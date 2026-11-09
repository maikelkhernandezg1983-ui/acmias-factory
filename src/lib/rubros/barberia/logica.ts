import { formatoPrecio, soloDigitos } from '@/lib/utiles';
import { DIA_MS, candidatosEspera, claveDia, hora, inicioDia, libre, lunesDe, nombreDia, ocupacion, sumarDias } from './agenda';
import type { Cliente, EnEspera, EstadoAgenda, Servicio, Turno } from './tipos';

const id = () => Math.random().toString(36).slice(2, 9);
const token = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

export function montoSena(s: Servicio) {
  return s.sena ? Math.round((s.precio * s.sena) / 100) : 0;
}

export interface NuevaReserva {
  servicioId: string;
  profId: string;
  inicio: number;
  nombre: string;
  whatsapp: string;
  origen: Turno['origen'];
}

/** Crea el turno (y el cliente si es nuevo). Devuelve error en texto o el estado nuevo y el turno. */
export function reservar(e: EstadoAgenda, r: NuevaReserva): { error: string } | { estado: EstadoAgenda; turno: Turno } {
  const s = e.servicios.find((x) => x.id === r.servicioId);
  if (!s) return { error: 'Ese servicio ya no está disponible.' };
  const fin = r.inicio + s.duracion * 60_000;
  if (!libre(e, r.profId, r.inicio, fin)) return { error: 'Ese horario se acaba de ocupar. Elegí otro.' };
  const wa = soloDigitos(r.whatsapp);
  let clientes = e.clientes;
  let cliente = wa ? clientes.find((c) => c.whatsapp === wa) : undefined;
  if (!cliente) {
    cliente = { id: `c-${id()}`, nombre: r.nombre.trim(), whatsapp: wa, notas: '', sellos: 0, ausencias: 0, creado: new Date().toISOString() };
    clientes = [...clientes, cliente];
  }
  const turno: Turno = {
    id: `t-${id()}`,
    token: token(),
    clienteId: cliente.id,
    profId: r.profId,
    servicioId: s.id,
    inicio: new Date(r.inicio).toISOString(),
    fin: new Date(fin).toISOString(),
    estado: 'reservado',
    origen: r.origen,
    creado: new Date().toISOString(),
  };
  return { estado: { ...e, clientes, turnos: [...e.turnos, turno] }, turno };
}

/**
 * Cambia el estado de un turno y mantiene sellos y ausencias del cliente (BAR-11, BAR-12).
 * Si se cancela, marca como avisados a los de la lista de espera que pueden tomarlo (BAR-08).
 */
export function cambiarEstado(e: EstadoAgenda, turnoId: string, nuevo: Turno['estado']): { estado: EstadoAgenda; avisados: EnEspera[] } {
  const t = e.turnos.find((x) => x.id === turnoId);
  if (!t || t.estado === nuevo) return { estado: e, avisados: [] };
  const delta = (est: Turno['estado'], cual: Turno['estado']) => (est === cual ? 1 : 0);
  const sellos = delta(nuevo, 'atendido') - delta(t.estado, 'atendido');
  const ausencias = delta(nuevo, 'ausente') - delta(t.estado, 'ausente');
  const clientes = e.clientes.map((c) =>
    c.id === t.clienteId ? { ...c, sellos: Math.max(0, c.sellos + sellos), ausencias: Math.max(0, c.ausencias + ausencias) } : c,
  );
  const turnos = e.turnos.map((x) => (x.id === turnoId ? { ...x, estado: nuevo } : x));
  let espera = e.espera;
  let avisados: EnEspera[] = [];
  if (nuevo === 'cancelado' && +new Date(t.inicio) > Date.now()) {
    avisados = candidatosEspera(e, t);
    const ahora = new Date().toISOString();
    const ids = new Set(avisados.map((a) => a.id));
    espera = e.espera.map((x) => (ids.has(x.id) ? { ...x, avisado: ahora, turnoLiberado: t.id } : x));
    avisados = espera.filter((x) => ids.has(x.id));
  }
  return { estado: { ...e, turnos, clientes, espera }, avisados };
}

export function reprogramar(e: EstadoAgenda, turnoId: string, inicio: number, profId: string): { error: string } | { estado: EstadoAgenda; avisados: EnEspera[] } {
  const t = e.turnos.find((x) => x.id === turnoId);
  const s = t && e.servicios.find((x) => x.id === t.servicioId);
  if (!t || !s) return { error: 'No encontramos el turno.' };
  const fin = inicio + s.duracion * 60_000;
  if (!libre(e, profId, inicio, fin, t.id)) return { error: 'Ese horario se acaba de ocupar. Elegí otro.' };
  // El horario viejo queda libre: se avisa a la lista de espera como si se hubiera cancelado.
  const liberado = { ...t };
  const avisados = +new Date(t.inicio) > Date.now() ? candidatosEspera(e, liberado) : [];
  const ids = new Set(avisados.map((a) => a.id));
  const ahora = new Date().toISOString();
  return {
    estado: {
      ...e,
      turnos: e.turnos.map((x) => (x.id === turnoId ? { ...x, profId, inicio: new Date(inicio).toISOString(), fin: new Date(fin).toISOString(), estado: 'reservado' } : x)),
      espera: e.espera.map((x) => (ids.has(x.id) ? { ...x, avisado: ahora, turnoLiberado: t.id } : x)),
    },
    avisados: avisados.map((a) => ({ ...a, avisado: ahora })),
  };
}

export function canjearSellos(e: EstadoAgenda, clienteId: string): EstadoAgenda {
  return { ...e, clientes: e.clientes.map((c) => (c.id === clienteId ? { ...c, sellos: Math.max(0, c.sellos - e.metaSellos) } : c)) };
}

// ---------- Mensajes de WhatsApp (BAR-04, BAR-05, BAR-08) ----------

interface Ctx {
  negocio: string;
  moneda: string;
  direccion?: string;
  enlaceTurno?: string;
}

function lineaTurno(e: EstadoAgenda, t: Turno) {
  const s = e.servicios.find((x) => x.id === t.servicioId);
  const p = e.profesionales.find((x) => x.id === t.profId);
  return `${s?.nombre ?? 'Turno'} con ${p?.nombre.split(' ')[0] ?? ''}, ${nombreDia(t.inicio)} a las ${hora(t.inicio)} h`;
}

/** Lo que recibe el cliente al reservar. */
export function mensajeConfirmacion(e: EstadoAgenda, t: Turno, c: Cliente, ctx: Ctx) {
  const s = e.servicios.find((x) => x.id === t.servicioId);
  const lineas = [
    `Hola ${c.nombre.split(' ')[0]}, te esperamos en ${ctx.negocio}.`,
    `✂️ ${lineaTurno(e, t)}.`,
  ];
  if (s?.sena) lineas.push(`Este servicio lleva una seña de ${formatoPrecio(montoSena(s), ctx.moneda)} para reservar el lugar.`);
  if (ctx.direccion) lineas.push(`📍 ${ctx.direccion}`);
  if (ctx.enlaceTurno) lineas.push('', `Confirmá, cambiá o cancelá acá: ${ctx.enlaceTurno}`);
  return lineas.join('\n');
}

/** Recordatorio del día anterior. */
export function mensajeRecordatorio(e: EstadoAgenda, t: Turno, c: Cliente, ctx: Ctx) {
  return [
    `Hola ${c.nombre.split(' ')[0]}, te recordamos tu turno en ${ctx.negocio}:`,
    `${lineaTurno(e, t)}.`,
    ctx.enlaceTurno ? `\nConfirmá con un toque o reprogramalo acá: ${ctx.enlaceTurno}` : '',
  ].join('\n');
}

/** Lo que el cliente le manda al local al terminar la reserva. */
export function mensajeAlLocal(e: EstadoAgenda, t: Turno, c: Cliente, ctx: Ctx) {
  return `Hola ${ctx.negocio}, soy ${c.nombre}. Reservé ${lineaTurno(e, t)}.`;
}

export function mensajeEspera(e: EstadoAgenda, x: EnEspera, ctx: Ctx & { enlaceReserva: string }) {
  const s = e.servicios.find((y) => y.id === x.servicioId);
  const t = x.turnoLiberado ? e.turnos.find((y) => y.id === x.turnoLiberado) : undefined;
  const cuando = t ? `${nombreDia(t.inicio)} a las ${hora(t.inicio)} h` : nombreDia(x.dia + 'T12:00:00');
  return `Hola ${x.nombre.split(' ')[0]}, se liberó un turno en ${ctx.negocio} para ${s?.nombre ?? 'tu servicio'}: ${cuando}. Si lo querés, reservalo acá antes que otro: ${ctx.enlaceReserva}`;
}

// ---------- Métricas (BAR-13) ----------

export function metricas(e: EstadoAgenda, ahora = Date.now()) {
  const lunes = lunesDe(ahora);
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const hoy = inicioDia(ahora);
  const desde = +hoy - 28 * DIA_MS;
  const ultimos = e.turnos.filter((t) => +new Date(t.inicio) >= desde && +new Date(t.fin) <= ahora);
  const conCita = ultimos.filter((t) => t.estado === 'atendido' || t.estado === 'ausente');
  const ausentes = ultimos.filter((t) => t.estado === 'ausente').length;
  // Nuevo: el cliente se dio de alta en las últimas 4 semanas; recurrente: ya venía de antes.
  const atendidos = new Set(conCita.filter((t) => t.estado === 'atendido').map((t) => t.clienteId));
  let nuevos = 0;
  for (const cid of atendidos) {
    const c = e.clientes.find((x) => x.id === cid);
    if (c && +new Date(c.creado) >= desde) nuevos++;
  }
  const ingresos = conCita
    .filter((t) => t.estado === 'atendido')
    .reduce((s, t) => s + (e.servicios.find((x) => x.id === t.servicioId)?.precio ?? 0), 0);
  const porServicio = e.servicios
    .map((s) => ({ s, n: conCita.filter((t) => t.servicioId === s.id && t.estado === 'atendido').length }))
    .sort((a, b) => b.n - a.n);
  const porProf = e.profesionales.map((p) => ({ p, ocupacion: ocupacion(e, semana, p.id) }));
  const online = ultimos.filter((t) => t.origen === 'online').length;
  return {
    ocupacionSemana: ocupacion(e, semana),
    porProf,
    ausencias: conCita.length ? ausentes / conCita.length : 0,
    ausentes,
    turnos28: conCita.length,
    nuevos,
    recurrentes: atendidos.size - nuevos,
    ingresos,
    porServicio,
    online: ultimos.length ? online / ultimos.length : 0,
  };
}

export function historialCliente(e: EstadoAgenda, clienteId: string) {
  return e.turnos.filter((t) => t.clienteId === clienteId).sort((a, b) => b.inicio.localeCompare(a.inicio));
}

export const claveHoy = () => claveDia(Date.now());

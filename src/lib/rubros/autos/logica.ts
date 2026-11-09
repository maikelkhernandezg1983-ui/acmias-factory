import { soloDigitos } from '@/lib/utiles';
import { DIA_MS, hora, huecos, libre, nombreDia } from '@/lib/rubros/barberia/agenda';
import type { EstadoAgenda, Servicio } from '@/lib/rubros/barberia/tipos';
import { DURACION_PRUEBA, cuotaFrancesa } from './datos-ejemplo';
import type { Consulta, EstadoAutos, Prueba, TipoVehiculo, Vehiculo } from './tipos';

const LOCALE: Record<string, string> = { ARS: 'es-AR', MXN: 'es-MX', COP: 'es-CO', CLP: 'es-CL', PEN: 'es-PE', UYU: 'es-UY', EUR: 'es-ES', USD: 'es-419' };

/** Precio de vehículo: sin decimales, siempre. */
export function precioAuto(valor: number, moneda: string) {
  try {
    return new Intl.NumberFormat(LOCALE[moneda] ?? 'es-419', { style: 'currency', currency: moneda, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(valor);
  } catch {
    return `${moneda} ${Math.round(valor)}`;
  }
}

export const nombreVehiculo = (v: Vehiculo) => `${v.marca} ${v.modelo}`;
export const resumenVehiculo = (v: Vehiculo) => (v.cerokm ? `0 km · ${v.caja.toLowerCase()} · ${v.combustible.toLowerCase()}` : `${v.anio} · ${v.km.toLocaleString('es')} km · ${v.combustible.toLowerCase()}`);
export const diasEnStock = (v: Vehiculo, ahora = Date.now()) => Math.max(0, Math.floor((ahora - +new Date(v.ingreso)) / DIA_MS));

export const nuevoId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Cómo habla el cliente → qué buscamos. */
const SINONIMOS: Record<string, string[]> = {
  camioneta: ['pickup', 'pick up', 'suv'],
  chata: ['pickup', 'pick up'],
  '4x4': ['4x4'],
  familiar: ['suv', '7 asientos', 'sedan'],
  automatico: ['automatica', 'automatico'],
  automatica: ['automatica', 'automatico'],
  moto: ['naked', 'scooter', 'enduro', 'trail'],
  motito: ['scooter', '125', '150'],
  scooter: ['scooter'],
  cross: ['enduro', 'trail'],
  diesel: ['diesel'],
  gasolero: ['diesel'],
  nuevo: ['0 km'],
  '0km': ['0 km'],
  economico: ['hatch', '1 0', '1 4', '125', '150'],
};

function texto(v: Vehiculo) {
  return normalizar(`${v.marca} ${v.modelo} ${v.carroceria} ${v.carroceria === 'pickup' ? 'pick up' : ''} ${v.combustible} ${v.caja} ${v.color} ${v.anio} ${v.cerokm ? '0 km' : 'usado'} ${v.tipo}`);
}

export interface Filtros {
  q: string;
  tipo: TipoVehiculo | null;
  cerokm: boolean;
  precioMax: number | null;
  caja: Vehiculo['caja'] | null;
}

/** Búsqueda con palabras del cliente ("camioneta automática", "moto chica"). */
export function filtrar(vehiculos: Vehiculo[], f: Filtros) {
  const palabras = normalizar(f.q).split(' ').filter((p) => p.length > 1);
  return vehiculos
    .filter((v) => v.estado !== 'vendido')
    .filter((v) => (!f.tipo || v.tipo === f.tipo) && (!f.cerokm || v.cerokm) && (!f.precioMax || v.precio <= f.precioMax) && (!f.caja || v.caja === f.caja))
    .filter((v) => {
      if (!palabras.length) return true;
      const t = texto(v);
      return palabras.every((p) => {
        if (/^(19|20)\d\d$/.test(p)) return v.anio >= Number(p);
        const alternativas = [p, ...(SINONIMOS[p] ?? [])];
        return alternativas.some((a) => t.includes(a));
      });
    })
    .sort((a, b) => Number(!!b.destacado) - Number(!!a.destacado) || Number(a.estado !== 'disponible') - Number(b.estado !== 'disponible') || +new Date(b.ingreso) - +new Date(a.ingreso));
}

// ---------- Financiación ----------

export function cuota(e: EstadoAutos, v: Vehiculo, anticipo: number, meses: number) {
  return cuotaFrancesa(Math.max(0, v.precio - anticipo), e.ajustes.tasaMensual, meses);
}

// ---------- Pruebas de manejo (motor de agenda: cada vehículo es un "profesional") ----------

const SERVICIO_PRUEBA: Servicio = { id: 'prueba', nombre: 'Prueba de manejo', descripcion: '', duracion: DURACION_PRUEBA, precio: 0 };

export function comoAgenda(e: EstadoAutos): EstadoAgenda {
  return {
    version: 1,
    rubro: 'barberia',
    servicios: [SERVICIO_PRUEBA],
    profesionales: e.vehiculos.filter((v) => v.estado === 'disponible').map((v) => ({ id: v.id, nombre: v.modelo, especialidad: '', servicios: ['prueba'] })),
    turnos: e.pruebas,
    clientes: [],
    bloqueos: [],
    espera: [],
    horario: e.horario,
    metaSellos: 0,
    beneficio: '',
    semilla: '',
  };
}

export function horariosPrueba(e: EstadoAutos, vehiculoId: string, dia: Date, ahora = Date.now()) {
  return huecos(comoAgenda(e), SERVICIO_PRUEBA, vehiculoId, dia, ahora);
}

export interface DatosCliente {
  nombre: string;
  whatsapp: string;
}

export function registrarConsulta(e: EstadoAutos, c: Omit<Consulta, 'id' | 'fecha' | 'estado'>): { estado: EstadoAutos; consulta: Consulta } {
  const consulta: Consulta = { ...c, whatsapp: soloDigitos(c.whatsapp), id: nuevoId('c'), fecha: new Date().toISOString(), estado: 'nueva' };
  return { estado: { ...e, consultas: [consulta, ...e.consultas] }, consulta };
}

export function agendarPrueba(e: EstadoAutos, vehiculoId: string, inicio: number, cliente: DatosCliente): { error: string } | { estado: EstadoAutos; prueba: Prueba; consulta: Consulta } {
  const v = e.vehiculos.find((x) => x.id === vehiculoId);
  if (!v || v.estado !== 'disponible') return { error: 'Este vehículo ya no está disponible para prueba.' };
  const fin = inicio + DURACION_PRUEBA * 60_000;
  if (!libre(comoAgenda(e), vehiculoId, inicio, fin)) return { error: 'Ese horario se acaba de ocupar. Elegí otro.' };
  const r = registrarConsulta(e, { nombre: cliente.nombre.trim(), whatsapp: cliente.whatsapp, vehiculoId, tipo: 'prueba' });
  const prueba: Prueba = {
    id: nuevoId('p'),
    token: Math.random().toString(36).slice(2, 12),
    clienteId: r.consulta.id,
    profId: vehiculoId,
    servicioId: 'prueba',
    inicio: new Date(inicio).toISOString(),
    fin: new Date(fin).toISOString(),
    estado: 'reservado',
    origen: 'online',
    creado: new Date().toISOString(),
  };
  const consulta = { ...r.consulta, pruebaId: prueba.id };
  return { estado: { ...r.estado, consultas: r.estado.consultas.map((x) => (x.id === consulta.id ? consulta : x)), pruebas: [...e.pruebas, prueba] }, prueba, consulta };
}

// ---------- Mensajes de WhatsApp ----------

interface Ctx {
  negocio: string;
  moneda: string;
  enlace?: string;
}

/** Lo que el cliente le manda a la agencia: el auto que miró y lo que simuló. */
export function mensajeAgencia(v: Vehiculo, c: Consulta, e: EstadoAutos, ctx: Ctx) {
  const l = [`Hola ${ctx.negocio}, soy ${c.nombre}. Me interesa el ${nombreVehiculo(v)} (${resumenVehiculo(v)}), publicado a ${precioAuto(v.precio, ctx.moneda)}.`];
  if (c.cuota) l.push(`Simulé ${c.cuota.meses} cuotas de ${precioAuto(c.cuota.cuota, ctx.moneda)} con ${precioAuto(c.cuota.anticipo, ctx.moneda)} de anticipo.`);
  if (c.usado) l.push(`Quiero entregar mi usado: ${c.usado.descripcion}, ${c.usado.anio}, ${c.usado.km.toLocaleString('es')} km.`);
  if (c.pruebaId) {
    const p = e.pruebas.find((x) => x.id === c.pruebaId);
    if (p) l.push(`Reservé la prueba de manejo para ${nombreDia(p.inicio)} a las ${hora(p.inicio)} h.`);
  }
  if (ctx.enlace) l.push(ctx.enlace);
  return l.join('\n');
}

/** Respuesta de la agencia al cliente desde el panel. */
export function mensajeRespuesta(c: Consulta, v: Vehiculo | undefined, ctx: Ctx) {
  const auto = v ? `el ${nombreVehiculo(v)}` : 'tu consulta';
  if (c.tipo === 'tasacion' && c.usado?.ofrecido) return `Hola ${c.nombre.split(' ')[0]}, te escribimos de ${ctx.negocio}. Por tu ${c.usado.descripcion} ${c.usado.anio} te ofrecemos ${precioAuto(c.usado.ofrecido, ctx.moneda)} en parte de pago (sujeto a revisión del vehículo). ¿Cuándo podés traerlo?`;
  if (c.tipo === 'financiacion') return `Hola ${c.nombre.split(' ')[0]}, te escribimos de ${ctx.negocio} por la financiación de ${auto}. ¿Te paso los requisitos para la precalificación?`;
  return `Hola ${c.nombre.split(' ')[0]}, te escribimos de ${ctx.negocio} por ${auto}. ¿Seguís interesado? Podemos coordinar una visita o prueba de manejo.`;
}

// ---------- Métricas ----------

export function metricas(e: EstadoAutos, ahora = Date.now()) {
  const desde7 = ahora - 7 * DIA_MS;
  const desde30 = ahora - 30 * DIA_MS;
  const enStock = e.vehiculos.filter((v) => v.estado !== 'vendido');
  const consultas7 = e.consultas.filter((c) => +new Date(c.fecha) >= desde7);
  const vendidos30 = e.vehiculos.filter((v) => v.vendido && +new Date(v.vendido) >= desde30);
  const porVehiculo = enStock
    .map((v) => ({ v, consultas: e.consultas.filter((c) => c.vehiculoId === v.id).length, dias: diasEnStock(v, ahora) }))
    .sort((a, b) => b.consultas - a.consultas || b.v.vistas - a.v.vistas);
  const noRotan = porVehiculo.filter((x) => x.dias >= 60).sort((a, b) => b.dias - a.dias);
  const pruebasProximas = e.pruebas.filter((p) => +new Date(p.inicio) >= ahora && (p.estado === 'reservado' || p.estado === 'confirmado')).length;
  const tasaciones = e.consultas.filter((c) => c.tipo === 'tasacion' && !c.usado?.ofrecido && c.estado !== 'perdida').length;
  const promedioDias = enStock.length ? Math.round(enStock.reduce((s, v) => s + diasEnStock(v, ahora), 0) / enStock.length) : 0;
  const cerradas = e.consultas.filter((c) => +new Date(c.fecha) >= desde30);
  return {
    enStock: enStock.length,
    autos: enStock.filter((v) => v.tipo === 'auto').length,
    motos: enStock.filter((v) => v.tipo === 'moto').length,
    consultas7: consultas7.length,
    nuevas: e.consultas.filter((c) => c.estado === 'nueva').length,
    pruebasProximas,
    tasaciones,
    vendidos30: vendidos30.length,
    promedioDias,
    porVehiculo,
    noRotan,
    conversion: cerradas.length ? cerradas.filter((c) => c.estado === 'cerrada').length / cerradas.length : 0,
    porTipo: (['consulta', 'financiacion', 'prueba', 'tasacion'] as const).map((t) => ({ t, n: e.consultas.filter((c) => c.tipo === t && +new Date(c.fecha) >= desde30).length })),
  };
}

export const NOMBRE_TIPO: Record<Consulta['tipo'], string> = { consulta: 'Consulta', financiacion: 'Financiación', prueba: 'Prueba de manejo', tasacion: 'Usado para tasar' };
export const NOMBRE_ESTADO_CONSULTA: Record<Consulta['estado'], string> = { nueva: 'Nueva', contactada: 'Contactada', cerrada: 'Vendida', perdida: 'Perdida' };

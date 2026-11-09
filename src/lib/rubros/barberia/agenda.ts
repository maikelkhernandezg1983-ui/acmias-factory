import type { Bloqueo, EnEspera, EstadoAgenda, Horario, Profesional, Servicio, Turno } from './tipos';

export const PASO = 15; // minutos entre horarios ofrecidos
export const ANTICIPACION = 30; // no se reserva con menos de 30 min
export const DIA_MS = 86_400_000;

export const ACTIVOS: Turno['estado'][] = ['reservado', 'confirmado', 'atendido', 'ausente'];
export const esActivo = (t: Turno) => ACTIVOS.includes(t.estado);

export const NOMBRE_ESTADO: Record<Turno['estado'], string> = {
  reservado: 'Reservado',
  confirmado: 'Confirmado',
  atendido: 'Atendido',
  ausente: 'Ausente',
  cancelado: 'Cancelado',
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function inicioDia(d: Date | string | number) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function claveDia(d: Date | string | number) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function deClave(clave: string) {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function lunesDe(d: Date | number) {
  const x = inicioDia(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function sumarDias(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function conMinutos(dia: Date, min: number) {
  const x = inicioDia(dia);
  x.setMinutes(min);
  return x;
}

export function minutosDe(d: Date | string) {
  const x = new Date(d);
  return x.getHours() * 60 + x.getMinutes();
}

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const hora = (iso: string | Date) => hhmm(minutosDe(iso));

export function nombreDia(d: Date | string, ahora = new Date()) {
  const x = inicioDia(d);
  const dif = Math.round((x.getTime() - inicioDia(ahora).getTime()) / DIA_MS);
  if (dif === 0) return 'hoy';
  if (dif === 1) return 'mañana';
  return `${DIAS[x.getDay()]} ${x.getDate()} de ${MESES[x.getMonth()]}`;
}

export const diaCorto = (d: Date) => DIAS_CORTOS[d.getDay()];
export const fechaCorta = (d: Date) => `${d.getDate()} ${MESES[d.getMonth()]}`;
export const nombreDiaSemana = (n: number) => DIAS[n];

export function seSolapan(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && b1 < a2;
}

export function abierto(horario: Horario, dia: Date) {
  return horario[dia.getDay()] ?? null;
}

/** ¿Está libre el profesional en [desde, hasta)? Respeta turnos activos y bloqueos. */
export function enPausa(e: Pick<EstadoAgenda, 'pausa'>, desde: number, hasta: number) {
  if (!e.pausa) return false;
  const d = new Date(desde);
  return seSolapan(desde, hasta, +conMinutos(d, e.pausa[0]), +conMinutos(d, e.pausa[1]));
}

export function libre(e: Pick<EstadoAgenda, 'turnos' | 'bloqueos' | 'pausa'>, profId: string, desde: number, hasta: number, ignorar?: string) {
  if (enPausa(e, desde, hasta)) return false;
  const choca = e.turnos.some(
    (t) => t.profId === profId && t.id !== ignorar && esActivo(t) && seSolapan(desde, hasta, +new Date(t.inicio), +new Date(t.fin)),
  );
  if (choca) return false;
  return !e.bloqueos.some((b) => (b.profId === null || b.profId === profId) && seSolapan(desde, hasta, +new Date(b.desde), +new Date(b.hasta)));
}

export interface Hueco {
  inicio: number; // ms
  profId: string;
}

export function profesionalesPara(e: EstadoAgenda, servicioId: string) {
  return e.profesionales.filter((p) => p.servicios.includes(servicioId));
}

/**
 * Horarios disponibles en un día para un servicio (BAR-02): cada 15 min, dentro del horario,
 * sin pisar turnos ni bloqueos y con 30 min de anticipación. Con profId null ("el primero libre")
 * devuelve un hueco por horario con el primer profesional disponible.
 */
export function huecos(e: EstadoAgenda, servicio: Servicio, profId: string | null, dia: Date, ahora = Date.now(), ignorar?: string): Hueco[] {
  const h = abierto(e.horario, dia);
  if (!h) return [];
  const profs = (profId ? e.profesionales.filter((p) => p.id === profId) : profesionalesPara(e, servicio.id)).filter((p) =>
    p.servicios.includes(servicio.id),
  );
  const dur = servicio.duracion * 60_000;
  const res: Hueco[] = [];
  for (let m = h[0]; m + servicio.duracion <= h[1]; m += PASO) {
    const ini = +conMinutos(dia, m);
    if (ini < ahora + ANTICIPACION * 60_000) continue;
    const p = profs.find((x) => libre(e, x.id, ini, ini + dur, ignorar));
    if (p) res.push({ inicio: ini, profId: p.id });
  }
  return res;
}

/** Próximo día con lugar (para sugerir cuando el elegido está lleno). */
export function proximoConLugar(e: EstadoAgenda, servicio: Servicio, profId: string | null, desde: Date, ahora = Date.now(), dias = 21) {
  for (let i = 0; i < dias; i++) {
    const d = sumarDias(inicioDia(desde), i);
    if (huecos(e, servicio, profId, d, ahora).length) return d;
  }
  return null;
}

/** Quiénes de la lista de espera pueden tomar el turno que se liberó (BAR-08). */
export function candidatosEspera(e: EstadoAgenda, liberado: Turno): EnEspera[] {
  const dia = claveDia(liberado.inicio);
  const durLibre = (+new Date(liberado.fin) - +new Date(liberado.inicio)) / 60_000;
  return e.espera.filter((x) => {
    if (x.avisado || x.dia !== dia) return false;
    if (x.profId && x.profId !== liberado.profId) return false;
    const s = e.servicios.find((y) => y.id === x.servicioId);
    const prof = e.profesionales.find((p) => p.id === liberado.profId);
    return !!s && s.duracion <= durLibre && !!prof?.servicios.includes(s.id);
  });
}

export function minutosDisponibles(e: EstadoAgenda, prof: Profesional, dia: Date) {
  const h = abierto(e.horario, dia);
  if (!h) return 0;
  const a = +conMinutos(dia, h[0]);
  const z = +conMinutos(dia, h[1]);
  const bloqueado = e.bloqueos
    .filter((b) => b.profId === null || b.profId === prof.id)
    .reduce((s, b) => s + Math.max(0, Math.min(z, +new Date(b.hasta)) - Math.max(a, +new Date(b.desde))), 0);
  const pausa = e.pausa ? Math.max(0, Math.min(z, +conMinutos(dia, e.pausa[1])) - Math.max(a, +conMinutos(dia, e.pausa[0]))) : 0;
  return Math.max(0, (z - a - bloqueado - pausa) / 60_000);
}

export function minutosOcupados(turnos: Turno[], profId: string, dia: Date) {
  const k = claveDia(dia);
  return turnos
    .filter((t) => t.profId === profId && esActivo(t) && claveDia(t.inicio) === k)
    .reduce((s, t) => s + (+new Date(t.fin) - +new Date(t.inicio)) / 60_000, 0);
}

export function ocupacion(e: EstadoAgenda, dias: Date[], profId?: string) {
  let disp = 0;
  let ocup = 0;
  for (const d of dias)
    for (const p of e.profesionales) {
      if (profId && p.id !== profId) continue;
      disp += minutosDisponibles(e, p, d);
      ocup += minutosOcupados(e.turnos, p.id, d);
    }
  return disp ? Math.min(1, ocup / disp) : 0;
}

export function turnosDelDia(turnos: Turno[], dia: Date) {
  const k = claveDia(dia);
  return turnos.filter((t) => claveDia(t.inicio) === k).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function bloqueosDelDia(bloqueos: Bloqueo[], dia: Date) {
  const a = +inicioDia(dia);
  const z = a + DIA_MS;
  return bloqueos.filter((b) => seSolapan(a, z, +new Date(b.desde), +new Date(b.hasta)));
}

/** Primer día abierto después de `desde` (sin contar ese día). */
export function siguienteAbierto(horario: Horario, desde: Date | number) {
  let d = inicioDia(desde);
  for (let i = 0; i < 14; i++) {
    d = sumarDias(d, 1);
    if (horario[d.getDay()]) return d;
  }
  return d;
}

/** "de hoy", "de mañana" o "del miércoles 11 de nov". */
export function delDia(d: Date | string, ahora = new Date()) {
  const n = nombreDia(d, ahora);
  return n === 'hoy' || n === 'mañana' ? `de ${n}` : `del ${n}`;
}

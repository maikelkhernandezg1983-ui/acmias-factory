import { formatoPrecio, idCorto } from '@/lib/utiles';
import type { Area, Cargo, EstadoHab, EstadoHotel, Estadia, Habitacion, LineaRS, Solicitud, TipoHab } from './tipos';

export const NOMBRE_TIPO_HAB: Record<TipoHab, string> = { estandar: 'Estándar', doble: 'Doble', familiar: 'Familiar', suite: 'Suite' };
export const NOMBRE_ESTADO_HAB: Record<EstadoHab, string> = { libre: 'Libre', ocupada: 'Ocupada', limpieza: 'Para limpiar', mantenimiento: 'En mantenimiento' };
export const NOMBRE_AREA: Record<Area, string> = { cocina: 'Cocina', limpieza: 'Limpieza', mantenimiento: 'Mantenimiento', recepcion: 'Recepción' };
export const NOMBRE_ESTADO_SOL: Record<Solicitud['estado'], string> = { nueva: 'Nueva', 'en-curso': 'En curso', lista: 'Lista', cancelada: 'Cancelada' };
export const NOMBRE_CATEGORIA_RS = { desayuno: 'Desayunos', platos: 'Platos', snacks: 'Snacks y postres', bebidas: 'Bebidas', bar: 'Bar' } as const;

/** Lo que el huésped puede pedir sin escribir, por área. */
export const PEDIDOS_RAPIDOS: Record<Exclude<Area, 'cocina'>, { tipo: string; hora?: boolean; detalle?: boolean }[]> = {
  limpieza: [{ tipo: 'Toallas limpias' }, { tipo: 'Limpieza de la habitación' }, { tipo: 'Almohada extra' }, { tipo: 'Papel higiénico' }, { tipo: 'Amenities' }],
  mantenimiento: [{ tipo: 'Aire acondicionado', detalle: true }, { tipo: 'Agua caliente o ducha', detalle: true }, { tipo: 'TV o control', detalle: true }, { tipo: 'Luz o enchufes', detalle: true }, { tipo: 'Wifi', detalle: true }, { tipo: 'Otro problema', detalle: true }],
  recepcion: [{ tipo: 'Despertador', hora: true }, { tipo: 'Late checkout', hora: true }, { tipo: 'Taxi', hora: true, detalle: true }, { tipo: 'Guardar equipaje' }, { tipo: 'Otra consulta', detalle: true }],
};

export const dinero = (v: number, moneda: string) => formatoPrecio(v, moneda);

export function fechaLocal(d: Date | number) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function fechaCorta(iso: string) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const minutosDesde = (iso: string, ahora: number) => Math.max(0, Math.round((ahora - +new Date(iso)) / 60_000));

export function hace(iso: string, ahora: number) {
  const m = minutosDesde(iso, ahora);
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
}

export const porCodigo = (e: EstadoHotel, codigo: string) => e.habitaciones.find((h) => h.codigo === codigo);
export const estadiaActiva = (e: EstadoHotel, habitacionId: string) => e.estadias.find((s) => s.habitacionId === habitacionId && s.estado === 'activa');

export function noches(s: Pick<Estadia, 'entrada' | 'salida'>) {
  const [a1, m1, d1] = s.entrada.split('-').map(Number);
  const [a2, m2, d2] = s.salida.split('-').map(Number);
  return Math.max(1, Math.round((+new Date(a2, m2 - 1, d2) - +new Date(a1, m1 - 1, d1)) / 86_400_000));
}

/** Cuenta de la estadía: noches por tarifa más consumos. */
export function cuenta(e: EstadoHotel, estadiaId: string) {
  const s = e.estadias.find((x) => x.id === estadiaId);
  const h = s && e.habitaciones.find((x) => x.id === s.habitacionId);
  if (!s || !h) return { noches: 0, tarifa: 0, alojamiento: 0, cargos: [] as Cargo[], consumos: 0, total: 0 };
  const n = noches(s);
  const cargos = e.cargos.filter((c) => c.estadiaId === estadiaId).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const consumos = cargos.reduce((t, c) => t + c.monto, 0);
  return { noches: n, tarifa: h.tarifa, alojamiento: n * h.tarifa, cargos, consumos, total: n * h.tarifa + consumos };
}

export function pedirRoomService(e: EstadoHotel, habitacionId: string, lineas: LineaRS[], opciones: { nota?: string; para?: string }, fecha = new Date()): { estado: EstadoHotel; solicitud: Solicitud } | { error: string } {
  const s = estadiaActiva(e, habitacionId);
  if (!s) return { error: 'Esta habitación no tiene una estadía activa. Consultá en recepción.' };
  const validas = lineas.filter((l) => l.cantidad > 0 && e.carta.some((c) => c.id === l.itemId && c.disponible));
  if (!validas.length) return { error: 'Elegí al menos un plato o bebida disponible.' };
  const total = validas.reduce((t, l) => t + l.precio * l.cantidad, 0);
  const sol: Solicitud = { id: `so-${idCorto()}`, habitacionId, estadiaId: s.id, area: 'cocina', tipo: 'Room service', items: validas, total, estado: 'nueva', fecha: fecha.toISOString(), detalle: opciones.nota?.trim().slice(0, 200) || undefined, para: opciones.para };
  const cargo: Cargo = { id: `ca-${sol.id}`, estadiaId: s.id, concepto: `Room service: ${validas.map((l) => `${l.cantidad} ${l.nombre}`).join(', ')}`, monto: total, fecha: sol.fecha, solicitudId: sol.id };
  return { estado: { ...e, solicitudes: [...e.solicitudes, sol], cargos: [...e.cargos, cargo] }, solicitud: sol };
}

export function pedirServicio(e: EstadoHotel, habitacionId: string, area: Exclude<Area, 'cocina'>, tipo: string, opciones: { detalle?: string; para?: string }, fecha = new Date()): { estado: EstadoHotel; solicitud: Solicitud } | { error: string } {
  const s = estadiaActiva(e, habitacionId);
  if (!s) return { error: 'Esta habitación no tiene una estadía activa. Consultá en recepción.' };
  const abierta = e.solicitudes.find((x) => x.habitacionId === habitacionId && x.tipo === tipo && (x.estado === 'nueva' || x.estado === 'en-curso'));
  if (abierta) return { error: `Ya pediste "${tipo}" y lo estamos resolviendo.` };
  const sol: Solicitud = { id: `so-${idCorto()}`, habitacionId, estadiaId: s.id, area, tipo, detalle: opciones.detalle?.trim().slice(0, 200) || undefined, para: opciones.para, total: 0, estado: 'nueva', fecha: fecha.toISOString() };
  return { estado: { ...e, solicitudes: [...e.solicitudes, sol] }, solicitud: sol };
}

/** Nueva → En curso → Lista. */
export function avanzar(e: EstadoHotel, id: string, fecha = new Date()): EstadoHotel {
  return {
    ...e,
    solicitudes: e.solicitudes.map((s) => {
      if (s.id !== id) return s;
      if (s.estado === 'nueva') return { ...s, estado: 'en-curso', enCurso: fecha.toISOString() };
      if (s.estado === 'en-curso') return { ...s, estado: 'lista', lista: fecha.toISOString() };
      return s;
    }),
  };
}

/** Cancelar un pedido también saca el consumo de la cuenta. */
export function cancelar(e: EstadoHotel, id: string): EstadoHotel {
  return { ...e, solicitudes: e.solicitudes.map((s) => (s.id === id ? { ...s, estado: 'cancelada' } : s)), cargos: e.cargos.filter((c) => c.solicitudId !== id) };
}

export function cambiarEstadoHab(e: EstadoHotel, habitacionId: string, estado: EstadoHab): EstadoHotel {
  return { ...e, habitaciones: e.habitaciones.map((h) => (h.id === habitacionId ? { ...h, estado } : h)) };
}

export function checkin(e: EstadoHotel, estadiaId: string, fecha = new Date()): EstadoHotel | { error: string } {
  const s = e.estadias.find((x) => x.id === estadiaId);
  const h = s && e.habitaciones.find((x) => x.id === s.habitacionId);
  if (!s || !h) return { error: 'No encontramos la reserva.' };
  if (h.estado !== 'libre') return { error: `La habitación ${h.numero} está ${NOMBRE_ESTADO_HAB[h.estado].toLowerCase()}. Marcala como libre antes del check-in.` };
  return { ...cambiarEstadoHab(e, h.id, 'ocupada'), estadias: e.estadias.map((x) => (x.id === estadiaId ? { ...x, estado: 'activa', checkin: fecha.toISOString() } : x)) };
}

/** Al salir el huésped, la habitación queda para limpiar y los pedidos abiertos se cierran. */
export function checkout(e: EstadoHotel, estadiaId: string, fecha = new Date()): EstadoHotel {
  const s = e.estadias.find((x) => x.id === estadiaId);
  if (!s) return e;
  return {
    ...cambiarEstadoHab(e, s.habitacionId, 'limpieza'),
    estadias: e.estadias.map((x) => (x.id === estadiaId ? { ...x, estado: 'cerrada', checkout: fecha.toISOString() } : x)),
    solicitudes: e.solicitudes.map((x) => (x.estadiaId === estadiaId && (x.estado === 'nueva' || x.estado === 'en-curso') && x.area !== 'cocina' ? { ...x, estado: 'cancelada' } : x)),
  };
}

export function nuevaReserva(e: EstadoHotel, datos: { habitacionId: string; huesped: string; whatsapp: string; personas: number; entrada: string; salida: string }): EstadoHotel | { error: string } {
  if (datos.huesped.trim().length < 3) return { error: 'Escribí el nombre del huésped.' };
  if (datos.salida <= datos.entrada) return { error: 'La salida tiene que ser después de la entrada.' };
  const cruza = e.estadias.some((s) => s.habitacionId === datos.habitacionId && s.estado !== 'cerrada' && s.entrada < datos.salida && datos.entrada < s.salida);
  if (cruza) return { error: 'Esa habitación ya está tomada en esas fechas.' };
  const s: Estadia = { id: `es-${idCorto()}`, ...datos, huesped: datos.huesped.trim(), estado: 'reservada' };
  return { ...e, estadias: [...e.estadias, s] };
}

interface Ctx {
  negocio: string;
  moneda: string;
}

export function mensajeBienvenida(s: Estadia, h: Habitacion, e: EstadoHotel, enlace: string, ctx: Ctx) {
  return [
    `¡Bienvenido/a, ${s.huesped.split(' ')[0]}! Te damos la bienvenida a ${ctx.negocio}.`,
    `Tu habitación es la ${h.numero}. Wifi: ${e.ajustes.wifiRed} · clave ${e.ajustes.wifiClave}.`,
    `Desde este enlace (o el QR de tu habitación) pedís room service, toallas, limpieza o lo que necesites, sin llamar: ${enlace}`,
    `Desayuno: ${e.ajustes.desayuno}. Check-out: ${e.ajustes.checkout} h.`,
  ].join('\n');
}

export function mensajeCuenta(s: Estadia, h: Habitacion, e: EstadoHotel, ctx: Ctx) {
  const c = cuenta(e, s.id);
  return [
    `Hola ${s.huesped.split(' ')[0]}, gracias por quedarte en ${ctx.negocio}.`,
    `Detalle de tu estadía en la habitación ${h.numero}:`,
    `- Alojamiento: ${c.noches} ${c.noches === 1 ? 'noche' : 'noches'} × ${dinero(c.tarifa, ctx.moneda)} = ${dinero(c.alojamiento, ctx.moneda)}`,
    ...c.cargos.map((x) => `- ${x.concepto}: ${dinero(x.monto, ctx.moneda)}`),
    `Total: ${dinero(c.total, ctx.moneda)}.`,
    '¡Te esperamos pronto!',
  ].join('\n');
}

export function metricas(e: EstadoHotel, ahora: number) {
  const hoy = fechaLocal(ahora);
  const habilitadas = e.habitaciones.filter((h) => h.estado !== 'mantenimiento').length;
  const ocupadas = e.habitaciones.filter((h) => h.estado === 'ocupada').length;
  const deHoy = e.solicitudes.filter((s) => fechaLocal(new Date(s.fecha)) === hoy && s.estado !== 'cancelada');
  const ultimos7 = e.solicitudes.filter((s) => ahora - +new Date(s.fecha) < 7 * 86_400_000 && s.estado !== 'cancelada');
  const respuesta = (a: Area) => {
    const xs = ultimos7.filter((s) => s.area === a && s.enCurso).map((s) => (+new Date(s.enCurso!) - +new Date(s.fecha)) / 60_000);
    return xs.length ? Math.round(xs.reduce((t, x) => t + x, 0) / xs.length) : null;
  };
  const resolucion = (a: Area) => {
    const xs = ultimos7.filter((s) => s.area === a && s.lista).map((s) => (+new Date(s.lista!) - +new Date(s.fecha)) / 60_000);
    return xs.length ? Math.round(xs.reduce((t, x) => t + x, 0) / xs.length) : null;
  };
  const conteo = new Map<string, number>();
  for (const s of ultimos7) for (const l of s.items ?? []) conteo.set(l.nombre, (conteo.get(l.nombre) ?? 0) + l.cantidad);
  return {
    ocupadas,
    habilitadas,
    ocupacion: habilitadas ? Math.round((ocupadas / habilitadas) * 100) : 0,
    llegadas: e.estadias.filter((s) => s.estado === 'reservada' && s.entrada === hoy).length,
    salidas: e.estadias.filter((s) => s.estado === 'activa' && s.salida <= hoy).length,
    pedidosHoy: deHoy.length,
    abiertos: e.solicitudes.filter((s) => s.estado === 'nueva' || s.estado === 'en-curso').length,
    nuevos: e.solicitudes.filter((s) => s.estado === 'nueva').length,
    roomServiceHoy: deHoy.filter((s) => s.area === 'cocina').reduce((t, s) => t + s.total, 0),
    roomService7: ultimos7.filter((s) => s.area === 'cocina').reduce((t, s) => t + s.total, 0),
    porArea: (['cocina', 'limpieza', 'mantenimiento', 'recepcion'] as Area[]).map((a) => ({ area: a, pedidos: ultimos7.filter((s) => s.area === a).length, respuesta: respuesta(a), resolucion: resolucion(a) })),
    masPedidos: [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

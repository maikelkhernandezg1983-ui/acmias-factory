import { formatoPrecio, idCorto, soloDigitos } from '@/lib/utiles';
import { nombreMes, periodoDe, sumarMeses, vencimiento } from './periodos';
import type { Categoria, ClienteC, Cuota, EstadoContador, Tarea } from './tipos';

export const NOMBRE_CATEGORIA: Record<Categoria, string> = { monotributo: 'Monotributo', responsable: 'Responsable inscripto', empleador: 'Empleador', sociedad: 'Sociedad' };

export const dinero = (v: number, moneda: string) => formatoPrecio(v, moneda);
export const nombreCompleto = (c: Pick<ClienteC, 'nombre' | 'apellido'>) => [c.nombre, c.apellido].filter(Boolean).join(' ');
export const primerNombre = (c: Pick<ClienteC, 'nombre' | 'apellido'>) => (c.apellido ? c.nombre.split(' ')[0] : c.nombre);

export function vencida(q: Cuota, dia: number, ahora: number) {
  return q.estado === 'pendiente' && +vencimiento(q.periodo, dia) < ahora;
}

export type EstadoPago = 'al-dia' | 'por-vencer' | 'debe';
export const NOMBRE_ESTADO_PAGO: Record<EstadoPago, string> = { 'al-dia': 'Al día', 'por-vencer': 'Cuota del mes por pagar', debe: 'Con deuda' };

export function cuentaDe(e: EstadoContador, clienteId: string, ahora: number) {
  const propias = e.cuotas.filter((q) => q.clienteId === clienteId).sort((a, b) => a.periodo.localeCompare(b.periodo));
  const pendientes = propias.filter((q) => q.estado === 'pendiente');
  const vencidas = pendientes.filter((q) => vencida(q, e.ajustes.diaVencimiento, ahora));
  const deuda = vencidas.reduce((t, q) => t + q.monto, 0);
  const total = pendientes.reduce((t, q) => t + q.monto, 0);
  const estado: EstadoPago = vencidas.length ? 'debe' : pendientes.length ? 'por-vencer' : 'al-dia';
  return { cuotas: propias, pendientes, vencidas, deuda, total, estado, informada: pendientes.some((q) => q.informada) };
}

/** Crea la cuota y la tarea del periodo para cada cliente activo que no las tenga. Devuelve el mismo estado si no falta nada. */
export function asegurarPeriodo(e: EstadoContador, periodo: string): EstadoContador {
  const conCuota = new Set(e.cuotas.filter((q) => q.periodo === periodo).map((q) => q.clienteId));
  const conTarea = new Set(e.tareas.filter((t) => t.periodo === periodo).map((t) => t.clienteId));
  const activos = e.clientes.filter((c) => c.activo);
  const cuotas = activos.filter((c) => !conCuota.has(c.id)).map<Cuota>((c) => ({ id: `cu-${idCorto()}`, clienteId: c.id, periodo, monto: c.honorario, estado: 'pendiente' }));
  const tareas = activos.filter((c) => !conTarea.has(c.id)).map<Tarea>((c) => ({ id: `ta-${idCorto()}`, clienteId: c.id, periodo, nombre: e.ajustes.tareaMensual, estado: 'pendiente' }));
  if (!cuotas.length && !tareas.length) return e;
  return { ...e, cuotas: [...e.cuotas, ...cuotas], tareas: [...e.tareas, ...tareas] };
}

export function confirmarPago(e: EstadoContador, cuotaId: string, medio: Cuota['medio'], fecha = new Date()): EstadoContador {
  return { ...e, cuotas: e.cuotas.map((q) => (q.id === cuotaId ? { ...q, estado: 'pagada', pagada: fecha.toISOString(), medio, informada: undefined } : q)) };
}

export function anularPago(e: EstadoContador, cuotaId: string): EstadoContador {
  return { ...e, cuotas: e.cuotas.map((q) => (q.id === cuotaId ? { ...q, estado: 'pendiente', pagada: undefined, medio: undefined } : q)) };
}

/** Cuota de un mes que todavía no existe (por ejemplo, un cliente que se sumó después). */
export function sumarCuota(e: EstadoContador, clienteId: string, periodo: string, monto: number): EstadoContador {
  if (e.cuotas.some((q) => q.clienteId === clienteId && q.periodo === periodo)) return e;
  return { ...e, cuotas: [...e.cuotas, { id: `cu-${idCorto()}`, clienteId, periodo, monto, estado: 'pendiente' }] };
}

export function terminarTarea(e: EstadoContador, tareaId: string, fecha = new Date()): EstadoContador {
  return { ...e, tareas: e.tareas.map((t) => (t.id === tareaId ? { ...t, estado: 'terminada', terminada: fecha.toISOString() } : t)) };
}

export function reabrirTarea(e: EstadoContador, tareaId: string): EstadoContador {
  return { ...e, tareas: e.tareas.map((t) => (t.id === tareaId ? { ...t, estado: 'pendiente', terminada: undefined, avisada: undefined } : t)) };
}

export function marcarAvisada(e: EstadoContador, tareaId: string, fecha = new Date()): EstadoContador {
  return { ...e, tareas: e.tareas.map((t) => (t.id === tareaId ? { ...t, avisada: fecha.toISOString() } : t)) };
}

export function registrarAcceso(e: EstadoContador, clienteId: string, accion: string, fecha = new Date()): EstadoContador {
  return { ...e, accesos: [{ fecha: fecha.toISOString(), clienteId, accion }, ...e.accesos].slice(0, 200) };
}

interface Ctx {
  negocio: string;
  moneda: string;
}

function detalleDeuda(pendientes: Cuota[], moneda: string) {
  return pendientes.map((q) => `- ${nombreMes(q.periodo)}: ${dinero(q.monto, moneda)}`).join('\n');
}

/** Aviso al terminar la tarea del mes: qué se hizo, cuánto cuesta y qué queda pendiente. */
export function mensajeTarea(c: ClienteC, t: Tarea, e: EstadoContador, ctx: Ctx, ahora: number) {
  const cuenta = cuentaDe(e, c.id, ahora);
  const delMes = cuenta.cuotas.find((q) => q.periodo === t.periodo);
  const otras = cuenta.pendientes.filter((q) => q.periodo !== t.periodo);
  const lineas = [
    `Hola ${primerNombre(c)}, te escribimos de ${ctx.negocio}.`,
    `Ya terminamos tu ${t.nombre.toLowerCase()} de ${nombreMes(t.periodo)}.`,
    delMes ? (delMes.estado === 'pagada' ? `Los honorarios del mes (${dinero(delMes.monto, ctx.moneda)}) ya están pagos. ¡Gracias!` : `Honorarios del mes: ${dinero(delMes.monto, ctx.moneda)}, vencen el ${e.ajustes.diaVencimiento} de ${nombreMes(t.periodo, false)}.`) : '',
    otras.length ? `Además tenés pendiente:\n${detalleDeuda(otras, ctx.moneda)}` : '',
    cuenta.total ? `Total a pagar: ${dinero(cuenta.total, ctx.moneda)}. Podés transferir al alias ${e.ajustes.alias}.` : '',
    'Cualquier duda, respondé este mensaje.',
  ];
  return lineas.filter(Boolean).join('\n');
}

export function mensajeDeuda(c: ClienteC, e: EstadoContador, ctx: Ctx, ahora: number) {
  const cuenta = cuentaDe(e, c.id, ahora);
  return [
    `Hola ${primerNombre(c)}, te escribimos de ${ctx.negocio}.`,
    `Te recordamos que tenés honorarios pendientes:`,
    detalleDeuda(cuenta.pendientes, ctx.moneda),
    `Total: ${dinero(cuenta.total, ctx.moneda)}. Podés transferir al alias ${e.ajustes.alias} y avisarnos por acá.`,
    'Si ya pagaste, desestimá este mensaje. ¡Gracias!',
  ].join('\n');
}

export function mensajePago(c: ClienteC, q: Cuota, ctx: Ctx) {
  return `Hola ${primerNombre(c)}, confirmamos tu pago de ${dinero(q.monto, ctx.moneda)} por los honorarios de ${nombreMes(q.periodo)}. ¡Gracias! ${ctx.negocio}`;
}

export function resumen(e: EstadoContador, periodo: string, ahora: number) {
  const activos = e.clientes.filter((c) => c.activo);
  const delMes = e.cuotas.filter((q) => q.periodo === periodo);
  const facturado = delMes.reduce((t, q) => t + q.monto, 0);
  const cobrado = delMes.filter((q) => q.estado === 'pagada').reduce((t, q) => t + q.monto, 0);
  const vencidas = e.cuotas.filter((q) => vencida(q, e.ajustes.diaVencimiento, ahora));
  const deudores = new Set(vencidas.map((q) => q.clienteId));
  const tareas = e.tareas.filter((t) => t.periodo === periodo);
  const hechas = tareas.filter((t) => t.estado === 'terminada');
  return {
    activos: activos.length,
    facturado,
    cobrado,
    porCobrar: facturado - cobrado,
    deudaVencida: vencidas.reduce((t, q) => t + q.monto, 0),
    conDeuda: deudores.size,
    alDia: activos.filter((c) => !deudores.has(c.id)).length,
    informadas: e.cuotas.filter((q) => q.estado === 'pendiente' && q.informada).length,
    tareasTotal: tareas.length,
    tareasHechas: hechas.length,
    sinAvisar: hechas.filter((t) => !t.avisada).length,
  };
}

/** Ingresos de los últimos meses: lo cobrado en cada mes (por fecha de pago) y lo facturado (honorarios del mes). */
export function ingresos(e: EstadoContador, periodo: string, n = 6) {
  return Array.from({ length: n }, (_, i) => sumarMeses(periodo, i - n + 1)).map((p) => ({
    periodo: p,
    facturado: e.cuotas.filter((q) => q.periodo === p).reduce((t, q) => t + q.monto, 0),
    cobrado: e.cuotas.filter((q) => q.estado === 'pagada' && q.pagada && periodoDe(new Date(q.pagada)) === p).reduce((t, q) => t + q.monto, 0),
  }));
}

// ---------------- Importación masiva desde Excel o CSV

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const COLUMNAS: Record<string, string[]> = {
  completo: ['nombre y apellido', 'apellido y nombre', 'cliente', 'razon social', 'nombre completo'],
  nombre: ['nombre', 'nombres', 'name'],
  apellido: ['apellido', 'apellidos'],
  usuario: ['usuario', 'cuit', 'cuil', 'user', 'dni', 'usuario fiscal', 'cuit cuil'],
  clave: ['clave', 'clave fiscal', 'contrasena', 'password', 'pass'],
  whatsapp: ['whatsapp', 'telefono', 'celular', 'tel', 'movil', 'wsp', 'whats app'],
  honorario: ['honorario', 'honorarios', 'cuota', 'abono', 'monto', 'importe', 'honorario mensual'],
  categoria: ['categoria', 'condicion', 'regimen', 'tipo', 'condicion fiscal'],
  email: ['email', 'mail', 'correo', 'e mail'],
};

export type Campo = keyof typeof COLUMNAS;
export const NOMBRE_CAMPO: Record<Campo, string> = { completo: 'Nombre y apellido', nombre: 'Nombre', apellido: 'Apellido', usuario: 'Usuario', clave: 'Clave', whatsapp: 'WhatsApp', honorario: 'Honorario', categoria: 'Categoría', email: 'Mail' };

export interface FilaImportada {
  fila: number;
  nombre: string;
  apellido: string;
  usuario: string;
  clave?: string;
  whatsapp: string;
  honorario: number;
  categoria: Categoria;
  email?: string;
  /** Si ya existe un cliente con ese usuario, se actualiza en vez de duplicarlo. */
  existente?: string;
  avisos: string[];
}

export interface Lectura {
  columnas: Partial<Record<Campo, number>>;
  filas: FilaImportada[];
  descartadas: { fila: number; motivo: string }[];
}

function numero(s: string) {
  const t = s.replace(/[^\d.,-]/g, '');
  if (!t) return 0;
  // 25.000,50 → 25000.50 · 25,000.50 → 25000.50 · 25000 → 25000
  const coma = t.lastIndexOf(',');
  const punto = t.lastIndexOf('.');
  const dec = coma > punto ? ',' : '.';
  const limpio = dec === ',' ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  const n = Number(limpio);
  if (Number.isFinite(n) && dec === '.' && /^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function categoria(s: string): Categoria {
  const t = norm(s);
  if (/socied|srl|sa\b|sas\b/.test(t)) return 'sociedad';
  if (/emplead/.test(t)) return 'empleador';
  if (/responsable|inscript|\bri\b/.test(t)) return 'responsable';
  return 'monotributo';
}

export const claveUsuario = (u: string) => soloDigitos(u) || norm(u);

/** Lee la planilla: reconoce los títulos de la primera fila (con o sin tildes) y valida cada fila. */
export function leerPlanilla(filas: string[][], e: EstadoContador, honorarioPorDefecto: number): Lectura | { error: string } {
  const cab = filas.findIndex((f) => f.some((c) => Object.values(COLUMNAS).flat().includes(norm(c))));
  if (cab < 0 || cab > 5) return { error: 'No encontramos los títulos de las columnas. La primera fila tiene que decir, por ejemplo: Nombre, Apellido, Usuario, Clave, WhatsApp, Honorario.' };
  const columnas: Partial<Record<Campo, number>> = {};
  filas[cab].forEach((c, i) => {
    const t = norm(c);
    for (const [campo, nombres] of Object.entries(COLUMNAS) as [Campo, string[]][]) if (columnas[campo] === undefined && nombres.includes(t)) columnas[campo] = i;
  });
  if (columnas.nombre === undefined && columnas.completo === undefined) return { error: 'Falta la columna Nombre (o "Nombre y apellido").' };
  const porUsuario = new Map(e.clientes.map((c) => [claveUsuario(c.usuario), c.id]));
  const vistos = new Set<string>();
  const leidas: FilaImportada[] = [];
  const descartadas: Lectura['descartadas'] = [];
  const celda = (f: string[], campo: Campo) => (columnas[campo] === undefined ? '' : String(f[columnas[campo]!] ?? '').trim());
  filas.slice(cab + 1).forEach((f, k) => {
    const fila = cab + k + 2;
    if (!f.some((c) => String(c).trim())) return;
    let nombre = celda(f, 'nombre');
    let apellido = celda(f, 'apellido');
    if (!nombre && celda(f, 'completo')) {
      const partes = celda(f, 'completo').split(/\s+/);
      const soc = /\b(srl|sa|sas|sociedad)\b/i.test(celda(f, 'completo'));
      nombre = soc || partes.length === 1 ? partes.join(' ') : partes.slice(0, -1).join(' ');
      apellido = soc || partes.length === 1 ? '' : partes.at(-1)!;
    }
    if (!nombre) return descartadas.push({ fila, motivo: 'Sin nombre' });
    const usuario = celda(f, 'usuario');
    const avisos: string[] = [];
    if (!usuario) avisos.push('sin usuario');
    const id = usuario ? claveUsuario(usuario) : '';
    if (id && vistos.has(id)) return descartadas.push({ fila, motivo: `Usuario repetido en la planilla (${usuario})` });
    if (id) vistos.add(id);
    let wa = soloDigitos(celda(f, 'whatsapp'));
    if (wa && wa.length >= 8 && wa.length <= 10) wa = `549${wa.replace(/^0/, '')}`;
    if (wa.length < 8) {
      if (wa) avisos.push('WhatsApp incompleto');
      else avisos.push('sin WhatsApp');
      wa = '';
    }
    const h = numero(celda(f, 'honorario'));
    if (!h) avisos.push('sin honorario: se usa el de referencia');
    leidas.push({
      fila,
      nombre: nombre.slice(0, 80),
      apellido: apellido.slice(0, 60),
      usuario: usuario.slice(0, 40),
      clave: celda(f, 'clave').slice(0, 80) || undefined,
      whatsapp: wa,
      honorario: h || honorarioPorDefecto,
      categoria: categoria(celda(f, 'categoria') || (nombre.match(/\b(srl|sa|sas)\b/i) ? 'sociedad' : '')),
      email: celda(f, 'email').slice(0, 120) || undefined,
      existente: id ? porUsuario.get(id) : undefined,
      avisos,
    });
  });
  return { columnas, filas: leidas, descartadas };
}

/** Suma los clientes nuevos al final de la cartera y actualiza los existentes sin tocar su orden ni su historial. */
export function aplicarImportacion(e: EstadoContador, filas: FilaImportada[], periodo: string, fecha = new Date()): EstadoContador {
  let orden = e.clientes.reduce((m, c) => Math.max(m, c.orden), 0);
  const porId = new Map(filas.filter((f) => f.existente).map((f) => [f.existente!, f]));
  const clientes = e.clientes.map((c) => {
    const f = porId.get(c.id);
    if (!f) return c;
    return { ...c, nombre: f.nombre, apellido: f.apellido, clave: f.clave ?? c.clave, whatsapp: f.whatsapp || c.whatsapp, honorario: f.honorario, categoria: f.categoria, email: f.email ?? c.email, activo: true };
  });
  const nuevos: ClienteC[] = filas
    .filter((f) => !f.existente)
    .map((f) => ({ id: `cc-${idCorto()}`, orden: ++orden, nombre: f.nombre, apellido: f.apellido, usuario: f.usuario, clave: f.clave, whatsapp: f.whatsapp, email: f.email, categoria: f.categoria, honorario: f.honorario, activo: true, alta: fecha.toISOString(), importado: true }));
  return asegurarPeriodo({ ...e, clientes: [...clientes, ...nuevos] }, periodo);
}

/** Cuota del mes de un cliente ya cargado que cambia de honorario: también se actualiza si sigue sin pagar. */
export function cambiarHonorario(e: EstadoContador, clienteId: string, monto: number, periodo: string): EstadoContador {
  return {
    ...e,
    clientes: e.clientes.map((c) => (c.id === clienteId ? { ...c, honorario: monto } : c)),
    cuotas: e.cuotas.map((q) => (q.clienteId === clienteId && q.periodo === periodo && q.estado === 'pendiente' ? { ...q, monto } : q)),
  };
}

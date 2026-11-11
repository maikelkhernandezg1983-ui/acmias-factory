import { formatoPrecio, idCorto, soloDigitos } from '@/lib/utiles';
import { nombreMes, periodoDe, sumarMeses, vencimiento } from '@/lib/rubros/contador/periodos';
import type { Alumno, Autorizacion, Comunicado, CuotaFamilia, Curso, Destino, EstadoColegio, Familia, Nivel, Preinscripcion, Presencia } from './tipos';

export const dinero = (v: number, moneda: string) => formatoPrecio(v, moneda);
export const NOMBRE_NIVEL: Record<Nivel, string> = { inicial: 'Nivel inicial', primaria: 'Primaria', secundaria: 'Secundaria' };
export const NOMBRE_PRESENCIA: Record<Presencia, string> = { presente: 'Presente', ausente: 'Ausente', tarde: 'Tarde' };
export const NOMBRE_PREINSCRIPCION: Record<Preinscripcion['estado'], string> = { nueva: 'Nueva', entrevista: 'Entrevista', aceptada: 'Aceptada', espera: 'Lista de espera', rechazada: 'Sin vacante' };

export const nombreAlumno = (a: Pick<Alumno, 'nombre' | 'apellido'>) => `${a.nombre} ${a.apellido}`;
export const primerNombre = (s: string) => s.split(' ')[0];

export function diaLocal(d: Date | number) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function diaLargo(dia: string) {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Días hábiles (lunes a viernes) hacia atrás desde `desde`, incluido. */
export function diasHabiles(desde: Date, n: number) {
  const xs: string[] = [];
  const d = new Date(desde);
  while (xs.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) xs.push(diaLocal(d));
    d.setDate(d.getDate() - 1);
  }
  return xs;
}

export const hijosDe = (e: EstadoColegio, familiaId: string) => e.alumnos.filter((a) => a.familiaId === familiaId && a.activo);
export const cursoDe = (e: EstadoColegio, id: string) => e.cursos.find((c) => c.id === id);

/** Cuota de cada hijo: base del nivel, descuento por hermano desde el segundo y beca. */
export function detalleCuota(e: EstadoColegio, familiaId: string) {
  const hijos = hijosDe(e, familiaId).sort((a, b) => (cursoDe(e, b.cursoId)?.orden ?? 0) - (cursoDe(e, a.cursoId)?.orden ?? 0));
  return hijos.map((a, i) => {
    const nivel = cursoDe(e, a.cursoId)?.nivel ?? 'primaria';
    const base = nivel === 'inicial' ? e.ajustes.cuotaInicial : nivel === 'secundaria' ? e.ajustes.cuotaSecundaria : e.ajustes.cuotaPrimaria;
    const conHermano = i > 0 ? base * (1 - e.ajustes.descuentoHermano / 100) : base;
    const monto = Math.round((conHermano * (1 - a.beca / 100)) / 100) * 100;
    const notas = [i > 0 && e.ajustes.descuentoHermano ? `${e.ajustes.descuentoHermano} % hermano` : '', a.beca ? `beca ${a.beca} %` : ''].filter(Boolean).join(' · ');
    return { alumnoId: a.id, monto, nota: notas || undefined };
  });
}

export function enCiclo(e: EstadoColegio, periodo: string) {
  const m = Number(periodo.slice(5, 7));
  return m >= e.ajustes.mesInicio && m <= e.ajustes.mesFin;
}

/** Crea la cuota del mes para cada familia con hijos activos (solo meses del ciclo lectivo). */
export function asegurarPeriodo(e: EstadoColegio, periodo: string): EstadoColegio {
  if (!enCiclo(e, periodo)) return e;
  const con = new Set(e.cuotas.filter((q) => q.periodo === periodo).map((q) => q.familiaId));
  const nuevas: CuotaFamilia[] = [];
  for (const f of e.familias) {
    if (con.has(f.id)) continue;
    const detalle = detalleCuota(e, f.id);
    if (!detalle.length) continue;
    nuevas.push({ id: `cq-${idCorto()}`, familiaId: f.id, periodo, monto: detalle.reduce((t, d) => t + d.monto, 0), detalle, estado: 'pendiente' });
  }
  return nuevas.length ? { ...e, cuotas: [...e.cuotas, ...nuevas] } : e;
}

export type EstadoPago = 'al-dia' | 'por-vencer' | 'debe';
export const NOMBRE_ESTADO_PAGO: Record<EstadoPago, string> = { 'al-dia': 'Al día', 'por-vencer': 'Cuota del mes por pagar', debe: 'Con deuda' };

export function cuentaFamilia(e: EstadoColegio, familiaId: string, ahora: number) {
  const cuotas = e.cuotas.filter((q) => q.familiaId === familiaId).sort((a, b) => a.periodo.localeCompare(b.periodo));
  const pendientes = cuotas.filter((q) => q.estado === 'pendiente');
  const vencidas = pendientes.filter((q) => +vencimiento(q.periodo, e.ajustes.diaVencimiento) < ahora);
  const deuda = vencidas.reduce((t, q) => t + q.monto, 0);
  const total = pendientes.reduce((t, q) => t + q.monto, 0);
  const estado: EstadoPago = vencidas.length ? 'debe' : pendientes.length ? 'por-vencer' : 'al-dia';
  return { cuotas, pendientes, vencidas, deuda, total, estado, informada: pendientes.some((q) => q.informada) };
}

export function confirmarPago(e: EstadoColegio, id: string, fecha = new Date()): EstadoColegio {
  return { ...e, cuotas: e.cuotas.map((q) => (q.id === id ? { ...q, estado: 'pagada', pagada: fecha.toISOString(), medio: 'transferencia', informada: undefined } : q)) };
}

export function anularPago(e: EstadoColegio, id: string): EstadoColegio {
  return { ...e, cuotas: e.cuotas.map((q) => (q.id === id ? { ...q, estado: 'pendiente', pagada: undefined, medio: undefined } : q)) };
}

// ---------------- Comunicados

export function destinatarios(e: EstadoColegio, d: Destino): Familia[] {
  if (d.tipo === 'familia') return e.familias.filter((f) => f.id === d.id);
  const ids = new Set(e.alumnos.filter((a) => a.activo && (d.tipo === 'todos' || a.cursoId === d.id)).map((a) => a.familiaId));
  return e.familias.filter((f) => ids.has(f.id));
}

export function nombreDestino(e: EstadoColegio, d: Destino) {
  if (d.tipo === 'todos') return 'Todo el colegio';
  if (d.tipo === 'curso') return cursoDe(e, d.id)?.nombre ?? 'Curso';
  return e.familias.find((f) => f.id === d.id)?.responsable ?? 'Familia';
}

export function lectura(e: EstadoColegio, c: Comunicado) {
  const fams = destinatarios(e, c.destino);
  const leyeron = fams.filter((f) => c.leidos[f.id]);
  return { total: fams.length, leidos: leyeron.length, pendientes: fams.filter((f) => !c.leidos[f.id]), pct: fams.length ? Math.round((leyeron.length / fams.length) * 100) : 0 };
}

export function nuevoComunicado(e: EstadoColegio, datos: { titulo: string; texto: string; destino: Destino }, fecha = new Date()): EstadoColegio | { error: string } {
  if (datos.titulo.trim().length < 3) return { error: 'Escribí un título.' };
  if (datos.texto.trim().length < 10) return { error: 'Escribí el texto del comunicado.' };
  const c: Comunicado = { id: `co-${idCorto()}`, fecha: fecha.toISOString(), titulo: datos.titulo.trim().slice(0, 100), texto: datos.texto.trim().slice(0, 2000), destino: datos.destino, leidos: {} };
  return { ...e, comunicados: [c, ...e.comunicados] };
}

export function marcarLeido(e: EstadoColegio, comunicadoId: string, familiaId: string, fecha = new Date()): EstadoColegio {
  return { ...e, comunicados: e.comunicados.map((c) => (c.id === comunicadoId && !c.leidos[familiaId] ? { ...c, leidos: { ...c.leidos, [familiaId]: fecha.toISOString() } } : c)) };
}

export const comunicadosDe = (e: EstadoColegio, familiaId: string) => e.comunicados.filter((c) => destinatarios(e, c.destino).some((f) => f.id === familiaId));

// ---------------- Autorizaciones

export const alumnosDeAutorizacion = (e: EstadoColegio, a: Autorizacion) => e.alumnos.filter((x) => x.activo && a.cursoIds.includes(x.cursoId));

export function respuestas(e: EstadoColegio, a: Autorizacion) {
  const al = alumnosDeAutorizacion(e, a);
  const si = al.filter((x) => a.respuestas[x.id]?.valor === 'si');
  const no = al.filter((x) => a.respuestas[x.id]?.valor === 'no');
  const sin = al.filter((x) => !a.respuestas[x.id]);
  return { total: al.length, si, no, sin };
}

export function nuevaAutorizacion(e: EstadoColegio, datos: { titulo: string; detalle: string; dia: string; cursoIds: string[] }, fecha = new Date()): EstadoColegio | { error: string } {
  if (datos.titulo.trim().length < 3) return { error: 'Escribí un título.' };
  if (!datos.cursoIds.length) return { error: 'Elegí al menos un curso.' };
  if (!datos.dia) return { error: 'Elegí el día.' };
  const a: Autorizacion = { id: `au-${idCorto()}`, fecha: fecha.toISOString(), titulo: datos.titulo.trim().slice(0, 100), detalle: datos.detalle.trim().slice(0, 1000), dia: datos.dia, cursoIds: datos.cursoIds, respuestas: {} };
  return { ...e, autorizaciones: [a, ...e.autorizaciones] };
}

export function responder(e: EstadoColegio, autorizacionId: string, alumnoId: string, valor: 'si' | 'no', fecha = new Date()): EstadoColegio {
  return { ...e, autorizaciones: e.autorizaciones.map((a) => (a.id === autorizacionId ? { ...a, respuestas: { ...a.respuestas, [alumnoId]: { valor, fecha: fecha.toISOString() } } } : a)) };
}

// ---------------- Asistencia

export function guardarLista(e: EstadoColegio, dia: string, lista: Record<string, Presencia>): EstadoColegio {
  return { ...e, asistencia: { ...e.asistencia, [dia]: { ...(e.asistencia[dia] ?? {}), ...lista } } };
}

export function faltasDe(e: EstadoColegio, alumnoId: string) {
  return Object.entries(e.asistencia)
    .filter(([, l]) => l[alumnoId] === 'ausente')
    .map(([dia]) => ({ dia, justificada: e.justificaciones.find((j) => j.alumnoId === alumnoId && j.dia === dia) }))
    .sort((a, b) => b.dia.localeCompare(a.dia));
}

export function justificar(e: EstadoColegio, alumnoId: string, dia: string, motivo: string, fecha = new Date()): EstadoColegio | { error: string } {
  if (motivo.trim().length < 3) return { error: 'Contanos el motivo.' };
  if (e.justificaciones.some((j) => j.alumnoId === alumnoId && j.dia === dia)) return { error: 'Esa falta ya está justificada.' };
  return { ...e, justificaciones: [...e.justificaciones, { id: `ju-${idCorto()}`, alumnoId, dia, motivo: motivo.trim().slice(0, 200), fecha: fecha.toISOString() }] };
}

export function asistenciaDelDia(e: EstadoColegio, dia: string) {
  const lista = e.asistencia[dia] ?? {};
  const activos = e.alumnos.filter((a) => a.activo);
  const tomados = activos.filter((a) => lista[a.id]);
  const presentes = tomados.filter((a) => lista[a.id] !== 'ausente').length;
  const cursosTomados = e.cursos.filter((c) => activos.some((a) => a.cursoId === c.id && lista[a.id])).length;
  return { tomados: tomados.length, presentes, pct: tomados.length ? Math.round((presentes / tomados.length) * 100) : 0, cursosTomados };
}

// ---------------- Inscripciones

export function vacantes(e: EstadoColegio, cursoId: string) {
  const c = cursoDe(e, cursoId);
  if (!c) return 0;
  // Para el próximo ciclo, los alumnos del curso anterior pasan a este.
  const anterior = e.cursos.find((x) => x.orden === c.orden - 1);
  const pasan = anterior ? e.alumnos.filter((a) => a.activo && a.cursoId === anterior.id).length : 0;
  const aceptadas = e.preinscripciones.filter((p) => p.cursoId === cursoId && p.estado === 'aceptada').length;
  return Math.max(0, c.cupo - pasan - aceptadas);
}

export function preinscribir(e: EstadoColegio, datos: { alumno: string; cursoId: string; responsable: string; whatsapp: string; hermanoEnElColegio: boolean; comentario?: string }, fecha = new Date()): EstadoColegio | { error: string } {
  if (datos.alumno.trim().length < 3) return { error: 'Escribí el nombre del alumno.' };
  if (datos.responsable.trim().length < 3) return { error: 'Escribí el nombre del adulto responsable.' };
  const wa = soloDigitos(datos.whatsapp);
  if (wa.length < 8) return { error: 'Revisá el WhatsApp: incluí código de área.' };
  const p: Preinscripcion = { id: `pi-${idCorto()}`, fecha: fecha.toISOString(), alumno: datos.alumno.trim().slice(0, 80), cursoId: datos.cursoId, responsable: datos.responsable.trim().slice(0, 80), whatsapp: wa.length <= 10 ? `549${wa.replace(/^0/, '')}` : wa, hermanoEnElColegio: datos.hermanoEnElColegio, comentario: datos.comentario?.trim().slice(0, 300) || undefined, estado: 'nueva' };
  return { ...e, preinscripciones: [p, ...e.preinscripciones] };
}

// ---------------- Mensajes

interface Ctx {
  negocio: string;
  moneda: string;
  enlace: string;
}

export function mensajeComunicado(f: Familia, c: Comunicado, ctx: Ctx) {
  return `Hola ${primerNombre(f.responsable)}, ${ctx.negocio} te envió un comunicado: "${c.titulo}". Leelo y confirmá la lectura acá: ${ctx.enlace}`;
}

export function mensajeAutorizacion(f: Familia, a: Autorizacion, hijo: Alumno, ctx: Ctx) {
  return `Hola ${primerNombre(f.responsable)}, falta tu respuesta para "${a.titulo}" (${diaLargo(a.dia)}) de ${hijo.nombre}. Respondé con un toque acá: ${ctx.enlace}`;
}

export function mensajeAusencia(f: Familia, hijo: Alumno, dia: string, ctx: Ctx) {
  return `Hola ${primerNombre(f.responsable)}, te avisamos de ${ctx.negocio} que ${hijo.nombre} no vino hoy (${diaLargo(dia)}). Si querés, justificá la falta acá: ${ctx.enlace}`;
}

export function mensajeDeuda(f: Familia, e: EstadoColegio, ctx: Ctx, ahora: number) {
  const c = cuentaFamilia(e, f.id, ahora);
  return [
    `Hola ${primerNombre(f.responsable)}, te escribimos de ${ctx.negocio}.`,
    'Te recordamos las cuotas pendientes:',
    ...c.pendientes.map((q) => `- ${nombreMes(q.periodo)}: ${dinero(q.monto, ctx.moneda)}`),
    `Total: ${dinero(c.total, ctx.moneda)}. Podés transferir al alias ${e.ajustes.alias} y avisar desde el portal de familias: ${ctx.enlace}`,
    'Si ya pagaste, desestimá este mensaje. ¡Gracias!',
  ].join('\n');
}

export function mensajePreinscripcion(p: Preinscripcion, curso: Curso | undefined, ctx: Pick<Ctx, 'negocio'>) {
  const txt: Record<Preinscripcion['estado'], string> = {
    nueva: `recibimos la preinscripción de ${p.alumno} para ${curso?.nombre ?? 'el próximo ciclo'}. Te escribimos para coordinar una entrevista.`,
    entrevista: `queremos coordinar la entrevista por la preinscripción de ${p.alumno} para ${curso?.nombre ?? 'el próximo ciclo'}. ¿Qué día te queda bien?`,
    aceptada: `¡${p.alumno} tiene vacante en ${curso?.nombre ?? 'el próximo ciclo'}! Te pasamos los pasos para completar la inscripción.`,
    espera: `por ahora no hay vacante para ${p.alumno} en ${curso?.nombre ?? 'el curso pedido'}. Quedó en lista de espera y te avisamos si se libera un lugar.`,
    rechazada: `lamentablemente no tenemos vacante para ${p.alumno} en ${curso?.nombre ?? 'el curso pedido'} para el próximo ciclo.`,
  };
  return `Hola ${primerNombre(p.responsable)}, te escribimos de ${ctx.negocio}: ${txt[p.estado]}`;
}

// ---------------- Tablero

export function resumen(e: EstadoColegio, periodo: string, ahora: number) {
  const delMes = e.cuotas.filter((q) => q.periodo === periodo);
  const facturado = delMes.reduce((t, q) => t + q.monto, 0);
  const cobrado = delMes.filter((q) => q.estado === 'pagada').reduce((t, q) => t + q.monto, 0);
  const cuentas = e.familias.map((f) => cuentaFamilia(e, f.id, ahora)).filter((c) => c.cuotas.length);
  const hoy = asistenciaDelDia(e, diaLocal(ahora));
  const lecturas = e.comunicados.slice(0, 5).map((c) => lectura(e, c).pct);
  const autorizacionesAbiertas = e.autorizaciones.filter((a) => a.dia >= diaLocal(ahora));
  return {
    alumnos: e.alumnos.filter((a) => a.activo).length,
    familias: cuentas.length,
    facturado,
    cobrado,
    porCobrar: facturado - cobrado,
    deuda: cuentas.reduce((t, c) => t + c.deuda, 0),
    conDeuda: cuentas.filter((c) => c.estado === 'debe').length,
    alDia: cuentas.filter((c) => c.estado !== 'debe').length,
    informadas: e.cuotas.filter((q) => q.estado === 'pendiente' && q.informada).length,
    asistenciaHoy: hoy,
    lecturaPromedio: lecturas.length ? Math.round(lecturas.reduce((t, x) => t + x, 0) / lecturas.length) : 0,
    autorizacionesSinResponder: autorizacionesAbiertas.reduce((t, a) => t + respuestas(e, a).sin.length, 0),
    preinscripcionesNuevas: e.preinscripciones.filter((p) => p.estado === 'nueva').length,
  };
}

export function ingresos(e: EstadoColegio, periodo: string, n = 6) {
  return Array.from({ length: n }, (_, i) => sumarMeses(periodo, i - n + 1)).map((p) => ({
    periodo: p,
    facturado: e.cuotas.filter((q) => q.periodo === p).reduce((t, q) => t + q.monto, 0),
    cobrado: e.cuotas.filter((q) => q.estado === 'pagada' && q.pagada && periodoDe(new Date(q.pagada)) === p).reduce((t, q) => t + q.monto, 0),
  }));
}

// ---------------- Importación de alumnos desde Excel o CSV

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const COLUMNAS = {
  nombre: ['nombre', 'nombres', 'alumno', 'alumna', 'estudiante', 'nombre del alumno'],
  apellido: ['apellido', 'apellidos'],
  curso: ['curso', 'grado', 'sala', 'ano', 'division', 'grado o sala'],
  responsable: ['responsable', 'madre', 'padre', 'tutor', 'adulto responsable', 'familia', 'madre padre o tutor'],
  whatsapp: ['whatsapp', 'telefono', 'celular', 'tel', 'movil', 'telefono del responsable'],
  beca: ['beca', 'descuento', 'beca %'],
} as const;

export type CampoAl = keyof typeof COLUMNAS;
export const NOMBRE_CAMPO_AL: Record<CampoAl, string> = { nombre: 'Alumno', apellido: 'Apellido', curso: 'Curso', responsable: 'Responsable', whatsapp: 'WhatsApp', beca: 'Beca' };

/** "1ro", "Primer grado", "1° A", "Sala de 5" → curso de la demo. */
export function cursoPorTexto(e: EstadoColegio, texto: string) {
  const t = norm(texto);
  const ORD: Record<string, number> = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, quinto: 5, sexto: 6 };
  const n = Number(t.match(/\d+/)?.[0] ?? Object.entries(ORD).find(([k]) => t.split(' ').includes(k))?.[1] ?? NaN);
  if (!n) return undefined;
  if (/sala|jardin|inicial/.test(t)) return e.cursos.find((c) => c.nivel === 'inicial' && c.nombre.includes(String(n)));
  return e.cursos.find((c) => c.nivel === 'primaria' && c.nombre.startsWith(`${n}.`));
}

export interface FilaAlumno {
  fila: number;
  nombre: string;
  apellido: string;
  cursoId: string;
  responsable: string;
  whatsapp: string;
  beca: number;
  existente?: string;
  avisos: string[];
}

export function leerPlanillaAlumnos(filas: string[][], e: EstadoColegio): { columnas: Partial<Record<CampoAl, number>>; filas: FilaAlumno[]; descartadas: { fila: number; motivo: string }[] } | { error: string } {
  const todos = Object.values(COLUMNAS).flat() as string[];
  const cab = filas.findIndex((f) => f.filter((c) => todos.includes(norm(c))).length >= 2);
  if (cab < 0 || cab > 5) return { error: 'No encontramos los títulos de las columnas. La primera fila tiene que decir, por ejemplo: Alumno, Apellido, Curso, Responsable, WhatsApp.' };
  const columnas: Partial<Record<CampoAl, number>> = {};
  filas[cab].forEach((c, i) => {
    const t = norm(c);
    for (const [k, v] of Object.entries(COLUMNAS) as [CampoAl, readonly string[]][]) if (columnas[k] === undefined && v.includes(t)) columnas[k] = i;
  });
  if (columnas.nombre === undefined || columnas.curso === undefined) return { error: 'Faltan columnas obligatorias: Alumno y Curso.' };
  const celda = (f: string[], k: CampoAl) => (columnas[k] === undefined ? '' : String(f[columnas[k]!] ?? '').trim());
  const existentes = new Map(e.alumnos.map((a) => [norm(`${a.nombre} ${a.apellido} ${a.cursoId}`), a.id]));
  const vistos = new Set<string>();
  const out: FilaAlumno[] = [];
  const descartadas: { fila: number; motivo: string }[] = [];
  filas.slice(cab + 1).forEach((f, k) => {
    const fila = cab + k + 2;
    if (!f.some((c) => String(c).trim())) return;
    let nombre = celda(f, 'nombre');
    let apellido = celda(f, 'apellido');
    if (!apellido && nombre.includes(' ')) { const p = nombre.split(/\s+/); apellido = p.pop()!; nombre = p.join(' '); }
    if (!nombre) return descartadas.push({ fila, motivo: 'Sin nombre' });
    const curso = cursoPorTexto(e, celda(f, 'curso'));
    if (!curso) return descartadas.push({ fila, motivo: `Curso no reconocido (${celda(f, 'curso') || 'vacío'})` });
    const clave = norm(`${nombre} ${apellido} ${curso.id}`);
    if (vistos.has(clave)) return descartadas.push({ fila, motivo: 'Alumno repetido en la planilla' });
    vistos.add(clave);
    let wa = soloDigitos(celda(f, 'whatsapp'));
    if (wa.length >= 8 && wa.length <= 10) wa = `549${wa.replace(/^0/, '')}`;
    const avisos: string[] = [];
    if (wa.length < 8) { avisos.push('sin WhatsApp'); wa = ''; }
    const responsable = celda(f, 'responsable').slice(0, 80);
    if (!responsable) avisos.push('sin responsable');
    const beca = Math.min(100, Math.max(0, Number(celda(f, 'beca').replace(/[^\d]/g, '')) || 0));
    out.push({ fila, nombre: nombre.slice(0, 60), apellido: apellido.slice(0, 60), cursoId: curso.id, responsable, whatsapp: wa, beca, existente: existentes.get(clave), avisos });
  });
  return { columnas, filas: out, descartadas };
}

/** Agrupa hermanos por WhatsApp del responsable y crea las familias que falten. */
export function aplicarAlumnos(e: EstadoColegio, filas: FilaAlumno[], periodo: string): EstadoColegio {
  const familias = [...e.familias];
  const porWa = new Map(familias.map((f) => [f.whatsapp, f.id]));
  const alumnos = e.alumnos.map((a) => {
    const f = filas.find((x) => x.existente === a.id);
    return f ? { ...a, beca: f.beca, activo: true } : a;
  });
  for (const f of filas.filter((x) => !x.existente)) {
    let familiaId = f.whatsapp ? porWa.get(f.whatsapp) : undefined;
    if (!familiaId) {
      familiaId = `fam-${idCorto()}`;
      familias.push({ id: familiaId, responsable: f.responsable || `Familia ${f.apellido}`, whatsapp: f.whatsapp, codigo: `F${Math.floor(1000 + Math.random() * 9000)}` });
      if (f.whatsapp) porWa.set(f.whatsapp, familiaId);
    }
    alumnos.push({ id: `al-${idCorto()}`, nombre: f.nombre, apellido: f.apellido, cursoId: f.cursoId, familiaId, beca: f.beca, activo: true });
  }
  return asegurarPeriodo({ ...e, familias, alumnos }, periodo);
}

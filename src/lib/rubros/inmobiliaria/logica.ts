import { soloDigitos } from '@/lib/utiles';
import { DIA_MS, hora, huecos, libre, nombreDia } from '@/lib/rubros/barberia/agenda';
import type { EstadoAgenda, Servicio } from '@/lib/rubros/barberia/tipos';
import { DURACION_VISITA } from './datos-ejemplo';
import type { Captacion, Consulta, EstadoInmo, Operacion, Propiedad, TipoPropiedad, Visita } from './tipos';

const LOCALE: Record<string, string> = { ARS: 'es-AR', MXN: 'es-MX', COP: 'es-CO', CLP: 'es-CL', PEN: 'es-PE', UYU: 'es-UY', EUR: 'es-ES', USD: 'es-419' };

export function dinero(valor: number, moneda: string) {
  try {
    // Los dólares se escriben "USD 120.000", con el separador de miles de la región.
    if (moneda === 'USD') return `USD ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor)}`;
    return new Intl.NumberFormat(LOCALE[moneda] ?? 'es-419', { style: 'currency', currency: moneda, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(valor);
  } catch {
    return `${moneda} ${Math.round(valor)}`;
  }
}

export const monedaDe = (p: Propiedad, local: string) => (p.moneda === 'USD' ? 'USD' : local);
export const precioProp = (p: Propiedad, local: string) => dinero(p.precio, monedaDe(p, local));
export const sufijo = (p: Propiedad) => (p.operacion === 'alquiler' ? '/ mes' : p.operacion === 'temporario' ? '/ noche' : '');

export const NOMBRE_OPERACION: Record<Operacion, string> = { venta: 'Venta', alquiler: 'Alquiler', temporario: 'Temporario' };
export const NOMBRE_TIPO: Record<TipoPropiedad, string> = { departamento: 'Departamento', casa: 'Casa', ph: 'PH', local: 'Local', oficina: 'Oficina', terreno: 'Terreno', galpon: 'Galpón', cochera: 'Cochera' };
export const NOMBRE_CONSULTA: Record<Consulta['tipo'], string> = { consulta: 'Consulta', visita: 'Visita', requisitos: 'Requisitos' };
export const NOMBRE_ESTADO_CONSULTA: Record<Consulta['estado'], string> = { nueva: 'Nueva', contactada: 'Contactada', cerrada: 'Cerrada', perdida: 'Perdida' };
export const NOMBRE_CAPTACION: Record<Captacion['estado'], string> = { nueva: 'Nueva', tasacion: 'Tasación agendada', captada: 'Captada', descartada: 'Descartada' };

export const diasPublicada = (p: Propiedad, ahora = Date.now()) => Math.max(0, Math.floor((ahora - +new Date(p.ingreso)) / DIA_MS));
export const nuevoId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function resumen(p: Propiedad) {
  const partes: string[] = [];
  if (p.tipo === 'terreno') partes.push(`${p.m2Totales.toLocaleString('es')} m²`);
  else partes.push(`${p.m2Cubiertos.toLocaleString('es')} m² cub.`);
  if (p.ambientes) partes.push(`${p.ambientes} amb.`);
  if (p.dormitorios) partes.push(`${p.dormitorios} dorm.`);
  if (p.cocheras && p.tipo !== 'cochera') partes.push('cochera');
  return partes.join(' · ');
}

const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Cómo busca la gente → qué miramos. */
const SINONIMOS: Record<string, string[]> = {
  depto: ['departamento'],
  dpto: ['departamento'],
  monoambiente: ['monoambiente', '1amb'],
  mono: ['monoambiente'],
  jardin: ['jardin', 'casa'],
  patio: ['patio', 'ph', 'casa', 'jardin'],
  terraza: ['terraza', 'ph'],
  pileta: ['pileta'],
  piscina: ['pileta'],
  mascota: ['mascotas'],
  mascotas: ['mascotas'],
  perro: ['mascotas'],
  gato: ['mascotas'],
  credito: ['credito'],
  lote: ['terreno'],
  deposito: ['galpon', 'deposito'],
  garage: ['cochera'],
  garaje: ['cochera'],
  estrenar: ['a estrenar'],
  nuevo: ['a estrenar'],
};

/** Palabras que no filtran nada ("acepta mascotas" busca "mascotas"). */
const VACIAS = new Set(['acepta', 'aceptan', 'con', 'de', 'del', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'que', 'y', 'busco', 'quiero', 'cerca', 'por', 'sin', 'zona', 'alquiler', 'alquilar', 'venta', 'comprar']);

function texto(p: Propiedad) {
  return normalizar(
    `${p.titulo} ${NOMBRE_TIPO[p.tipo]} ${p.zona} ${p.codigo} ${p.amenities.join(' ')} ${p.ambientes}amb ${p.mascotas ? 'mascotas' : ''} ${p.aptoCredito ? 'credito' : ''} ${p.antiguedad === 0 ? 'a estrenar' : ''} ${p.cocheras ? 'cochera' : ''} ${NOMBRE_OPERACION[p.operacion]}`,
  );
}

export interface Filtros {
  q: string;
  operacion: Operacion;
  tipo: TipoPropiedad | null;
  ambientes: number | null; // mínimo
  zona: string | null;
}

export function filtrar(props: Propiedad[], f: Filtros) {
  const palabras = normalizar(f.q)
    .replace(/(\d+) ?(ambientes|ambiente|amb)\b/g, '$1amb')
    .split(' ')
    .filter((x) => (x.length > 1 || /\d/.test(x)) && !VACIAS.has(x));
  // Si escriben un código (P-1014), se busca en todas las operaciones.
  const porCodigo = /^p-?\d{3,}$/.test(normalizar(f.q).replace(/\s/g, ''));
  const codigo = normalizar(f.q).replace(/[^0-9]/g, '');
  if (porCodigo) return props.filter((p) => p.estado !== 'cerrada' && p.codigo.replace(/\D/g, '').startsWith(codigo));
  return props
    .filter((p) => p.estado !== 'cerrada' && p.operacion === f.operacion)
    .filter((p) => (!f.tipo || p.tipo === f.tipo) && (!f.ambientes || p.ambientes >= f.ambientes) && (!f.zona || p.zona === f.zona))
    .filter((p) => {
      if (!palabras.length) return true;
      const t = texto(p);
      return palabras.every((w) => [w, ...(SINONIMOS[w] ?? [])].some((a) => t.includes(a)));
    })
    .sort((a, b) => Number(!!b.destacada) - Number(!!a.destacada) || Number(a.estado !== 'disponible') - Number(b.estado !== 'disponible') || +new Date(b.ingreso) - +new Date(a.ingreso));
}

/** Costo de entrada estimado para alquilar: primer mes + depósito + honorarios (según ajustes). */
export function costoIngreso(e: EstadoInmo, p: Propiedad) {
  const mes = p.precio + (p.expensas ?? 0);
  const deposito = p.precio * e.ajustes.mesesDeposito;
  const honorarios = p.precio * e.ajustes.honorariosMeses;
  return { mes, deposito, honorarios, total: mes + deposito + honorarios };
}

// ---------- Visitas (motor de agenda: cada propiedad es un "profesional") ----------

const SERVICIO_VISITA: Servicio = { id: 'visita', nombre: 'Visita', descripcion: '', duracion: DURACION_VISITA, precio: 0 };

export function comoAgenda(e: EstadoInmo): EstadoAgenda {
  return {
    version: 1,
    rubro: 'barberia',
    servicios: [SERVICIO_VISITA],
    profesionales: e.propiedades.filter((p) => p.estado === 'disponible').map((p) => ({ id: p.id, nombre: p.titulo, especialidad: '', servicios: ['visita'] })),
    turnos: e.visitas,
    clientes: [],
    bloqueos: [],
    espera: [],
    horario: e.horario,
    metaSellos: 0,
    beneficio: '',
    semilla: '',
  };
}

export const horariosVisita = (e: EstadoInmo, propiedadId: string, dia: Date, ahora = Date.now()) => huecos(comoAgenda(e), SERVICIO_VISITA, propiedadId, dia, ahora);

export function registrarConsulta(e: EstadoInmo, c: Omit<Consulta, 'id' | 'fecha' | 'estado'>): { estado: EstadoInmo; consulta: Consulta } {
  const consulta: Consulta = { ...c, whatsapp: soloDigitos(c.whatsapp), id: nuevoId('c'), fecha: new Date().toISOString(), estado: 'nueva' };
  return { estado: { ...e, consultas: [consulta, ...e.consultas] }, consulta };
}

export function agendarVisita(e: EstadoInmo, propiedadId: string, inicio: number, datos: { nombre: string; whatsapp: string; mensaje?: string }): { error: string } | { estado: EstadoInmo; visita: Visita; consulta: Consulta } {
  const p = e.propiedades.find((x) => x.id === propiedadId);
  if (!p || p.estado !== 'disponible') return { error: 'Esta propiedad ya no está disponible para visitas.' };
  const fin = inicio + DURACION_VISITA * 60_000;
  if (!libre(comoAgenda(e), propiedadId, inicio, fin)) return { error: 'Ese horario se acaba de ocupar. Elegí otro.' };
  const r = registrarConsulta(e, { nombre: datos.nombre.trim(), whatsapp: datos.whatsapp, propiedadId, tipo: 'visita', mensaje: datos.mensaje });
  const visita: Visita = {
    id: nuevoId('v'),
    token: Math.random().toString(36).slice(2, 12),
    clienteId: r.consulta.id,
    profId: propiedadId,
    servicioId: 'visita',
    inicio: new Date(inicio).toISOString(),
    fin: new Date(fin).toISOString(),
    estado: 'reservado',
    origen: 'online',
    creado: new Date().toISOString(),
  };
  const consulta = { ...r.consulta, visitaId: visita.id };
  return { estado: { ...r.estado, consultas: r.estado.consultas.map((x) => (x.id === consulta.id ? consulta : x)), visitas: [...e.visitas, visita] }, visita, consulta };
}

// ---------- Mensajes de WhatsApp ----------

interface Ctx {
  negocio: string;
  moneda: string;
  enlace?: string;
}

export function mensajeInmobiliaria(p: Propiedad, c: Consulta, e: EstadoInmo, ctx: Ctx) {
  const l = [`Hola ${ctx.negocio}, soy ${c.nombre}. Me interesa la propiedad ${p.codigo}: ${p.titulo} en ${p.zona} (${NOMBRE_OPERACION[p.operacion].toLowerCase()}, ${precioProp(p, ctx.moneda)} ${sufijo(p)}).`.replace(' )', ')')];
  if (c.mensaje) l.push(c.mensaje);
  if (c.visitaId) {
    const v = e.visitas.find((x) => x.id === c.visitaId);
    if (v) l.push(`Reservé una visita para ${nombreDia(v.inicio)} a las ${hora(v.inicio)} h.`);
  }
  if (c.tipo === 'requisitos') l.push('¿Qué requisitos piden para alquilarla?');
  if (ctx.enlace) l.push(ctx.enlace);
  return l.join('\n');
}

export function mensajeRespuesta(c: Consulta, p: Propiedad | undefined, ctx: Ctx) {
  const nombre = c.nombre.split(' ')[0];
  const prop = p ? `la propiedad ${p.codigo} (${p.titulo})` : 'tu consulta';
  if (c.tipo === 'requisitos') return `Hola ${nombre}, te escribimos de ${ctx.negocio} por ${prop}. Te paso los requisitos para alquilar: [garantía], [recibos de sueldo], [DNI]. ¿Querés coordinar una visita?`;
  return `Hola ${nombre}, te escribimos de ${ctx.negocio} por ${prop}. ¿Seguís interesado? Podemos coordinar una visita.`;
}

export function mensajeCaptacion(k: Captacion, ctx: Ctx) {
  return `Hola ${k.nombre.split(' ')[0]}, te escribimos de ${ctx.negocio} por tu ${NOMBRE_TIPO[k.tipo].toLowerCase()} en ${k.zona}. ¿Cuándo podemos pasar a tasarla sin cargo?`;
}

// ---------- Métricas ----------

export function metricas(e: EstadoInmo, ahora = Date.now()) {
  const desde7 = ahora - 7 * DIA_MS;
  const desde30 = ahora - 30 * DIA_MS;
  const activas = e.propiedades.filter((p) => p.estado !== 'cerrada');
  const porProp = activas
    .map((p) => ({ p, consultas: e.consultas.filter((c) => c.propiedadId === p.id).length, dias: diasPublicada(p, ahora) }))
    .sort((a, b) => b.consultas - a.consultas || b.p.vistas - a.p.vistas);
  return {
    activas: activas.length,
    venta: activas.filter((p) => p.operacion === 'venta').length,
    alquiler: activas.filter((p) => p.operacion === 'alquiler').length,
    temporario: activas.filter((p) => p.operacion === 'temporario').length,
    consultas7: e.consultas.filter((c) => +new Date(c.fecha) >= desde7).length,
    nuevas: e.consultas.filter((c) => c.estado === 'nueva').length,
    visitasProximas: e.visitas.filter((v) => +new Date(v.inicio) >= ahora && (v.estado === 'reservado' || v.estado === 'confirmado')).length,
    captacionesNuevas: e.captaciones.filter((k) => k.estado === 'nueva').length,
    cerradas30: e.propiedades.filter((p) => p.cerrada && +new Date(p.cerrada) >= desde30).length,
    promedioDias: activas.length ? Math.round(activas.reduce((s, p) => s + diasPublicada(p, ahora), 0) / activas.length) : 0,
    porProp,
    sinMovimiento: porProp.filter((x) => x.dias >= 60).sort((a, b) => b.dias - a.dias),
  };
}

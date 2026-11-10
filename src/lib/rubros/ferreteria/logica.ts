import type { Semaforo } from '@/lib/semaforo';
import { distancia } from '@/lib/rubros/repuestos/logica';
import { formatoPrecio } from '@/lib/utiles';
import { COMPLEMENTOS, FAMILIAS, PROBLEMAS, ORDEN_FAMILIA, catalogoBase, familiaDe, preparar, sinAcentos, tokens } from './catalogo';
import type { EstadoFerreteria, LineaPresupuesto, Presupuesto, Producto, TipoCliente, Unidad } from './tipos';

export const NOMBRE_TIPO: Record<TipoCliente, string> = { paso: 'De paso', profesional: 'Profesional', constructora: 'Constructora' };

// ---------------- Catálogo con los cambios del dueño ----------------

const memo = new WeakMap<EstadoFerreteria, { moneda: string; productos: Producto[] }>();

export function productos(e: EstadoFerreteria, moneda: string): Producto[] {
  const m = memo.get(e);
  if (m?.moneda === moneda) return m.productos;
  const lista = catalogoBase(moneda).map((p) => {
    const precio = e.precios[p.id];
    const stock = e.stock[p.id];
    return precio === undefined && stock === undefined ? p : { ...p, precio: precio ?? p.precio, stock: stock ?? p.stock };
  });
  memo.set(e, { moneda, productos: lista });
  return lista;
}

const indice = new Map<string, Set<string>>();
function claves(p: Producto) {
  let s = indice.get(p.id);
  if (!s) {
    s = new Set([...p.claves, sinAcentos(p.codigo).replace(/-/g, ''), sinAcentos(p.codigo)]);
    indice.set(p.id, s);
  }
  return s;
}

export function estadoStock(p: Producto): 'hay' | 'pocas' | 'sin' {
  return p.stock <= 0 ? 'sin' : p.stock < p.minimo ? 'pocas' : 'hay';
}
export const TEXTO_STOCK = { hay: 'Hay stock', pocas: 'Quedan pocas', sin: 'Sin stock' } as const;

export function precioUnidad(p: Producto, u: Unidad, descuento = 0) {
  const v = p.precio * u.factor * (1 - descuento / 100);
  return v < 20 ? Math.round(v * 100) / 100 : Math.round(v);
}

// ---------------- Búsqueda con sinónimos (FER-03) ----------------

interface Puntaje {
  p: Producto;
  falta: number;
  puntos: number;
}

function puntuar(p: Producto, qt: string[]): Puntaje {
  const c = claves(p);
  let puntos = 0;
  let falta = 0;
  for (const t of qt) {
    if (c.has(t)) puntos += /^\d/.test(t) ? 3 : 2;
    else if (t.length >= 3 && !/^\d/.test(t) && [...c].some((x) => x.startsWith(t))) puntos += 1;
    else if (t.length >= 5 && [...c].some((x) => Math.abs(x.length - t.length) <= 1 && distancia(x, t) <= 1)) puntos += 1;
    else falta++;
  }
  return { p, falta, puntos };
}

const ORDEN_LINEA: Record<string, number> = { Estándar: 0, Económica: 1, Reforzado: 2, Premium: 3, Profesional: 4 };

export function buscar(lista: Producto[], texto: string, palabras: Record<string, string> = {}, max = 60): Producto[] {
  const qt = tokens(texto, palabras);
  if (!qt.length) return [];
  const res: Puntaje[] = [];
  for (const p of lista) {
    const s = puntuar(p, qt);
    if (s.falta < qt.length) res.push(s);
  }
  const mejorFalta = Math.min(...res.map((x) => x.falta));
  return res
    .filter((x) => x.falta === mejorFalta && (mejorFalta === 0 || x.puntos >= 2))
    .sort((a, b) => b.puntos - a.puntos || ORDEN_FAMILIA[a.p.familia] - ORDEN_FAMILIA[b.p.familia] || (ORDEN_LINEA[a.p.linea] ?? 9) - (ORDEN_LINEA[b.p.linea] ?? 9) || a.p.precio - b.p.precio)
    .slice(0, max)
    .map((x) => x.p);
}

export function problema(texto: string) {
  const t = sinAcentos(texto);
  return PROBLEMAS.find((x) => x.frases.some((f) => t.includes(f))) ?? null;
}

export function complementos(lista: Producto[], p: Producto): Producto[] {
  const fams = COMPLEMENTOS[p.familia] ?? [];
  const num = tokens(p.medida).find((x) => /^\d/.test(x));
  return fams
    .map((f) => {
      const deFam = lista.filter((x) => x.familia === f && x.linea === 'Estándar' && x.stock > 0);
      const fam = FAMILIAS.find((y) => y.id === f);
      return (
        (num && deFam.find((x) => claves(x).has(num))) ||
        deFam.find((x) => (!fam?.defecto?.medida || x.medida === fam.defecto.medida) && (!fam?.defecto?.variante || x.variante === fam.defecto.variante)) ||
        deFam[0]
      );
    })
    .filter((x): x is Producto => !!x);
}

// ---------------- Lectura de listas (FER-05, FER-06) ----------------

const UNIDAD_PALABRA: Record<string, string> = {
  m: 'm', mt: 'm', mts: 'm', metro: 'm', metros: 'm', rollo: 'rollo', rollos: 'rollo', tira: 'tira', tiras: 'tira',
  caja: 'caja', cajas: 'caja', bolsa: 'bolsa', bolsas: 'bolsa', paquete: 'paquete', paquetes: 'paquete', u: 'u', un: 'u', unid: 'u', unidad: 'u', unidades: 'u', pliego: 'u', pliegos: 'u',
};

export interface LineaLeida {
  original: string;
  cantidad: number;
  unidadId: string | null;
  descripcion: string;
  /** Producto elegido (si la confianza es alta o ya lo eligió el vendedor). */
  elegido: Producto | null;
  opciones: Producto[];
  confianza: 'alta' | 'baja' | 'nada';
  aprendido?: boolean;
}

export const claveFrase = (t: string) => tokens(t).join(' ');

/** Separa una línea en cantidad, unidad y descripción. "20 m cable 2,5" → 20, m, "cable 2,5". */
export function partirLinea(linea: string) {
  let s = preparar(linea).replace(/^[\s\-•*·]+/, '').trim();
  let cantidad = 1;
  let unidadId: string | null = null;
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:x\s+)?/);
  if (m && !/^\d+(?:\.\d+)?\s*(?:mm|cc|l\b|kg|w\b|a\b|"|\/)/.test(s)) {
    cantidad = Number(m[1]);
    s = s.slice(m[0].length);
  } else {
    const fin = s.match(/\s+x\s*(\d+)\s*$/);
    if (fin) {
      cantidad = Number(fin[1]);
      s = s.slice(0, fin.index);
    }
  }
  const w = s.match(/^([a-z]+)\b\.?\s*/);
  if (w && UNIDAD_PALABRA[w[1]]) {
    unidadId = UNIDAD_PALABRA[w[1]];
    s = s.slice(w[0].length);
  }
  return { cantidad: cantidad > 0 && cantidad < 100000 ? cantidad : 1, unidadId, descripcion: s.replace(/^de\s+/, '').trim() };
}

function unidadPara(p: Producto, unidadId: string | null, conCantidadSola: boolean): string {
  if (unidadId && p.unidades.some((u) => u.id === unidadId)) return unidadId;
  const f = familiaDe(p);
  if (conCantidadSola && f.conteo && p.unidades.some((u) => u.id === f.conteo)) return f.conteo;
  return p.unidades[0].id;
}

export function unidadElegida(p: Producto, linea: Pick<LineaLeida, 'unidadId'>) {
  return unidadPara(p, linea.unidadId, !linea.unidadId);
}

const grupo = (p: Producto) => `${p.familia}|${p.medida}|${p.variante}`;

/**
 * Lee una lista completa. Usa el contexto (medidas y familias de las líneas anteriores) para
 * desempatar: "6 codos" después de "caños de 50" propone codos de 50 mm.
 */
export function leerLista(texto: string, lista: Producto[], e: Pick<EstadoFerreteria, 'aprendidos' | 'palabras'>): LineaLeida[] {
  const lineas = texto.split(/\n|;|,(?!\d)/).map((l) => l.trim()).filter((l) => /[a-záéíóúñ]/i.test(l));
  const numeros: string[] = [];
  const familias: string[] = [];
  const out: LineaLeida[] = [];
  for (const original of lineas) {
    const { cantidad, unidadId, descripcion } = partirLinea(original);
    const base: LineaLeida = { original, cantidad, unidadId, descripcion, elegido: null, opciones: [], confianza: 'nada' };
    const clave = claveFrase(descripcion);
    const aprendido = e.aprendidos[clave] ? lista.find((p) => p.id === e.aprendidos[clave]) : undefined;
    if (aprendido) {
      out.push({ ...base, elegido: aprendido, opciones: [aprendido], confianza: 'alta', aprendido: true });
      familias.push(aprendido.familia);
      continue;
    }
    const qt = tokens(descripcion, e.palabras);
    const tieneNumero = qt.some((t) => /^\d/.test(t));
    const cand = buscar(lista, descripcion, e.palabras, 400);
    if (!cand.length) {
      out.push(base);
      continue;
    }
    const complementarias = new Set(familias.flatMap((f) => COMPLEMENTOS[f] ?? []));
    // Las medidas de la línea anterior solo ayudan entre piezas que se miden igual (caños y accesorios en mm).
    const extra = (p: Producto) => (!tieneNumero && p.medida.endsWith('mm') && numeros.some((n) => claves(p).has(n)) ? 2 : 0) + (complementarias.has(p.familia) || familias.includes(p.familia) ? 1 : 0);
    // "6 tiras …" señala un caño, no un accesorio: suma el producto que se vende en esa unidad.
    const porUnidad = (p: Producto) => (unidadId && unidadId !== 'u' && p.unidades.some((u) => u.id === unidadId) ? 1 : 0);
    const pts = (p: Producto) => puntuar(p, qt).puntos + extra(p) + porUnidad(p);
    // Un representante por grupo (familia + medida + variante), prefiriendo la línea Estándar.
    const grupos = new Map<string, Producto>();
    for (const p of cand) {
      const g = grupo(p);
      const prev = grupos.get(g);
      if (!prev || (ORDEN_LINEA[p.linea] ?? 9) < (ORDEN_LINEA[prev.linea] ?? 9)) grupos.set(g, p);
    }
    const reps = [...grupos.values()].sort((a, b) => pts(b) - pts(a) || ORDEN_FAMILIA[a.familia] - ORDEN_FAMILIA[b.familia]);
    const top = pts(reps[0]);
    let empatados = reps.filter((p) => pts(p) === top);
    if (empatados.length > 1 && new Set(empatados.map((p) => p.familia)).size === 1) {
      const f = familiaDe(empatados[0]);
      const def = empatados.filter((p) => (!f.defecto?.medida || p.medida === f.defecto.medida) && (!f.defecto?.variante || p.variante === f.defecto.variante));
      if (def.length === 1) empatados = def;
    }
    const sinFaltas = puntuar(empatados[0], qt).falta === 0;
    if (empatados.length === 1 && sinFaltas) {
      const p = empatados[0];
      out.push({ ...base, elegido: p, opciones: reps.slice(0, 3), confianza: 'alta' });
      familias.push(p.familia);
      tokens(p.medida).filter((t) => /^\d/.test(t)).forEach((t) => numeros.push(t));
    } else {
      out.push({ ...base, opciones: (empatados.length > 1 ? empatados : reps).slice(0, 3), confianza: 'baja' });
      familias.push(reps[0].familia);
    }
    qt.filter((t) => /^\d/.test(t)).forEach((t) => numeros.push(t));
  }
  return out;
}

// ---------------- Presupuestos (FER-07 a FER-11) ----------------

export function totalPresupuesto(p: Pick<Presupuesto, 'lineas'>) {
  return p.lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
}

export function lineaDesde(prod: Producto, unidadId: string, cantidad: number, descuento: number, original?: string): LineaPresupuesto {
  const u = prod.unidades.find((x) => x.id === unidadId) ?? prod.unidades[0];
  return { productoId: prod.id, unidadId: u.id, cantidad, precio: precioUnidad(prod, u, descuento), ...(original ? { original } : {}) };
}

export function venceEl(p: Presupuesto) {
  return new Date(+new Date(p.fecha) + p.validezDias * 86_400_000);
}

export function mensajePresupuesto(p: Presupuesto, lista: Producto[], ctx: { negocio: string; moneda: string; enlace: string; cliente?: string }) {
  const f = (v: number) => formatoPrecio(v, ctx.moneda);
  const lineas = p.lineas.map((l) => {
    const prod = lista.find((x) => x.id === l.productoId);
    const u = prod?.unidades.find((x) => x.id === l.unidadId);
    return `• ${l.cantidad} ${u && u.id !== 'u' ? `${u.etiqueta} ` : ''}× ${prod?.nombre ?? 'Producto'} — ${f(l.precio * l.cantidad)}`;
  });
  return [
    `${ctx.cliente ? `Hola ${ctx.cliente.split(' ')[0]}, ` : 'Hola, '}te paso el presupuesto N.º ${p.numero} de ${ctx.negocio}:`,
    '',
    ...lineas,
    '',
    `Total: ${f(totalPresupuesto(p))}${p.tipo !== 'paso' ? ` (precio ${NOMBRE_TIPO[p.tipo].toLowerCase()})` : ''}`,
    `Válido hasta el ${venceEl(p).toLocaleDateString('es', { day: 'numeric', month: 'long' })}. Sujeto a disponibilidad.`,
    `Ver y descargar: ${ctx.enlace}`,
  ].join('\n');
}

export function mensajeRecordar(p: Presupuesto, ctx: { negocio: string; enlace: string; cliente?: string }) {
  return `${ctx.cliente ? `Hola ${ctx.cliente.split(' ')[0]}` : 'Hola'}, ¿pudiste ver el presupuesto N.º ${p.numero} de ${ctx.negocio}? Si querés lo reservamos. ${ctx.enlace}`;
}

/** Convierte en venta (FER-08): descuenta stock en unidades base. Devuelve error en texto o el estado nuevo. */
export function venderPresupuesto(e: EstadoFerreteria, id: string, lista: Producto[]): string | EstadoFerreteria {
  const p = e.presupuestos.find((x) => x.id === id);
  if (!p || p.estado !== 'abierto') return 'Ese presupuesto ya no está abierto.';
  const stock = { ...e.stock };
  for (const l of p.lineas) {
    const prod = lista.find((x) => x.id === l.productoId);
    if (!prod) continue;
    const u = prod.unidades.find((x) => x.id === l.unidadId) ?? prod.unidades[0];
    const actual = stock[prod.id] ?? prod.stock;
    const necesita = l.cantidad * u.factor;
    if (actual < necesita) return `No alcanza el stock de ${prod.nombre}: hay ${actual} ${prod.base === 'm' ? 'm' : 'u.'}`;
    stock[prod.id] = actual - necesita;
  }
  return { ...e, stock, presupuestos: e.presupuestos.map((x) => (x.id === id ? { ...x, estado: 'vendido', vendido: new Date().toISOString() } : x)) };
}

// ---------------- Stock y reposición (FER-14) ----------------

export function faltantes(lista: Producto[]) {
  return lista.filter((p) => p.stock < p.minimo).sort((a, b) => a.stock / a.minimo - b.stock / b.minimo);
}

export const sugerido = (p: Producto) => Math.max(0, p.minimo * 3 - p.stock);

export function mensajeProveedor(items: Producto[], negocio: string) {
  return [`Hola, soy de ${negocio}. Te paso el pedido:`, '', ...items.map((p) => `• ${sugerido(p)} ${p.base === 'm' ? 'm' : 'u.'} · ${p.codigo} · ${p.nombre}`), '', 'Gracias.'].join('\n');
}

export const SEMAFORO_FER: Semaforo = { rojo: 3, amarillo: 10 };
export const semaforoFer = (e: Pick<EstadoFerreteria, 'semaforo'>) => e.semaforo ?? SEMAFORO_FER;

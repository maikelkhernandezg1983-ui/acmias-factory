import type { Semaforo } from '@/lib/semaforo';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import type { DemoConfig } from '@/lib/tipos';
import type { EstadoRepuestos, LineaCotizacion, MiVehiculo, Pieza, Vehiculo } from './tipos';

export const normalizar = (t: string) =>
  t
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '');

/** Distancia de edición (con transposiciones): cuántas letras hay que cambiar para pasar de a a b. */
export function distancia(a: string, b: string) {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Letras que se confunden al tipear códigos: O/0, I/1, S/5, B/8. */
const confusiones = (t: string) => t.replace(/O/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8');

export interface Resultado {
  pieza: Pieza;
  /** Código que coincidió (propio, OEM o equivalente) para resaltarlo. */
  codigo?: string;
  tipo: 'codigo' | 'oem' | 'equivalente' | 'nombre';
  exacto: boolean;
}

/**
 * Búsqueda tolerante: por código propio, OEM o equivalente aunque tenga un error de tipeo
 * (ej. "FA21O" encuentra "FA-210"), o por palabras del nombre y la marca.
 */
export function buscar(piezas: Pieza[], termino: string): Resultado[] {
  const t = normalizar(termino);
  if (t.length < 2) return [];
  const tc = confusiones(t);
  const tolerancia = t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0;
  const palabras = termino.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter((w) => w.length >= 3);
  const out: (Resultado & { puntaje: number })[] = [];

  for (const pieza of piezas) {
    let mejor: (Resultado & { puntaje: number }) | null = null;
    const codigos: [string, Resultado['tipo']][] = [
      [pieza.codigo, 'codigo'],
      ...pieza.oem.map((c) => [c, 'oem'] as [string, Resultado['tipo']]),
      ...pieza.equivalentes.map((c) => [c, 'equivalente'] as [string, Resultado['tipo']]),
    ];
    for (const [codigo, tipo] of codigos) {
      const c = normalizar(codigo);
      let puntaje = Infinity;
      if (c === t) puntaje = 0;
      else if (t.length >= 3 && c.startsWith(t)) puntaje = 0.5;
      else if (confusiones(c) === tc) puntaje = 0.8;
      else if (tolerancia > 0 && Math.abs(c.length - t.length) <= tolerancia) {
        const dist = Math.min(distancia(c, t), distancia(confusiones(c), tc));
        if (dist <= tolerancia) puntaje = 1 + dist;
      }
      if (puntaje < (mejor?.puntaje ?? Infinity)) mejor = { pieza, codigo, tipo, exacto: puntaje === 0, puntaje };
    }
    if (!mejor && palabras.length) {
      const texto = `${pieza.nombre} ${pieza.marca} ${pieza.categoria}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const coincide = palabras.filter((w) => texto.includes(w) || texto.split(/\s+/).some((x) => x.length >= 4 && distancia(x, w) <= 1)).length;
      if (coincide === palabras.length) mejor = { pieza, tipo: 'nombre', exacto: false, puntaje: 5 };
    }
    if (mejor) out.push(mejor);
  }
  return out.sort((a, b) => a.puntaje - b.puntaje).map(({ puntaje: _p, ...r }) => { void _p; return r; });
}

export type EstadoStock = 'disponible' | 'pocas' | 'pedido' | 'sin';
export function estadoStock(p: Pieza): EstadoStock {
  if (p.stock > 5) return 'disponible';
  if (p.stock > 0) return 'pocas';
  return p.aPedido ? 'pedido' : 'sin';
}
export const TEXTO_STOCK: Record<EstadoStock, string> = {
  disponible: 'Disponible',
  pocas: 'Pocas unidades',
  pedido: 'A pedido 24–48 h',
  sin: 'Sin stock',
};

export const nombreVehiculo = (v: Vehiculo) => `${v.marca} ${v.modelo} ${v.motor}`;
export const etiquetaVehiculo = (v: Vehiculo, anio: number) => `${nombreVehiculo(v)} ${anio}`;

export function esCompatible(p: Pieza, mi?: MiVehiculo | null) {
  return !!mi && p.compat.includes(mi.vehiculoId);
}

export function precioPara(p: Pieza, taller: boolean, descuento: number) {
  return taller ? Math.round(p.precio * (1 - descuento / 100)) : p.precio;
}

export function mensajeCotizacion(opts: {
  config: DemoConfig;
  items: LineaCotizacion[];
  vehiculo?: string;
  taller?: string;
  nombre?: string;
}) {
  const { config, items, vehiculo, taller, nombre } = opts;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  return [
    `Hola ${config.negocio}, quiero cotizar:`,
    vehiculo ? `🚗 Vehículo: ${vehiculo}` : '🚗 Vehículo: (no lo indiqué)',
    taller ? `🔧 Taller: ${taller}` : nombre ? `Nombre: ${nombre}` : '',
    '',
    ...items.map((i) => `• ${i.cantidad} × ${i.nombre} · cód. ${i.codigo} · ${p(i.precio * i.cantidad)}`),
    '',
    `Total estimado: ${p(total)}${taller ? ' (precio taller)' : ''}`,
    '¿Me confirmás compatibilidad y disponibilidad?',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n');
}

export { enlaceWhatsApp };

export const SEMAFORO_REP: Semaforo = { rojo: 1, amarillo: 5 };
export const semaforoRep = (e: Pick<EstadoRepuestos, 'semaforo'>) => e.semaforo ?? SEMAFORO_REP;

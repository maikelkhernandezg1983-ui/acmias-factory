import { z } from 'zod';
import type { DemoConfig, ItemPedido, ModoServicio } from './tipos';
import { MONEDAS } from './rubros/restaurante/datos-ejemplo';

const LOCALE_MONEDA: Record<string, string> = {
  ARS: 'es-AR', MXN: 'es-MX', COP: 'es-CO', CLP: 'es-CL', PEN: 'es-PE', UYU: 'es-UY', BOB: 'es-BO', PYG: 'es-PY', GTQ: 'es-GT', DOP: 'es-DO', EUR: 'es-ES', USD: 'es-419',
};

export function formatoPrecio(valor: number, moneda: string) {
  const sinDecimales = ['ARS', 'COP', 'CLP', 'PYG', 'UYU', 'DOP'].includes(moneda);
  try {
    return new Intl.NumberFormat(LOCALE_MONEDA[moneda] ?? 'es-419', {
      style: 'currency',
      currency: moneda,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: sinDecimales ? 0 : 2,
      maximumFractionDigits: sinDecimales ? 0 : 2,
    }).format(valor);
  } catch {
    return `${moneda} ${valor.toFixed(sinDecimales ? 0 : 2)}`;
  }
}

function minutos(hhmm: string) {
  const [h, m] = String(hhmm ?? '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function estaAbierto(apertura: string, cierre: string, ahora = new Date()) {
  const a = minutos(apertura);
  const c = minutos(cierre);
  const n = ahora.getHours() * 60 + ahora.getMinutes();
  return a <= c ? n >= a && n < c : n >= a || n < c;
}

export function soloDigitos(tel: string) {
  return tel.replace(/\D/g, '');
}

const NOMBRE_MODO: Record<ModoServicio, string> = { mesa: 'En la mesa', llevar: 'Para llevar', delivery: 'Delivery' };

export function mensajePedido(opts: {
  config: DemoConfig;
  items: ItemPedido[];
  modo: ModoServicio;
  mesa?: number;
  direccion?: string;
  nombre?: string;
  envio: number;
}) {
  const { config, items, modo, mesa, direccion, nombre, envio } = opts;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const lineas = [
    `Hola ${config.negocio}, quiero hacer este pedido:`,
    '',
    ...items.map((i) => `• ${i.cantidad} x ${i.nombre} (${p(i.precio * i.cantidad)})${i.nota ? `\n   Nota: ${i.nota}` : ''}`),
    '',
    `Modo: ${NOMBRE_MODO[modo]}${modo === 'mesa' && mesa ? ` · Mesa ${mesa}` : ''}`,
  ];
  if (modo === 'delivery') {
    if (direccion) lineas.push(`Dirección: ${direccion}`);
    lineas.push(`Envío: ${p(envio)}`);
  }
  if (nombre) lineas.push(`A nombre de: ${nombre}`);
  lineas.push(`Total: ${p(subtotal + (modo === 'delivery' ? envio : 0))}`);
  return lineas.join('\n');
}

export function enlaceWhatsApp(telefono: string, texto: string) {
  const num = soloDigitos(telefono);
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

/** Datos de la demo sin el logo, para compartir por enlace o QR. */
export function codificarConfig(config: DemoConfig) {
  const { logo: _logo, ...resto } = config;
  void _logo;
  const json = JSON.stringify(resto);
  const b64 = typeof window === 'undefined' ? Buffer.from(json, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const ConfigCompartida = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{1,48}$/),
    rubro: z.enum(['restaurante', 'repuestos', 'tienda', 'barberia', 'consultorio']).default('restaurante'),
    variante: z.enum(['moda', 'almacen']).optional(),
    negocio: z.string().trim().min(1).max(60),
    colorPrincipal: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    colorSecundario: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    whatsapp: z.string().max(20),
    mesas: z.number().int().min(1).max(60),
    moneda: z.enum(MONEDAS as [string, ...string[]]),
    apertura: z.string().regex(HORA),
    cierre: z.string().regex(HORA),
    delivery: z.boolean(),
    costoEnvio: z.number().min(0).max(1e9),
    direccion: z.string().max(200),
    creada: z.string().max(40),
  })
  .strip();

export function decodificarConfig(texto: string): DemoConfig | null {
  try {
    const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const r = ConfigCompartida.safeParse(JSON.parse(json));
    if (!r.success) return null;
    const c = r.data;
    return {
      slug: c.slug,
      rubro: c.rubro,
      ...(c.variante ? { variante: c.variante } : {}),
      negocio: c.negocio,
      colorPrincipal: c.colorPrincipal.toUpperCase(),
      colorSecundario: c.colorSecundario.toUpperCase(),
      whatsapp: soloDigitos(c.whatsapp),
      mesas: c.mesas,
      moneda: c.moneda,
      apertura: c.apertura,
      cierre: c.cierre,
      delivery: c.delivery,
      costoEnvio: c.costoEnvio,
      direccion: c.direccion,
      creada: c.creada,
    };
  } catch {
    return null;
  }
}

export function idCorto() {
  return Math.random().toString(36).slice(2, 9);
}

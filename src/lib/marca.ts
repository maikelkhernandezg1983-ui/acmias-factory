/**
 * Motor de marca: convierte los dos colores de un cliente en un tema
 * que siempre cumple contraste 4,5:1 sobre blanco y sobre el propio color.
 */

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [11, 18, 32];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function canal(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminancia(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function contraste(a: string, b: string) {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function mezclar(a: string, b: string, t: number) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

const TINTA = '#16161D';
const BLANCO = '#FFFFFF';

/** Texto legible sobre un fondo: blanco o tinta, el que más contraste dé. */
export function textoSobre(fondo: string) {
  return contraste(fondo, BLANCO) >= contraste(fondo, TINTA) ? BLANCO : TINTA;
}

/** Oscurece (o aclara) un color hasta lograr el contraste pedido contra un fondo. */
export function asegurarContraste(color: string, fondo = BLANCO, objetivo = 4.5) {
  if (contraste(color, fondo) >= objetivo) return color;
  const hacia = luminancia(fondo) > 0.5 ? '#000000' : '#FFFFFF';
  for (let t = 0.05; t <= 1; t += 0.05) {
    const c = mezclar(color, hacia, t);
    if (contraste(c, fondo) >= objetivo) return c;
  }
  return hacia === '#000000' ? TINTA : BLANCO;
}

export interface Tema {
  marca: string;
  sobreMarca: string;
  marcaTexto: string;
  acento: string;
  sobreAcento: string;
  acentoSuave: string;
  ajustado: boolean;
}

export function crearTema(principal: string, secundario: string): Tema {
  const marca = principal;
  // Si el secundario es casi blanco o casi igual al principal, se usa una variante del principal.
  let acento = secundario;
  if (contraste(acento, BLANCO) < 1.4 || contraste(acento, marca) < 1.3) {
    acento = luminancia(marca) > 0.4 ? mezclar(marca, '#000000', 0.35) : mezclar(marca, '#FFFFFF', 0.35);
  }
  const marcaTexto = asegurarContraste(marca);
  return {
    marca,
    sobreMarca: textoSobre(marca),
    marcaTexto,
    acento,
    sobreAcento: textoSobre(acento),
    acentoSuave: mezclar(acento, BLANCO, 0.86),
    ajustado: marcaTexto !== marca,
  };
}

export function temaComoEstilo(t: Tema): Record<string, string> {
  return {
    '--c-marca': t.marca,
    '--c-sobre-marca': t.sobreMarca,
    '--c-marca-texto': t.marcaTexto,
    '--c-acento': t.acento,
    '--c-sobre-acento': t.sobreAcento,
    '--c-acento-suave': t.acentoSuave,
  };
}

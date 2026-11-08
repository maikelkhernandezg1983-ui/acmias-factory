'use client';

import { rgbToHex } from './marca';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const MAX_MB = 5;

export function validarImagen(file: File): string | null {
  if (!TIPOS.includes(file.type)) return 'Formato no válido: usá PNG, JPG, WEBP o SVG.';
  if (file.size > MAX_MB * 1024 * 1024) return `El archivo pesa más de ${MAX_MB} MB.`;
  return null;
}

function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = src;
  });
}

/** Reduce la imagen a un lado máximo y la devuelve como data URL (PNG si tiene transparencia). */
export async function reducirImagen(file: File, lado = 320, formato: 'image/png' | 'image/jpeg' = 'image/png', calidad = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await cargar(url);
    const escala = Math.min(1, lado / Math.max(img.naturalWidth || lado, img.naturalHeight || lado));
    const w = Math.max(1, Math.round((img.naturalWidth || lado) * escala));
    const h = Math.max(1, Math.round((img.naturalHeight || lado) * escala));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.drawImage(img, 0, 0, w, h);
    return cv.toDataURL(formato, calidad);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Toma los dos colores dominantes y bien distintos de una imagen. */
export async function coloresDeImagen(src: string): Promise<[string, string] | null> {
  const img = await cargar(src);
  const n = 48;
  const cv = document.createElement('canvas');
  cv.width = n;
  cv.height = n;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, n, n);
  const px = ctx.getImageData(0, 0, n, n).data;
  const cubos: Record<string, { n: number; r: number; g: number; b: number }> = {};
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 160) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mn > 235) continue;
    const clave = `${r >> 4},${g >> 4},${b >> 4}`;
    const peso = 1 + (mx - mn) / 64;
    const c = (cubos[clave] ??= { n: 0, r: 0, g: 0, b: 0 });
    c.n += peso; c.r += r * peso; c.g += g * peso; c.b += b * peso;
  }
  const lista = Object.values(cubos)
    .sort((a, b) => b.n - a.n)
    .map((c) => [c.r / c.n, c.g / c.n, c.b / c.n] as [number, number, number]);
  if (!lista.length) return null;
  const lejos = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 120;
  const primero = lista[0];
  const segundo = lista.find((c) => lejos(c, primero)) ?? [246, 249, 252];
  return [rgbToHex(primero), rgbToHex(segundo as [number, number, number])];
}

export function leerComoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { hayBase } from './registros';

/** Sesión del panel del vendedor: cookie firmada con SESION_SECRETO, clave en PANEL_CLAVE. */
export const COOKIE = 'acmias_panel';
const DURACION_S = 60 * 60 * 24 * 14;

const clave = process.env.PANEL_CLAVE;
const secreto = process.env.SESION_SECRETO ?? clave;

function firmar(valor: string) {
  return createHmac('sha256', secreto ?? '').update(valor).digest('base64url');
}

function iguales(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Sin clave configurada: abierto en desarrollo; en producción con base real, cerrado. */
export function panelProtegido() {
  return Boolean(clave);
}
export function panelBloqueadoSinClave() {
  return !clave && process.env.NODE_ENV === 'production' && hayBase;
}

export function claveCorrecta(intento: string) {
  return Boolean(clave) && iguales(intento, clave!);
}

export function crearToken() {
  const vence = String(Math.floor(Date.now() / 1000) + DURACION_S);
  return `${vence}.${firmar(vence)}`;
}

export function tokenValido(token?: string) {
  if (!clave) return !panelBloqueadoSinClave();
  if (!token) return false;
  const [vence, firma] = token.split('.');
  if (!vence || !firma || !iguales(firma, firmar(vence))) return false;
  return Number(vence) > Date.now() / 1000;
}

export const opcionesCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: DURACION_S,
};

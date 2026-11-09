import { createHmac, pbkdf2Sync, timingSafeEqual } from 'node:crypto';

/**
 * Acceso al portal del vendedor: usuario y contraseña.
 *
 * VENDEDORES  = "usuario=pbkdf2$iteraciones$sal$hash;otro=..."  (se arma en /ingresar/generar)
 * SESION_SECRETO = texto aleatorio largo para firmar la cookie de sesión.
 *
 * Las contraseñas nunca se guardan: solo su hash PBKDF2-SHA256 con sal.
 * En desarrollo y pruebas, sin VENDEDORES, existe el usuario "vendedor" / "demo1234".
 */
export const COOKIE = 'acmias_vendedor';
const DURACION_S = 60 * 60 * 12; // una jornada de visitas
const produccion = process.env.NODE_ENV === 'production';

const DEV_VENDEDORES = 'vendedor=pbkdf2$1000$ZGVtby1zYWw$' + pbkdf2Sync('demo1234', 'demo-sal', 1000, 32, 'sha256').toString('base64url');

function vendedores(): Map<string, string> {
  const crudo = process.env.VENDEDORES ?? (produccion ? '' : DEV_VENDEDORES);
  const m = new Map<string, string>();
  // Tolera errores comunes al pegar en Vercel: comillas, espacios, saltos de línea o el nombre "VENDEDORES=" incluido.
  const limpio = crudo.trim().replace(/^VENDEDORES\s*=\s*/i, '');
  for (const entrada of limpio.split(/[;\n,]+/)) {
    const par = entrada.trim().replace(/^["'`]+|["'`]+$/g, '');
    const i = par.indexOf('=');
    if (i > 0) m.set(par.slice(0, i).trim().toLowerCase(), par.slice(i + 1).trim().replace(/\s+/g, ''));
  }
  return m;
}

function secreto() {
  const v = process.env.SESION_SECRETO?.trim().replace(/^SESION_SECRETO\s*=\s*/i, '').replace(/^["'`]+|["'`]+$/g, '');
  return v || (produccion ? '' : 'secreto-solo-para-desarrollo');
}

/** Qué falta configurar en Vercel para poder ingresar (vacío si está todo). */
export function faltaConfigurar(): string[] {
  const f: string[] = [];
  if (vendedores().size === 0) f.push('VENDEDORES');
  if (secreto().length < 32 && produccion) f.push('SESION_SECRETO');
  return f;
}

function iguales(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verificarClave(usuario: string, clave: string): string | null {
  const nombre = usuario.trim().toLowerCase();
  const guardado = vendedores().get(nombre);
  // Se calcula igual aunque el usuario no exista, para no revelar qué usuarios hay por el tiempo de respuesta.
  const [alg, iterTxt, sal, hash] = (guardado ?? 'pbkdf2$210000$c2lu$c2lu').split('$');
  const iter = Number(iterTxt);
  if (alg !== 'pbkdf2' || !Number.isInteger(iter) || iter < 1000 || iter > 2_000_000) return null;
  const calculado = pbkdf2Sync(clave, Buffer.from(sal, 'base64url'), iter, 32, 'sha256').toString('base64url');
  return guardado && iguales(calculado, hash) ? nombre : null;
}

function firmar(valor: string) {
  return createHmac('sha256', secreto()).update(valor).digest('base64url');
}

export function crearToken(usuario: string) {
  const datos = `${usuario}.${Math.floor(Date.now() / 1000) + DURACION_S}`;
  return `${datos}.${firmar(datos)}`;
}

/** Devuelve el usuario de una cookie válida y vigente; null si no hay sesión. */
export function usuarioDeToken(token?: string): string | null {
  if (!token || faltaConfigurar().length) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [usuario, vence, firma] = partes;
  if (!iguales(firma, firmar(`${usuario}.${vence}`))) return null;
  if (Number(vence) < Date.now() / 1000) return null;
  return vendedores().has(usuario) ? usuario : null; // si se da de baja a un vendedor, pierde el acceso
}

export const opcionesCookie = {
  httpOnly: true,
  secure: produccion,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: DURACION_S,
};

/** Usuario con sesión en esta petición (para rutas y páginas del servidor). */
export async function vendedorActual(): Promise<string | null> {
  const { cookies } = await import('next/headers');
  return usuarioDeToken((await cookies()).get(COOKIE)?.value);
}

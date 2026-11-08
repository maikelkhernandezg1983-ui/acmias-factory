import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, usuarioDeToken } from '@/lib/sesion';

/**
 * El portal del vendedor (/) pide usuario y contraseña.
 * Las demos (/d/...) son públicas para mostrarlas al cliente.
 * Las APIs controlan la sesión por su cuenta (ver vendedorActual en lib/sesion).
 */
export function proxy(req: NextRequest) {
  if (usuarioDeToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/ingresar';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/'],
};

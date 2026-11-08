import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, crearToken, faltaConfigurar, opcionesCookie, verificarClave } from '@/lib/sesion';

const intentos = new Map<string, { n: number; desde: number }>();
const VENTANA = 15 * 60_000;

export async function POST(req: NextRequest) {
  const origen = req.headers.get('origin');
  if (origen && new URL(origen).host !== req.headers.get('host')) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  const falta = faltaConfigurar();
  if (falta.length) return NextResponse.json({ error: `El acceso todavía no está configurado. Falta ${falta.join(' y ')} en Vercel.` }, { status: 503 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ahora = Date.now();
  const i = intentos.get(ip);
  const reg = i && ahora - i.desde < VENTANA ? i : { n: 0, desde: ahora };
  if (reg.n >= 8) return NextResponse.json({ error: 'Demasiados intentos. Esperá 15 minutos y volvé a probar.' }, { status: 429 });

  const cuerpo = (await req.json().catch(() => null)) as { usuario?: unknown; clave?: unknown } | null;
  const usuario = typeof cuerpo?.usuario === 'string' ? cuerpo.usuario.slice(0, 60) : '';
  const clave = typeof cuerpo?.clave === 'string' ? cuerpo.clave.slice(0, 200) : '';
  const valido = usuario && clave ? verificarClave(usuario, clave) : null;
  if (!valido) {
    intentos.set(ip, { ...reg, n: reg.n + 1 });
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401 });
  }
  intentos.delete(ip);
  const res = NextResponse.json({ ok: true, usuario: valido });
  res.cookies.set(COOKIE, crearToken(valido), opcionesCookie);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { ...opcionesCookie, maxAge: 0 });
  return res;
}

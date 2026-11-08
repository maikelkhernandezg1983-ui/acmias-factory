import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, claveCorrecta, crearToken, opcionesCookie, panelProtegido } from '@/lib/sesion';

const intentos = new Map<string, { n: number; desde: number }>();

export async function POST(req: NextRequest) {
  if (!panelProtegido()) return NextResponse.json({ ok: true });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ahora = Date.now();
  const i = intentos.get(ip);
  const reg = i && ahora - i.desde < 15 * 60_000 ? i : { n: 0, desde: ahora };
  if (reg.n >= 10) return NextResponse.json({ error: 'Demasiados intentos. Esperá 15 minutos.' }, { status: 429 });
  const cuerpo = (await req.json().catch(() => null)) as { clave?: unknown } | null;
  const clave = typeof cuerpo?.clave === 'string' ? cuerpo.clave : '';
  if (!claveCorrecta(clave)) {
    intentos.set(ip, { ...reg, n: reg.n + 1 });
    return NextResponse.json({ error: 'Clave incorrecta.' }, { status: 401 });
  }
  intentos.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, crearToken(), opcionesCookie);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}

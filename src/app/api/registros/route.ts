import { NextResponse, type NextRequest } from 'next/server';
import { vendedorActual } from '@/lib/sesion';
import { z } from 'zod';
import { avisarSolicitud } from '@/lib/avisos';
import { armarRegistro, crearRegistro, listarRegistros, MAX_LOGO, NuevoRegistro, type Registro } from '@/lib/registros';

/** Orígenes que pueden enviar solicitudes (la landing). Separados por coma en LANDING_ORIGENES. */
const ORIGENES = (process.env.LANDING_ORIGENES ?? 'https://acmias-landing-demo-bmhi.vercel.app,https://acmias-landing-demo.vercel.app,https://acmias.com,https://www.acmias.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function cors(origen: string | null) {
  const h = new Headers({ Vary: 'Origin' });
  if (origen && ORIGENES.includes(origen)) {
    h.set('Access-Control-Allow-Origin', origen);
    h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    h.set('Access-Control-Allow-Headers', 'Content-Type');
    h.set('Access-Control-Max-Age', '86400');
  }
  return h;
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get('origin')) });
}

// GET solo llega con sesión de vendedor: lo controla src/proxy.ts.
export async function GET() {
  if (!(await vendedorActual())) return NextResponse.json({ error: 'Ingresá con tu usuario de vendedor.' }, { status: 401 });
  try {
    return NextResponse.json({ registros: await listarRegistros() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la base de datos.' }, { status: 502 });
  }
}

const limite = new Map<string, { n: number; desde: number }>();

export async function POST(req: NextRequest) {
  const origen = req.headers.get('origin');
  const host = req.headers.get('host');
  const mismo = origen && host && new URL(origen).host === host;
  const h = cors(origen);
  if (!mismo && !(origen && ORIGENES.includes(origen))) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403, headers: h });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ahora = Date.now();
  const l = limite.get(ip);
  const reg = l && ahora - l.desde < 3_600_000 ? l : { n: 0, desde: ahora };
  if (reg.n >= 10) return NextResponse.json({ error: 'Recibimos muchas solicitudes desde tu conexión. Probá más tarde.' }, { status: 429, headers: h });
  limite.set(ip, { ...reg, n: reg.n + 1 });

  if (Number(req.headers.get('content-length') ?? 0) > MAX_LOGO + 20_000) return NextResponse.json({ error: 'El logo pesa demasiado. Probá con uno más liviano.' }, { status: 413, headers: h });
  const cuerpo = await req.json().catch(() => null);
  const datos = NuevoRegistro.safeParse(cuerpo);
  if (!datos.success) {
    const campos = [...new Set(datos.error.issues.map((i) => String(i.path[0] ?? '')))].filter(Boolean);
    return NextResponse.json({ error: 'Revisá los datos del formulario.', campos }, { status: 422, headers: h });
  }
  // Rubro tal como lo eligió en la landing ("Otro"…), solo para el aviso.
  const rubroIndicado = z.string().trim().max(60).optional().catch(undefined).parse((cuerpo as { rubroIndicado?: unknown })?.rubroIndicado);
  let registro: Registro;
  let guardado = true;
  try {
    registro = await crearRegistro(datos.data);
  } catch {
    guardado = false;
    registro = armarRegistro(datos.data);
  }
  // El aviso por mail y WhatsApp al equipo nunca hace fallar el formulario.
  const avisos = await avisarSolicitud(registro, rubroIndicado).catch(() => ({ mail: 'error', whatsapp: 'error' }));
  const avisado = avisos.mail === 'ok' || avisos.whatsapp === 'ok' || avisos.whatsapp === 'parcial';
  if (!guardado && !avisado) return NextResponse.json({ error: 'No pudimos guardar tu solicitud. Probá de nuevo en unos minutos.' }, { status: 502, headers: h });
  return NextResponse.json({ ok: true, id: registro.id, avisado }, { status: 201, headers: h });
}

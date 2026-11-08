import Anthropic from '@anthropic-ai/sdk';
import { ESQUEMA_HERRAMIENTA, INSTRUCCIONES, normalizarMenu } from '@/lib/rubros/restaurante/menu-importado';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'] as const;
// Vercel acepta cuerpos de hasta 4,5 MB en funciones: dejamos margen.
const MAX_BYTES = 4 * 1024 * 1024;
const LIMITE_POR_HORA = 12;

// Límite simple por IP y por instancia. El control fuerte llega con el inicio de sesión del vendedor (BRD 00, P-13).
const usos = new Map<string, number[]>();
function permitido(ip: string) {
  const ahora = Date.now();
  const recientes = (usos.get(ip) ?? []).filter((t) => ahora - t < 3600_000);
  if (recientes.length >= LIMITE_POR_HORA) return false;
  recientes.push(ahora);
  usos.set(ip, recientes);
  if (usos.size > 5000) usos.clear();
  return true;
}

function mismoOrigen(req: Request) {
  const origen = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origen || !host) return false;
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

function error(mensaje: string, status: number) {
  return Response.json({ error: mensaje }, { status });
}

export async function POST(req: Request) {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) {
    return error('La importación con IA todavía no está activada: falta cargar ANTHROPIC_API_KEY en Vercel.', 503);
  }

  if (!mismoOrigen(req)) return error('Origen no permitido.', 403);
  const largo = Number(req.headers.get('content-length') ?? 0);
  if (largo > MAX_BYTES + 64 * 1024) return error('El archivo pesa más de 4 MB. Probá con una foto o un PDF más liviano.', 413);
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  if (!permitido(ip)) return error('Llegaste al límite de importaciones por hora. Probá más tarde.', 429);

  let archivo: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('archivo');
    archivo = f instanceof File ? f : null;
  } catch {
    return error('No se pudo leer el archivo enviado.', 400);
  }
  if (!archivo) return error('Falta el archivo de la carta.', 400);
  if (archivo.size > MAX_BYTES) return error('El archivo pesa más de 4 MB. Probá con una foto o un PDF más liviano.', 413);

  const esPdf = archivo.type === 'application/pdf';
  const esImagen = (TIPOS_IMAGEN as readonly string[]).includes(archivo.type);
  if (!esPdf && !esImagen) return error('Formato no válido: usá una foto (JPG, PNG, WEBP) o un PDF.', 415);

  const datos = Buffer.from(await archivo.arrayBuffer()).toString('base64');
  const contenido: Anthropic.ContentBlockParam = esPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: datos } }
    : { type: 'image', source: { type: 'base64', media_type: archivo.type as (typeof TIPOS_IMAGEN)[number], data: datos } };

  const cliente = new Anthropic({ apiKey: clave });
  try {
    const respuesta = await cliente.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 8000,
      system: INSTRUCCIONES,
      tools: [{ name: 'guardar_menu', description: 'Guarda la carta transcripta.', input_schema: ESQUEMA_HERRAMIENTA }],
      tool_choice: { type: 'tool', name: 'guardar_menu' },
      messages: [{ role: 'user', content: [contenido, { type: 'text', text: 'Transcribí esta carta.' }] }],
    });
    if (respuesta.stop_reason === 'max_tokens') {
      return error('La carta es muy larga para leerla de una vez. Subila por partes (una foto por página).', 422);
    }
    const uso = respuesta.content.find((b) => b.type === 'tool_use');
    if (!uso || uso.type !== 'tool_use') return error('La IA no devolvió una carta. Probá con una foto más nítida.', 502);
    const menu = normalizarMenu(uso.input);
    if (!menu.categorias.length) return error('No encontramos platos en el archivo. Probá con una foto más cerca y con buena luz.', 422);
    return Response.json(menu);
  } catch (e) {
    console.error('importar-menu', e);
    return error('No se pudo conectar con la IA. Intentá de nuevo en un minuto.', 502);
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { vendedorActual } from '@/lib/sesion';
import { crearLimite, error, mismoOrigen } from '@/lib/api-comun';

/**
 * Ferretería (FER-05): la IA solo transcribe la lista de la foto, línea por línea.
 * Nunca ve el catálogo ni los precios: el cruce con productos y precios se hace en el dispositivo.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

const permitido = crearLimite(30);
const Entrada = z.object({ imagen: z.string().max(6_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/) });

const ESQUEMA = {
  type: 'object' as const,
  properties: {
    lineas: {
      type: 'array',
      items: { type: 'string', description: 'Una línea de la lista tal como está escrita: cantidad, unidad si la hay y producto. Ej.: "20 m cable 2,5".' },
    },
    ilegibles: { type: 'integer', description: 'Cuántas líneas no se pudieron leer.' },
  },
  required: ['lineas'],
};

const INSTRUCCIONES = `Sos un empleado de ferretería que transcribe listas de materiales escritas a mano o impresas.
Transcribí cada renglón tal como está, en español, uno por elemento: cantidad, unidad (si figura) y producto con su medida.
No inventes productos, marcas, medidas ni precios. No agregues nada que no esté escrito. Si un renglón es ilegible, no lo pongas y sumalo en "ilegibles".
Ignorá saludos, firmas, fechas y precios escritos.`;

export async function POST(req: Request) {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return error('Leer fotos con IA todavía no está activado: falta cargar ANTHROPIC_API_KEY en Vercel. Mientras tanto, pegá la lista como texto o usá la lista de ejemplo.', 503);
  if (!mismoOrigen(req)) return error('Origen no permitido.', 403);
  if (!(await vendedorActual())) return error('Para leer fotos con IA, el vendedor tiene que ingresar con su usuario en este dispositivo.', 401);
  if (!permitido(req)) return error('Llegaste al límite de fotos por hora. Probá más tarde o pegá la lista como texto.', 429);
  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success) return error('No pudimos leer la imagen. Probá con una foto JPG o PNG de menos de 4 MB.', 400);

  const [, tipo, b64] = datos.data.imagen.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/)!;
  const cliente = new Anthropic({ apiKey: clave });
  try {
    const r = await cliente.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 2000,
      system: INSTRUCCIONES,
      tools: [{ name: 'guardar_lista', description: 'Guarda los renglones leídos de la lista.', input_schema: ESQUEMA }],
      tool_choice: { type: 'tool', name: 'guardar_lista' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: `image/${tipo}` as 'image/png' | 'image/jpeg' | 'image/webp', data: b64 } },
            { type: 'text', text: 'Transcribí esta lista de materiales.' },
          ],
        },
      ],
    });
    const uso = r.content.find((b) => b.type === 'tool_use');
    if (!uso || uso.type !== 'tool_use') return error('No encontramos una lista en la foto.', 422);
    const res = z.object({ lineas: z.array(z.string().max(200)).max(80), ilegibles: z.number().int().min(0).optional() }).safeParse(uso.input);
    if (!res.success || !res.data.lineas.length) return error('No encontramos renglones legibles en la foto. Probá con más luz o pegá la lista como texto.', 422);
    return Response.json({ texto: res.data.lineas.join('\n'), ilegibles: res.data.ilegibles ?? 0 });
  } catch (e) {
    console.error('leer-lista', e);
    return error('No se pudo conectar con la IA. Intentá de nuevo en un minuto.', 502);
  }
}

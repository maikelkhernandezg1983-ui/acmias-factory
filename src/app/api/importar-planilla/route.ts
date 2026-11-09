import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { vendedorActual } from '@/lib/sesion';
import { crearLimite, error, mismoOrigen } from '@/lib/api-comun';
import { ESQUEMA_PLANILLA, INSTRUCCIONES_PLANILLA, normalizarPlanilla } from '@/lib/rubros/repuestos/planilla-importada';

export const runtime = 'nodejs';
export const maxDuration = 60;

const permitido = crearLimite(12);
const MAX_FILAS = 300;

const Entrada = z.object({
  filas: z.array(z.array(z.string().max(300)).max(15)).min(1).max(MAX_FILAS),
});

export async function POST(req: Request) {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return error('La importación con IA todavía no está activada: falta cargar ANTHROPIC_API_KEY en Vercel.', 503);
  if (!mismoOrigen(req)) return error('Origen no permitido.', 403);
  if (!(await vendedorActual())) return error('Para importar la planilla, el vendedor tiene que ingresar con su usuario en este dispositivo.', 401);
  if (Number(req.headers.get('content-length') ?? 0) > 400_000) return error('La planilla es muy grande. Subí hasta 300 filas por vez.', 413);
  if (!permitido(req)) return error('Llegaste al límite de importaciones por hora. Probá más tarde.', 429);

  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success) return error(`No pudimos leer las filas. Subí hasta ${MAX_FILAS} filas por vez.`, 400);

  const texto = datos.data.filas.map((f, i) => `${i + 1}\t${f.join('\t')}`).join('\n');
  const cliente = new Anthropic({ apiKey: clave });
  try {
    const r = await cliente.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 16000,
      system: INSTRUCCIONES_PLANILLA,
      tools: [{ name: 'guardar_catalogo', description: 'Guarda las piezas leídas de la planilla.', input_schema: ESQUEMA_PLANILLA }],
      tool_choice: { type: 'tool', name: 'guardar_catalogo' },
      messages: [{ role: 'user', content: `Filas de la planilla (separadas por tabulación):\n\n${texto}` }],
    });
    if (r.stop_reason === 'max_tokens') return error('La planilla es muy larga para leerla de una vez. Subila por partes (hasta 150 filas).', 422);
    const uso = r.content.find((b) => b.type === 'tool_use');
    if (!uso || uso.type !== 'tool_use') return error('La IA no devolvió piezas. Revisá que la planilla tenga descripciones.', 502);
    const res = normalizarPlanilla(uso.input);
    if (!res.piezas.length) return error('No encontramos piezas en la planilla.', 422);
    return Response.json(res);
  } catch (e) {
    console.error('importar-planilla', e);
    return error('No se pudo conectar con la IA. Intentá de nuevo en un minuto.', 502);
  }
}

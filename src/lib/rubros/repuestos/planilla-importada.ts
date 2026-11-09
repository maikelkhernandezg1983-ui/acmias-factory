import { z } from 'zod';
import type { CategoriaRep } from './tipos';

/** Lo que devuelve la IA al leer la planilla del local. Se valida fila por fila antes de mostrarlo. */
const CATS = ['filtros', 'frenos', 'encendido', 'suspension', 'distribucion', 'lubricantes'] as const;
const txt = (n: number) => z.string().transform((s) => s.trim().slice(0, n));
const confianza = z.number().catch(0.5).transform((c) => Math.min(1, Math.max(0, c)));

export const CompatSugerida = z.object({
  marca: txt(30).pipe(z.string().min(1)),
  modelo: txt(40).pipe(z.string().min(1)),
  motor: txt(30).catch(''),
  desde: z.number().int().min(1950).max(2035).nullable().catch(null),
  hasta: z.number().int().min(1950).max(2035).nullable().catch(null),
  confianza,
});

export const PiezaImportada = z.object({
  codigo: txt(30).pipe(z.string().min(1)),
  nombre: txt(80).pipe(z.string().min(1)),
  categoria: z.enum(CATS).catch('filtros' as CategoriaRep),
  marca: txt(40).catch(''),
  origen: z.enum(['original', 'alternativo']).catch('alternativo'),
  precio: z.number().nonnegative().finite().nullable().catch(null),
  stock: z.number().int().nonnegative().nullable().catch(null),
  compat: z.array(z.unknown()).catch([]).transform((xs) => xs.slice(0, 12).map((x) => CompatSugerida.safeParse(x)).filter((r) => r.success).map((r) => r.data!)),
  confianza,
});

export type TPiezaImportada = z.infer<typeof PiezaImportada>;
export type TCompatSugerida = z.infer<typeof CompatSugerida>;

export function normalizarPlanilla(entrada: unknown): { piezas: TPiezaImportada[]; descartadas: number } {
  const lista = (entrada as { piezas?: unknown })?.piezas;
  const piezas: TPiezaImportada[] = [];
  let descartadas = 0;
  if (!Array.isArray(lista)) return { piezas, descartadas };
  for (const p of lista.slice(0, 400)) {
    const r = PiezaImportada.safeParse(p);
    if (r.success) piezas.push(r.data);
    else descartadas++;
  }
  return { piezas, descartadas };
}

export const ESQUEMA_PLANILLA = {
  type: 'object' as const,
  properties: {
    piezas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string', description: 'Código del local tal como aparece. Si no hay, armá uno corto con letras y números de la descripción.' },
          nombre: { type: 'string', description: 'Nombre limpio de la pieza, sin el vehículo (ej. "Filtro de aceite").' },
          categoria: { type: 'string', enum: [...CATS] },
          marca: { type: 'string', description: 'Marca de la pieza si figura; si no, cadena vacía.' },
          origen: { type: 'string', enum: ['original', 'alternativo'], description: '"original" solo si la planilla lo dice (original, OEM de fábrica, genuino).' },
          precio: { type: ['number', 'null'], description: 'Precio numérico sin símbolos ni separador de miles; null si no hay.' },
          stock: { type: ['integer', 'null'], description: 'Unidades si figuran; null si no.' },
          compat: {
            type: 'array',
            description: 'Vehículos que se deducen de la descripción. No inventar: solo lo que el texto dice o abrevia.',
            items: {
              type: 'object',
              properties: {
                marca: { type: 'string' },
                modelo: { type: 'string' },
                motor: { type: 'string', description: 'Cilindrada y combustible si se deducen (ej. "1.6 nafta"); si no, cadena vacía.' },
                desde: { type: ['integer', 'null'], description: 'Año de 4 dígitos. "98" es 1998, "05" es 2005.' },
                hasta: { type: ['integer', 'null'] },
                confianza: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['marca', 'modelo', 'motor', 'desde', 'hasta', 'confianza'],
            },
          },
          confianza: { type: 'number', minimum: 0, maximum: 1, description: 'Qué tan seguro estás de código, nombre, categoría y precio.' },
        },
        required: ['codigo', 'nombre', 'categoria', 'marca', 'origen', 'precio', 'stock', 'compat', 'confianza'],
      },
    },
  },
  required: ['piezas'],
};

export const INSTRUCCIONES_PLANILLA = `Sos el asistente de carga de catálogo de una casa de repuestos de autos.
Recibís las filas de la planilla del local (pueden venir desordenadas, con abreviaturas y sin encabezados claros).
Para cada fila que sea una pieza, devolvé código, nombre limpio, categoría, marca, origen, precio, stock y las compatibilidades que se deducen del texto
(ej. "Filtro aceite Corsa 1.6 98-05" → marca del auto, modelo "Corsa", motor "1.6", desde 1998, hasta 2005).
Reglas: no inventes datos que no estén o no se deduzcan con claridad; si dudás, bajá la confianza. Ignorá filas de títulos, totales o vacías.
Una persona revisa todo antes de publicarlo.`;

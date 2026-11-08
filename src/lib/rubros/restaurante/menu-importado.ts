import { z } from 'zod';

/** Esquema que devuelve la IA al leer una carta. Se valida siempre antes de mostrarlo. */
const ETQ = ['vegano', 'vegetariano', 'sin-tacc', 'picante'] as const;
const recortar = (n: number) => z.string().transform((s) => s.trim().slice(0, n));

export const PlatoImportado = z.object({
  nombre: recortar(80).pipe(z.string().min(1)),
  descripcion: recortar(240).catch(''),
  precio: z.number().nonnegative().finite().nullable().catch(null),
  etiquetas: z.array(z.string()).catch([]).transform((xs) => xs.filter((x): x is (typeof ETQ)[number] => (ETQ as readonly string[]).includes(x))),
  confianza: z.number().catch(0.5).transform((c) => Math.min(1, Math.max(0, c))),
});

export type TPlatoImportado = z.infer<typeof PlatoImportado>;
export interface TMenuImportado {
  categorias: { nombre: string; platos: TPlatoImportado[] }[];
  descartados: number;
}

/** Valida plato por plato: un plato raro se descarta, no tira abajo toda la carta. */
export function normalizarMenu(entrada: unknown): TMenuImportado {
  const cats = (entrada as { categorias?: unknown })?.categorias;
  let descartados = 0;
  const categorias: TMenuImportado['categorias'] = [];
  if (!Array.isArray(cats)) return { categorias, descartados };
  for (const c of cats.slice(0, 40)) {
    const nombre = typeof c?.nombre === 'string' && c.nombre.trim() ? c.nombre.trim().slice(0, 60) : 'Carta';
    const platos: TPlatoImportado[] = [];
    for (const p of Array.isArray(c?.platos) ? c.platos.slice(0, 150) : []) {
      const r = PlatoImportado.safeParse(p);
      if (r.success) platos.push(r.data);
      else descartados++;
    }
    if (platos.length) categorias.push({ nombre, platos });
  }
  return { categorias, descartados };
}

export const ESQUEMA_HERRAMIENTA = {
  type: 'object' as const,
  properties: {
    categorias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre de la categoría tal como aparece en la carta.' },
          platos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string', description: 'Máximo 80 caracteres.' },
                descripcion: { type: 'string', description: 'Descripción si la carta la trae (máximo 240 caracteres); si no, cadena vacía. No inventar.' },
                precio: { type: ['number', 'null'], description: 'Precio numérico sin símbolo ni separador de miles. null si no se lee.' },
                etiquetas: { type: 'array', items: { type: 'string', enum: ['vegano', 'vegetariano', 'sin-tacc', 'picante'] }, description: 'Solo si la carta lo indica explícitamente.' },
                confianza: { type: 'number', minimum: 0, maximum: 1, description: 'De 0 a 1: qué tan seguro estás de nombre y precio.' },
              },
              required: ['nombre', 'descripcion', 'precio', 'etiquetas', 'confianza'],
            },
          },
        },
        required: ['nombre', 'platos'],
      },
    },
  },
  required: ['categorias'],
};

export const INSTRUCCIONES = `Sos un asistente que transcribe cartas de restaurantes.
Leé la imagen o el PDF de la carta y devolvé TODOS los platos con la herramienta guardar_menu.
Reglas:
- Transcribí nombres y precios tal como están. No inventes platos, precios ni descripciones.
- Si un precio no se lee con claridad, usá null y bajá la confianza.
- Interpretá separadores de miles y decimales según el contexto (ej.: "12.500" es doce mil quinientos).
- Etiquetas solo si la carta lo dice (íconos o texto como "vegano", "sin TACC", "picante").
- Confianza baja (menos de 0,7) si el texto está borroso, cortado o es ambiguo.`;

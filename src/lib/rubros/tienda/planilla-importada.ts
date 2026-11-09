import { z } from 'zod';

/** Lo que devuelve la IA al leer la planilla de una tienda: productos con sus variantes. */
const txt = (n: number) => z.string().transform((s) => s.trim().slice(0, n));
const confianza = z.number().catch(0.5).transform((c) => Math.min(1, Math.max(0, c)));

export const VarianteImportada = z.object({
  talle: txt(12).catch(''),
  color: txt(24).catch(''),
  stock: z.number().int().nonnegative().nullable().catch(null),
  codigoBarras: z.string().transform((s) => s.replace(/\D/g, '').slice(0, 14)).catch(''),
});

export const ProductoImportado = z.object({
  nombre: txt(80).pipe(z.string().min(1)),
  categoria: txt(40).catch('General'),
  precio: z.number().nonnegative().finite().nullable().catch(null),
  variantes: z.array(z.unknown()).catch([]).transform((xs) => xs.slice(0, 40).map((x) => VarianteImportada.safeParse(x)).filter((r) => r.success).map((r) => r.data!)),
  confianza,
});
export type TProductoImportado = z.infer<typeof ProductoImportado>;

export function normalizarPlanillaTienda(entrada: unknown) {
  const lista = (entrada as { productos?: unknown })?.productos;
  const productos: TProductoImportado[] = [];
  let descartadas = 0;
  if (!Array.isArray(lista)) return { productos, descartadas };
  for (const p of lista.slice(0, 400)) {
    const r = ProductoImportado.safeParse(p);
    if (r.success) productos.push(r.data);
    else descartadas++;
  }
  return { productos, descartadas };
}

export const ESQUEMA_PLANILLA_TIENDA = {
  type: 'object' as const,
  properties: {
    productos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre del producto sin talle ni color (ej. "Remera lisa").' },
          categoria: { type: 'string', description: 'Categoría corta (ej. Remeras, Regalería, Bebidas). Usá la de la planilla si existe.' },
          precio: { type: ['number', 'null'], description: 'Precio de venta numérico; null si no hay.' },
          variantes: {
            type: 'array',
            description: 'Una por cada combinación de talle y color de la planilla. Si el producto no tiene talles ni colores, una sola variante con talle y color vacíos.',
            items: {
              type: 'object',
              properties: {
                talle: { type: 'string' },
                color: { type: 'string' },
                stock: { type: ['integer', 'null'] },
                codigoBarras: { type: 'string', description: 'Solo dígitos, si figura; si no, cadena vacía.' },
              },
              required: ['talle', 'color', 'stock', 'codigoBarras'],
            },
          },
          confianza: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['nombre', 'categoria', 'precio', 'variantes', 'confianza'],
      },
    },
  },
  required: ['productos'],
};

export const INSTRUCCIONES_PLANILLA_TIENDA = `Sos el asistente de carga de catálogo de una tienda (ropa, regalería o almacén).
Recibís las filas de la planilla del local, que pueden repetir el producto en varias filas (una por talle o color).
Agrupá las filas del mismo producto y devolvé sus variantes con talle, color, stock y código de barras.
No inventes datos; si dudás, bajá la confianza. Ignorá títulos, totales y filas vacías. Una persona revisa todo antes de publicarlo.`;

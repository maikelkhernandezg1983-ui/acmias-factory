import type { Categoria, DemoEstado, Pedido, Plato } from '@/lib/tipos';

/** Versión de los datos de ejemplo. Subirla regenera las demos que no tengan cambios. */
export const VERSION_DATOS = 2;

/**
 * Precios de ejemplo en una "unidad base" que se escala por moneda.
 * Son ilustrativos: nunca se muestran como precios reales de un local.
 */
const FACTOR_MONEDA: Record<string, number> = {
  USD: 1, EUR: 1, ARS: 1400, MXN: 18, COP: 4000, CLP: 950, PEN: 3.7, UYU: 40, BOB: 7, PYG: 7500, GTQ: 7.7, DOP: 60,
};

export const MONEDAS = Object.keys(FACTOR_MONEDA);

function redondear(v: number) {
  if (v < 20) return Math.round(v * 2) / 2;
  const paso = v < 200 ? 5 : v < 2000 ? 50 : v < 20000 ? 100 : 500;
  return Math.round(v / paso) * paso;
}

export function precioEjemplo(base: number, moneda: string) {
  return redondear(base * (FACTOR_MONEDA[moneda] ?? 1));
}


/**
 * Fotos de ejemplo de Unsplash (licencia Unsplash: uso comercial libre, sin atribución obligatoria).
 * Solo fotos verificadas como gratuitas (no Unsplash+). Si una no carga, la carta muestra la ilustración.
 */
const U = (id: string, w = 720) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
export const FOTO_PORTADA = U('photo-1749871615234-98bff62995ba', 1600);
const FOTOS: Record<string, string> = {
  p1: U('photo-1788172400221-6d7d417ee75f'),
  p2: U('photo-1464500650248-1a4b45debb9f'),
  p4: U('photo-1679449223735-444c4f71f0dd'),
  p5: U('photo-1613769049987-b31b641f25b1'),
  p6: U('photo-1637633801971-0b9231088347'),
  p8: U('photo-1704283735270-f973e7e9c14e'),
  p10: U('photo-1473093295043-cdd812d0e601'),
  p11: U('photo-1522251253478-4cae03d93949'),
  p12: U('photo-1542354254-d856f94968ea'),
  p13: U('photo-1560971017-e22e6a4fbefd'),
  p14: U('photo-1692737348416-0a4fa4cf1523'),
  p16: U('photo-1687030047985-9e7fff0739b6'),
  p17: U('photo-1597648152428-f883fbc9c873'),
  p19: U('photo-1675576628703-dd13ee3f87b8'),
  p20: U('photo-1600271886742-f049cd451bba'),
  p21: U('photo-1704283735270-f973e7e9c14e'),
  p22: U('photo-1788172400221-6d7d417ee75f'),
};

/** Foto de ejemplo para un plato de la carta de muestra (undefined si no tiene). */
export const fotoEjemplo = (id: string): string | undefined => FOTOS[id];

export const CATEGORIAS: Categoria[] = [
  { id: 'del-dia', nombre: 'Del día', ilustracion: 'plato' },
  { id: 'desayunos', nombre: 'Desayunos', ilustracion: 'medialuna' },
  { id: 'cafeteria', nombre: 'Cafetería', ilustracion: 'cafe' },
  { id: 'platos', nombre: 'Platos', ilustracion: 'pasta' },
  { id: 'burgers', nombre: 'Burgers y sándwiches', ilustracion: 'burger' },
  { id: 'postres', nombre: 'Postres', ilustracion: 'postre' },
  { id: 'bebidas', nombre: 'Bebidas', ilustracion: 'bebida' },
  { id: 'combos', nombre: 'Combos', ilustracion: 'combo' },
];

type Base = Omit<Plato, 'precio'> & { base: number };

const PLATOS: Base[] = [
  { id: 'p1', categoria: 'del-dia', nombre: 'Milanesa con puré', descripcion: 'Milanesa de ternera a la napolitana con puré de papas casero.', base: 9.5, etiquetas: [], alergenos: ['gluten', 'huevo', 'lácteos'], ilustracion: 'plato', destacado: true },
  { id: 'p2', categoria: 'del-dia', nombre: 'Wok de vegetales', descripcion: 'Vegetales salteados con salsa de soja, jengibre y arroz jazmín.', base: 8, etiquetas: ['vegano'], alergenos: ['soja'], ilustracion: 'wok', destacado: true },
  { id: 'p3', categoria: 'desayunos', nombre: 'Tostado de jamón y queso', descripcion: 'En pan de molde artesanal, con un toque de manteca.', base: 4.5, etiquetas: [], alergenos: ['gluten', 'lácteos'], ilustracion: 'tostado' },
  { id: 'p4', categoria: 'desayunos', nombre: 'Medialunas x3', descripcion: 'De manteca, horneadas cada mañana.', base: 3, etiquetas: ['vegetariano'], alergenos: ['gluten', 'lácteos', 'huevo'], ilustracion: 'medialuna' },
  { id: 'p5', categoria: 'desayunos', nombre: 'Tostadas con palta y huevo', descripcion: 'Pan de masa madre, palta pisada, huevo poché y semillas.', base: 6.5, etiquetas: ['vegetariano', 'nuevo'], alergenos: ['gluten', 'huevo'], ilustracion: 'tostado' },
  { id: 'p6', categoria: 'cafeteria', nombre: 'Espresso', descripcion: 'Doble, de tueste medio.', base: 1.8, etiquetas: ['vegano'], alergenos: [], ilustracion: 'cafe' },
  { id: 'p7', categoria: 'cafeteria', nombre: 'Cortado', descripcion: 'Espresso con un toque de leche.', base: 2, etiquetas: ['vegetariano'], alergenos: ['lácteos'], ilustracion: 'cafe' },
  { id: 'p8', categoria: 'cafeteria', nombre: 'Flat white', descripcion: 'Doble espresso con leche texturizada.', base: 2.8, etiquetas: ['vegetariano'], alergenos: ['lácteos'], ilustracion: 'cafe' },
  { id: 'p9', categoria: 'cafeteria', nombre: 'Latte de vainilla', descripcion: 'Con leche entera o vegetal.', base: 3.2, etiquetas: ['vegetariano'], alergenos: ['lácteos'], ilustracion: 'cafe' },
  { id: 'p10', categoria: 'platos', nombre: 'Pasta al pesto', descripcion: 'Fusilli con pesto de albahaca, piñones y parmesano.', base: 8.5, etiquetas: ['vegetariano'], alergenos: ['gluten', 'lácteos', 'frutos secos'], ilustracion: 'pasta' },
  { id: 'p11', categoria: 'platos', nombre: 'Ensalada César', descripcion: 'Lechuga, pollo grillado, croutons y aderezo César.', base: 7.5, etiquetas: [], alergenos: ['gluten', 'huevo', 'lácteos', 'pescado'], ilustracion: 'ensalada' },
  { id: 'p12', categoria: 'platos', nombre: 'Bowl de quinoa', descripcion: 'Quinoa, garbanzos, vegetales asados y hummus.', base: 7.8, etiquetas: ['vegano', 'sin-tacc'], alergenos: ['sésamo'], ilustracion: 'ensalada' },
  { id: 'p13', categoria: 'burgers', nombre: 'Burger doble de la casa', descripcion: 'Dos medallones, cheddar, cebolla caramelizada y papas.', base: 10.5, etiquetas: [], alergenos: ['gluten', 'lácteos'], ilustracion: 'burger', destacado: true },
  { id: 'p14', categoria: 'burgers', nombre: 'Sándwich de pollo grillado', descripcion: 'Pollo marinado, rúcula, tomate y mayonesa de ajo.', base: 8, etiquetas: [], alergenos: ['gluten', 'huevo'], ilustracion: 'sandwich' },
  { id: 'p15', categoria: 'burgers', nombre: 'Wrap veggie picante', descripcion: 'Falafel, vegetales frescos y salsa picante.', base: 7.2, etiquetas: ['vegano', 'picante'], alergenos: ['gluten', 'sésamo'], ilustracion: 'sandwich' },
  { id: 'p16', categoria: 'postres', nombre: 'Cheesecake de frutos rojos', descripcion: 'Base de galleta y coulis casero.', base: 4.8, etiquetas: ['vegetariano'], alergenos: ['gluten', 'lácteos', 'huevo'], ilustracion: 'postre' },
  { id: 'p17', categoria: 'postres', nombre: 'Brownie sin TACC', descripcion: 'Con nueces y helado de crema.', base: 4.5, etiquetas: ['sin-tacc', 'vegetariano'], alergenos: ['lácteos', 'huevo', 'frutos secos'], ilustracion: 'postre' },
  { id: 'p18', categoria: 'postres', nombre: 'Flan casero', descripcion: 'Con dulce de leche o crema.', base: 3.8, etiquetas: ['vegetariano', 'sin-tacc'], alergenos: ['lácteos', 'huevo'], ilustracion: 'postre', agotado: true },
  { id: 'p19', categoria: 'bebidas', nombre: 'Limonada con menta', descripcion: 'Exprimida en el momento. Jarra o vaso.', base: 3, etiquetas: ['vegano', 'sin-tacc'], alergenos: [], ilustracion: 'bebida' },
  { id: 'p20', categoria: 'bebidas', nombre: 'Jugo de naranja', descripcion: 'Naranjas exprimidas, sin azúcar agregada.', base: 3.2, etiquetas: ['vegano', 'sin-tacc'], alergenos: [], ilustracion: 'bebida' },
  { id: 'p21', categoria: 'combos', nombre: 'Desayuno completo', descripcion: 'Café a elección, jugo de naranja y tostado o medialunas.', base: 8.5, etiquetas: [], alergenos: ['gluten', 'lácteos'], ilustracion: 'combo' },
  { id: 'p22', categoria: 'combos', nombre: 'Almuerzo ejecutivo', descripcion: 'Plato del día, bebida y postre del día.', base: 13, etiquetas: [], alergenos: ['gluten', 'lácteos', 'huevo'], ilustracion: 'combo' },
];

function pedidosDeEjemplo(platos: Plato[]): Pedido[] {
  const hoy = new Date();
  const por = (id: string) => platos.find((p) => p.id === id)!;
  const crear = (h: number, m: number, modo: Pedido['modo'], items: [string, number][], mesa?: number): Pedido => {
    const fecha = new Date(hoy);
    fecha.setHours(h, m, 0, 0);
    const its = items.map(([id, cantidad]) => ({ platoId: id, nombre: por(id).nombre, cantidad, precio: por(id).precio, nota: '' }));
    return {
      id: `ej-${h}${m}`,
      fecha: fecha.toISOString(),
      modo,
      mesa,
      items: its,
      total: its.reduce((s, i) => s + i.precio * i.cantidad, 0),
      ejemplo: true,
    };
  };
  return [
    crear(9, 12, 'mesa', [['p8', 2], ['p4', 1]], 3),
    crear(9, 40, 'llevar', [['p21', 1]]),
    crear(12, 15, 'mesa', [['p1', 2], ['p19', 2]], 6),
    crear(12, 50, 'delivery', [['p13', 2], ['p20', 1]]),
    crear(13, 20, 'mesa', [['p22', 3]], 1),
    crear(13, 45, 'delivery', [['p12', 1], ['p15', 1]]),
  ];
}

export function crearEstadoInicial(moneda: string): DemoEstado {
  const platos: Plato[] = PLATOS.map(({ base, ...p }) => ({ ...p, foto: FOTOS[p.id], precio: precioEjemplo(base, moneda) }));
  const vistas: Record<string, number> = { p1: 41, p13: 37, p2: 22, p8: 30, p21: 19, p10: 15, p16: 12, p5: 18, p12: 9 };
  return { version: VERSION_DATOS, categorias: CATEGORIAS, platos, pedidos: pedidosDeEjemplo(platos), vistas };
}

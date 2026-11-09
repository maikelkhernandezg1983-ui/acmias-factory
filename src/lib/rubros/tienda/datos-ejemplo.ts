import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import type { EstadoTienda, IconoProducto, Movimiento, PedidoTienda, Producto, Variante, VarianteTienda } from './tipos';

export const VERSION_TIENDA = 1;

const U = (id: string, w = 720) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
export const FOTO_PORTADA_TIENDA = U('photo-1416339698674-4f118dd3388b', 1600);

/** EAN-13 ficticio con dígito verificador válido (prefijo 779, sin productos reales). */
function ean(n: number) {
  const base = `779${String(100000000 + n).slice(-9)}`;
  const suma = [...base].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (suma % 10)) % 10);
}

/** Generador pseudoaleatorio con semilla: los datos de ejemplo salen siempre iguales. */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Def = {
  nombre: string;
  categoria: string;
  base: number;
  icono: IconoProducto;
  foto?: string;
  descripcion?: string;
  destacado?: boolean;
  talles?: string[];
  colores?: [string, string][];
  /** Ventas por semana de cada variante (para armar el historial). */
  rotacion: number;
  stock?: (talle?: string, color?: string) => number;
  minimo?: number;
  vencimientos?: number[]; // días desde hoy, uno por lote
};

const MODA: Def[] = [
  {
    nombre: 'Remera básica', categoria: 'Remeras', base: 18, icono: 'remera', foto: U('photo-1499971442178-8c10fdf5f6ac'), destacado: true,
    descripcion: 'Algodón peinado 24/1, corte recto. La que más sale.',
    talles: ['S', 'M', 'L', 'XL'], colores: [['Negro', '#1d1d1f'], ['Blanco', '#f4f4f2'], ['Verde oliva', '#6b7046'], ['Arena', '#d8c7a5']],
    rotacion: 40, minimo: 3,
    stock: (t, c) => (c === 'Negro' && t === 'M' ? 2 : c === 'Arena' && t === 'XL' ? 0 : t === 'M' || t === 'L' ? 7 : 4),
  },
  {
    nombre: 'Jean recto', categoria: 'Pantalones', base: 45, icono: 'pantalon', foto: U('photo-1640336437301-8368b53861ab'), destacado: true,
    descripcion: 'Denim rígido azul clásico, tiro medio.',
    talles: ['36', '38', '40', '42', '44', '46'], colores: [['Azul', '#2f4a73']], rotacion: 10, minimo: 2,
    stock: (t) => (t === '40' ? 1 : t === '46' ? 0 : 5),
  },
  {
    nombre: 'Buzo canguro', categoria: 'Abrigo', base: 38, icono: 'buzo', descripcion: 'Frisa invierno con capucha y bolsillo canguro.',
    talles: ['S', 'M', 'L', 'XL'], colores: [['Gris melange', '#9a9ca0'], ['Negro', '#1d1d1f']], rotacion: 8, minimo: 2, stock: () => 4,
  },
  { nombre: 'Gorro de lana', categoria: 'Abrigo', base: 15, icono: 'gorro', colores: [['Negro', '#1d1d1f'], ['Rojo', '#b3261e']], rotacion: 0, minimo: 1, stock: () => 6 },
  { nombre: 'Taza estampada', categoria: 'Regalería', base: 9, icono: 'taza', foto: U('photo-1570059560477-d61ca8bfda33'), destacado: true, descripcion: 'Cerámica 350 ml, apta microondas.', rotacion: 6, minimo: 4, stock: () => 12 },
  { nombre: 'Vela aromática', categoria: 'Regalería', base: 12, icono: 'vela', foto: U('photo-1757688525739-8d1e13daf44f'), descripcion: 'Cera de soja en frasco de vidrio, 40 h.', colores: [['Vainilla', '#efe2c4'], ['Lavanda', '#b9a6d6']], rotacion: 5, minimo: 3, stock: (_t, c) => (c === 'Lavanda' ? 3 : 8) },
  { nombre: 'Tote de lona', categoria: 'Accesorios', base: 14, icono: 'bolso', colores: [['Crudo', '#e9e1cf'], ['Negro', '#1d1d1f']], rotacion: 3, minimo: 2, stock: () => 5 },
  { nombre: 'Aros de acero', categoria: 'Accesorios', base: 11, icono: 'aros', descripcion: 'Acero quirúrgico, no se oscurecen.', rotacion: 0, minimo: 2, stock: () => 9 },
];

const ALMACEN: Def[] = [
  { nombre: 'Agua mineral 1,5 L', categoria: 'Bebidas', base: 1.2, icono: 'bebida', rotacion: 14, minimo: 12, stock: () => 30 },
  { nombre: 'Gaseosa cola 2,25 L', categoria: 'Bebidas', base: 2.6, icono: 'bebida', destacado: true, rotacion: 12, minimo: 10, stock: () => 8 },
  { nombre: 'Jugo de naranja 1 L', categoria: 'Bebidas', base: 1.9, icono: 'bebida', rotacion: 5, minimo: 6, stock: () => 10 },
  { nombre: 'Alfajor triple', categoria: 'Golosinas', base: 0.9, icono: 'golosina', destacado: true, rotacion: 20, minimo: 15, stock: () => 40 },
  { nombre: 'Chocolate con leche 100 g', categoria: 'Golosinas', base: 2.2, icono: 'golosina', rotacion: 6, minimo: 6, stock: () => 14 },
  { nombre: 'Caramelos surtidos 150 g', categoria: 'Golosinas', base: 1.1, icono: 'golosina', rotacion: 0, minimo: 4, stock: () => 11 },
  { nombre: 'Arroz largo fino 1 kg', categoria: 'Almacén', base: 1.5, icono: 'almacen', rotacion: 7, minimo: 8, stock: () => 18 },
  { nombre: 'Fideos guiseros 500 g', categoria: 'Almacén', base: 1.0, icono: 'almacen', rotacion: 9, minimo: 10, stock: () => 22 },
  { nombre: 'Aceite de girasol 1,5 L', categoria: 'Almacén', base: 3.4, icono: 'almacen', rotacion: 6, minimo: 6, stock: () => 4 },
  { nombre: 'Yerba mate 1 kg', categoria: 'Almacén', base: 4.2, icono: 'almacen', destacado: true, rotacion: 8, minimo: 8, stock: () => 15 },
  { nombre: 'Detergente 750 ml', categoria: 'Limpieza', base: 1.8, icono: 'limpieza', rotacion: 4, minimo: 4, stock: () => 9 },
  { nombre: 'Lavandina 1 L', categoria: 'Limpieza', base: 0.9, icono: 'limpieza', rotacion: 0, minimo: 3, stock: () => 12 },
  { nombre: 'Leche entera 1 L', categoria: 'Lácteos', base: 1.1, icono: 'lacteo', rotacion: 18, minimo: 12, stock: () => 20, vencimientos: [3, 9] },
  { nombre: 'Yogur bebible frutilla 1 L', categoria: 'Lácteos', base: 2.0, icono: 'lacteo', destacado: true, rotacion: 5, minimo: 4, stock: () => 7, vencimientos: [5, 16] },
  { nombre: 'Queso cremoso por kg', categoria: 'Lácteos', base: 8.5, icono: 'lacteo', rotacion: 3, minimo: 2, stock: () => 3, vencimientos: [20] },
  { nombre: 'Manteca 200 g', categoria: 'Lácteos', base: 2.4, icono: 'lacteo', rotacion: 4, minimo: 4, stock: () => 6, vencimientos: [-1, 25] },
];

const diaISO = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

export function crearEstadoTienda(moneda: string, variante: VarianteTienda = 'moda'): EstadoTienda {
  const defs = variante === 'almacen' ? ALMACEN : MODA;
  const rnd = azar(variante === 'almacen' ? 77 : 42);
  let nEan = variante === 'almacen' ? 5000 : 1000;
  const productos: Producto[] = [];
  const movimientos: Movimiento[] = [];
  const ahora = Date.now();

  defs.forEach((d, i) => {
    const talles = d.talles ?? [undefined];
    const colores = d.colores ?? [[undefined, undefined] as unknown as [string, string]];
    const pid = `t${i + 1}`;
    const precio = precioEjemplo(d.base, moneda);
    const variantes: Variante[] = [];
    for (const [color, hex] of colores) {
      for (const talle of talles) {
        const stock = d.stock?.(talle, color) ?? 5;
        const v: Variante = {
          id: `${pid}-${variantes.length + 1}`,
          talle,
          color,
          colorHex: hex,
          stock,
          minimo: d.minimo ?? 2,
          codigoBarras: ean(nEan++),
        };
        if (d.vencimientos) {
          const partes = d.vencimientos.length;
          v.lotes = d.vencimientos.map((dias, k) => ({
            id: `${v.id}-L${k + 1}`,
            vence: diaISO(dias),
            cantidad: k === partes - 1 ? stock - Math.floor(stock / partes) * (partes - 1) : Math.floor(stock / partes),
          }));
        }
        variantes.push(v);
        // Historial de 28 días: ventas de mostrador y de WhatsApp según la rotación.
        const porSemana = d.rotacion / (talles.length * colores.length) * (talle === 'M' || talle === 'L' ? 1.6 : talle ? 0.7 : 1);
        for (let dia = 28; dia >= 1; dia--) {
          const esperado = porSemana / 7;
          let n = Math.floor(esperado) + (rnd() < esperado % 1 ? 1 : 0);
          if (d.rotacion === 0) n = 0;
          for (let k = 0; k < n; k++) {
            const hora = 10 + Math.floor(rnd() * 9);
            movimientos.push({
              id: `m${movimientos.length + 1}`,
              fecha: new Date(ahora - dia * 86_400_000 + (hora - new Date(ahora).getHours()) * 3_600_000).toISOString(),
              productoId: pid,
              varianteId: v.id,
              cantidad: -1,
              origen: rnd() < 0.3 ? 'whatsapp' : 'mostrador',
              precio,
              medio: rnd() < 0.5 ? 'efectivo' : rnd() < 0.5 ? 'transferencia' : 'tarjeta',
            });
          }
        }
      }
    }
    productos.push({ id: pid, nombre: d.nombre, categoria: d.categoria, descripcion: d.descripcion, precio, foto: d.foto, icono: d.icono, variantes, destacado: d.destacado });
  });

  // Algunas ventas de hoy para que el panel no arranque vacío.
  const hoy = productos.slice(0, 3);
  hoy.forEach((p, i) => {
    const v = p.variantes[Math.min(i + 1, p.variantes.length - 1)];
    movimientos.push({ id: `m${movimientos.length + 1}`, fecha: new Date(ahora - (i + 1) * 3_600_000).toISOString(), productoId: p.id, varianteId: v.id, cantidad: -1, origen: 'mostrador', precio: p.precio, medio: 'efectivo' });
  });

  const p0 = productos[0];
  const p1 = productos[variante === 'almacen' ? 3 : 4];
  const detalle = (v: Variante) => [v.talle && `Talle ${v.talle}`, v.color].filter(Boolean).join(' · ') || 'Único';
  const pedidos: PedidoTienda[] = [
    {
      id: 'pe1',
      fecha: new Date(ahora - 40 * 60_000).toISOString(),
      items: [
        { productoId: p0.id, varianteId: p0.variantes[0].id, nombre: p0.nombre, detalle: detalle(p0.variantes[0]), precio: p0.precio, cantidad: 2 },
        { productoId: p1.id, varianteId: p1.variantes[0].id, nombre: p1.nombre, detalle: detalle(p1.variantes[0]), precio: p1.precio, cantidad: 1 },
      ],
      total: p0.precio * 2 + p1.precio,
      entrega: 'retiro',
      nombre: 'Carla',
      estado: 'pendiente',
      ejemplo: true,
    },
  ];

  return {
    version: VERSION_TIENDA,
    rubro: 'tienda',
    variante,
    categorias: [...new Set(defs.map((d) => d.categoria))],
    productos,
    movimientos,
    pedidos,
    proveedor: { nombre: variante === 'almacen' ? 'Distribuidora Norte' : 'Textil del Sur', whatsapp: '5491155550099' },
    coberturaDias: 14,
    costoEnvio: precioEjemplo(variante === 'almacen' ? 1.5 : 4, moneda),
  };
}

export const NEGOCIO_EJEMPLO_TIENDA: Record<VarianteTienda, string> = { moda: 'Lupe Moda & Regalos', almacen: 'Almacén Don Tito' };

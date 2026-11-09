export type VarianteTienda = 'moda' | 'almacen';

export interface Lote {
  id: string;
  vence: string; // AAAA-MM-DD
  cantidad: number;
}

export interface Variante {
  id: string;
  talle?: string;
  color?: string;
  colorHex?: string;
  stock: number;
  minimo: number;
  codigoBarras: string;
  lotes?: Lote[];
}

export type IconoProducto = 'remera' | 'pantalon' | 'buzo' | 'taza' | 'vela' | 'bolso' | 'aros' | 'gorro' | 'bebida' | 'golosina' | 'almacen' | 'limpieza' | 'lacteo';

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  precio: number;
  foto?: string;
  icono: IconoProducto;
  variantes: Variante[];
  destacado?: boolean;
  importado?: boolean;
}

export type Origen = 'mostrador' | 'whatsapp' | 'entrada' | 'ajuste';
export type MedioPago = 'efectivo' | 'transferencia' | 'tarjeta';

export interface Movimiento {
  id: string;
  fecha: string;
  productoId: string;
  varianteId: string;
  /** Negativo = sale del stock (venta); positivo = entra. */
  cantidad: number;
  origen: Origen;
  precio?: number;
  medio?: MedioPago;
  ventaId?: string;
}

export interface LineaPedido {
  productoId: string;
  varianteId: string;
  nombre: string;
  detalle: string;
  precio: number;
  cantidad: number;
}

export interface PedidoTienda {
  id: string;
  fecha: string;
  items: LineaPedido[];
  total: number;
  entrega: 'retiro' | 'envio';
  direccion?: string;
  nombre?: string;
  estado: 'pendiente' | 'confirmado' | 'cancelado';
  ejemplo?: boolean;
}

export interface EstadoTienda {
  version: number;
  rubro: 'tienda';
  variante: VarianteTienda;
  categorias: string[];
  productos: Producto[];
  movimientos: Movimiento[];
  pedidos: PedidoTienda[];
  proveedor: { nombre: string; whatsapp: string };
  coberturaDias: number;
  costoEnvio: number;
  deshacerPrecios?: Record<string, number>;
}

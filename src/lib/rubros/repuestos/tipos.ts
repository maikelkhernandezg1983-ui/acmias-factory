export type CategoriaRep = 'filtros' | 'frenos' | 'encendido' | 'suspension' | 'distribucion' | 'lubricantes';

export interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  motor: string;
  desde: number;
  hasta: number;
}

export interface Pieza {
  id: string;
  codigo: string;
  oem: string[];
  equivalentes: string[];
  nombre: string;
  categoria: CategoriaRep;
  marca: string;
  origen: 'original' | 'alternativo';
  procedencia: 'nacional' | 'importado';
  garantiaMeses: number;
  stock: number;
  aPedido: boolean;
  precio: number;
  /** Vehículos con los que es compatible (ids de Vehiculo). */
  compat: string[];
  detalle?: string;
  destacado?: boolean;
  importado?: boolean;
}

export interface MiVehiculo {
  vehiculoId: string;
  anio: number;
}

export interface LineaCotizacion {
  piezaId: string;
  codigo: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface Cotizacion {
  id: string;
  fecha: string;
  vehiculo?: string;
  taller?: string;
  items: LineaCotizacion[];
  total: number;
  ejemplo?: boolean;
}

export interface EstadoRepuestos {
  version: number;
  rubro: 'repuestos';
  vehiculos: Vehiculo[];
  piezas: Pieza[];
  cotizaciones: Cotizacion[];
  /** Búsquedas sin resultado o sin stock: término → veces. */
  sinResultado: Record<string, number>;
  /** Descuento de la lista "Taller" en %. */
  descuentoTaller: number;
  deshacerPrecios?: Record<string, number>;
}

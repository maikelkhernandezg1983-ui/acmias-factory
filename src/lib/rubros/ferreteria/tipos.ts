import type { Semaforo } from '@/lib/semaforo';
/**
 * Ferretería (BRD 06). El catálogo (~3.000 productos) se genera con semilla fija en el dispositivo;
 * el estado guardado solo tiene lo que cambia: precios, stock, sinónimos aprendidos, clientes y presupuestos.
 */

export interface Unidad {
  id: string;
  /** "metro", "tira x 4 m", "caja x 100". */
  etiqueta: string;
  /** Cuántas unidades base trae. */
  factor: number;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  familia: string;
  medida: string;
  /** Color, polos, cabeza… ('' si no tiene). */
  variante: string;
  linea: string;
  /** Unidad base en la que está el precio y el stock ("u", "m", "L"). */
  base: string;
  unidades: Unidad[];
  /** Precio por unidad base, de lista "de paso". */
  precio: number;
  stock: number;
  minimo: number;
  /** Palabras para buscar: nombre, sinónimos de la familia y alias de la medida. */
  claves: string[];
}

export type TipoCliente = 'paso' | 'profesional' | 'constructora';

export interface ClienteFer {
  id: string;
  nombre: string;
  oficio: string;
  tipo: TipoCliente;
  whatsapp: string;
  ejemplo?: boolean;
}

export interface LineaPresupuesto {
  productoId: string;
  unidadId: string;
  cantidad: number;
  /** Precio por unidad elegida, ya con el descuento del tipo de cliente. */
  precio: number;
  /** Cómo lo escribió el cliente (si vino de una lista). */
  original?: string;
}

export interface Presupuesto {
  id: string;
  numero: number;
  fecha: string;
  clienteId: string | null;
  tipo: TipoCliente;
  lineas: LineaPresupuesto[];
  estado: 'abierto' | 'vendido' | 'cancelado';
  origen: 'mostrador' | 'lista' | 'web';
  validezDias: number;
  recordado?: string;
  vendido?: string;
  ejemplo?: boolean;
}

export interface EstadoFerreteria {
  version: number;
  rubro: 'ferreteria';
  /** Precio por producto (solo los que cambiaron respecto del catálogo generado). */
  precios: Record<string, number>;
  /** Stock por producto (solo los que cambiaron). */
  stock: Record<string, number>;
  /** Sinónimos aprendidos: frase normalizada → producto. */
  aprendidos: Record<string, string>;
  /** Sinónimos de palabra cargados por el dueño: palabra → palabra del catálogo. */
  palabras: Record<string, string>;
  descuentos: Record<TipoCliente, number>;
  clientes: ClienteFer[];
  presupuestos: Presupuesto[];
  proximoNumero: number;
  proveedor: { nombre: string; whatsapp: string };
  /** Semáforo de stock en unidades (Ajustes). Si falta, se usa el de ejemplo. */
  semaforo?: Semaforo;
  deshacerPrecios?: Record<string, number>;
}

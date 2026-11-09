export type Etiqueta = 'vegano' | 'vegetariano' | 'sin-tacc' | 'picante' | 'nuevo';

export const ETIQUETAS: Record<Etiqueta, string> = {
  vegano: 'Vegano',
  vegetariano: 'Vegetariano',
  'sin-tacc': 'Sin TACC',
  picante: 'Picante',
  nuevo: 'Nuevo',
};

export type Ilustracion =
  | 'cafe' | 'medialuna' | 'tostado' | 'plato' | 'pasta' | 'burger'
  | 'sandwich' | 'postre' | 'bebida' | 'combo' | 'ensalada' | 'wok';

export interface Categoria {
  id: string;
  nombre: string;
  ilustracion: Ilustracion;
}

export interface Plato {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  precio: number;
  etiquetas: Etiqueta[];
  alergenos: string[];
  ilustracion: Ilustracion;
  foto?: string;
  agotado?: boolean;
  destacado?: boolean;
  importado?: boolean;
}

export type ModoServicio = 'mesa' | 'llevar' | 'delivery';

export interface ItemPedido {
  platoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  nota: string;
}

export interface Pedido {
  id: string;
  fecha: string;
  modo: ModoServicio;
  mesa?: number;
  direccion?: string;
  items: ItemPedido[];
  total: number;
  ejemplo?: boolean;
}

export type Rubro = 'restaurante' | 'repuestos' | 'tienda' | 'barberia';
export const RUBROS_LISTOS: Rubro[] = ['restaurante', 'repuestos', 'tienda', 'barberia'];

export interface DemoConfig {
  slug: string;
  rubro: Rubro;
  /** Registro del cliente (formulario de la web) del que salió la demo. */
  registroId?: string;
  /** Tienda: ropa y regalos o almacén (con vencimientos). */
  variante?: 'moda' | 'almacen';
  negocio: string;
  logo?: string;
  colorPrincipal: string;
  colorSecundario: string;
  whatsapp: string;
  mesas: number;
  moneda: string;
  apertura: string;
  cierre: string;
  delivery: boolean;
  costoEnvio: number;
  direccion: string;
  creada: string;
}

export interface DemoEstado {
  version: number;
  categorias: Categoria[];
  platos: Plato[];
  pedidos: Pedido[];
  vistas: Record<string, number>;
  deshacerPrecios?: Record<string, number>;
}

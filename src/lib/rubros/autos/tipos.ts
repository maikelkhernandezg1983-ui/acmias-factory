import type { Turno } from '@/lib/rubros/barberia/tipos';

/** Agencia de autos y motos (BRD 07). Marcas genéricas: nunca marcas reales. */

export type Carroceria = 'sedan' | 'hatch' | 'suv' | 'pickup' | 'naked' | 'scooter' | 'enduro';
export type TipoVehiculo = 'auto' | 'moto';
export type EstadoVehiculo = 'disponible' | 'reservado' | 'vendido';

export interface Vehiculo {
  id: string;
  tipo: TipoVehiculo;
  carroceria: Carroceria;
  marca: string; // genérica: "Marca A"
  modelo: string; // "SUV mediano 2.0"
  anio: number;
  km: number;
  combustible: 'Nafta' | 'Diésel' | 'Híbrido' | 'Eléctrico';
  caja: 'Manual' | 'Automática';
  color: string;
  colorHex: string;
  precio: number;
  cerokm?: boolean;
  estado: EstadoVehiculo;
  ingreso: string; // ISO: fecha en que entró al stock
  vendido?: string;
  destacado?: boolean;
  aceptaPermuta: boolean;
  financiable: boolean;
  equipamiento: string[];
  vistas: number;
  ejemplo?: boolean;
}

export type TipoConsulta = 'consulta' | 'financiacion' | 'prueba' | 'tasacion';
export type EstadoConsulta = 'nueva' | 'contactada' | 'cerrada' | 'perdida';

export interface Usado {
  descripcion: string; // lo escribe el cliente: "Hatch 1.4 2016"
  anio: number;
  km: number;
  /** Valor que ofrece la agencia (lo carga el dueño; la demo nunca lo inventa). */
  ofrecido?: number;
}

export interface Consulta {
  id: string;
  fecha: string;
  nombre: string;
  whatsapp: string;
  vehiculoId: string | null;
  tipo: TipoConsulta;
  cuota?: { anticipo: number; meses: number; cuota: number };
  usado?: Usado;
  pruebaId?: string;
  estado: EstadoConsulta;
  ejemplo?: boolean;
}

/** Prueba de manejo: un turno del motor de agenda; el "profesional" es el vehículo. */
export type Prueba = Turno;

export interface AjustesAutos {
  /** Anticipo mínimo en % del precio. */
  anticipoMin: number;
  /** Tasa mensual de referencia para la cuota estimada (%). */
  tasaMensual: number;
  plazos: number[];
}

export interface EstadoAutos {
  version: number;
  rubro: 'autos';
  vehiculos: Vehiculo[];
  consultas: Consulta[];
  pruebas: Prueba[];
  /** Horario para pruebas de manejo, como en la agenda: día → [desde, hasta] en minutos. */
  horario: Record<number, [number, number] | null>;
  ajustes: AjustesAutos;
}

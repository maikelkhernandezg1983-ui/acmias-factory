import type { Ilustracion } from '@/lib/tipos';

/** Rubro Hotelería (BRD 10): habitaciones, estadías, room service y pedidos desde el QR de la habitación. */

export type TipoHab = 'estandar' | 'doble' | 'suite' | 'familiar';
export type EstadoHab = 'libre' | 'ocupada' | 'limpieza' | 'mantenimiento';

export interface Habitacion {
  id: string;
  numero: string;
  piso: number;
  tipo: TipoHab;
  capacidad: number;
  /** Tarifa por noche en moneda local. */
  tarifa: number;
  estado: EstadoHab;
  /** Código del QR pegado en la habitación: identifica la habitación sin mostrar el número en la dirección. */
  codigo: string;
}

export interface Estadia {
  id: string;
  habitacionId: string;
  huesped: string;
  whatsapp: string;
  personas: number;
  /** Fechas de entrada y salida (AAAA-MM-DD). */
  entrada: string;
  salida: string;
  estado: 'reservada' | 'activa' | 'cerrada';
  checkin?: string;
  checkout?: string;
  ejemplo?: boolean;
}

export type CategoriaRS = 'desayuno' | 'platos' | 'snacks' | 'bebidas' | 'bar';

export interface ItemRS {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaRS;
  precio: number;
  ilustracion: Ilustracion;
  foto?: string;
  disponible: boolean;
}

export type Area = 'cocina' | 'limpieza' | 'mantenimiento' | 'recepcion';

export interface LineaRS {
  itemId: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

/** Todo lo que pide el huésped desde el QR: room service, limpieza, mantenimiento o recepción. */
export interface Solicitud {
  id: string;
  habitacionId: string;
  estadiaId?: string;
  area: Area;
  /** Qué pidió: "Room service", "Toallas limpias", "Aire acondicionado"… */
  tipo: string;
  detalle?: string;
  items?: LineaRS[];
  total: number;
  estado: 'nueva' | 'en-curso' | 'lista' | 'cancelada';
  fecha: string;
  /** Para cuándo lo quiere (desayuno programado, despertador, taxi). */
  para?: string;
  enCurso?: string;
  lista?: string;
  ejemplo?: boolean;
}

/** Consumo que se suma a la cuenta de la estadía. */
export interface Cargo {
  id: string;
  estadiaId: string;
  concepto: string;
  monto: number;
  fecha: string;
  solicitudId?: string;
}

export interface AjustesHotel {
  wifiRed: string;
  wifiClave: string;
  checkout: string;
  desayuno: string;
  roomService: string;
}

export interface EstadoHotel {
  version: number;
  rubro: 'hotel';
  habitaciones: Habitacion[];
  estadias: Estadia[];
  carta: ItemRS[];
  solicitudes: Solicitud[];
  cargos: Cargo[];
  ajustes: AjustesHotel;
}

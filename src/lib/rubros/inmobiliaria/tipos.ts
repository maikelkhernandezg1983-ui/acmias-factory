import type { Turno } from '@/lib/rubros/barberia/tipos';

/** Inmobiliaria (BRD 08): alquileres, ventas y temporarios. Zonas y direcciones genéricas, nunca reales. */

export type Operacion = 'venta' | 'alquiler' | 'temporario';
export type TipoPropiedad = 'departamento' | 'casa' | 'ph' | 'local' | 'oficina' | 'terreno' | 'galpon' | 'cochera';
export type EstadoPropiedad = 'disponible' | 'reservada' | 'cerrada';

export interface Propiedad {
  id: string;
  codigo: string; // "P-1024": el cliente lo nombra por WhatsApp
  operacion: Operacion;
  tipo: TipoPropiedad;
  titulo: string;
  zona: string;
  direccion: string; // aproximada: "Calle 12 al 400"
  precio: number;
  /** 'USD' para ventas; 'local' usa la moneda de la demo (alquileres). */
  moneda: 'USD' | 'local';
  expensas?: number; // en moneda local, por mes
  m2Cubiertos: number;
  m2Totales: number;
  ambientes: number;
  dormitorios: number;
  banos: number;
  cocheras: number;
  antiguedad: number; // años; 0 = a estrenar
  amenities: string[];
  aptoCredito?: boolean;
  mascotas?: boolean;
  color: string; // fachada de la ilustración
  estado: EstadoPropiedad;
  ingreso: string;
  cerrada?: string;
  destacada?: boolean;
  vistas: number;
  ejemplo?: boolean;
}

export type TipoConsulta = 'consulta' | 'visita' | 'requisitos';
export type EstadoConsulta = 'nueva' | 'contactada' | 'cerrada' | 'perdida';

export interface Consulta {
  id: string;
  fecha: string;
  nombre: string;
  whatsapp: string;
  propiedadId: string | null;
  tipo: TipoConsulta;
  mensaje?: string;
  visitaId?: string;
  estado: EstadoConsulta;
  ejemplo?: boolean;
}

/** Propietario que quiere vender o alquilar con la inmobiliaria. */
export interface Captacion {
  id: string;
  fecha: string;
  nombre: string;
  whatsapp: string;
  operacion: 'venta' | 'alquiler';
  tipo: TipoPropiedad;
  zona: string;
  ambientes: number;
  comentario: string;
  estado: 'nueva' | 'tasacion' | 'captada' | 'descartada';
  ejemplo?: boolean;
}

/** Visita: un turno del motor de agenda; el "profesional" es la propiedad. */
export type Visita = Turno;

export interface AjustesInmo {
  /** Meses de depósito para alquilar. */
  mesesDeposito: number;
  /** Honorarios de alquiler, en meses de alquiler (según normativa local). */
  honorariosMeses: number;
  /** Honorarios de venta en % para el comprador (según normativa local). */
  honorariosVenta: number;
}

export interface EstadoInmo {
  version: number;
  rubro: 'inmobiliaria';
  propiedades: Propiedad[];
  consultas: Consulta[];
  visitas: Visita[];
  captaciones: Captacion[];
  horario: Record<number, [number, number] | null>;
  zonas: string[];
  ajustes: AjustesInmo;
}

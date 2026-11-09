/**
 * Agenda de turnos (BRD 04). Genérica: la reutiliza el consultorio (sin datos clínicos).
 * Fechas en ISO local del dispositivo; minutos desde medianoche para horarios.
 */

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracion: number; // minutos
  precio: number;
  /** Porcentaje de seña (regla visible; en la demo no se cobra). */
  sena?: number;
  foto?: string;
}

export interface Profesional {
  id: string;
  nombre: string;
  especialidad: string;
  servicios: string[];
}

export type EstadoTurno = 'reservado' | 'confirmado' | 'atendido' | 'ausente' | 'cancelado';

export interface Turno {
  id: string;
  token: string;
  clienteId: string;
  profId: string;
  servicioId: string;
  inicio: string; // ISO
  fin: string; // ISO
  estado: EstadoTurno;
  origen: 'online' | 'manual';
  creado: string;
  ejemplo?: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  whatsapp: string;
  notas: string;
  sellos: number;
  ausencias: number;
  creado: string;
  ejemplo?: boolean;
}

export interface Bloqueo {
  id: string;
  /** null: todo el local. */
  profId: string | null;
  desde: string; // ISO
  hasta: string; // ISO
  motivo: string;
}

export interface EnEspera {
  id: string;
  nombre: string;
  whatsapp: string;
  servicioId: string;
  profId: string | null;
  dia: string; // YYYY-MM-DD
  creado: string;
  /** Cuándo se le avisó que se liberó un turno. */
  avisado?: string;
  turnoLiberado?: string;
}

/** Horario por día de la semana (0 domingo … 6 sábado): [apertura, cierre] en minutos, o null si cierra. */
export type Horario = Record<number, [number, number] | null>;

export interface EstadoAgenda {
  version: number;
  rubro: 'barberia';
  servicios: Servicio[];
  profesionales: Profesional[];
  turnos: Turno[];
  clientes: Cliente[];
  bloqueos: Bloqueo[];
  espera: EnEspera[];
  horario: Horario;
  /** Sellos para el beneficio (BAR-12). */
  metaSellos: number;
  beneficio: string;
  /** Lunes (YYYY-MM-DD) de la semana en que se generaron los datos de ejemplo. */
  semilla: string;
}

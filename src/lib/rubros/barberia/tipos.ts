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
  /** Consultorio: se puede hacer por video. */
  video?: boolean;
}

export interface Profesional {
  id: string;
  nombre: string;
  especialidad: string;
  servicios: string[];
  /** Consultorio: título, matrícula (ficticia), coberturas que acepta y si atiende por video. */
  titulo?: string;
  matricula?: string;
  coberturas?: string[];
  teleconsulta?: boolean;
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
  /** Consultorio: turno dado por encima de la agenda (se marca distinto). */
  sobreturno?: boolean;
  cobertura?: string;
  modalidad?: 'presencial' | 'video';
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
  /** Consultorio: datos administrativos. Nunca datos clínicos. */
  cobertura?: string;
  afiliado?: string;
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

export interface Evento {
  fecha: string;
  quien: string;
  accion: string;
}

export interface EstadoAgenda {
  version: number;
  rubro: 'barberia' | 'consultorio';
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
  /** Pausa diaria (p. ej. 13 a 15 h), en minutos. */
  pausa?: [number, number];
  /** Consultorio: coberturas que trabaja ("Particular" incluida). */
  coberturas?: string[];
  /** Consultorio: registro de accesos a fichas (CON-12). */
  eventos?: Evento[];
}

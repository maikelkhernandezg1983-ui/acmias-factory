/** Rubro Colegio (BRD 11): familias, cuotas, comunicados con lectura, autorizaciones, asistencia e inscripciones. */

export type Nivel = 'inicial' | 'primaria' | 'secundaria';

export interface Curso {
  id: string;
  nombre: string;
  nivel: Nivel;
  docente: string;
  cupo: number;
  orden: number;
}

export interface Familia {
  id: string;
  /** Adulto responsable que recibe los avisos y paga. */
  responsable: string;
  whatsapp: string;
  email?: string;
  /** Código para entrar al portal (en la versión real llega por WhatsApp). */
  codigo: string;
  ejemplo?: boolean;
}

export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  cursoId: string;
  familiaId: string;
  /** Porcentaje de beca sobre la cuota (0 a 100). */
  beca: number;
  activo: boolean;
}

/** Cuota mensual por familia, con el detalle de cada hijo. */
export interface CuotaFamilia {
  id: string;
  familiaId: string;
  periodo: string;
  monto: number;
  detalle: { alumnoId: string; monto: number; nota?: string }[];
  estado: 'pendiente' | 'pagada';
  informada?: string;
  pagada?: string;
  medio?: 'transferencia' | 'efectivo' | 'otro';
}

export type Destino = { tipo: 'todos' } | { tipo: 'curso'; id: string } | { tipo: 'familia'; id: string };

export interface Comunicado {
  id: string;
  fecha: string;
  titulo: string;
  texto: string;
  destino: Destino;
  /** Familias que lo leyeron y cuándo. */
  leidos: Record<string, string>;
}

export interface Autorizacion {
  id: string;
  fecha: string;
  titulo: string;
  detalle: string;
  /** Día del evento (AAAA-MM-DD). */
  dia: string;
  cursoIds: string[];
  respuestas: Record<string, { valor: 'si' | 'no'; fecha: string }>;
}

export type Presencia = 'presente' | 'ausente' | 'tarde';

export interface Justificacion {
  id: string;
  alumnoId: string;
  dia: string;
  motivo: string;
  fecha: string;
}

export interface Preinscripcion {
  id: string;
  fecha: string;
  alumno: string;
  /** Curso que pide para el próximo ciclo. */
  cursoId: string;
  responsable: string;
  whatsapp: string;
  hermanoEnElColegio: boolean;
  comentario?: string;
  estado: 'nueva' | 'entrevista' | 'aceptada' | 'espera' | 'rechazada';
  ejemplo?: boolean;
}

export interface AjustesColegio {
  cuotaInicial: number;
  cuotaPrimaria: number;
  cuotaSecundaria: number;
  /** Descuento por cada hermano a partir del segundo (%). */
  descuentoHermano: number;
  diaVencimiento: number;
  alias: string;
  /** Primer y último mes con cuota del ciclo lectivo (1 a 12). */
  mesInicio: number;
  mesFin: number;
}

export interface EstadoColegio {
  version: number;
  rubro: 'colegio';
  cursos: Curso[];
  familias: Familia[];
  alumnos: Alumno[];
  cuotas: CuotaFamilia[];
  comunicados: Comunicado[];
  autorizaciones: Autorizacion[];
  /** asistencia[día][alumnoId] */
  asistencia: Record<string, Record<string, Presencia>>;
  justificaciones: Justificacion[];
  preinscripciones: Preinscripcion[];
  ajustes: AjustesColegio;
}

/** Rubro Contador (BRD 09): cartera de clientes, cuota mensual de honorarios, tareas del mes y cobranza por WhatsApp. */

export type Categoria = 'monotributo' | 'responsable' | 'sociedad' | 'empleador';

export interface ClienteC {
  id: string;
  /** Número fijo de la cartera: define el orden de trabajo y no cambia al importar. */
  orden: number;
  nombre: string;
  apellido: string;
  /** Usuario con el que el estudio entra al sistema fiscal del cliente (por ejemplo, su CUIT). */
  usuario: string;
  /**
   * Clave del sistema fiscal. En la demo queda en el dispositivo (usar datos ficticios) y se muestra
   * con el ojito solo unos segundos, dejando registro. En la versión real va cifrada.
   */
  clave?: string;
  whatsapp: string;
  email?: string;
  categoria: Categoria;
  /** Honorario mensual en moneda local. */
  honorario: number;
  activo: boolean;
  alta: string;
  importado?: boolean;
  ejemplo?: boolean;
}

/** Periodo mensual en formato AAAA-MM. */
export type Periodo = string;

export interface Cuota {
  id: string;
  clienteId: string;
  periodo: Periodo;
  monto: number;
  estado: 'pendiente' | 'pagada';
  /** El cliente avisó desde su portal que pagó; falta que el estudio lo confirme. */
  informada?: string;
  pagada?: string;
  medio?: 'transferencia' | 'efectivo' | 'otro';
}

export interface Tarea {
  id: string;
  clienteId: string;
  periodo: Periodo;
  /** Ej.: "Declaración mensual". */
  nombre: string;
  estado: 'pendiente' | 'terminada';
  terminada?: string;
  /** Se abrió el WhatsApp con el aviso de tarea terminada y el costo. */
  avisada?: string;
}

export interface AjustesContador {
  /** Nombre de la tarea que se repite todos los meses por cliente. */
  tareaMensual: string;
  /** Día del mes en que vence la cuota. */
  diaVencimiento: number;
  alias: string;
}

export interface EstadoContador {
  version: number;
  rubro: 'contador';
  clientes: ClienteC[];
  cuotas: Cuota[];
  tareas: Tarea[];
  ajustes: AjustesContador;
  /** Cada vez que alguien mira una clave queda registrado. */
  accesos: { fecha: string; clienteId: string; accion: string }[];
}

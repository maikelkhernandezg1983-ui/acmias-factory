/**
 * Semáforo de stock en unidades, compartido por Tienda, Ferretería y Repuestos.
 * El comercio carga en Ajustes hasta cuántas unidades es rojo y hasta cuántas es amarillo;
 * lo que pasa el amarillo es verde.
 */
export interface Semaforo {
  /** Rojo: de 0 a `rojo` unidades. */
  rojo: number;
  /** Amarillo: de `rojo + 1` a `amarillo` unidades. Verde: más de `amarillo`. */
  amarillo: number;
}

export type Luz = 'rojo' | 'amarillo' | 'verde';
export const LUCES: Luz[] = ['rojo', 'amarillo', 'verde'];
export const NOMBRE_LUZ: Record<Luz, string> = { rojo: 'Rojo', amarillo: 'Amarillo', verde: 'Verde' };
export const SENTIDO_LUZ: Record<Luz, string> = { rojo: 'Reponer ya', amarillo: 'Pedir pronto', verde: 'Bien' };

export function luz(stock: number, s: Semaforo): Luz {
  if (stock <= s.rojo) return 'rojo';
  if (stock <= s.amarillo) return 'amarillo';
  return 'verde';
}

export function contarLuces(stocks: number[], s: Semaforo): Record<Luz, number> {
  const c: Record<Luz, number> = { rojo: 0, amarillo: 0, verde: 0 };
  for (const x of stocks) c[luz(x, s)]++;
  return c;
}

/** Devuelve el error para mostrar, o null si los límites sirven. */
export function validarSemaforo(s: Semaforo): string | null {
  if (!Number.isInteger(s.rojo) || !Number.isInteger(s.amarillo) || s.rojo < 0 || s.amarillo < 0) return 'Usá números enteros desde 0.';
  if (s.amarillo <= s.rojo) return 'El límite del amarillo tiene que ser mayor que el del rojo.';
  if (s.amarillo > 100_000) return 'El límite del amarillo es demasiado alto.';
  return null;
}

/** Texto de cada franja para mostrar en Ajustes. */
export function rangoLuz(l: Luz, s: Semaforo, unidad = 'u.') {
  if (l === 'rojo') return s.rojo === 0 ? `Sin stock (0 ${unidad})` : `De 0 a ${s.rojo} ${unidad}`;
  if (l === 'amarillo') return s.amarillo === s.rojo + 1 ? `${s.amarillo} ${unidad}` : `De ${s.rojo + 1} a ${s.amarillo} ${unidad}`;
  return `Más de ${s.amarillo} ${unidad}`;
}

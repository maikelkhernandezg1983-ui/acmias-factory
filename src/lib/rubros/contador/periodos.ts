/** Periodos mensuales "AAAA-MM" (hora local). */

export function periodoDe(fecha: Date | number) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function sumarMeses(periodo: string, n: number) {
  const [a, m] = periodo.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return periodoDe(d);
}

/** Fin del día de vencimiento de la cuota del periodo. */
export function vencimiento(periodo: string, dia: number) {
  const [a, m] = periodo.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return new Date(a, m - 1, Math.min(dia, ultimo), 23, 59, 59);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function nombreMes(periodo: string, conAnio = true) {
  const [a, m] = periodo.split('-').map(Number);
  return conAnio ? `${MESES[m - 1]} ${a}` : MESES[m - 1];
}

export function mesCorto(periodo: string) {
  const [a, m] = periodo.split('-').map(Number);
  return `${MESES_CORTOS[m - 1]} ${String(a).slice(2)}`;
}

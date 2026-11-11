import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { aleatorio } from '@/lib/rubros/contador/datos-ejemplo';
import { periodoDe, vencimiento } from '@/lib/rubros/contador/periodos';
import { detalleCuota, diaLocal, diasHabiles } from './logica';
import type { Alumno, Autorizacion, Comunicado, CuotaFamilia, Curso, EstadoColegio, Familia, Justificacion, Preinscripcion, Presencia } from './tipos';

export const VERSION_COLEGIO = 1;

const CHICOS = ['Mateo', 'Valentina', 'Benjamín', 'Emma', 'Thiago', 'Martina', 'Santino', 'Catalina', 'Joaquín', 'Isabella', 'Lautaro', 'Olivia', 'Felipe', 'Mía', 'Bautista', 'Julieta', 'Tomás', 'Renata', 'Lorenzo', 'Delfina', 'Facundo', 'Lucía', 'Bruno', 'Alma', 'Ignacio', 'Pilar', 'Gael', 'Josefina', 'Simón', 'Victoria', 'Dante', 'Ámbar', 'Lisandro', 'Zoe', 'Franco', 'Agustina'];
const ADULTOS = ['Carolina', 'Martín', 'Paula', 'Federico', 'Verónica', 'Diego', 'Lorena', 'Sebastián', 'Natalia', 'Gustavo', 'Andrea', 'Pablo', 'Mariana', 'Hernán', 'Silvina', 'Ricardo', 'Gabriela', 'Leandro', 'Cecilia', 'Javier'];
const APELLIDOS = ['Acosta', 'Benítez', 'Cabrera', 'Domínguez', 'Escobar', 'Figueroa', 'Gallardo', 'Herrera', 'Ibáñez', 'Juárez', 'Ledesma', 'Molina', 'Navarro', 'Ojeda', 'Paredes', 'Quiroga', 'Ríos', 'Sosa', 'Toledo', 'Vera', 'Zalazar', 'Aguirre', 'Bustos', 'Castro', 'Duarte', 'Ferreyra', 'Godoy', 'Luna', 'Medina', 'Peralta', 'Rojas', 'Suárez', 'Torres', 'Villalba', 'Correa', 'Moreno', 'Ponce', 'Romero', 'Silva', 'Vázquez', 'Arias', 'Blanco', 'Campos', 'Díaz', 'Funes', 'Giménez', 'Lagos', 'Méndez', 'Núñez', 'Ortiz', 'Pereyra', 'Quinteros', 'Ramos', 'Salas', 'Vega', 'Yáñez', 'Álvarez', 'Bravo', 'Carrizo', 'Espinoza', 'Frías', 'Guzmán', 'Herrero', 'Iglesias', 'Jara', 'Lucero', 'Maidana', 'Nieva', 'Olmos', 'Pacheco', 'Reyes', 'Sánchez', 'Tapia', 'Urquiza', 'Valdez', 'Arce', 'Barrios', 'Coronel', 'Delgado', 'Escalante', 'Flores', 'Gauna', 'Heredia', 'Insaurralde', 'Lezcano', 'Mansilla', 'Noriega', 'Olivera', 'Prieto'];

export const CURSOS_BASE: Omit<Curso, 'id'>[] = [
  { nombre: 'Sala de 4', nivel: 'inicial', docente: 'Seño Laura', cupo: 20, orden: 1 },
  { nombre: 'Sala de 5', nivel: 'inicial', docente: 'Seño Romina', cupo: 20, orden: 2 },
  { nombre: '1.° grado', nivel: 'primaria', docente: 'Seño Marta', cupo: 25, orden: 3 },
  { nombre: '2.° grado', nivel: 'primaria', docente: 'Seño Claudia', cupo: 25, orden: 4 },
  { nombre: '3.° grado', nivel: 'primaria', docente: 'Seño Patricia', cupo: 25, orden: 5 },
  { nombre: '4.° grado', nivel: 'primaria', docente: 'Profe Jorge', cupo: 25, orden: 6 },
  { nombre: '5.° grado', nivel: 'primaria', docente: 'Seño Inés', cupo: 25, orden: 7 },
  { nombre: '6.° grado', nivel: 'primaria', docente: 'Profe Andrés', cupo: 25, orden: 8 },
];

const codigoFamilia = (i: number) => `F${String(1000 + ((i * 7_919) % 9000)).padStart(4, '0')}`;
/** Próximo día de la semana (1 = lunes … 5 = viernes) a partir de mañana. */
function proximo(ahora: Date, diaSemana: number, semanasExtra = 0) {
  const d = new Date(ahora);
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + semanasExtra * 7);
  return diaLocal(d);
}

export function crearEstadoColegio(moneda: string, ahora = new Date()): EstadoColegio {
  const r = aleatorio(4242);
  const cursos: Curso[] = CURSOS_BASE.map((c, i) => ({ ...c, id: `cur-${i + 1}` }));
  const familias: Familia[] = [];
  const alumnos: Alumno[] = [];
  const porCurso = new Map(cursos.map((c) => [c.id, 0]));
  const objetivo = 15;
  let fi = 0;
  while ([...porCurso.values()].some((n) => n < objetivo) && fi < 200) {
    const apellido = APELLIDOS[fi % APELLIDOS.length];
    const hijos = fi % 4 === 1 ? 2 : fi % 17 === 5 ? 3 : 1;
    const libres = cursos.filter((c) => porCurso.get(c.id)! < objetivo);
    if (!libres.length) break;
    const f: Familia = { id: `fam-${fi + 1}`, responsable: `${ADULTOS[(fi * 3) % ADULTOS.length]} ${apellido}`, whatsapp: `54911${String(40_000_000 + fi * 271_829).slice(0, 8)}`, codigo: codigoFamilia(fi), ejemplo: true };
    const usados = new Set<string>();
    for (let h = 0; h < hijos; h++) {
      const opciones = libres.filter((c) => !usados.has(c.id) && porCurso.get(c.id)! < objetivo);
      if (!opciones.length) break;
      const c = opciones[Math.floor(r() * opciones.length)];
      usados.add(c.id);
      porCurso.set(c.id, porCurso.get(c.id)! + 1);
      alumnos.push({ id: `al-${alumnos.length + 1}`, nombre: CHICOS[(alumnos.length * 5 + fi) % CHICOS.length], apellido, cursoId: c.id, familiaId: f.id, beca: fi % 13 === 7 ? 50 : fi % 19 === 3 ? 25 : 0, activo: true });
    }
    familias.push(f);
    fi++;
  }
  const ajustes = { cuotaInicial: Math.round(precioEjemplo(70, moneda) / 100) * 100 || 70, cuotaPrimaria: Math.round(precioEjemplo(85, moneda) / 100) * 100 || 85, cuotaSecundaria: Math.round(precioEjemplo(95, moneda) / 100) * 100 || 95, descuentoHermano: 10, diaVencimiento: 10, alias: 'colegio.cuotas.demo', mesInicio: 3, mesFin: 12 };
  const base: EstadoColegio = { version: VERSION_COLEGIO, rubro: 'colegio', cursos, familias, alumnos, cuotas: [], comunicados: [], autorizaciones: [], asistencia: {}, justificaciones: [], preinscripciones: [], ajustes };

  // Cuotas desde marzo hasta el mes actual (o diciembre).
  const actual = periodoDe(ahora);
  const anio = actual.slice(0, 4);
  const cuotas: CuotaFamilia[] = [];
  familias.forEach((f, i) => {
    const detalle = detalleCuota(base, f.id);
    const monto = detalle.reduce((t, d) => t + d.monto, 0);
    const perfil = i % 11 === 4 || i === 30 ? 'atrasada' : i % 6 === 2 ? 'debe' : 'aldia';
    for (let m = ajustes.mesInicio; m <= ajustes.mesFin; m++) {
      const periodo = `${anio}-${String(m).padStart(2, '0')}`;
      if (periodo > actual) break;
      const k = Number(actual.slice(5)) - m;
      let pagada = true;
      if (k === 0) pagada = r() < 0.5;
      if (perfil === 'debe' && k === 1) pagada = false;
      if (perfil === 'atrasada' && k <= 3) pagada = false;
      const vence = vencimiento(periodo, ajustes.diaVencimiento);
      cuotas.push({
        id: `cq-${f.id}-${periodo}`,
        familiaId: f.id,
        periodo,
        monto,
        detalle,
        estado: pagada ? 'pagada' : 'pendiente',
        pagada: pagada ? new Date(+vence - Math.floor(r() * 9) * 86_400_000).toISOString() : undefined,
        medio: pagada ? 'transferencia' : undefined,
        informada: !pagada && k === 0 && i % 7 === 3 ? new Date(+ahora - 5 * 3_600_000).toISOString() : undefined,
      });
    }
  });

  // Asistencia de los últimos 10 días hábiles y de hoy en tres cursos.
  const hoy = diaLocal(ahora);
  const pasados = diasHabiles(ahora, 11).filter((d) => d !== hoy).slice(0, 10);
  const asistencia: Record<string, Record<string, Presencia>> = {};
  const justificaciones: Justificacion[] = [];
  for (const dia of pasados) {
    asistencia[dia] = {};
    for (const a of alumnos) {
      const x = r();
      asistencia[dia][a.id] = x < 0.06 ? 'ausente' : x < 0.09 ? 'tarde' : 'presente';
      if (asistencia[dia][a.id] === 'ausente' && r() < 0.4) justificaciones.push({ id: `ju-${a.id}-${dia}`, alumnoId: a.id, dia, motivo: ['Turno médico', 'Estaba con fiebre', 'Viaje familiar', 'Control con el pediatra'][Math.floor(r() * 4)], fecha: `${dia}T20:00:00.000Z` });
    }
  }
  if (ahora.getDay() !== 0 && ahora.getDay() !== 6) {
    asistencia[hoy] = {};
    for (const a of alumnos.filter((x) => ['cur-1', 'cur-3', 'cur-6'].includes(x.cursoId))) asistencia[hoy][a.id] = r() < 0.07 ? 'ausente' : 'presente';
  }

  // Comunicados con lecturas parciales.
  const leer = (pct: number, cursoId?: string) => {
    const fams = cursoId ? familias.filter((f) => alumnos.some((a) => a.familiaId === f.id && a.cursoId === cursoId)) : familias;
    return Object.fromEntries(fams.filter(() => r() < pct).map((f) => [f.id, new Date(+ahora - Math.floor(r() * 40) * 3_600_000).toISOString()]));
  };
  const hace = (dias: number) => new Date(+ahora - dias * 86_400_000).toISOString();
  const comunicados: Comunicado[] = [
    { id: 'co-4', fecha: hace(0.2), titulo: 'Acto de fin de año', texto: 'El acto de cierre del ciclo lectivo será el viernes 11 de diciembre a las 18 h en el patio del colegio. Cada familia puede venir con hasta 4 acompañantes. Los chicos tienen que llegar a las 17:30 con la remera del colegio.', destino: { tipo: 'todos' }, leidos: leer(0.42) },
    { id: 'co-3', fecha: hace(2), titulo: 'Reunión de padres de 3.° grado', texto: 'Las esperamos el jueves a las 18 h en el aula de 3.° para conversar sobre el cierre del año y el paso a 4.°.', destino: { tipo: 'curso', id: 'cur-5' }, leidos: leer(0.7, 'cur-5') },
    { id: 'co-2', fecha: hace(6), titulo: 'Cambio de horario por jornada docente', texto: 'El miércoles de la semana próxima la salida será a las 12 h por jornada de capacitación docente. No habrá comedor ese día.', destino: { tipo: 'todos' }, leidos: leer(0.88) },
    { id: 'co-1', fecha: hace(14), titulo: 'Vacunación escolar', texto: 'El centro de salud del barrio vendrá a vacunar a 1.° grado. Enviá el carnet de vacunas en la mochila.', destino: { tipo: 'curso', id: 'cur-3' }, leidos: leer(0.95, 'cur-3') },
  ];

  // Autorizaciones abiertas.
  const responderPct = (pct: number, cursoIds: string[]) => Object.fromEntries(alumnos.filter((a) => cursoIds.includes(a.cursoId) && r() < pct).map((a) => [a.id, { valor: (r() < 0.93 ? 'si' : 'no') as 'si' | 'no', fecha: hace(r() * 2) }]));
  const autorizaciones: Autorizacion[] = [
    { id: 'au-1', fecha: hace(1), titulo: 'Salida al Museo de Ciencias', detalle: 'Salimos a las 9 h y volvemos a las 12:30. Viajamos en micro contratado. Llevar vianda y agua.', dia: proximo(ahora, 5), cursoIds: ['cur-7', 'cur-8'], respuestas: responderPct(0.6, ['cur-7', 'cur-8']) },
    { id: 'au-2', fecha: hace(0.5), titulo: 'Campamento de egresados de 6.°', detalle: 'Dos días y una noche en la reserva natural, con los profes y el equipo de campamento. Te pasamos la lista de cosas para llevar.', dia: proximo(ahora, 4, 2), cursoIds: ['cur-8'], respuestas: responderPct(0.3, ['cur-8']) },
  ];

  // Preinscripciones para el próximo ciclo.
  const preinscripciones: Preinscripcion[] = [
    ['Emilia Rosales', 'cur-1', 'Sofía Rosales', false, 'nueva', 0.3],
    ['Tobías Herrera', 'cur-1', 'Gabriela Herrera', true, 'nueva', 1],
    ['Nina Castro', 'cur-2', 'Federico Castro', true, 'entrevista', 3],
    ['León Benítez', 'cur-3', 'Mariana Benítez', false, 'aceptada', 8],
    ['Ciro Paz', 'cur-3', 'Laura Paz', false, 'espera', 10],
    ['Abril Molina', 'cur-6', 'Diego Molina', false, 'nueva', 0.1],
  ].map(([alumno, cursoId, responsable, hermano, estado, dias], i) => ({ id: `pi-${i + 1}`, fecha: hace(Number(dias)), alumno: String(alumno), cursoId: String(cursoId), responsable: String(responsable), whatsapp: `54911${55_000_000 + i * 4_321}`, hermanoEnElColegio: Boolean(hermano), estado: estado as Preinscripcion['estado'], ejemplo: true }));

  return { ...base, cuotas, comunicados, autorizaciones, asistencia, justificaciones, preinscripciones };
}


/** Planilla ficticia de alumnos: los de la demo más otros nuevos (los hermanos comparten WhatsApp). */
export function planillaAlumnos(moneda: string, ahora = new Date()) {
  const e = crearEstadoColegio(moneda, ahora);
  const filas = [['Alumno', 'Apellido', 'Curso', 'Responsable', 'WhatsApp', 'Beca']];
  for (const a of e.alumnos) {
    const f = e.familias.find((x) => x.id === a.familiaId)!;
    filas.push([a.nombre, a.apellido, e.cursos.find((c) => c.id === a.cursoId)!.nombre, f.responsable, `+${f.whatsapp}`, a.beca ? `${a.beca} %` : '']);
  }
  const extra = ['Sala 4', 'Sala 5', '1ro', '2do', '3ro', '4to', '5to', '6to'];
  for (let i = 0; i < 64; i++) {
    const ap = APELLIDOS[(i * 7 + 40) % APELLIDOS.length];
    filas.push([CHICOS[(i * 11 + 3) % CHICOS.length], ap, extra[i % 8], `${ADULTOS[(i * 5 + 1) % ADULTOS.length]} ${ap}`, `+54 9 11 6${String(1_000_000 + i * 97_531).slice(0, 7)}`, i % 15 === 4 ? '50 %' : '']);
  }
  return '﻿' + filas.map((r) => r.join(';')).join('\r\n');
}

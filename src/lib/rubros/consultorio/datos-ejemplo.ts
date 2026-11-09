import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { DIA_MS, claveDia, conMinutos, libre, lunesDe, siguienteAbierto, sumarDias } from '@/lib/rubros/barberia/agenda';
import type { Cliente, EstadoAgenda, Horario, Profesional, Servicio, Turno } from '@/lib/rubros/barberia/tipos';

export const VERSION_CONSULTORIO = 1;

const U = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
/** Sala de espera sin personas (Unsplash, licencia libre). */
export const FOTO_PORTADA_CONS = U('photo-1774192620935-e8a140a6cc69');

export const PARTICULAR = 'Particular';
export const COBERTURAS_EJEMPLO = ['Salud Plus', 'MediRed', PARTICULAR];

const SERVICIOS: (Omit<Servicio, 'precio'> & { base: number })[] = [
  { id: 'q-primera', nombre: 'Primera consulta clínica', descripcion: 'Para pacientes nuevos.', duracion: 30, base: 30 },
  { id: 'q-control', nombre: 'Control o lectura de resultados', descripcion: 'Para pacientes que ya se atienden.', duracion: 15, base: 18 },
  { id: 'q-apto', nombre: 'Certificado de aptitud física', descripcion: 'Para gimnasio, colegio o club.', duracion: 20, base: 22 },
  { id: 'q-nutri', nombre: 'Primera consulta nutricional', descripcion: 'Entrevista inicial y plan de trabajo.', duracion: 45, base: 32 },
  { id: 'q-seguim', nombre: 'Seguimiento nutricional', descripcion: 'Presencial o por videollamada.', duracion: 30, base: 22, video: true },
];

export const PROFESIONALES_CONS: Profesional[] = [
  { id: 'm-mendez', nombre: 'Laura Méndez', titulo: 'Dra.', especialidad: 'Médica clínica', matricula: 'MN 00000 (ficticia)', servicios: ['q-primera', 'q-control', 'q-apto'], coberturas: ['Salud Plus', 'MediRed', PARTICULAR] },
  { id: 'm-castillo', nombre: 'Andrés Castillo', titulo: 'Lic.', especialidad: 'Nutricionista', matricula: 'MN 00001 (ficticia)', servicios: ['q-nutri', 'q-seguim'], coberturas: ['MediRed', PARTICULAR], teleconsulta: true },
];

/** Lunes a viernes de 9 a 19 h, con pausa de 13 a 15 h. */
export const HORARIO_CONS: Horario = { 0: null, 1: [540, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: null };

const NOMBRES = [
  'Ana Martínez', 'Carlos Pereyra', 'Lucía Fernández', 'Jorge Domínguez', 'Marta Quiroga', 'Diego Salas', 'Paula Herrera',
  'Raúl Giménez', 'Silvia Romero', 'Hernán Vázquez', 'Florencia Ruiz', 'Gustavo Ledesma', 'Verónica Paz', 'Martín Aguirre',
  'Claudia Ponce', 'Esteban Sosa', 'Natalia Godoy', 'Ricardo Funes', 'Mariana Cabral', 'Sergio Benítez', 'Laura Ibarra',
  'Oscar Villalba', 'Julieta Correa', 'Pablo Moyano', 'Rocío Arias', 'Daniel Ojeda', 'Gabriela Ríos', 'Fernando Luna',
];

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const tok = (r: () => number) => Math.floor(r() * 36 ** 8).toString(36).padStart(8, '0');

/**
 * Consultorio Integral Sur (BRD 05). Pacientes ficticios solo con datos administrativos:
 * nombre, WhatsApp, cobertura y número de afiliado. Nunca datos clínicos.
 */
export function crearEstadoConsultorio(moneda: string, ahora = Date.now()): EstadoAgenda {
  const r = azar(7171);
  const servicios: Servicio[] = SERVICIOS.map(({ base, ...s }) => ({ ...s, precio: precioEjemplo(base, moneda) }));
  const clientes: Cliente[] = NOMBRES.map((nombre, i) => {
    const cobertura = COBERTURAS_EJEMPLO[i % 3];
    return {
      id: `p${i + 1}`,
      nombre,
      whatsapp: `54911555${String(20200 + i * 41).padStart(5, '0')}`,
      notas: '',
      sellos: 0,
      ausencias: 0,
      creado: new Date(ahora - (i > 21 ? 6 + (i - 22) * 4 : 90 + i) * DIA_MS).toISOString(),
      cobertura,
      afiliado: cobertura === PARTICULAR ? undefined : `${cobertura === 'Salud Plus' ? 'SP' : 'MR'}-${100000 + i * 7919}`,
      ejemplo: true,
    };
  });
  clientes[0].notas = 'Prefiere turnos a primera hora. Avisar por WhatsApp, no llamar.';

  const estado: EstadoAgenda = {
    version: VERSION_CONSULTORIO,
    rubro: 'consultorio',
    servicios,
    profesionales: PROFESIONALES_CONS,
    turnos: [],
    clientes,
    bloqueos: [],
    espera: [],
    horario: HORARIO_CONS,
    metaSellos: 0,
    beneficio: '',
    semilla: claveDia(lunesDe(ahora)),
    pausa: [780, 900],
    coberturas: COBERTURAS_EJEMPLO,
    eventos: [],
  };

  const lunes = lunesDe(ahora);
  const hoy = claveDia(ahora);
  // El licenciado no atiende los viernes de la semana que viene (congreso).
  const viernes = sumarDias(lunes, 11);
  estado.bloqueos.push({ id: 'b1', profId: 'm-castillo', desde: conMinutos(viernes, 0).toISOString(), hasta: conMinutos(viernes, 1440).toISOString(), motivo: 'Congreso' });

  const elegir = () => clientes[1 + Math.floor(r() ** 1.4 * (clientes.length - 1))];
  for (let d = -28; d < 14; d++) {
    const dia = sumarDias(lunes, d);
    const h = HORARIO_CONS[dia.getDay()];
    if (!h) continue;
    const pasado = claveDia(dia) < hoy;
    const relleno = pasado ? 0.7 : claveDia(dia) === hoy ? 0.6 : Math.max(0.15, 0.55 - (d - 7) * 0.035);
    for (const p of PROFESIONALES_CONS) {
      let m = h[0];
      while (m < h[1]) {
        const sid = p.servicios[Math.floor(r() * p.servicios.length)];
        const s = servicios.find((x) => x.id === sid)!;
        if (m + s.duracion > h[1]) break;
        const ini = conMinutos(dia, m);
        const fin = new Date(+ini + s.duracion * 60_000);
        if (r() < relleno && libre(estado, p.id, +ini, +fin)) {
          const c = elegir();
          const terminado = +fin <= ahora;
          const x = r();
          // Ausentismo de ejemplo cercano al 18 % (el BRD cita ~20 % en Argentina).
          const est: Turno['estado'] = terminado ? (x < 0.18 ? 'ausente' : x < 0.22 ? 'cancelado' : 'atendido') : x < 0.5 ? 'confirmado' : 'reservado';
          const cobertura = p.coberturas!.includes(c.cobertura!) ? c.cobertura! : PARTICULAR;
          estado.turnos.push({
            id: `t${estado.turnos.length + 1}`,
            token: tok(r),
            clienteId: c.id,
            profId: p.id,
            servicioId: sid,
            inicio: ini.toISOString(),
            fin: fin.toISOString(),
            estado: est,
            origen: r() < 0.6 ? 'online' : 'manual',
            creado: new Date(+ini - (2 + Math.floor(r() * 10)) * DIA_MS).toISOString(),
            cobertura,
            ...(s.video && r() < 0.4 ? { modalidad: 'video' as const } : {}),
            ejemplo: true,
          });
          m += s.duracion;
          m = Math.ceil(m / 15) * 15;
        } else m += 15 * (1 + Math.floor(r() * 2));
      }
    }
  }
  // Un sobreturno de ejemplo hoy con la doctora.
  const hoyD = new Date(ahora);
  if (HORARIO_CONS[hoyD.getDay()]) {
    const ini = conMinutos(hoyD, 12 * 60 + 45);
    estado.turnos.push({
      id: `t${estado.turnos.length + 1}`,
      token: tok(r),
      clienteId: clientes[5].id,
      profId: 'm-mendez',
      servicioId: 'q-control',
      inicio: ini.toISOString(),
      fin: new Date(+ini + 15 * 60_000).toISOString(),
      estado: +ini + 15 * 60_000 <= ahora ? 'atendido' : 'confirmado',
      origen: 'manual',
      creado: new Date(ahora - 3_600_000).toISOString(),
      cobertura: clientes[5].cobertura,
      sobreturno: true,
      ejemplo: true,
    });
  }
  // Ana es paciente habitual: una consulta cada una o dos semanas, más un turno próximo.
  const pasados = estado.turnos.filter((t) => +new Date(t.fin) <= ahora && t.estado === 'atendido' && !t.sobreturno);
  const porDia = new Map<string, Turno>();
  for (const t of pasados) porDia.set(claveDia(t.inicio), t);
  [...porDia.values()].filter((_, i, a) => (a.length - 1 - i) % 6 === 0).slice(-5).forEach((t) => {
    t.clienteId = clientes[0].id;
    t.cobertura = PROFESIONALES_CONS.find((p) => p.id === t.profId)!.coberturas!.includes('Salud Plus') ? 'Salud Plus' : PARTICULAR;
  });
  const prox = estado.turnos.find((t) => +new Date(t.inicio) > ahora + 2 * DIA_MS && t.profId === 'm-mendez' && !t.sobreturno);
  if (prox) Object.assign(prox, { clienteId: clientes[0].id, cobertura: 'Salud Plus', estado: 'confirmado' });
  for (const c of clientes) c.ausencias = estado.turnos.filter((t) => t.clienteId === c.id && t.estado === 'ausente').length;
  // Paciente con historial limpio (sin ausencias) para mostrar.
  estado.turnos.filter((t) => t.clienteId === clientes[0].id && t.estado === 'ausente').forEach((t) => (t.estado = 'atendido'));
  clientes[0].ausencias = 0;

  estado.espera.push({
    id: 'e1',
    nombre: 'Elena Bustos',
    whatsapp: '5491155529876',
    servicioId: 'q-control',
    profId: 'm-mendez',
    dia: claveDia(siguienteAbierto(HORARIO_CONS, ahora)),
    creado: new Date(ahora - 2 * 3_600_000).toISOString(),
  });
  return estado;
}

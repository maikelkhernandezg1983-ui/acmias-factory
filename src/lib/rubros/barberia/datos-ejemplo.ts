import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { DIA_MS, claveDia, conMinutos, esActivo, libre, lunesDe, siguienteAbierto, sumarDias } from './agenda';
import type { Cliente, EstadoAgenda, Horario, Profesional, Servicio, Turno } from './tipos';

export const VERSION_BARBERIA = 1;

const U = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
/** Fotos de Unsplash con licencia libre (no Unsplash+), sin marcas visibles. */
export const FOTO_PORTADA_BARB = U('photo-1702865272115-5afdbae975af', 1600);
export const GALERIA_BARB = [
  { src: U('photo-1634302104565-cc698ee83144'), alt: 'Corte con tijera y peine en el sillón' },
  { src: U('photo-1593702233354-259d1f794ed1'), alt: 'Afeitado clásico con navaja' },
  { src: U('photo-1672257493393-7456f8aa76b6'), alt: 'El salón con sillones y espejos' },
  { src: U('photo-1786056554886-703cd6e3f55c'), alt: 'Herramientas de manicura' },
];

const SERVICIOS: (Omit<Servicio, 'precio'> & { base: number })[] = [
  { id: 's-clasico', nombre: 'Corte clásico', descripcion: 'Tijera y máquina, lavado y peinado.', duracion: 30, base: 9 },
  { id: 's-corte-barba', nombre: 'Corte + barba', descripcion: 'Corte completo y perfilado de barba.', duracion: 45, base: 14 },
  { id: 's-degrade', nombre: 'Degradé (fade)', descripcion: 'Degradé a máquina con terminación a navaja.', duracion: 40, base: 12 },
  { id: 's-barba', nombre: 'Perfilado de barba', descripcion: 'Con toalla caliente y aceite.', duracion: 25, base: 7 },
  { id: 's-infantil', nombre: 'Corte infantil', descripcion: 'Hasta 12 años, con paciencia.', duracion: 25, base: 7 },
  { id: 's-color', nombre: 'Color / mechas', descripcion: 'Incluye diagnóstico y matizado.', duracion: 90, base: 38, sena: 30 },
  { id: 's-manicura', nombre: 'Manicura masculina', descripcion: 'Limado, cutículas e hidratación.', duracion: 30, base: 9 },
];

export const PROFESIONALES: Profesional[] = [
  { id: 'p-mateo', nombre: 'Mateo Ríos', especialidad: 'Degradés y cortes modernos', servicios: ['s-clasico', 's-degrade', 's-corte-barba', 's-infantil'] },
  { id: 'p-joaquin', nombre: 'Joaquín Paredes', especialidad: 'Barba y corte clásico', servicios: ['s-clasico', 's-corte-barba', 's-barba', 's-infantil'] },
  { id: 'p-valentina', nombre: 'Valentina Suárez', especialidad: 'Manicura y color', servicios: ['s-color', 's-manicura', 's-clasico'] },
];

/** Martes a sábado de 10 a 20 h. */
export const HORARIO_EJEMPLO: Horario = { 0: null, 1: null, 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [600, 1200] };

const NOMBRES = [
  'Martín Gómez', 'Lucas Herrera', 'Sofía Benítez', 'Nicolás Acosta', 'Tomás Medina', 'Facundo Rojas', 'Agustín Molina',
  'Bruno Castro', 'Diego Ortiz', 'Ignacio Silva', 'Santiago Romero', 'Matías Torres', 'Julián Díaz', 'Federico Sosa',
  'Gonzalo Ruiz', 'Emiliano Vega', 'Camila Luna', 'Valentín Ríos', 'Andrés Navarro', 'Pablo Ibáñez', 'Leandro Paz',
  'Rodrigo Cabrera', 'Joaquín Blanco', 'Ramiro Ferreyra',
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
 * Agenda de ejemplo: las 4 semanas anteriores (historial para métricas) y las 2 próximas,
 * con huecos libres para reservar en vivo. Clientes destacados del BRD: uno frecuente
 * con 8/10 sellos, uno con 2 ausencias y uno nuevo.
 */
export function crearEstadoBarberia(moneda: string, ahora = Date.now()): EstadoAgenda {
  const r = azar(4242);
  const servicios: Servicio[] = SERVICIOS.map(({ base, ...s }) => ({ ...s, precio: precioEjemplo(base, moneda) }));
  const creado = new Date(ahora - 120 * DIA_MS).toISOString();
  const clientes: Cliente[] = NOMBRES.map((nombre, i) => ({
    id: `c${i + 1}`,
    nombre,
    whatsapp: `54911555${String(10100 + i * 37).padStart(5, '0')}`,
    notas: '',
    sellos: 0,
    ausencias: 0,
    creado,
    ejemplo: true,
  }));
  // Los últimos de la lista llegaron en el último mes (para la métrica de clientes nuevos).
  clientes.slice(-6).forEach((c, i) => (c.creado = new Date(ahora - (26 - i * 3) * DIA_MS).toISOString()));
  const frecuente = clientes[0];
  frecuente.notas = 'Degradé bajo, número 1 a los costados. Prefiere a Mateo. Café sin azúcar.';
  const faltador = clientes[1];
  faltador.notas = 'Confirmar siempre el día anterior.';
  const nuevo = clientes[2];
  nuevo.creado = new Date(ahora - 2 * DIA_MS).toISOString();

  const estado: EstadoAgenda = {
    version: VERSION_BARBERIA,
    rubro: 'barberia',
    servicios,
    profesionales: PROFESIONALES,
    turnos: [],
    clientes,
    bloqueos: [],
    espera: [],
    horario: HORARIO_EJEMPLO,
    metaSellos: 10,
    beneficio: 'Corte clásico sin cargo',
    semilla: claveDia(lunesDe(ahora)),
  };

  const lunes = lunesDe(ahora);
  const hoy = claveDia(ahora);
  // Vacaciones de ejemplo: Valentina no atiende el sábado de la semana que viene.
  const sabado = sumarDias(lunes, 12);
  estado.bloqueos.push({ id: 'b1', profId: 'p-valentina', desde: conMinutos(sabado, 0).toISOString(), hasta: conMinutos(sabado, 1440).toISOString(), motivo: 'Capacitación' });
  // Almuerzo de Joaquín todos los días hábiles de esta semana y la próxima.
  for (let d = 0; d < 14; d++) {
    const dia = sumarDias(lunes, d);
    if (!HORARIO_EJEMPLO[dia.getDay()]) continue;
    estado.bloqueos.push({ id: `b-alm-${d}`, profId: 'p-joaquin', desde: conMinutos(dia, 810).toISOString(), hasta: conMinutos(dia, 870).toISOString(), motivo: 'Almuerzo' });
  }

  // Clientes "habituales" (los primeros) vienen más seguido.
  const elegirCliente = () => clientes[3 + Math.floor(r() ** 1.6 * (clientes.length - 3))];
  for (let d = -28; d < 14; d++) {
    const dia = sumarDias(lunes, d);
    const h = HORARIO_EJEMPLO[dia.getDay()];
    if (!h) continue;
    const pasado = claveDia(dia) < hoy;
    const relleno = pasado ? 0.72 : claveDia(dia) === hoy ? 0.62 : Math.max(0.15, 0.58 - (d - 7) * 0.035);
    for (const p of PROFESIONALES) {
      let m = h[0];
      while (m < h[1]) {
        const sid = p.servicios[Math.floor(r() * p.servicios.length)];
        const s = servicios.find((x) => x.id === sid)!;
        if (m + s.duracion > h[1]) break;
        const ini = conMinutos(dia, m);
        const fin = new Date(+ini + s.duracion * 60_000);
        if (r() < relleno && libre(estado, p.id, +ini, +fin)) {
          const terminado = +fin <= ahora;
          const x = r();
          const est: Turno['estado'] = terminado ? (x < 0.07 ? 'ausente' : x < 0.12 ? 'cancelado' : 'atendido') : x < 0.55 ? 'confirmado' : 'reservado';
          estado.turnos.push({
            id: `t${estado.turnos.length + 1}`,
            token: tok(r),
            clienteId: elegirCliente().id,
            profId: p.id,
            servicioId: sid,
            inicio: ini.toISOString(),
            fin: fin.toISOString(),
            estado: est,
            origen: r() < 0.7 ? 'online' : 'manual',
            creado: new Date(+ini - (2 + Math.floor(r() * 6)) * DIA_MS).toISOString(),
            ejemplo: true,
          });
          m += s.duracion;
          m = Math.ceil(m / 15) * 15;
        } else m += 15 * (1 + Math.floor(r() * 3));
      }
    }
  }

  // Historia de los tres clientes del BRD.
  const pasados = estado.turnos.filter((t) => +new Date(t.fin) <= ahora && esActivo(t));
  // Un turno por día distinto (viene más o menos cada 3 días), los últimos 8.
  const porDia = new Map<string, Turno>();
  for (const t of pasados) if (t.profId === 'p-mateo') porDia.set(claveDia(t.inicio), t);
  const mateo = [...porDia.values()].filter((_, i, a) => (a.length - 1 - i) % 2 === 0).slice(-8);
  mateo.forEach((t) => {
    t.clienteId = frecuente.id;
    t.estado = 'atendido';
    t.servicioId = 's-degrade';
  });
  const deJoaquin = pasados.filter((t) => t.profId === 'p-joaquin' && !mateo.includes(t));
  deJoaquin.slice(-3).forEach((t, i) => {
    t.clienteId = faltador.id;
    t.estado = i < 2 ? 'ausente' : 'atendido';
  });
  // Recalcular sellos (atendidos) y ausencias desde la historia.
  for (const c of clientes) {
    const suyos = estado.turnos.filter((t) => t.clienteId === c.id);
    c.sellos = Math.min(estado.metaSellos - 1, suyos.filter((t) => t.estado === 'atendido').length % estado.metaSellos);
    c.ausencias = suyos.filter((t) => t.estado === 'ausente').length;
  }
  frecuente.sellos = 8;
  // El cliente nuevo tiene su primer turno reservado online para más adelante.
  const futuro = estado.turnos.find((t) => +new Date(t.inicio) > ahora + DIA_MS && t.profId === 'p-joaquin');
  if (futuro) {
    futuro.clienteId = nuevo.id;
    futuro.estado = 'reservado';
    futuro.origen = 'online';
  }
  nuevo.sellos = 0;
  nuevo.ausencias = 0;

  // Lista de espera de ejemplo: alguien quiere un turno mañana con Mateo.
  const manana = siguienteAbierto(HORARIO_EJEMPLO, ahora);
  estado.espera.push({
    id: 'e1',
    nombre: 'Franco Peralta',
    whatsapp: '5491155519876',
    servicioId: 's-degrade',
    profId: 'p-mateo',
    dia: claveDia(manana),
    creado: new Date(ahora - 3 * 3_600_000).toISOString(),
  });
  return estado;
}

/**
 * Los datos de ejemplo se generan una vez; si la demo se abre semanas después, se corren
 * las semanas completas para que la agenda siga mostrando "esta semana" (sin tocar lo que cargó el dueño).
 */
export function correrSemanas(e: EstadoAgenda, ahora = Date.now()): EstadoAgenda | null {
  const actual = lunesDe(ahora);
  const [a, m, d] = e.semilla.split('-').map(Number);
  const semanas = Math.round((+actual - +new Date(a, m - 1, d)) / (7 * DIA_MS));
  if (semanas < 1) return null;
  const mover = (iso: string) => {
    const x = new Date(iso);
    x.setDate(x.getDate() + semanas * 7);
    return x.toISOString();
  };
  return {
    ...e,
    semilla: claveDia(actual),
    turnos: e.turnos.map((t) => {
      if (!t.ejemplo) return t;
      const fin = mover(t.fin);
      const terminado = +new Date(fin) <= ahora;
      const estado = terminado && (t.estado === 'reservado' || t.estado === 'confirmado') ? 'atendido' : t.estado;
      return { ...t, inicio: mover(t.inicio), fin, creado: mover(t.creado), estado };
    }),
    bloqueos: e.bloqueos.map((b) => (b.id.startsWith('b') ? { ...b, desde: mover(b.desde), hasta: mover(b.hasta) } : b)),
    espera: e.espera.map((x) => (x.id === 'e1' ? { ...x, dia: claveDia(siguienteAbierto(e.horario, ahora)) } : x)),
  };
}

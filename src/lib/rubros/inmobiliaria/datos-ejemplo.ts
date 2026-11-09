import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { DIA_MS, conMinutos, inicioDia, sumarDias } from '@/lib/rubros/barberia/agenda';
import type { Captacion, Consulta, EstadoInmo, Operacion, Propiedad, TipoPropiedad, Visita } from './tipos';

export const VERSION_INMO = 1;
export const DURACION_VISITA = 30;

/** Zonas genéricas: nunca barrios o ciudades reales. */
export const ZONAS = ['Centro', 'Zona Norte', 'Barrio Parque', 'Las Lomas', 'Villa Verde', 'Zona Sur', 'La Ribera'];

export const FACHADAS = ['#E9D8C4', '#C9DBE8', '#F2E6B8', '#D9E4D0', '#EFD3CC', '#D8D3E8', '#E4E1DA', '#CFE3E0'];

interface Molde {
  tipo: TipoPropiedad;
  operaciones: Operacion[];
  titulo: (amb: number) => string;
  amb: [number, number];
  m2: [number, number]; // cubiertos por ambiente (o totales en terreno/galpón)
  /** USD por m² para venta. */
  usdM2: number;
  amenities: string[];
}

const MOLDES: Molde[] = [
  { tipo: 'departamento', operaciones: ['alquiler', 'venta', 'temporario', 'alquiler', 'venta'], titulo: (a) => (a === 1 ? 'Monoambiente luminoso' : `Departamento de ${a} ambientes`), amb: [1, 4], m2: [24, 32], usdM2: 1900, amenities: ['Balcón', 'Ascensor', 'Laundry', 'Seguridad 24 h', 'Pileta', 'Parrilla'] },
  { tipo: 'casa', operaciones: ['venta', 'alquiler', 'venta'], titulo: (a) => `Casa de ${a} ambientes con jardín`, amb: [3, 6], m2: [28, 36], usdM2: 1400, amenities: ['Jardín', 'Parrilla', 'Pileta', 'Cochera cubierta', 'Lavadero'] },
  { tipo: 'ph', operaciones: ['venta', 'alquiler'], titulo: (a) => `PH de ${a} ambientes con terraza`, amb: [2, 4], m2: [26, 32], usdM2: 1500, amenities: ['Terraza propia', 'Sin expensas', 'Patio', 'Parrilla'] },
  { tipo: 'local', operaciones: ['alquiler', 'venta'], titulo: () => 'Local a la calle', amb: [1, 2], m2: [30, 70], usdM2: 1700, amenities: ['Vidriera', 'Baño', 'Depósito'] },
  { tipo: 'oficina', operaciones: ['alquiler', 'venta'], titulo: (a) => `Oficina de ${a} ambientes`, amb: [1, 4], m2: [18, 26], usdM2: 1800, amenities: ['Ascensor', 'Aire acondicionado', 'Recepción', 'Sala de reuniones'] },
  { tipo: 'terreno', operaciones: ['venta'], titulo: () => 'Lote para construir', amb: [0, 0], m2: [300, 900], usdM2: 120, amenities: ['Servicios en la cuadra', 'Escritura inmediata'] },
  { tipo: 'galpon', operaciones: ['alquiler', 'venta'], titulo: () => 'Galpón con oficinas', amb: [2, 3], m2: [350, 900], usdM2: 600, amenities: ['Portón para camiones', 'Oficinas', 'Trifásica'] },
  { tipo: 'cochera', operaciones: ['alquiler', 'venta'], titulo: () => 'Cochera cubierta', amb: [0, 0], m2: [12, 14], usdM2: 1100, amenities: ['Portón automático', 'Seguridad'] },
];

const NOMBRES = ['Laura Benítez', 'Marcos Díaz', 'Carolina Paz', 'Sebastián Ríos', 'Natalia Vega', 'Ezequiel Sosa', 'Daniela Ruiz', 'Pablo Medina', 'Agustina Luna', 'Ignacio Torres', 'Micaela Romero', 'Gonzalo Herrera', 'Victoria Castro', 'Leandro Ortiz', 'Belén Acosta', 'Ramiro Molina'];

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const entre = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

/**
 * Inmobiliaria de ejemplo: ~30 propiedades en venta, alquiler y temporario,
 * consultas de 3 semanas, visitas de los próximos días y propietarios que quieren vender o alquilar.
 */
export function crearEstadoInmo(moneda: string, ahora = Date.now()): EstadoInmo {
  const r = azar(2468);
  const propiedades: Propiedad[] = [];
  let n = 0;
  for (const m of MOLDES) {
    for (const op of m.operaciones) {
      n++;
      const amb = m.amb[1] ? entre(r, m.amb[0], m.amb[1]) : 0;
      const porAmb = entre(r, m.m2[0], m.m2[1]);
      const m2Cub = m.tipo === 'terreno' ? 0 : m.tipo === 'galpon' || m.tipo === 'cochera' ? porAmb : Math.max(28, amb * porAmb);
      const m2Tot = m.tipo === 'terreno' ? porAmb : m.tipo === 'casa' ? Math.round(m2Cub * (2 + r() * 2)) : m.tipo === 'ph' ? Math.round(m2Cub * 1.3) : Math.round(m2Cub * 1.08);
      const antig = r() < 0.18 ? 0 : entre(r, 2, 45);
      const valorUsd = Math.round(((m.tipo === 'terreno' ? m2Tot : m2Cub) * m.usdM2 * (antig === 0 ? 1.15 : Math.max(0.7, 1 - antig / 120)) * (0.85 + r() * 0.3)) / 1000) * 1000;
      // Alquiler mensual ≈ 0,45 % del valor; temporario por noche ≈ 0,04 %.
      const alquilerUsd = op === 'alquiler' ? valorUsd * 0.0045 : valorUsd * 0.0004;
      const zona = ZONAS[(n * 3 + entre(r, 0, 2)) % ZONAS.length];
      const dorm = m.tipo === 'casa' || m.tipo === 'departamento' || m.tipo === 'ph' ? Math.max(0, amb - 1) : 0;
      const am = m.amenities.filter(() => r() < 0.65);
      propiedades.push({
        id: `pr${n}`,
        codigo: `P-${1000 + n * 7}`,
        operacion: op,
        tipo: m.tipo,
        titulo: m.titulo(amb),
        zona,
        direccion: `Calle ${entre(r, 2, 60)} al ${entre(r, 1, 30) * 100}`,
        precio: op === 'venta' ? valorUsd : Math.round(precioEjemplo(alquilerUsd, moneda) / 1000) * 1000 || Math.round(precioEjemplo(alquilerUsd, moneda)),
        moneda: op === 'venta' ? 'USD' : 'local',
        expensas: m.tipo === 'departamento' || m.tipo === 'oficina' ? Math.round(precioEjemplo(40 + amb * 22, moneda) / 1000) * 1000 || precioEjemplo(40 + amb * 22, moneda) : undefined,
        m2Cubiertos: m2Cub,
        m2Totales: m2Tot,
        ambientes: amb,
        dormitorios: dorm,
        banos: m.tipo === 'terreno' || m.tipo === 'cochera' ? 0 : amb >= 4 ? 2 : 1,
        cocheras: m.tipo === 'cochera' ? 1 : m.tipo === 'casa' || r() < 0.3 ? 1 : 0,
        antiguedad: antig,
        amenities: am.length ? am : m.amenities.slice(0, 1),
        aptoCredito: op === 'venta' && m.tipo !== 'terreno' && m.tipo !== 'cochera' && r() < 0.6 ? true : undefined,
        mascotas: op !== 'venta' && (m.tipo === 'casa' || m.tipo === 'departamento' || m.tipo === 'ph') ? r() < 0.6 : undefined,
        color: FACHADAS[n % FACHADAS.length],
        estado: 'disponible',
        ingreso: new Date(ahora - Math.floor(r() ** 2.2 * 90) * DIA_MS).toISOString(),
        vistas: entre(r, 30, 420),
        ejemplo: true,
      });
    }
  }
  for (const t of ['casa', 'departamento', 'ph'] as TipoPropiedad[]) {
    const p = propiedades.find((x) => x.tipo === t && x.operacion !== 'temporario');
    if (p) p.destacada = true;
  }
  const res = propiedades.find((p) => p.tipo === 'local' && p.operacion === 'alquiler');
  if (res) res.estado = 'reservada';
  const cerr = propiedades.find((p) => p.tipo === 'oficina' && p.operacion === 'alquiler');
  if (cerr) Object.assign(cerr, { estado: 'cerrada', cerrada: new Date(ahora - 6 * DIA_MS).toISOString() });
  const lenta = propiedades.find((p) => p.tipo === 'galpon');
  if (lenta) Object.assign(lenta, { ingreso: new Date(ahora - 104 * DIA_MS).toISOString(), vistas: 44 });

  const disponibles = propiedades.filter((p) => p.estado === 'disponible');
  const consultas: Consulta[] = NOMBRES.map((nombre, i) => {
    const p = disponibles[(i * 5) % disponibles.length];
    const horas = Math.floor(r() ** 1.5 * 20 * 24);
    return {
      id: `c${i + 1}`,
      fecha: new Date(ahora - horas * 3_600_000 - 20 * 60_000).toISOString(),
      nombre,
      whatsapp: `54911555${String(40400 + i * 61).padStart(5, '0')}`,
      propiedadId: p.id,
      tipo: i % 4 === 1 ? 'requisitos' : i % 4 === 2 ? 'visita' : 'consulta',
      mensaje: i % 4 === 1 ? '¿Qué garantía piden?' : i % 3 === 0 ? '¿Sigue disponible?' : undefined,
      estado: horas < 30 ? 'nueva' : r() < 0.6 ? 'contactada' : r() < 0.5 ? 'cerrada' : 'perdida',
      ejemplo: true,
    } satisfies Consulta;
  });

  const visitas: Visita[] = [];
  const horas = [600, 690, 960, 1050];
  for (let d = 0; visitas.length < 6 && d < 10; d++) {
    const dia = sumarDias(inicioDia(ahora), d);
    const h = HORARIO_INMO[dia.getDay()];
    if (!h) continue;
    let delDia = 0;
    for (const m of horas) {
      if (visitas.length >= 6 || delDia >= 2) break;
      const ini = conMinutos(dia, m);
      if (+ini < ahora + 30 * 60_000 || m + DURACION_VISITA > h[1]) continue;
      const k = visitas.length;
      const c = consultas.find((x) => x.tipo === 'visita' && !x.visitaId) ?? consultas[consultas.length - 1 - k];
      const v: Visita = {
        id: `v${k + 1}`,
        token: Math.floor(r() * 36 ** 8).toString(36).padStart(8, '0'),
        clienteId: c.id,
        profId: c.propiedadId ?? disponibles[k].id,
        servicioId: 'visita',
        inicio: ini.toISOString(),
        fin: new Date(+ini + DURACION_VISITA * 60_000).toISOString(),
        estado: k % 3 === 2 ? 'reservado' : 'confirmado',
        origen: 'online',
        creado: new Date(ahora - DIA_MS).toISOString(),
        ejemplo: true,
      };
      c.visitaId = v.id;
      c.tipo = 'visita';
      if (c.estado !== 'nueva') c.estado = 'contactada';
      visitas.push(v);
      delDia++;
    }
  }

  const captaciones: Captacion[] = [
    { id: 'k1', fecha: new Date(ahora - 5 * 3_600_000).toISOString(), nombre: 'Roberto Giménez', whatsapp: '5491155549001', operacion: 'venta', tipo: 'casa', zona: 'Las Lomas', ambientes: 4, comentario: 'Casa con jardín, nos mudamos en marzo.', estado: 'nueva', ejemplo: true },
    { id: 'k2', fecha: new Date(ahora - 2 * DIA_MS).toISOString(), nombre: 'Silvia Navarro', whatsapp: '5491155549002', operacion: 'alquiler', tipo: 'departamento', zona: 'Centro', ambientes: 2, comentario: 'Lo heredé y quiero alquilarlo amoblado.', estado: 'tasacion', ejemplo: true },
    { id: 'k3', fecha: new Date(ahora - 9 * DIA_MS).toISOString(), nombre: 'Hugo Ferreyra', whatsapp: '5491155549003', operacion: 'venta', tipo: 'local', zona: 'Zona Sur', ambientes: 1, comentario: '', estado: 'captada', ejemplo: true },
  ];

  return {
    version: VERSION_INMO,
    rubro: 'inmobiliaria',
    propiedades,
    consultas,
    visitas,
    captaciones,
    horario: HORARIO_INMO,
    zonas: ZONAS,
    ajustes: { mesesDeposito: 1, honorariosMeses: 1, honorariosVenta: 3 },
  };
}

/** Visitas de lunes a viernes de 10 a 18 h y sábados de 10 a 13 h. */
export const HORARIO_INMO: EstadoInmo['horario'] = { 0: null, 1: [600, 1080], 2: [600, 1080], 3: [600, 1080], 4: [600, 1080], 5: [600, 1080], 6: [600, 780] };

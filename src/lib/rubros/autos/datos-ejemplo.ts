import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { DIA_MS, conMinutos, sumarDias, inicioDia } from '@/lib/rubros/barberia/agenda';
import type { Carroceria, Consulta, EstadoAutos, Prueba, TipoVehiculo, Vehiculo } from './tipos';

export const VERSION_AUTOS = 1;
export const DURACION_PRUEBA = 30;

interface Ficha {
  tipo: TipoVehiculo;
  carroceria: Carroceria;
  marca: string;
  modelo: string;
  /** Precio en USD de una unidad 2020 (se ajusta por año). */
  base: number;
  combustible: Vehiculo['combustible'];
  caja: Vehiculo['caja'];
  equipamiento: string[];
}

const FICHAS: Ficha[] = [
  { tipo: 'auto', carroceria: 'sedan', marca: 'Marca A', modelo: 'Sedán compacto 1.6', base: 12500, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Aire acondicionado', 'Dirección asistida', 'Doble airbag', 'Bluetooth'] },
  { tipo: 'auto', carroceria: 'sedan', marca: 'Marca B', modelo: 'Sedán mediano 2.0 automático', base: 17800, combustible: 'Nafta', caja: 'Automática', equipamiento: ['Climatizador', 'Pantalla táctil', 'Cámara de retroceso', '6 airbags', 'Control de crucero'] },
  { tipo: 'auto', carroceria: 'hatch', marca: 'Marca C', modelo: 'Hatch 1.4 urbano', base: 10900, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Aire acondicionado', 'Levantavidrios eléctricos', 'Doble airbag'] },
  { tipo: 'auto', carroceria: 'hatch', marca: 'Marca A', modelo: 'Hatch 1.0 turbo', base: 13200, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Pantalla táctil', 'Sensor de estacionamiento', '4 airbags', 'Llantas de aleación'] },
  { tipo: 'auto', carroceria: 'suv', marca: 'Marca D', modelo: 'SUV compacto 1.6', base: 16400, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Climatizador', 'Barras de techo', 'Cámara de retroceso', '6 airbags'] },
  { tipo: 'auto', carroceria: 'suv', marca: 'Marca B', modelo: 'SUV mediano 2.0 automático', base: 21900, combustible: 'Nafta', caja: 'Automática', equipamiento: ['Climatizador bizona', 'Techo solar', 'Cámara 360°', 'Asistente de carril', '6 airbags'] },
  { tipo: 'auto', carroceria: 'suv', marca: 'Marca E', modelo: 'SUV 7 asientos híbrido', base: 27500, combustible: 'Híbrido', caja: 'Automática', equipamiento: ['Tercera fila', 'Climatizador trizona', 'Carga inalámbrica', 'Frenado autónomo'] },
  { tipo: 'auto', carroceria: 'pickup', marca: 'Marca C', modelo: 'Pick-up 2.5 diésel 4x2', base: 21500, combustible: 'Diésel', caja: 'Manual', equipamiento: ['Cabina doble', 'Lona marítima', 'Gancho de arrastre', 'Aire acondicionado'] },
  { tipo: 'auto', carroceria: 'pickup', marca: 'Marca D', modelo: 'Pick-up 2.8 diésel 4x4 automática', base: 31800, combustible: 'Diésel', caja: 'Automática', equipamiento: ['Cabina doble', '4x4 con reductora', 'Pantalla táctil', 'Control de descenso'] },
  { tipo: 'moto', carroceria: 'naked', marca: 'Marca F', modelo: 'Naked 300', base: 4600, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Frenos ABS', 'Tablero digital', 'Inyección electrónica'] },
  { tipo: 'moto', carroceria: 'naked', marca: 'Marca G', modelo: 'Naked 150', base: 2300, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Freno a disco', 'Arranque eléctrico'] },
  { tipo: 'moto', carroceria: 'scooter', marca: 'Marca G', modelo: 'Scooter 125', base: 1900, combustible: 'Nafta', caja: 'Automática', equipamiento: ['Baúl bajo asiento', 'Arranque eléctrico', 'Puerto USB'] },
  { tipo: 'moto', carroceria: 'scooter', marca: 'Marca F', modelo: 'Scooter 160 ABS', base: 2900, combustible: 'Nafta', caja: 'Automática', equipamiento: ['Frenos ABS', 'Llave de proximidad', 'Baúl bajo asiento'] },
  { tipo: 'moto', carroceria: 'enduro', marca: 'Marca H', modelo: 'Enduro 250', base: 4100, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Suspensión de largo recorrido', 'Cubiertas mixtas', 'Protector de cárter'] },
  { tipo: 'moto', carroceria: 'enduro', marca: 'Marca G', modelo: 'Trail 190', base: 2700, combustible: 'Nafta', caja: 'Manual', equipamiento: ['Arranque eléctrico', 'Parrilla trasera'] },
];

export const COLORES = [
  { nombre: 'Rojo', hex: '#C0392B' },
  { nombre: 'Gris plata', hex: '#A3ABB5' },
  { nombre: 'Blanco', hex: '#EEF0F2' },
  { nombre: 'Negro', hex: '#262A31' },
  { nombre: 'Azul', hex: '#2F5E9E' },
  { nombre: 'Verde', hex: '#3F7D5A' },
  { nombre: 'Naranja', hex: '#D9632B' },
  { nombre: 'Gris oscuro', hex: '#525866' },
];

const NOMBRES = [
  'Lucía Romero', 'Martín Giménez', 'Paula Acosta', 'Diego Salas', 'Florencia Luna', 'Nicolás Vera', 'Carla Méndez',
  'Javier Ruiz', 'Sofía Ortiz', 'Tomás Herrera', 'Valeria Ponce', 'Gabriel Castro', 'Rocío Medina', 'Andrés Molina',
  'Camila Sosa', 'Federico Paz', 'Julieta Ríos', 'Hernán Luna',
];

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Precio de lista de un vehículo según año y km (ajuste simple para que el stock de ejemplo sea coherente). */
function precioFicha(f: Ficha, anio: number, km: number, cerokm: boolean) {
  const anios = Math.max(0, 2020 - anio);
  const factorAnio = anio >= 2020 ? 1 + (anio - 2020) * 0.06 : Math.pow(0.92, anios);
  const factorKm = cerokm ? 1.12 : Math.max(0.82, 1 - km / 900000);
  return Math.round((f.base * factorAnio * factorKm) / 100) * 100;
}

/**
 * Agencia de ejemplo "Motores del Sur": ~28 vehículos (autos y motos, usados y 0 km),
 * consultas de las últimas 3 semanas y pruebas de manejo de hoy y los próximos días.
 */
export function crearEstadoAutos(moneda: string, ahora = Date.now()): EstadoAutos {
  const r = azar(9090);
  const anioActual = new Date(ahora).getFullYear();
  const vehiculos: Vehiculo[] = [];
  let n = 1;
  for (const f of FICHAS) {
    const unidades = f.tipo === 'auto' ? 2 : 1;
    for (let u = 0; u < unidades; u++) {
      const cerokm = u === 0 && r() < 0.22;
      const anio = cerokm ? anioActual : anioActual - 1 - Math.floor(r() * 9);
      const km = cerokm ? 0 : Math.round(((anioActual - anio) * (f.tipo === 'moto' ? 6000 : 13000) * (0.7 + r() * 0.6)) / 500) * 500;
      const color = COLORES[(n * 3 + Math.floor(r() * 2)) % COLORES.length];
      const diasStock = Math.floor(r() ** 2.4 * 75);
      vehiculos.push({
        id: `v${n++}`,
        tipo: f.tipo,
        carroceria: f.carroceria,
        marca: f.marca,
        modelo: f.modelo,
        anio,
        km,
        combustible: f.combustible,
        caja: f.caja,
        color: color.nombre,
        colorHex: color.hex,
        precio: precioEjemplo(precioFicha(f, anio, km, cerokm), moneda),
        cerokm: cerokm || undefined,
        estado: 'disponible',
        ingreso: new Date(ahora - diasStock * DIA_MS).toISOString(),
        aceptaPermuta: true,
        financiable: r() < 0.85,
        equipamiento: f.equipamiento,
        vistas: Math.floor(20 + r() * 260),
        ejemplo: true,
      });
    }
  }
  // Algunos destacados, uno reservado y uno vendido para mostrar estados.
  const vivo = (v: Vehiculo) => !['Negro', 'Gris oscuro', 'Gris plata', 'Blanco'].includes(v.color);
  for (const c of ['suv', 'pickup', 'naked'] as Carroceria[]) {
    const v = vehiculos.find((x) => x.carroceria === c && vivo(x)) ?? vehiculos.find((x) => x.carroceria === c);
    if (v) v.destacado = true;
  }
  const res = vehiculos.find((v) => v.carroceria === 'pickup');
  if (res) res.estado = 'reservado';
  const ven = vehiculos.find((v) => v.carroceria === 'hatch');
  if (ven) Object.assign(ven, { estado: 'vendido', vendido: new Date(ahora - 4 * DIA_MS).toISOString() });
  // Uno que no rota: muchos días y pocas consultas.
  const lento = vehiculos.find((v) => v.carroceria === 'sedan' && !v.cerokm);
  if (lento) Object.assign(lento, { ingreso: new Date(ahora - 96 * DIA_MS).toISOString(), vistas: 31 });

  const disponibles = vehiculos.filter((v) => v.estado !== 'vendido');
  const consultas: Consulta[] = [];
  const tipos: Consulta['tipo'][] = ['consulta', 'financiacion', 'consulta', 'tasacion', 'prueba', 'financiacion'];
  NOMBRES.forEach((nombre, i) => {
    const v = disponibles[Math.floor(r() * disponibles.length)];
    const tipo = tipos[i % tipos.length];
    const horas = Math.floor(r() ** 1.5 * 21 * 24);
    const c: Consulta = {
      id: `c${i + 1}`,
      fecha: new Date(ahora - horas * 3_600_000 - 15 * 60_000).toISOString(),
      nombre,
      whatsapp: `54911555${String(30300 + i * 53).padStart(5, '0')}`,
      vehiculoId: v.id,
      tipo,
      estado: horas < 30 ? 'nueva' : r() < 0.6 ? 'contactada' : r() < 0.6 ? 'cerrada' : 'perdida',
      ejemplo: true,
    };
    if (tipo === 'financiacion') {
      const anticipo = Math.round(v.precio * 0.4);
      c.cuota = { anticipo, meses: [12, 24, 36][i % 3], cuota: cuotaFrancesa(v.precio - anticipo, 2.2, [12, 24, 36][i % 3]) };
    }
    if (tipo === 'tasacion') c.usado = { descripcion: v.tipo === 'moto' ? 'Moto 110 cc' : 'Hatch 1.4 nafta', anio: anioActual - 6 - (i % 4), km: 70000 + i * 3500 };
    consultas.push(c);
  });

  // Pruebas de manejo: hoy y los próximos días hábiles, dentro del horario.
  const pruebas: Prueba[] = [];
  const libres = disponibles.filter((x) => x.estado === 'disponible');
  const horarios = [630, 720, 990, 1050];
  for (let dd = 0; pruebas.length < 6 && dd < 10; dd++) {
    const dia = sumarDias(inicioDia(ahora), dd);
    const h = HORARIO_AUTOS[dia.getDay()];
    if (!h) continue;
    for (const m of horarios) {
      if (pruebas.length >= 6 || pruebas.filter((p) => p.inicio.slice(0, 10) === conMinutos(dia, m).toISOString().slice(0, 10)).length >= 2) break;
      const ini = conMinutos(dia, m);
      if (+ini < ahora + 30 * 60_000 || m + DURACION_PRUEBA > h[1]) continue;
      const k = pruebas.length;
      const c = consultas.find((x) => x.tipo === 'prueba' && !x.pruebaId) ?? consultas[consultas.length - 1 - k];
      const v = libres.find((x) => x.id === c.vehiculoId) ?? libres[(k * 5) % libres.length];
      const p: Prueba = {
        id: `p${k + 1}`,
        token: Math.floor(r() * 36 ** 8).toString(36).padStart(8, '0'),
        clienteId: c.id,
        profId: v.id,
        servicioId: 'prueba',
        inicio: ini.toISOString(),
        fin: new Date(+ini + DURACION_PRUEBA * 60_000).toISOString(),
        estado: k % 3 === 2 ? 'reservado' : 'confirmado',
        origen: 'online',
        creado: new Date(ahora - DIA_MS).toISOString(),
        ejemplo: true,
      };
      c.pruebaId = p.id;
      c.vehiculoId = v.id;
      if (c.estado !== 'nueva') c.estado = 'contactada';
      pruebas.push(p);
    }
  }

  return {
    version: VERSION_AUTOS,
    rubro: 'autos',
    vehiculos,
    consultas,
    pruebas,
    horario: HORARIO_AUTOS,
    ajustes: { anticipoMin: 30, tasaMensual: 2.2, plazos: [12, 24, 36, 48] },
  };
}

/** Lunes a viernes de 9 a 18 h; sábados de 9 a 13 h. */
export const HORARIO_AUTOS: EstadoAutos['horario'] = { 0: null, 1: [540, 1080], 2: [540, 1080], 3: [540, 1080], 4: [540, 1080], 5: [540, 1080], 6: [540, 780] };

/** Cuota del sistema francés: capital, tasa mensual en %, cantidad de cuotas. */
export function cuotaFrancesa(capital: number, tasaMensual: number, meses: number) {
  if (capital <= 0) return 0;
  const i = tasaMensual / 100;
  if (i === 0) return Math.round(capital / meses);
  return Math.round((capital * i) / (1 - Math.pow(1 + i, -meses)));
}

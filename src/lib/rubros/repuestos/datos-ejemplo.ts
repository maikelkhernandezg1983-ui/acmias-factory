import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import type { CategoriaRep, Cotizacion, EstadoRepuestos, Pieza, Vehiculo } from './tipos';

export const VERSION_REPUESTOS = 1;

/** Comercio y vehículos ficticios: en la demo nunca se usan marcas de autos reales. */
export const NEGOCIO_EJEMPLO = 'Repuestos El Pistón';
export const TALLER_EJEMPLO = 'Taller Hermanos Ruiz';

const U = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
export const FOTO_PORTADA_REP = U('photo-1486262715619-67b85e0b08d3');

export const CATEGORIAS_REP: { id: CategoriaRep; nombre: string }[] = [
  { id: 'filtros', nombre: 'Filtros' },
  { id: 'frenos', nombre: 'Frenos' },
  { id: 'encendido', nombre: 'Encendido' },
  { id: 'suspension', nombre: 'Suspensión' },
  { id: 'distribucion', nombre: 'Distribución' },
  { id: 'lubricantes', nombre: 'Lubricantes' },
];

export const VEHICULOS: Vehiculo[] = [
  { id: 'v1', marca: 'Marca A', modelo: 'Sedán', motor: '1.6 nafta', desde: 2012, hasta: 2016 },
  { id: 'v4', marca: 'Marca A', modelo: 'SUV', motor: '2.0 nafta', desde: 2017, hasta: 2022 },
  { id: 'v2', marca: 'Marca B', modelo: 'Hatch', motor: '1.4 nafta', desde: 2015, hasta: 2020 },
  { id: 'v3', marca: 'Marca C', modelo: 'Pick-up', motor: '2.5 diésel', desde: 2010, hasta: 2018 },
];

type Base = Omit<Pieza, 'precio' | 'id'> & { base: number };
const P = (codigo: string, nombre: string, categoria: CategoriaRep, marca: string, base: number, compat: string[], extra: Partial<Base> = {}): Base => ({
  codigo,
  oem: [],
  equivalentes: [],
  nombre,
  categoria,
  marca,
  origen: 'alternativo',
  procedencia: 'nacional',
  garantiaMeses: 6,
  stock: 8,
  aPedido: false,
  compat,
  base,
  ...extra,
});

const PIEZAS: Base[] = [
  P('FA-210', 'Filtro de aceite', 'filtros', 'Filtrax', 9, ['v1', 'v4'], { oem: ['26300-35503'], equivalentes: ['W712/75', 'OC-210'], stock: 24, destacado: true }),
  P('FA-118', 'Filtro de aceite', 'filtros', 'Filtrax', 9, ['v2'], { oem: ['15208-AA100'], equivalentes: ['OC-118'], stock: 12 }),
  P('FA-330D', 'Filtro de aceite diésel', 'filtros', 'Filtrax', 14, ['v3'], { oem: ['90915-YZZD2'], stock: 6 }),
  P('FAI-455', 'Filtro de aire', 'filtros', 'Filtrax', 14, ['v1', 'v2'], { oem: ['28113-1R100'], equivalentes: ['C2295'], stock: 9 }),
  P('FAI-610', 'Filtro de aire', 'filtros', 'Filtrax', 18, ['v3', 'v4'], { stock: 3 }),
  P('FC-78', 'Filtro de combustible', 'filtros', 'Filtrax', 12, ['v1', 'v2', 'v4'], { equivalentes: ['WK58'], stock: 11 }),
  P('FC-90D', 'Filtro de combustible diésel', 'filtros', 'Filtrax', 21, ['v3'], { procedencia: 'importado', stock: 0, aPedido: true }),
  P('FH-12', 'Filtro de habitáculo', 'filtros', 'Filtrax', 11, ['v1', 'v2', 'v4'], { stock: 15 }),

  P('PD-330', 'Pastillas de freno delanteras', 'frenos', 'Frenotec', 28, ['v1', 'v2'], { oem: ['58101-1RA00'], equivalentes: ['GDB3330', 'FDB330'], stock: 14, destacado: true, detalle: 'Juego para eje delantero (4 pastillas). Bajo polvo.' }),
  P('PD-330-OR', 'Pastillas de freno delanteras', 'frenos', 'Original Marca A', 45, ['v1'], { origen: 'original', procedencia: 'importado', oem: ['58101-1RA00'], garantiaMeses: 12, stock: 4, detalle: 'Repuesto original de fábrica. Juego para eje delantero.' }),
  P('PD-512', 'Pastillas de freno delanteras', 'frenos', 'Frenotec', 34, ['v3', 'v4'], { stock: 7 }),
  P('DV-280', 'Discos de freno ventilados (par)', 'frenos', 'Frenotec', 70, ['v1', 'v2'], { oem: ['51712-1R000'], stock: 2, detalle: 'Se venden de a par. Diámetro 280 mm.' }),
  P('DV-300', 'Discos de freno ventilados (par)', 'frenos', 'Frenotec', 84, ['v4'], { procedencia: 'importado', stock: 0, aPedido: true }),
  P('LF-500', 'Líquido de frenos DOT 4 (500 ml)', 'frenos', 'Lubrimax', 8, ['v1', 'v2', 'v3', 'v4'], { stock: 30 }),

  P('BJ-4', 'Bujías (juego x4)', 'encendido', 'Ignis', 22, ['v1', 'v2'], { equivalentes: ['BKR6E'], stock: 18 }),
  P('BJ-4I', 'Bujías de iridio (juego x4)', 'encendido', 'Ignis', 48, ['v1', 'v2', 'v4'], { procedencia: 'importado', garantiaMeses: 12, stock: 5, destacado: true }),
  P('BE-91', 'Bobina de encendido', 'encendido', 'Ignis', 55, ['v1'], { oem: ['27301-26640'], stock: 3 }),
  P('BE-95', 'Bobina de encendido', 'encendido', 'Ignis', 62, ['v4'], { stock: 0, aPedido: true }),
  P('BC-12', 'Bujías de precalentamiento (x4)', 'encendido', 'Ignis', 58, ['v3'], { procedencia: 'importado', stock: 4 }),

  P('AD-552', 'Amortiguador delantero', 'suspension', 'Suspenflex', 65, ['v1'], { equivalentes: ['334552'], stock: 6, detalle: 'Se recomienda cambiar de a par.' }),
  P('AD-610', 'Amortiguador delantero', 'suspension', 'Suspenflex', 68, ['v2'], { stock: 4 }),
  P('AD-880', 'Amortiguador delantero', 'suspension', 'Suspenflex', 92, ['v3'], { procedencia: 'importado', stock: 2 }),
  P('BL-17', 'Bieleta de barra estabilizadora', 'suspension', 'Suspenflex', 15, ['v1', 'v2', 'v4'], { stock: 20 }),
  P('RT-09', 'Rótula de suspensión', 'suspension', 'Suspenflex', 18, ['v1', 'v2'], { stock: 10 }),

  P('KD-160', 'Kit de distribución', 'distribucion', 'Frenotec', 95, ['v1'], { equivalentes: ['KTB160'], garantiaMeses: 12, stock: 3, destacado: true, detalle: 'Incluye correa, tensor y polea. Cambiar cada 60.000 km.' }),
  P('KD-140', 'Kit de distribución', 'distribucion', 'Frenotec', 88, ['v2'], { garantiaMeses: 12, stock: 2 }),
  P('KD-250D', 'Kit de distribución diésel', 'distribucion', 'Frenotec', 140, ['v3'], { procedencia: 'importado', garantiaMeses: 12, stock: 0, aPedido: true }),
  P('BA-73', 'Bomba de agua', 'distribucion', 'Frenotec', 48, ['v1', 'v4'], { stock: 5 }),

  P('AC-5W30', 'Aceite sintético 5W-30 (4 L)', 'lubricantes', 'Lubrimax', 42, ['v1', 'v2', 'v4'], { stock: 26 }),
  P('AC-20W50', 'Aceite mineral 20W-50 (4 L)', 'lubricantes', 'Lubrimax', 26, ['v1', 'v3'], { stock: 16 }),
  P('AC-15W40', 'Aceite diésel 15W-40 (4 L)', 'lubricantes', 'Lubrimax', 35, ['v3'], { stock: 9 }),
];

function cotizacionesEjemplo(piezas: Pieza[]): Cotizacion[] {
  const por = (c: string) => piezas.find((p) => p.codigo === c)!;
  const linea = (c: string, n: number) => ({ piezaId: por(c).id, codigo: c, nombre: por(c).nombre, precio: por(c).precio, cantidad: n });
  const armar = (id: string, horas: number, items: ReturnType<typeof linea>[], extra: Partial<Cotizacion>): Cotizacion => ({
    id,
    fecha: new Date(Date.now() - horas * 3_600_000).toISOString(),
    items,
    total: items.reduce((s, i) => s + i.precio * i.cantidad, 0),
    ejemplo: true,
    ...extra,
  });
  return [
    armar('c1', 3, [linea('PD-330', 1), linea('DV-280', 1), linea('LF-500', 1)], { vehiculo: 'Marca A Sedán 1.6 nafta 2014', taller: TALLER_EJEMPLO }),
    armar('c2', 20, [linea('FA-210', 1), linea('AC-5W30', 1)], { vehiculo: 'Marca A SUV 2.0 nafta 2019' }),
    armar('c3', 50, [linea('KD-160', 1), linea('BA-73', 1)], { vehiculo: 'Marca A Sedán 1.6 nafta 2013', taller: TALLER_EJEMPLO }),
  ];
}

export function crearEstadoRepuestos(moneda: string): EstadoRepuestos {
  const piezas: Pieza[] = PIEZAS.map(({ base, ...p }, i) => ({ ...p, id: `r${i + 1}`, precio: precioEjemplo(base, moneda) }));
  return {
    version: VERSION_REPUESTOS,
    rubro: 'repuestos',
    vehiculos: VEHICULOS,
    piezas,
    cotizaciones: cotizacionesEjemplo(piezas),
    sinResultado: { 'embrague marca b': 4, 'radiador pick-up': 3, 'FA-999': 2, 'escobillas': 2 },
    descuentoTaller: 12,
  };
}

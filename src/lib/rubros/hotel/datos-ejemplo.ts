import { fotoEjemplo, precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import type { Area, Cargo, EstadoHotel, Estadia, Habitacion, ItemRS, Solicitud, TipoHab } from './tipos';

export const VERSION_HOTEL = 1;

/** Tarifa por noche de referencia en USD. */
export const TARIFA_BASE: Record<TipoHab, number> = { estandar: 55, doble: 70, familiar: 95, suite: 130 };
const CAPACIDAD: Record<TipoHab, number> = { estandar: 1, doble: 2, familiar: 4, suite: 2 };

const NOMBRES = ['Laura Méndez', 'Jorge Castillo', 'Ana Ferreira', 'Pedro Salinas', 'Marta Ruiz', 'Tomás Herrera', 'Claudia Ortiz', 'Diego Paz', 'Sofía Rivas', 'Raúl Benítez', 'Elena Vidal', 'Hugo Romero', 'Inés Campos', 'Bruno Lagos', 'Paula Núñez', 'Óscar Medina', 'Carmen Soto', 'Iván Molina', 'Lucía Prado', 'Andrés Vega', 'Rosa Duarte', 'Mateo Cruz', 'Julia Arce', 'Simón Ponce'];

const dia = (base: Date, d: number) => {
  const x = new Date(base);
  x.setDate(x.getDate() + d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/** Código corto del QR de cada habitación (fijo por número para que los QR impresos sigan sirviendo). */
export const codigoHab = (numero: string) => `h${numero}${(Number(numero) * 37 % 89).toString(36)}`;

function crearCarta(moneda: string): ItemRS[] {
  const p = (usd: number) => precioEjemplo(usd, moneda);
  const it = (id: string, categoria: ItemRS['categoria'], nombre: string, descripcion: string, usd: number, ilustracion: ItemRS['ilustracion'], foto?: string): ItemRS => ({ id, categoria, nombre, descripcion, precio: p(usd), ilustracion, foto: foto ? fotoEjemplo(foto) : undefined, disponible: true });
  return [
    it('rs1', 'desayuno', 'Desayuno continental', 'Café o té, jugo de naranja, medialunas, tostadas, manteca y mermelada.', 9, 'combo', 'p21'),
    it('rs2', 'desayuno', 'Tostadas con palta y huevo', 'Pan de masa madre, palta, huevo poché y semillas.', 6.5, 'tostado', 'p5'),
    it('rs3', 'desayuno', 'Medialunas x3', 'De manteca, recién horneadas.', 3, 'medialuna', 'p4'),
    it('rs4', 'platos', 'Pasta al pesto', 'Fusilli con pesto de albahaca y parmesano.', 9.5, 'pasta', 'p10'),
    it('rs5', 'platos', 'Ensalada César', 'Lechuga, pollo grillado, croutons y aderezo César.', 8.5, 'ensalada', 'p11'),
    it('rs6', 'platos', 'Burger de la casa', 'Doble medallón, cheddar, cebolla caramelizada y papas.', 11, 'burger', 'p13'),
    it('rs7', 'snacks', 'Sándwich club', 'Pollo, panceta, tomate, lechuga y papas.', 8.5, 'sandwich', 'p14'),
    it('rs8', 'snacks', 'Cheesecake de frutos rojos', 'Con coulis casero.', 5, 'postre', 'p16'),
    it('rs9', 'bebidas', 'Café de especialidad', 'Espresso, cortado o con leche.', 2.5, 'cafe', 'p8'),
    it('rs10', 'bebidas', 'Jugo de naranja', 'Exprimido en el momento.', 3.2, 'bebida', 'p20'),
    it('rs11', 'bebidas', 'Agua mineral 1,5 l', 'Con o sin gas.', 2, 'bebida'),
    it('rs12', 'bar', 'Copa de vino tinto', 'Malbec de la casa.', 5.5, 'bebida'),
    it('rs13', 'bar', 'Limonada con menta', 'Jarra para dos.', 4, 'bebida', 'p19'),
  ];
}

export const AJUSTES_HOTEL = { wifiRed: 'Hotel-Huespedes', wifiClave: 'bienvenidos2026', checkout: '10:00', desayuno: '7:00 a 10:30', roomService: '7:00 a 23:30' };

export function crearEstadoHotel(moneda: string, ahora = new Date()): EstadoHotel {
  const habitaciones: Habitacion[] = [];
  const pisos: TipoHab[][] = [
    ['estandar', 'estandar', 'doble', 'doble', 'doble', 'doble', 'familiar', 'familiar'],
    ['estandar', 'doble', 'doble', 'doble', 'doble', 'doble', 'familiar', 'suite'],
    ['doble', 'doble', 'doble', 'familiar', 'suite', 'suite'],
  ];
  pisos.forEach((tipos, k) =>
    tipos.forEach((tipo, j) => {
      const numero = `${k + 1}${String(j + 1).padStart(2, '0')}`;
      habitaciones.push({ id: `hab-${numero}`, numero, piso: k + 1, tipo, capacidad: CAPACIDAD[tipo], tarifa: precioEjemplo(TARIFA_BASE[tipo], moneda), estado: 'libre', codigo: codigoHab(numero) });
    }),
  );
  const ocupadas = ['101', '102', '103', '105', '106', '107', '201', '202', '203', '204', '206', '207', '208', '301', '302', '304', '305'];
  const estadias: Estadia[] = [];
  ocupadas.forEach((n, i) => {
    const h = habitaciones.find((x) => x.numero === n)!;
    h.estado = 'ocupada';
    const desde = -1 - (i % 4);
    const hasta = i % 6 === 2 ? 0 : 1 + (i % 4);
    estadias.push({ id: `es-${n}`, habitacionId: h.id, huesped: NOMBRES[i], whatsapp: `54911${String(60_000_000 + i * 1_234_567).slice(0, 8)}`, personas: Math.min(h.capacidad, 1 + (i % 3)), entrada: dia(ahora, desde), salida: dia(ahora, hasta), estado: 'activa', checkin: new Date(+ahora + desde * 86_400_000 - 3 * 3_600_000).toISOString(), ejemplo: true });
  });
  habitaciones.find((x) => x.numero === '104')!.estado = 'limpieza';
  habitaciones.find((x) => x.numero === '205')!.estado = 'limpieza';
  habitaciones.find((x) => x.numero === '303')!.estado = 'mantenimiento';
  // Llegadas de hoy (reservas sin habitación ocupada todavía).
  [['104', 'Gabriel Ruiz', 2], ['306', 'Natalia Correa', 2], ['108', 'Familia Lozano', 4]].forEach(([n, nombre, pers], i) => {
    const h = habitaciones.find((x) => x.numero === n)!;
    estadias.push({ id: `es-r${n}`, habitacionId: h.id, huesped: String(nombre), whatsapp: `54911${70_000_000 + i * 3_131}`, personas: Number(pers), entrada: dia(ahora, 0), salida: dia(ahora, 2 + i), estado: 'reservada', ejemplo: true });
  });
  const carta = crearCarta(moneda);
  const solicitudes: Solicitud[] = [];
  const cargos: Cargo[] = [];
  const hace = (min: number) => new Date(+ahora - min * 60_000).toISOString();
  const est = (n: string) => estadias.find((x) => x.habitacionId === `hab-${n}` && x.estado === 'activa')!;
  const rs = (n: string, min: number, items: [string, number][], estado: Solicitud['estado'], para?: string, detalle?: string) => {
    const lineas = items.map(([id, cantidad]) => { const x = carta.find((c) => c.id === id)!; return { itemId: id, nombre: x.nombre, precio: x.precio, cantidad }; });
    const total = lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);
    const e = est(n);
    const s: Solicitud = { id: `so-${n}-${min}`, habitacionId: `hab-${n}`, estadiaId: e.id, area: 'cocina', tipo: 'Room service', items: lineas, total, estado, fecha: hace(min), para, detalle, enCurso: estado !== 'nueva' ? hace(min - 4) : undefined, lista: estado === 'lista' ? hace(Math.max(1, min - 22)) : undefined, ejemplo: true };
    solicitudes.push(s);
    cargos.push({ id: `ca-${s.id}`, estadiaId: e.id, concepto: `Room service: ${lineas.map((l) => `${l.cantidad} ${l.nombre}`).join(', ')}`, monto: total, fecha: s.fecha, solicitudId: s.id });
  };
  const sv = (n: string, area: Area, tipo: string, min: number, estado: Solicitud['estado'], detalle?: string, para?: string) => {
    solicitudes.push({ id: `so-${n}-${area}-${min}`, habitacionId: `hab-${n}`, estadiaId: est(n).id, area, tipo, detalle, total: 0, estado, fecha: hace(min), para, enCurso: estado !== 'nueva' ? hace(min - 3) : undefined, lista: estado === 'lista' ? hace(Math.max(1, min - 15)) : undefined, ejemplo: true });
  };
  // Ayer y antes de ayer (para métricas).
  rs('201', 26 * 60, [['rs6', 2], ['rs12', 2]], 'lista');
  rs('305', 25 * 60, [['rs4', 1], ['rs5', 1], ['rs13', 1]], 'lista');
  rs('107', 28 * 60, [['rs1', 2]], 'lista');
  rs('204', 50 * 60, [['rs7', 1], ['rs11', 1]], 'lista');
  sv('103', 'limpieza', 'Toallas limpias', 30 * 60, 'lista');
  sv('206', 'mantenimiento', 'Aire acondicionado', 27 * 60, 'lista', 'No enfría');
  // Hoy.
  rs('102', 190, [['rs1', 2]], 'lista', undefined, 'Sin azúcar');
  rs('304', 165, [['rs1', 1], ['rs2', 1], ['rs9', 1]], 'lista');
  rs('207', 150, [['rs3', 1], ['rs9', 2]], 'lista');
  sv('105', 'limpieza', 'Limpieza de la habitación', 120, 'lista');
  sv('301', 'recepcion', 'Late checkout', 95, 'lista', 'Hasta las 13 h');
  rs('203', 38, [['rs6', 1], ['rs10', 1]], 'en-curso');
  sv('208', 'limpieza', 'Almohada extra', 22, 'en-curso');
  sv('106', 'mantenimiento', 'Agua caliente o ducha', 31, 'en-curso', 'Sale tibia');
  rs('302', 14, [['rs5', 2], ['rs11', 1]], 'nueva', undefined, 'Una sin croutons');
  sv('202', 'limpieza', 'Toallas limpias', 6, 'nueva');
  sv('101', 'recepcion', 'Taxi', 4, 'nueva', 'Al aeropuerto', '13:30');
  sv('305', 'mantenimiento', 'TV o control', 2, 'nueva', 'El control no anda');
  return { version: VERSION_HOTEL, rubro: 'hotel', habitaciones, estadias, carta, solicitudes, cargos, ajustes: { ...AJUSTES_HOTEL } };
}

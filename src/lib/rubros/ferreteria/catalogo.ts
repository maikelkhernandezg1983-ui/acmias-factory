import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import type { Producto, Unidad } from './tipos';

/**
 * Catálogo simulado de "Ferretería El Tornillo Feliz" (FER-01). Se genera igual en cada dispositivo
 * a partir de familias × medidas × variantes × líneas: unos 3.000 productos sin marcas reales.
 */

type Var = { v: string; a?: string[]; p: number };
interface Familia {
  id: string;
  categoria: string;
  nombre: string;
  prefijo: string;
  base: string;
  unidades: Unidad[];
  /** Unidad que se usa cuando la lista dice solo una cantidad ("3 caños" = 3 tiras). */
  conteo?: string;
  sinonimos: string[];
  medidas: Var[];
  variantes?: string[];
  lineas?: [string, number][];
  /** Medida y variante que se eligen si la lista no dice cuál. */
  defecto?: { medida?: string; variante?: string };
  minimo?: number;
}

const U1: Unidad[] = [{ id: 'u', etiqueta: 'unidad', factor: 1 }];
const LINEAS3: [string, number][] = [['Económica', 0.8], ['Estándar', 1], ['Premium', 1.35], ['Profesional', 1.6]];
const LINEAS2: [string, number][] = [['Estándar', 1], ['Reforzado', 1.6]];
const COLORES_CABLE = ['Rojo', 'Celeste', 'Verde-amarillo', 'Negro', 'Marrón', 'Blanco', 'Gris', 'Naranja'];
const COLORES_PINTURA = ['Blanco', 'Blanco tiza', 'Gris perla', 'Gris plomo', 'Arena', 'Beige', 'Celeste cielo', 'Azul francia', 'Verde agua', 'Verde manzana', 'Terracota', 'Amarillo pastel', 'Rosa viejo', 'Lila'];

const pul = (m: string, mm: string, extra: string[] = []) => [mm, m, ...extra];

export const FAMILIAS: Familia[] = [
  // ---------------- Plomería ----------------
  {
    id: 'pvc', categoria: 'Plomería', nombre: 'Caño PVC desagüe', prefijo: 'PVC', base: 'm',
    unidades: [{ id: 'm', etiqueta: 'metro', factor: 1 }, { id: 'tira', etiqueta: 'tira x 4 m', factor: 4 }], conteo: 'tira',
    sinonimos: ['caño', 'tubo', 'cano', 'desague', 'pvc', 'cloaca'],
    medidas: [
      { v: '40 mm', a: pul('1 1/2', '40'), p: 2.2 }, { v: '50 mm', a: pul('2', '50'), p: 2.8 }, { v: '63 mm', a: pul('2 1/2', '63'), p: 3.6 },
      { v: '75 mm', a: pul('3', '75'), p: 4.4 }, { v: '110 mm', a: pul('4', '110'), p: 6.5 }, { v: '160 mm', a: pul('6', '160'), p: 11 },
    ],
    lineas: LINEAS2, minimo: 40,
  },
  { id: 'codo90', categoria: 'Plomería', nombre: 'Codo PVC 90°', prefijo: 'C90', base: 'u', unidades: U1, sinonimos: ['codo', 'curva', 'pvc', '90'], medidas: [{ v: '40 mm', a: pul('1 1/2', '40'), p: 0.9 }, { v: '50 mm', a: pul('2', '50'), p: 1.1 }, { v: '63 mm', a: pul('2 1/2', '63'), p: 1.6 }, { v: '110 mm', a: pul('4', '110'), p: 3.2 }], lineas: LINEAS2, minimo: 20 },
  { id: 'codo45', categoria: 'Plomería', nombre: 'Codo PVC 45°', prefijo: 'C45', base: 'u', unidades: U1, sinonimos: ['codo', 'curva', 'pvc', '45'], medidas: [{ v: '40 mm', a: pul('1 1/2', '40'), p: 0.85 }, { v: '50 mm', a: pul('2', '50'), p: 1.05 }, { v: '63 mm', a: pul('2 1/2', '63'), p: 1.5 }, { v: '110 mm', a: pul('4', '110'), p: 3 }], lineas: LINEAS2, minimo: 20 },
  { id: 'ramal', categoria: 'Plomería', nombre: 'Ramal T PVC', prefijo: 'RT', base: 'u', unidades: U1, sinonimos: ['ramal', 'te', 'pvc', 'derivacion'], medidas: [{ v: '40 mm', a: pul('1 1/2', '40'), p: 1.3 }, { v: '50 mm', a: pul('2', '50'), p: 1.6 }, { v: '110 mm', a: pul('4', '110'), p: 4.2 }], lineas: LINEAS2 },
  { id: 'pegpvc', categoria: 'Plomería', nombre: 'Pegamento para PVC', prefijo: 'PEG', base: 'u', unidades: U1, sinonimos: ['pegamento', 'adhesivo', 'cemento', 'pvc', 'pega'], medidas: [{ v: '50 cc', a: ['50cc'], p: 2.5 }, { v: '125 cc', a: ['125cc'], p: 4.5 }, { v: '250 cc', a: ['250cc'], p: 7.8 }], lineas: LINEAS3, defecto: { medida: '125 cc' }, minimo: 10 },
  {
    id: 'termo', categoria: 'Plomería', nombre: 'Caño termofusión agua', prefijo: 'TF', base: 'm',
    unidades: [{ id: 'm', etiqueta: 'metro', factor: 1 }, { id: 'tira', etiqueta: 'tira x 4 m', factor: 4 }], conteo: 'tira',
    sinonimos: ['caño', 'tubo', 'cano', 'termofusion', 'polipropileno', 'agua'],
    medidas: [{ v: '20 mm', a: pul('1/2', '20'), p: 1.6 }, { v: '25 mm', a: pul('3/4', '25'), p: 2.1 }, { v: '32 mm', a: pul('1', '32'), p: 3 }, { v: '40 mm', a: ['40'], p: 4.6 }],
    lineas: LINEAS2,
  },
  { id: 'codotf', categoria: 'Plomería', nombre: 'Codo termofusión 90°', prefijo: 'CTF', base: 'u', unidades: U1, sinonimos: ['codo', 'curva', 'termofusion', 'agua', '90'], medidas: [{ v: '20 mm', a: pul('1/2', '20'), p: 0.4 }, { v: '25 mm', a: pul('3/4', '25'), p: 0.55 }, { v: '32 mm', a: pul('1', '32'), p: 0.9 }], lineas: LINEAS2 },
  { id: 'teflon', categoria: 'Plomería', nombre: 'Cinta de teflón', prefijo: 'TEF', base: 'u', unidades: U1, sinonimos: ['teflon', 'cinta', 'sellador'], medidas: [{ v: '12 mm x 10 m', a: ['10m'], p: 0.6 }, { v: '18 mm x 20 m', a: ['20m'], p: 1.1 }], lineas: LINEAS3, defecto: { medida: '12 mm x 10 m' } },
  { id: 'canilla', categoria: 'Plomería', nombre: 'Canilla', prefijo: 'CAN', base: 'u', unidades: U1, sinonimos: ['canilla', 'grifo', 'llave', 'pileta', 'patio'], medidas: [{ v: '1/2"', a: ['1/2', '20'], p: 9 }, { v: '3/4"', a: ['3/4', '25'], p: 12 }], variantes: ['Pared', 'Pileta', 'Jardín'], lineas: LINEAS3 },
  { id: 'cuerito', categoria: 'Plomería', nombre: 'Cuerito para canilla', prefijo: 'CUE', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'bolsa', etiqueta: 'bolsa x 10', factor: 10 }], sinonimos: ['cuerito', 'cuero', 'goma', 'canilla', 'arandela'], medidas: [{ v: '1/2"', a: ['1/2'], p: 0.2 }, { v: '3/4"', a: ['3/4'], p: 0.25 }], defecto: { medida: '1/2"' } },
  { id: 'vastago', categoria: 'Plomería', nombre: 'Vástago para canilla', prefijo: 'VAS', base: 'u', unidades: U1, sinonimos: ['vastago', 'canilla', 'repuesto', 'cabezal'], medidas: [{ v: '1/2"', a: ['1/2'], p: 3.5 }, { v: '3/4"', a: ['3/4'], p: 4.2 }], lineas: LINEAS3 },
  { id: 'flexible', categoria: 'Plomería', nombre: 'Flexible mallado', prefijo: 'FLX', base: 'u', unidades: U1, sinonimos: ['flexible', 'conexion', 'manguerita', 'canilla', 'inodoro'], medidas: [{ v: '30 cm', a: ['30'], p: 2.8 }, { v: '40 cm', a: ['40'], p: 3.2 }, { v: '50 cm', a: ['50'], p: 3.6 }], lineas: LINEAS3, defecto: { medida: '40 cm' } },
  { id: 'llavepaso', categoria: 'Plomería', nombre: 'Llave de paso esférica', prefijo: 'LLP', base: 'u', unidades: U1, sinonimos: ['llave', 'paso', 'esferica', 'agua'], medidas: [{ v: '1/2"', a: ['1/2', '20'], p: 6 }, { v: '3/4"', a: ['3/4', '25'], p: 8 }, { v: '1"', a: ['1', '32'], p: 12 }], lineas: LINEAS3 },
  { id: 'sifon', categoria: 'Plomería', nombre: 'Sifón para pileta', prefijo: 'SIF', base: 'u', unidades: U1, sinonimos: ['sifon', 'pileta', 'desague', 'bacha'], medidas: [{ v: 'Simple', p: 5 }, { v: 'Doble', p: 8 }], lineas: LINEAS3 },
  // ---------------- Electricidad ----------------
  {
    id: 'cable', categoria: 'Electricidad', nombre: 'Cable unipolar', prefijo: 'CAB', base: 'm',
    unidades: [{ id: 'm', etiqueta: 'metro', factor: 1 }, { id: 'rollo', etiqueta: 'rollo x 100 m', factor: 100 }],
    sinonimos: ['cable', 'cablecito', 'conductor', 'unipolar', 'electrico'],
    medidas: [{ v: '1 mm²', a: ['1'], p: 0.25 }, { v: '1,5 mm²', a: ['1.5'], p: 0.35 }, { v: '2,5 mm²', a: ['2.5'], p: 0.55 }, { v: '4 mm²', a: ['4'], p: 0.85 }, { v: '6 mm²', a: ['6'], p: 1.3 }, { v: '10 mm²', a: ['10'], p: 2.1 }],
    variantes: COLORES_CABLE, lineas: LINEAS2, defecto: { variante: 'Rojo' }, minimo: 100,
  },
  { id: 'termica', categoria: 'Electricidad', nombre: 'Llave térmica', prefijo: 'TER', base: 'u', unidades: U1, sinonimos: ['termica', 'llave', 'interruptor', 'automatico', 'breaker'], medidas: [6, 10, 16, 20, 25, 32, 40].map((a) => ({ v: `${a} A`, a: [`${a}`, `${a}a`], p: 6 + a * 0.12 })), variantes: ['1 polo', '2 polos', '3 polos'], lineas: LINEAS3, defecto: { variante: '2 polos' }, minimo: 4 },
  { id: 'disyuntor', categoria: 'Electricidad', nombre: 'Disyuntor diferencial', prefijo: 'DIS', base: 'u', unidades: U1, sinonimos: ['disyuntor', 'diferencial', 'proteccion'], medidas: [{ v: '25 A', a: ['25'], p: 28 }, { v: '40 A', a: ['40'], p: 34 }, { v: '63 A', a: ['63'], p: 48 }], variantes: ['2 polos', '4 polos'], lineas: LINEAS3 },
  { id: 'cinta', categoria: 'Electricidad', nombre: 'Cinta aisladora', prefijo: 'CIA', base: 'u', unidades: U1, sinonimos: ['cinta', 'aisladora', 'aislante', 'aisladora'], medidas: [{ v: '10 m', a: ['10m'], p: 0.8 }, { v: '20 m', a: ['20m'], p: 1.3 }], variantes: ['Negra', 'Roja', 'Azul', 'Verde', 'Blanca'], lineas: LINEAS3, defecto: { medida: '10 m', variante: 'Negra' } },
  { id: 'caja', categoria: 'Electricidad', nombre: 'Caja de luz embutir', prefijo: 'CJL', base: 'u', unidades: U1, sinonimos: ['caja', 'luz', 'embutir', 'electrica'], medidas: [{ v: 'Rectangular 5x10', p: 0.5 }, { v: 'Octogonal', p: 0.6 }, { v: 'Cuadrada 10x10', p: 0.8 }], lineas: LINEAS2 },
  { id: 'toma', categoria: 'Electricidad', nombre: 'Tomacorriente', prefijo: 'TOM', base: 'u', unidades: U1, sinonimos: ['tomacorriente', 'toma', 'enchufe', 'modulo'], medidas: [{ v: '10 A', a: ['10'], p: 2 }, { v: '20 A', a: ['20'], p: 3 }], variantes: ['Simple', 'Doble', 'Con tierra'], lineas: LINEAS3 },
  { id: 'interruptor', categoria: 'Electricidad', nombre: 'Interruptor de luz', prefijo: 'INT', base: 'u', unidades: U1, sinonimos: ['interruptor', 'tecla', 'llave', 'luz', 'punto'], medidas: [{ v: '1 punto', p: 1.8 }, { v: '2 puntos', p: 2.6 }, { v: 'Combinación', p: 2.9 }], variantes: ['Blanco', 'Negro', 'Gris'], lineas: LINEAS3 },
  { id: 'lampara', categoria: 'Electricidad', nombre: 'Lámpara LED', prefijo: 'LED', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 10', factor: 10 }], sinonimos: ['lampara', 'foco', 'bombita', 'bombilla', 'lamparita', 'led'], medidas: [5, 7, 9, 12, 15, 18].map((w) => ({ v: `${w} W`, a: [`${w}`, `${w}w`], p: 1 + w * 0.15 })), variantes: ['Luz fría', 'Luz cálida'], lineas: LINEAS3, defecto: { variante: 'Luz fría' } },
  { id: 'corrugado', categoria: 'Electricidad', nombre: 'Caño corrugado', prefijo: 'COR', base: 'm', unidades: [{ id: 'm', etiqueta: 'metro', factor: 1 }, { id: 'rollo', etiqueta: 'rollo x 25 m', factor: 25 }], sinonimos: ['corrugado', 'caño', 'manguera', 'electrico'], medidas: [{ v: '3/4"', a: ['3/4', '20'], p: 0.3 }, { v: '7/8"', a: ['7/8', '22'], p: 0.35 }, { v: '1"', a: ['1', '25'], p: 0.45 }], lineas: LINEAS2 },
  // ---------------- Tornillería ----------------
  {
    id: 'autop', categoria: 'Tornillería', nombre: 'Tornillo autoperforante', prefijo: 'TAP', base: 'u',
    unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 100', factor: 100 }],
    sinonimos: ['tornillo', 'autoperforante', 'mecha', 'chapa'],
    medidas: ['8x1/2', '8x3/4', '8x1', '8x1 1/4', '10x1/2', '10x3/4', '10x1', '10x1 1/2', '10x2', '12x1', '12x1 1/2', '12x2', '14x2', '14x3'].map((m, i) => ({ v: m, a: [m.replace(' ', '')], p: 0.04 + i * 0.006 })),
    variantes: ['Cabeza fresada', 'Cabeza hexagonal', 'Cabeza tanque'], lineas: LINEAS3, minimo: 300,
  },
  {
    id: 'tmadera', categoria: 'Tornillería', nombre: 'Tornillo para madera', prefijo: 'TMA', base: 'u',
    unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 100', factor: 100 }],
    sinonimos: ['tornillo', 'madera', 'fix'],
    medidas: ['3.5x16', '3.5x25', '4x30', '4x40', '4.5x40', '4.5x50', '5x50', '5x60', '6x60', '6x80', '6x100'].map((m, i) => ({ v: m, a: [m], p: 0.03 + i * 0.008 })),
    variantes: ['Zincado', 'Bronceado', 'Negro'], lineas: LINEAS3, minimo: 300,
  },
  { id: 'tarugo', categoria: 'Tornillería', nombre: 'Tarugo de nylon', prefijo: 'TAR', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'bolsa', etiqueta: 'bolsa x 50', factor: 50 }], sinonimos: ['tarugo', 'taco', 'anclaje', 'nylon'], medidas: [5, 6, 8, 10, 12, 14].map((m) => ({ v: `N.º ${m}`, a: [`${m}`], p: 0.02 + m * 0.004 })), variantes: ['Común', 'Con tope'], lineas: LINEAS3, defecto: { variante: 'Común' }, minimo: 200 },
  { id: 'clavo', categoria: 'Tornillería', nombre: 'Clavo punta París', prefijo: 'CLA', base: 'u', unidades: [{ id: 'u', etiqueta: 'caja x 1 kg', factor: 1 }], sinonimos: ['clavo', 'clavos', 'paris'], medidas: ['1"', '1 1/2"', '2"', '2 1/2"', '3"', '4"'].map((m, i) => ({ v: m, a: [m.replace('"', '')], p: 3 + i * 0.2 })), lineas: LINEAS2 },
  { id: 'bulon', categoria: 'Tornillería', nombre: 'Bulón con tuerca', prefijo: 'BUL', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 50', factor: 50 }], sinonimos: ['bulon', 'perno', 'tuerca'], medidas: ['1/4x1', '1/4x2', '1/4x3', '5/16x1', '5/16x2', '5/16x3', '3/8x1', '3/8x2', '3/8x3', '3/8x4', '1/2x2', '1/2x4'].map((m, i) => ({ v: m, a: [m], p: 0.12 + i * 0.03 })), variantes: ['Zincado', 'Galvanizado'], lineas: LINEAS3 },
  { id: 'arandela', categoria: 'Tornillería', nombre: 'Arandela plana', prefijo: 'ARA', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'bolsa', etiqueta: 'bolsa x 100', factor: 100 }], sinonimos: ['arandela'], medidas: ['1/4', '5/16', '3/8', '1/2'].map((m, i) => ({ v: m, a: [m], p: 0.02 + i * 0.01 })), variantes: ['Zincada', 'Galvanizada'], lineas: LINEAS3 },
  { id: 'tuerca', categoria: 'Tornillería', nombre: 'Tuerca hexagonal', prefijo: 'TUE', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'bolsa', etiqueta: 'bolsa x 100', factor: 100 }], sinonimos: ['tuerca', 'tuercas'], medidas: ['1/8', '3/16', '1/4', '5/16', '3/8', '7/16', '1/2', '5/8'].map((m, i) => ({ v: m, a: [m], p: 0.03 + i * 0.02 })), variantes: ['Zincada', 'Galvanizada', 'Autofrenante'], lineas: LINEAS3 },
  { id: 'chapa', categoria: 'Tornillería', nombre: 'Tornillo para chapa T2', prefijo: 'TCH', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 100', factor: 100 }], sinonimos: ['tornillo', 'chapa', 't2', 'techo'], medidas: ['8x1/2', '8x3/4', '8x1', '10x1/2', '10x3/4', '10x1', '10x1 1/2', '12x1', '12x1 1/2', '12x2', '14x2', '14x2 1/2'].map((m, i) => ({ v: m, a: [m.replace(' ', '')], p: 0.05 + i * 0.006 })), variantes: ['Con arandela', 'Sin arandela', 'Punta aguja'], lineas: LINEAS3 },
  { id: 'drywall', categoria: 'Tornillería', nombre: 'Tornillo para durlock', prefijo: 'TDU', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 1000', factor: 1000 }], sinonimos: ['tornillo', 'durlock', 'yeso', 'placa', 'drywall', 't1', 't2'], medidas: ['T1 punta aguja', 'T1 punta mecha', 'T2 punta aguja', 'T2 punta mecha', '6x1', '6x1 1/4', '6x1 5/8', '6x2'].map((m, i) => ({ v: m, a: [m.toLowerCase().replace(' ', '')], p: 0.01 + i * 0.002 })), variantes: ['Fosfatado', 'Zincado'], lineas: LINEAS3 },
  { id: 'remache', categoria: 'Tornillería', nombre: 'Remache pop', prefijo: 'REM', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 100', factor: 100 }], sinonimos: ['remache', 'pop'], medidas: ['3.2x6', '3.2x10', '4x8', '4x12', '4.8x10', '4.8x16', '4.8x20', '6.4x20'].map((m, i) => ({ v: m, a: [m], p: 0.02 + i * 0.005 })), variantes: ['Aluminio', 'Acero', 'Inoxidable'], lineas: LINEAS3 },
  { id: 'abrazadera', categoria: 'Plomería', nombre: 'Abrazadera sinfín', prefijo: 'ABR', base: 'u', unidades: U1, sinonimos: ['abrazadera', 'sinfin', 'precinto metalico'], medidas: ['8-12', '10-16', '12-20', '16-25', '20-32', '25-40', '32-50', '40-60', '50-70', '60-80'].map((m, i) => ({ v: `${m} mm`, a: [m], p: 0.4 + i * 0.08 })), variantes: ['Acero zincado', 'Inoxidable'], lineas: LINEAS3 },
  { id: 'precinto', categoria: 'Electricidad', nombre: 'Precinto plástico', prefijo: 'PRE', base: 'u', unidades: [{ id: 'u', etiqueta: 'bolsa x 100', factor: 1 }], sinonimos: ['precinto', 'precintos', 'cintillo', 'abrazadera'], medidas: ['100 mm', '150 mm', '200 mm', '250 mm', '300 mm', '400 mm'].map((m, i) => ({ v: m, a: [m.replace(' mm', '')], p: 1 + i * 0.5 })), variantes: ['Blanco', 'Negro', 'Reforzado UV'], lineas: LINEAS3 },
  { id: 'bisagra', categoria: 'Herramientas', nombre: 'Bisagra', prefijo: 'BIS', base: 'u', unidades: U1, sinonimos: ['bisagra', 'pomela', 'puerta', 'mueble'], medidas: ['50 mm', '63 mm', '75 mm', '89 mm', '100 mm'].map((m, i) => ({ v: m, a: [m.replace(' mm', '')], p: 1.2 + i * 0.5 })), variantes: ['Hierro', 'Bronceada', 'Cazoleta mueble'], lineas: LINEAS3 },
  { id: 'candado', categoria: 'Herramientas', nombre: 'Candado', prefijo: 'CDO', base: 'u', unidades: U1, sinonimos: ['candado', 'seguridad'], medidas: ['30 mm', '40 mm', '50 mm', '60 mm', '70 mm'].map((m, i) => ({ v: m, a: [m.replace(' mm', '')], p: 4 + i * 2 })), variantes: ['Bronce', 'Acero', 'Con combinación'], lineas: LINEAS3 },
  { id: 'guante', categoria: 'Herramientas', nombre: 'Guante de trabajo', prefijo: 'GUA', base: 'u', unidades: [{ id: 'u', etiqueta: 'par', factor: 1 }], sinonimos: ['guante', 'guantes', 'proteccion'], medidas: ['Talle 8', 'Talle 9', 'Talle 10', 'Talle 11'].map((m) => ({ v: m, a: [m.replace('Talle ', '')], p: 2.5 })), variantes: ['Moteado', 'Nitrilo', 'Cuero', 'Anticorte'], lineas: LINEAS3 },
  // ---------------- Pinturas ----------------
  { id: 'aerosol', categoria: 'Pinturas', nombre: 'Pintura en aerosol', prefijo: 'AER', base: 'u', unidades: U1, sinonimos: ['aerosol', 'spray', 'pintura'], medidas: [{ v: '240 cc', a: ['240'], p: 3.5 }, { v: '440 cc', a: ['440'], p: 5.5 }], variantes: ['Blanco', 'Negro', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Gris', 'Plata', 'Oro', 'Naranja', 'Transparente'].flatMap((c) => [`${c} brillante`, `${c} mate`]), lineas: LINEAS3 },
  { id: 'latexint', categoria: 'Pinturas', nombre: 'Látex interior', prefijo: 'LTI', base: 'u', unidades: U1, sinonimos: ['latex', 'pintura', 'interior', 'pared', 'agua'], medidas: [1, 4, 10, 20].map((l) => ({ v: `${l} L`, a: [`${l}l`, `${l}`], p: l * 4.2 })), variantes: COLORES_PINTURA, lineas: LINEAS3, defecto: { variante: 'Blanco', medida: '4 L' }, minimo: 3 },
  { id: 'latexext', categoria: 'Pinturas', nombre: 'Látex exterior', prefijo: 'LTE', base: 'u', unidades: U1, sinonimos: ['latex', 'pintura', 'exterior', 'frente', 'agua'], medidas: [1, 4, 10, 20].map((l) => ({ v: `${l} L`, a: [`${l}l`, `${l}`], p: l * 5.4 })), variantes: COLORES_PINTURA, lineas: LINEAS3, defecto: { variante: 'Blanco', medida: '4 L' }, minimo: 3 },
  { id: 'esmalte', categoria: 'Pinturas', nombre: 'Esmalte sintético', prefijo: 'ESM', base: 'u', unidades: U1, sinonimos: ['esmalte', 'pintura', 'sintetico', 'hierro', 'madera'], medidas: [{ v: '0,5 L', a: ['0.5l', '1/2'], p: 5 }, { v: '1 L', a: ['1l', '1'], p: 9 }, { v: '4 L', a: ['4l', '4'], p: 31 }], variantes: ['Blanco brillante', 'Negro brillante', 'Negro satinado', 'Gris', 'Rojo', 'Verde inglés', 'Azul marino', 'Marrón'], lineas: LINEAS3 },
  { id: 'rodillo', categoria: 'Pinturas', nombre: 'Rodillo', prefijo: 'ROD', base: 'u', unidades: U1, sinonimos: ['rodillo', 'pintar'], medidas: [{ v: '9 cm', a: ['9'], p: 2.5 }, { v: '17 cm', a: ['17'], p: 4 }, { v: '22 cm', a: ['22'], p: 5.5 }], variantes: ['Lana', 'Antigota', 'Espuma'], lineas: LINEAS3, defecto: { medida: '22 cm', variante: 'Lana' } },
  { id: 'pincel', categoria: 'Pinturas', nombre: 'Pincel', prefijo: 'PIN', base: 'u', unidades: U1, sinonimos: ['pincel', 'brocha'], medidas: [10, 15, 20, 25, 30, 40, 50].map((n) => ({ v: `N.º ${n}`, a: [`${n}`], p: 0.8 + n * 0.05 })), lineas: LINEAS3 },
  { id: 'lija', categoria: 'Pinturas', nombre: 'Lija', prefijo: 'LIJ', base: 'u', unidades: [{ id: 'u', etiqueta: 'pliego', factor: 1 }, { id: 'paquete', etiqueta: 'paquete x 25', factor: 25 }], sinonimos: ['lija', 'lijar'], medidas: [60, 80, 100, 120, 150, 180, 220, 320].map((g) => ({ v: `grano ${g}`, a: [`${g}`], p: 0.35 })), variantes: ['Al agua', 'Para madera', 'Para hierro'], lineas: LINEAS3 },
  { id: 'enduido', categoria: 'Pinturas', nombre: 'Enduido plástico', prefijo: 'END', base: 'u', unidades: U1, sinonimos: ['enduido', 'masilla', 'pared'], medidas: [{ v: '1 kg', a: ['1kg', '1'], p: 3 }, { v: '4 kg', a: ['4kg', '4'], p: 9 }, { v: '10 kg', a: ['10kg', '10'], p: 19 }], variantes: ['Interior', 'Exterior'], lineas: LINEAS3 },
  { id: 'fijador', categoria: 'Pinturas', nombre: 'Fijador sellador', prefijo: 'FIJ', base: 'u', unidades: U1, sinonimos: ['fijador', 'sellador', 'imprimacion'], medidas: [{ v: '1 L', a: ['1l', '1'], p: 4 }, { v: '4 L', a: ['4l', '4'], p: 13 }, { v: '10 L', a: ['10l', '10'], p: 28 }], lineas: LINEAS3 },
  // ---------------- Herramientas ----------------
  { id: 'mechaac', categoria: 'Herramientas', nombre: 'Mecha para metal', prefijo: 'MEM', base: 'u', unidades: U1, sinonimos: ['mecha', 'broca', 'metal', 'acero', 'hierro'], medidas: [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9, 10, 11, 12, 13].map((m) => ({ v: `${String(m).replace('.', ',')} mm`, a: [`${m}`, `${m}mm`], p: 0.6 + m * 0.22 })), lineas: LINEAS3 },
  { id: 'mechaw', categoria: 'Herramientas', nombre: 'Mecha para pared (widia)', prefijo: 'MEW', base: 'u', unidades: U1, sinonimos: ['mecha', 'broca', 'widia', 'pared', 'concreto', 'ladrillo'], medidas: [4, 5, 6, 7, 8, 10, 12, 14].map((m) => ({ v: `${m} mm`, a: [`${m}`, `${m}mm`], p: 1 + m * 0.3 })), lineas: LINEAS3 },
  { id: 'mecham', categoria: 'Herramientas', nombre: 'Mecha para madera', prefijo: 'MEMA', base: 'u', unidades: U1, sinonimos: ['mecha', 'broca', 'madera'], medidas: [4, 5, 6, 8, 10, 12, 16, 20].map((m) => ({ v: `${m} mm`, a: [`${m}`, `${m}mm`], p: 0.9 + m * 0.25 })), lineas: LINEAS3 },
  { id: 'destor', categoria: 'Herramientas', nombre: 'Destornillador', prefijo: 'DES', base: 'u', unidades: U1, sinonimos: ['destornillador', 'atornillador'], medidas: ['3x75', '5x100', '6x150', '8x200'].map((m, i) => ({ v: m, a: [m], p: 2.5 + i })), variantes: ['Plano', 'Philips', 'Pozidriv'], lineas: LINEAS3 },
  { id: 'llavefr', categoria: 'Herramientas', nombre: 'Llave ajustable', prefijo: 'LLA', base: 'u', unidades: U1, sinonimos: ['llave', 'francesa', 'ajustable', 'inglesa'], medidas: [6, 8, 10, 12, 15].map((p) => ({ v: `${p}"`, a: [`${p}`], p: 6 + p * 0.8 })), lineas: LINEAS3 },
  { id: 'llavecomb', categoria: 'Herramientas', nombre: 'Llave combinada', prefijo: 'LLC', base: 'u', unidades: U1, sinonimos: ['llave', 'combinada', 'boca', 'estrella'], medidas: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24].map((m) => ({ v: `${m} mm`, a: [`${m}`], p: 2 + m * 0.18 })), lineas: LINEAS3 },
  { id: 'pinza', categoria: 'Herramientas', nombre: 'Pinza', prefijo: 'PZA', base: 'u', unidades: U1, sinonimos: ['pinza', 'alicate'], medidas: [{ v: '6"', a: ['6'], p: 7 }, { v: '7"', a: ['7'], p: 8 }, { v: '8"', a: ['8'], p: 9 }], variantes: ['Universal', 'Punta', 'Corte', 'Pico de loro'], lineas: LINEAS3 },
  { id: 'cinta-m', categoria: 'Herramientas', nombre: 'Cinta métrica', prefijo: 'CME', base: 'u', unidades: U1, sinonimos: ['cinta', 'metro', 'metrica', 'medir'], medidas: [3, 5, 8, 10].map((m) => ({ v: `${m} m`, a: [`${m}m`], p: 2 + m * 0.5 })), lineas: LINEAS3 },
  { id: 'martillo', categoria: 'Herramientas', nombre: 'Martillo', prefijo: 'MAR', base: 'u', unidades: U1, sinonimos: ['martillo', 'maza'], medidas: [{ v: '300 g', p: 6 }, { v: '500 g', p: 8 }, { v: '1 kg', p: 11 }], variantes: ['Carpintero', 'Bola', 'Goma'], lineas: LINEAS3 },
  { id: 'disco', categoria: 'Herramientas', nombre: 'Disco de corte', prefijo: 'DIC', base: 'u', unidades: [{ id: 'u', etiqueta: 'unidad', factor: 1 }, { id: 'caja', etiqueta: 'caja x 10', factor: 10 }], sinonimos: ['disco', 'corte', 'amoladora'], medidas: [{ v: '115 mm', a: ['115', '4 1/2'], p: 0.9 }, { v: '180 mm', a: ['180', '7'], p: 1.8 }, { v: '230 mm', a: ['230', '9'], p: 2.6 }], variantes: ['Metal', 'Piedra', 'Diamantado'], lineas: LINEAS3 },
  // ---------------- Construcción ----------------
  { id: 'cemento', categoria: 'Construcción', nombre: 'Cemento', prefijo: 'CEM', base: 'u', unidades: [{ id: 'u', etiqueta: 'bolsa', factor: 1 }], sinonimos: ['cemento', 'portland', 'bolsa'], medidas: [{ v: '25 kg', a: ['25', '25kg'], p: 5 }, { v: '50 kg', a: ['50', '50kg'], p: 9 }], lineas: [['Estándar', 1]], minimo: 20 },
  { id: 'cal', categoria: 'Construcción', nombre: 'Cal hidráulica', prefijo: 'CAL', base: 'u', unidades: [{ id: 'u', etiqueta: 'bolsa', factor: 1 }], sinonimos: ['cal', 'bolsa'], medidas: [{ v: '25 kg', a: ['25'], p: 4 }], lineas: [['Estándar', 1]] },
  { id: 'pegceram', categoria: 'Construcción', nombre: 'Pegamento para cerámica', prefijo: 'PCE', base: 'u', unidades: [{ id: 'u', etiqueta: 'bolsa', factor: 1 }], sinonimos: ['pegamento', 'ceramica', 'adhesivo', 'porcelanato', 'klaukol'], medidas: [{ v: '30 kg', a: ['30'], p: 8 }], variantes: ['Común', 'Porcelanato', 'Impermeable'], lineas: LINEAS3 },
  { id: 'silicona', categoria: 'Construcción', nombre: 'Sellador de silicona', prefijo: 'SIL', base: 'u', unidades: U1, sinonimos: ['silicona', 'sellador', 'siliconas', 'cartucho'], medidas: [{ v: '280 ml', a: ['280'], p: 4 }], variantes: ['Transparente', 'Blanca', 'Negra', 'Gris'], lineas: LINEAS3, defecto: { variante: 'Transparente' } },
  { id: 'espuma', categoria: 'Construcción', nombre: 'Espuma de poliuretano', prefijo: 'ESP', base: 'u', unidades: U1, sinonimos: ['espuma', 'poliuretano', 'aerosol'], medidas: [{ v: '300 ml', a: ['300'], p: 5 }, { v: '500 ml', a: ['500'], p: 7 }, { v: '750 ml', a: ['750'], p: 9 }], lineas: LINEAS3 },
  // ---------------- Jardín ----------------
  { id: 'manguera', categoria: 'Jardín', nombre: 'Manguera de riego', prefijo: 'MAN', base: 'u', unidades: U1, sinonimos: ['manguera', 'riego', 'jardin'], medidas: [{ v: '1/2" x 15 m', a: ['1/2', '15'], p: 9 }, { v: '1/2" x 25 m', a: ['1/2', '25'], p: 14 }, { v: '3/4" x 25 m', a: ['3/4', '25'], p: 19 }, { v: '3/4" x 50 m', a: ['3/4', '50'], p: 34 }], lineas: LINEAS3 },
  { id: 'conector', categoria: 'Jardín', nombre: 'Conector rápido para manguera', prefijo: 'CRM', base: 'u', unidades: U1, sinonimos: ['conector', 'acople', 'manguera', 'union'], medidas: [{ v: '1/2"', a: ['1/2'], p: 1.2 }, { v: '3/4"', a: ['3/4'], p: 1.6 }], variantes: ['Hembra', 'Macho', 'Con stop'], lineas: LINEAS3 },
  { id: 'tijerap', categoria: 'Jardín', nombre: 'Tijera de podar', prefijo: 'TPO', base: 'u', unidades: U1, sinonimos: ['tijera', 'podar', 'poda'], medidas: [{ v: '20 cm', p: 7 }, { v: '60 cm', p: 18 }], lineas: LINEAS3 },
  { id: 'pala', categoria: 'Jardín', nombre: 'Pala', prefijo: 'PAL', base: 'u', unidades: U1, sinonimos: ['pala', 'palita'], medidas: [{ v: 'Ancha', p: 14 }, { v: 'Punta', p: 14 }, { v: 'De jardín', p: 6 }], lineas: LINEAS3 },
];

/** Complementos (FER-12): con esta familia se suele llevar… */
export const COMPLEMENTOS: Record<string, string[]> = {
  pvc: ['codo90', 'codo45', 'pegpvc', 'ramal'],
  codo90: ['pegpvc'],
  codo45: ['pegpvc'],
  termo: ['codotf', 'teflon'],
  cable: ['cinta', 'caja', 'corrugado'],
  termica: ['disyuntor'],
  latexint: ['rodillo', 'fijador', 'lija'],
  latexext: ['rodillo', 'fijador'],
  esmalte: ['pincel', 'lija'],
  canilla: ['teflon', 'flexible'],
  cuerito: ['teflon'],
  autop: ['mechaac'],
  tarugo: ['mechaw', 'tmadera'],
  manguera: ['conector'],
};

/** Búsqueda por problema ("pierde la canilla"). */
export const PROBLEMAS: { frases: string[]; titulo: string; consejo: string; familias: string[] }[] = [
  { frases: ['pierde la canilla', 'gotea la canilla', 'canilla gotea', 'canilla pierde', 'gotea'], titulo: 'Canilla que gotea', consejo: 'Casi siempre es el cuerito o el vástago. Llevá también teflón.', familias: ['cuerito', 'vastago', 'teflon'] },
  { frases: ['salta la termica', 'se corta la luz', 'salta la llave'], titulo: 'Se corta la luz', consejo: 'Revisá la llave térmica y el disyuntor. Si no sabés, llamá a un electricista matriculado.', familias: ['termica', 'disyuntor'] },
  { frases: ['humedad en la pared', 'mancha de humedad', 'pared humeda'], titulo: 'Pared con humedad', consejo: 'Primero se seca y se sella; después fijador y látex.', familias: ['fijador', 'latexint', 'enduido'] },
  { frases: ['pierde el inodoro', 'pierde el flexible', 'gotea el flexible'], titulo: 'Pierde la conexión', consejo: 'Cambiá el flexible y sellá la rosca con teflón.', familias: ['flexible', 'teflon'] },
  { frases: ['tapada la pileta', 'pileta tapada', 'no desagota'], titulo: 'Pileta que no desagota', consejo: 'Probá desarmar el sifón; si está roto, se cambia entero.', familias: ['sifon'] },
  { frases: ['colgar un cuadro', 'colgar estante', 'agujero en la pared'], titulo: 'Colgar algo en la pared', consejo: 'Mecha de widia del mismo número que el tarugo.', familias: ['tarugo', 'mechaw', 'tmadera'] },
];

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ---------------- Normalización y sinónimos (FER-02, FER-03) ----------------

/** Sinónimos de palabra que ya vienen de fábrica (el dueño suma los suyos). */
export const SINONIMOS_BASE: Record<string, string> = {
  tubo: 'caño', tubos: 'caño', cano: 'caño', canos: 'caño', caños: 'caño',
  curva: 'codo', curvas: 'codo', pega: 'pegamento', adhesivo: 'pegamento', foco: 'lampara', focos: 'lampara', bombita: 'lampara', bombilla: 'lampara', lamparita: 'lampara',
  enchufe: 'tomacorriente', toma: 'tomacorriente', taco: 'tarugo', tacos: 'tarugo', grifo: 'canilla', cuero: 'cuerito', cablecito: 'cable', aislante: 'aisladora',
  broca: 'mecha', brocas: 'mecha', alicate: 'pinza', francesa: 'ajustable', perno: 'bulon', brocha: 'pincel', masilla: 'enduido', klaukol: 'pegamento',
};

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'x', 'por', 'un', 'una', 'unos', 'y', 'a', 'en', 'que', 'mi', 'me', 'se', 'lo', 'al', 'o', 'mas', 'mm', 'mm2', 'cm', 'pulgada', 'pulgadas', 'medida', 'n', 'nro', 'numero']);

export function sinAcentos(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n');
}

/** "caños" → "caño" (también con acento), "codos" → "codo". */
export function raiz(w: string) {
  if (/^\d/.test(w)) return w;
  if (w.length > 4 && w.endsWith('es') && !w.endsWith('ces')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

export function preparar(texto: string) {
  return sinAcentos(texto)
    .replace(/½/g, ' 1/2').replace(/¼/g, ' 1/4').replace(/¾/g, ' 3/4')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d+)\s+(\d\/\d)/g, '$1 $2')
    .replace(/["”″]/g, ' ')
    .replace(/(\d)\s*(?:lts?|litros?)\b/g, '$1l')
    .replace(/(\d)\s*(?:kgs?|kilos?)\b/g, '$1kg')
    .replace(/(\d)\s*(?:mm2|mm²|mm)\b/g, '$1')
    .replace(/(\d)\s*(?:watts?)\b/g, '$1w');
}

/** Tokens normalizados, con "1 1/2" como un solo token. */
export function tokens(texto: string, palabras: Record<string, string> = {}) {
  const t = preparar(texto).replace(/(\d+) (\d\/\d)/g, '$1_$2');
  return t
    .split(/[^a-z0-9./_]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, '').replace('_', ' '))
    .filter((w) => w && !STOP.has(w))
    .map((w) => {
      const s = palabras[w] ?? SINONIMOS_BASE[w] ?? w;
      return raiz(sinAcentos(s));
    });
}

// ---------------- Generación del catálogo ----------------

let CACHE: { moneda: string; productos: Producto[] } | null = null;

export function catalogoBase(moneda: string): Producto[] {
  if (CACHE?.moneda === moneda) return CACHE.productos;
  const r = azar(9090);
  const productos: Producto[] = [];
  let n = 0;
  for (const f of FAMILIAS) {
    const lineas = f.lineas ?? [['Estándar', 1]];
    const variantes = f.variantes ?? [''];
    for (const m of f.medidas)
      for (const v of variantes)
        for (const [linea, factor] of lineas) {
          n++;
          const nombre = [f.nombre, m.v, v].filter(Boolean).join(' ');
          const precio = precioEjemplo(m.p * factor * (0.95 + r() * 0.1), moneda);
          const minimo = f.minimo ?? (f.base === 'm' ? 20 : 5);
          const x = r();
          const stock = x < 0.012 ? 0 : x < 0.035 ? Math.max(1, Math.floor(minimo * 0.5)) : Math.round(minimo * (1.5 + r() * 4));
          const claves = new Set<string>([
            ...tokens(`${f.nombre} ${v} ${linea} ${f.sinonimos.join(' ')} ${f.categoria}`),
            ...tokens(m.v),
            ...(m.a ?? []).flatMap((a) => tokens(a)),
          ]);
          productos.push({
            id: `${f.id}-${n}`,
            codigo: `${f.prefijo}-${String(n).padStart(4, '0')}`,
            nombre,
            categoria: f.categoria,
            familia: f.id,
            medida: m.v,
            variante: v,
            linea,
            base: f.base,
            unidades: f.unidades,
            precio,
            stock,
            minimo,
            claves: [...claves],
          });
        }
  }
  CACHE = { moneda, productos };
  return productos;
}

export const ORDEN_FAMILIA: Record<string, number> = Object.fromEntries(FAMILIAS.map((f, i) => [f.id, i]));
export const familiaDe = (p: Pick<Producto, 'familia'>) => FAMILIAS.find((f) => f.id === p.familia)!;
export const CATEGORIAS = [...new Set(FAMILIAS.map((f) => f.categoria))];

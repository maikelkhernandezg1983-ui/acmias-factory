import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import type { Categoria, ClienteC, Cuota, EstadoContador, Tarea } from './tipos';
import { periodoDe, sumarMeses, vencimiento } from './periodos';

export const VERSION_CONTADOR = 1;

/** Honorario mensual de referencia en USD por categoría (se pasa a la moneda de la demo). */
export const HONORARIO_BASE: Record<Categoria, number> = { monotributo: 30, responsable: 75, empleador: 110, sociedad: 160 };

const NOMBRES = ['Lucía', 'Martín', 'Carla', 'Diego', 'Valeria', 'Sergio', 'Florencia', 'Pablo', 'Natalia', 'Gustavo', 'Romina', 'Hernán', 'Paula', 'Ricardo', 'Mariela', 'Facundo', 'Andrea', 'Julián', 'Silvina', 'Marcelo', 'Gabriela', 'Leandro', 'Verónica', 'Esteban', 'Daniela', 'Alejandro', 'Cecilia', 'Matías', 'Laura', 'Fernando', 'Agustina', 'Nicolás', 'Soledad', 'Rodrigo', 'Mónica', 'Federico', 'Lorena', 'Cristian', 'Analía', 'Emiliano'];
const APELLIDOS = ['Acosta', 'Benítez', 'Cabrera', 'Domínguez', 'Escobar', 'Figueroa', 'Gallardo', 'Herrera', 'Ibáñez', 'Juárez', 'Ledesma', 'Molina', 'Navarro', 'Ojeda', 'Paredes', 'Quiroga', 'Ríos', 'Sosa', 'Toledo', 'Urquiza', 'Vera', 'Zalazar', 'Aguirre', 'Bustos', 'Castro', 'Duarte', 'Ferreyra', 'Godoy', 'Luna', 'Medina'];
const SOCIEDADES = ['Distribuidora Norte SRL', 'Panificados del Centro SA', 'Transporte Ruta 5 SRL', 'Servicios Integrales Delta SAS', 'Construcciones Andinas SRL', 'Café de la Plaza SAS'];

/** Generador determinístico para que la demo sea siempre igual. */
export function aleatorio(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** CUIT con formato válido y dígito verificador correcto, siempre ficticio. */
export function cuitFicticio(prefijo: '20' | '27' | '30', n: number) {
  const dni = String(30_000_000 + ((n * 7_919_311) % 15_000_000)).padStart(8, '0');
  const base = prefijo + dni;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = base.split('').reduce((t, d, i) => t + Number(d) * pesos[i], 0);
  let v = 11 - (suma % 11);
  if (v === 11) v = 0;
  if (v === 10) v = 9;
  return `${prefijo}-${dni}-${v}`;
}

export function claveFicticia(r: () => number) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 6; i++) s += letras[Math.floor(r() * letras.length)];
  return `${s}${Math.floor(10 + r() * 89)}`;
}

/** Fila de la cartera ficticia; la usan la demo (primeros clientes) y la planilla de ejemplo de 280. */
export function filaFicticia(i: number) {
  const r = aleatorio(9001 + i * 31);
  const esSociedad = i % 9 === 4;
  const categoria: Categoria = esSociedad ? 'sociedad' : i % 7 === 2 ? 'empleador' : i % 3 === 1 ? 'responsable' : 'monotributo';
  const nombre = esSociedad ? SOCIEDADES[Math.floor(i / 9) % SOCIEDADES.length] + (i >= 54 ? ` ${Math.floor(i / 54) + 1}` : '') : NOMBRES[(i * 7) % NOMBRES.length];
  const apellido = esSociedad ? '' : APELLIDOS[(i * 11 + 3) % APELLIDOS.length];
  const mujer = /a$/.test(nombre) || ['Soledad', 'Mónica', 'Cecilia', 'Silvina'].includes(nombre);
  const usuario = cuitFicticio(esSociedad ? '30' : mujer ? '27' : '20', i + 1);
  const whatsapp = `54911${String(50_000_000 + ((i * 1_234_577) % 49_999_999)).padStart(8, '0')}`;
  const ajuste = [1, 1, 1.15, 0.9, 1.3][i % 5];
  return { nombre, apellido, usuario, clave: claveFicticia(r), whatsapp, categoria, ajuste, email: `${(apellido || nombre.split(' ')[0]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${i + 1}@correo-ejemplo.com` };
}

export const TAREA_MENSUAL = 'Declaración mensual';
export const CLIENTES_DEMO = 48;

export function crearEstadoContador(moneda: string, ahora = new Date()): EstadoContador {
  const actual = periodoDe(ahora);
  const clientes: ClienteC[] = [];
  const cuotas: Cuota[] = [];
  const tareas: Tarea[] = [];
  const diaVencimiento = 10;
  for (let i = 0; i < CLIENTES_DEMO; i++) {
    const f = filaFicticia(i);
    const r = aleatorio(77 + i * 13);
    // La mayoría está en la cartera hace más de un año; algunos se sumaron hace poco.
    const antiguedad = i % 11 === 6 ? 2 : i % 13 === 9 ? 5 : 14;
    const alta = sumarMeses(actual, -antiguedad);
    const honorario = Math.round(precioEjemplo(HONORARIO_BASE[f.categoria] * f.ajuste, moneda) / 100) * 100 || Math.round(HONORARIO_BASE[f.categoria] * f.ajuste);
    const c: ClienteC = {
      id: `cc-${i + 1}`,
      orden: i + 1,
      nombre: f.nombre,
      apellido: f.apellido,
      usuario: f.usuario,
      clave: i % 10 === 8 ? undefined : f.clave,
      whatsapp: f.whatsapp,
      email: f.email,
      categoria: f.categoria,
      honorario,
      activo: i !== 41,
      alta: `${alta}-01T12:00:00.000Z`,
      ejemplo: true,
    };
    clientes.push(c);
    // Perfil de pago: la mayoría al día, algunos deben un mes y pocos deben varios.
    const perfil = i % 12 === 3 || i === 29 ? 'atrasado' : i % 7 === 2 || i % 10 === 7 ? 'debe' : 'aldia';
    const meses = Math.min(12, antiguedad);
    for (let k = meses - 1; k >= 0; k--) {
      const periodo = sumarMeses(actual, -k);
      const vence = vencimiento(periodo, diaVencimiento);
      let pagada = true;
      if (k === 0) pagada = r() < 0.45; // el mes en curso todavía se está cobrando
      if (perfil === 'debe' && k === 1) pagada = false;
      if (perfil === 'atrasado' && k <= 3) pagada = false;
      if (!c.activo && k <= 1) continue;
      const dia = Math.min(28, diaVencimiento - 6 + Math.floor(r() * 12));
      cuotas.push({
        id: `cu-${i + 1}-${periodo}`,
        clienteId: c.id,
        periodo,
        monto: k > 6 ? Math.round((honorario * 0.85) / 100) * 100 || honorario : honorario,
        estado: pagada ? 'pagada' : 'pendiente',
        pagada: pagada ? new Date(+vence - (10 - dia) * 86_400_000).toISOString() : undefined,
        medio: pagada ? (r() < 0.8 ? 'transferencia' : 'efectivo') : undefined,
        informada: !pagada && k === 0 && i % 6 === 1 ? new Date(+ahora - 3 * 3_600_000).toISOString() : undefined,
      });
    }
    if (!c.activo) continue;
    // Tareas: los dos meses anteriores terminados y avisados; el mes en curso, a mitad de camino (en orden de cartera).
    for (const k of [2, 1]) {
      const periodo = sumarMeses(actual, -k);
      const fin = new Date(+vencimiento(periodo, 18) + (i % 5) * 3_600_000).toISOString();
      tareas.push({ id: `ta-${i + 1}-${periodo}`, clienteId: c.id, periodo, nombre: TAREA_MENSUAL, estado: 'terminada', terminada: fin, avisada: fin });
    }
    const hecha = i < 26;
    const fin = new Date(+ahora - (26 - i) * 2 * 3_600_000).toISOString();
    tareas.push({ id: `ta-${i + 1}-${actual}`, clienteId: c.id, periodo: actual, nombre: TAREA_MENSUAL, estado: hecha ? 'terminada' : 'pendiente', terminada: hecha ? fin : undefined, avisada: hecha && i < 23 ? fin : undefined });
  }
  return {
    version: VERSION_CONTADOR,
    rubro: 'contador',
    clientes,
    cuotas,
    tareas,
    ajustes: { tareaMensual: TAREA_MENSUAL, diaVencimiento, alias: 'estudio.contable.demo' },
    accesos: [],
  };
}

const NOMBRE_CAT: Record<Categoria, string> = { monotributo: 'Monotributo', responsable: 'Responsable inscripto', empleador: 'Empleador', sociedad: 'Sociedad' };

/** Planilla ficticia para mostrar la importación masiva: los primeros 48 ya están en la demo y se actualizan. */
export function planillaEjemplo(moneda: string, n = 280) {
  const filas = [['Nombre', 'Apellido', 'Usuario', 'Clave', 'WhatsApp', 'Honorario', 'Categoría', 'Mail']];
  for (let i = 0; i < n; i++) {
    const f = filaFicticia(i);
    const h = Math.round(precioEjemplo(HONORARIO_BASE[f.categoria] * f.ajuste, moneda) / 100) * 100 || Math.round(HONORARIO_BASE[f.categoria] * f.ajuste);
    filas.push([f.nombre, f.apellido, f.usuario, f.clave, `+${f.whatsapp}`, String(h), NOMBRE_CAT[f.categoria], f.email]);
  }
  return '﻿' + filas.map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\r\n');
}

import 'server-only';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

/**
 * Registros de clientes: llegan del formulario "Agenda tu demo" de la landing y guardan
 * el manual de marca del negocio (logo, colores, rubro). El vendedor solo toca "Ver demo".
 *
 * Con DATABASE_URL (Neon, desde el Marketplace de Vercel) se guardan en Postgres.
 * Sin base, en desarrollo y pruebas, se usa una memoria local con registros ficticios.
 */

export const RUBROS_REGISTRO = ['restaurante', 'repuestos', 'tienda', 'barberia', 'consultorio', 'ferreteria', 'autos', 'inmobiliaria'] as const;
const HEX = /^#[0-9A-Fa-f]{6}$/;
const LOGO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_LOGO = 400_000; // caracteres del data URL (~300 KB de imagen)

export const NuevoRegistro = z.object({
  negocio: z.string().trim().min(2).max(60),
  rubro: z.enum(RUBROS_REGISTRO),
  colorPrincipal: z.string().regex(HEX),
  colorSecundario: z.string().regex(HEX),
  logo: z.string().max(MAX_LOGO).regex(LOGO).optional(),
  whatsapp: z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().min(8).max(15)),
  email: z.email().max(120),
  caso: z.string().trim().max(1000).optional().default(''),
  aceptaContacto: z.literal(true),
});
export type NuevoRegistro = z.infer<typeof NuevoRegistro>;

export interface Registro {
  id: string;
  negocio: string;
  rubro: (typeof RUBROS_REGISTRO)[number];
  colorPrincipal: string;
  colorSecundario: string;
  logo?: string;
  whatsapp: string;
  email: string;
  caso: string;
  creado: string;
  ejemplo?: boolean;
}

const url = process.env.DATABASE_URL;
const sql = url ? neon(url) : null;
export const hayBase = Boolean(sql);

let tablaLista: Promise<unknown> | null = null;
function asegurarTabla() {
  if (!sql) return Promise.resolve();
  tablaLista ??= sql`
    create table if not exists registros (
      id text primary key,
      negocio text not null,
      rubro text not null,
      color_principal text not null,
      color_secundario text not null,
      logo text,
      whatsapp text not null,
      email text not null,
      caso text not null default '',
      acepta_contacto_en timestamptz not null,
      creado timestamptz not null default now()
    )`;
  return tablaLista;
}

/** Memoria para desarrollo y pruebas: negocios ficticios, nunca datos reales. */
const memoria: Registro[] = [
  { id: 'r-ejemplo-1', negocio: 'Trattoria Don Bruno', rubro: 'restaurante', colorPrincipal: '#1F5135', colorSecundario: '#E9B44C', whatsapp: '5491155550001', email: 'demo@ejemplo.com', caso: 'Quieren la carta con QR por mesa y pedidos por WhatsApp.', creado: '2026-11-06T14:10:00.000Z', ejemplo: true },
  { id: 'r-ejemplo-2', negocio: 'La Parrilla del Puerto', rubro: 'restaurante', colorPrincipal: '#7A1F1F', colorSecundario: '#F2C14E', whatsapp: '5491155550002', email: 'demo@ejemplo.com', caso: 'Delivery propio y subir precios rápido.', creado: '2026-11-07T19:25:00.000Z', ejemplo: true },
  { id: 'r-ejemplo-8', negocio: 'Propiedades del Parque', rubro: 'inmobiliaria', colorPrincipal: '#1F3B33', colorSecundario: '#E3B23C', whatsapp: '5491155550008', email: 'demo@ejemplo.com', caso: 'Que las consultas lleguen con el código de la propiedad y la visita ya agendada.', creado: '2026-11-09T23:30:00.000Z', ejemplo: true },
  { id: 'r-ejemplo-7', negocio: 'Motores del Sur', rubro: 'autos', colorPrincipal: '#14161A', colorSecundario: '#E8590C', whatsapp: '5491155550007', email: 'demo@ejemplo.com', caso: 'Que las consultas lleguen con el auto, la cuota y el usado ya cargados.', creado: '2026-11-09T22:00:00.000Z', ejemplo: true },
  { id: 'r-ejemplo-6', negocio: 'Ferretería El Tornillo Feliz', rubro: 'ferreteria', colorPrincipal: '#E2571E', colorSecundario: '#1F2A44', whatsapp: '5491155550006', email: 'demo@ejemplo.com', caso: 'Contestar rápido las listas que mandan los plomeros por WhatsApp.', creado: '2026-11-09T12:20:00.000Z', ejemplo: true },
  { id: 'r-ejemplo-5', negocio: 'Consultorio Integral Sur', rubro: 'consultorio', colorPrincipal: '#0F5F73', colorSecundario: '#9ED8C9', whatsapp: '5491155550005', email: 'demo@ejemplo.com', caso: 'Menos ausencias y que la secretaria no confirme a mano.', creado: '2026-11-09T11:30:00.000Z', ejemplo: true },
  { id: 'r-ejemplo-4', negocio: 'Barbería El Faro', rubro: 'barberia', colorPrincipal: '#1D2B3A', colorSecundario: '#C8963E', whatsapp: '5491155550004', email: 'demo@ejemplo.com', caso: 'Turnos online sin llamadas y menos ausencias.', creado: '2026-11-09T09:40:00.000Z', ejemplo: true },
  { id: 'r-ejemplo-3', negocio: 'Repuestos Ruta 9', rubro: 'repuestos', colorPrincipal: '#0E3B66', colorSecundario: '#F28C28', whatsapp: '5491155550003', email: 'demo@ejemplo.com', caso: 'Catálogo por modelo de auto.', creado: '2026-11-08T10:05:00.000Z', ejemplo: true },
];

function idNuevo() {
  // Imposible de adivinar: el slug de la demo sale de acá.
  return 'r' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export async function listarRegistros(): Promise<Registro[]> {
  if (!sql) return [...memoria].sort((a, b) => b.creado.localeCompare(a.creado));
  await asegurarTabla();
  const filas = await sql`
    select id, negocio, rubro, color_principal, color_secundario, logo, whatsapp, email, caso, creado
    from registros order by creado desc limit 200`;
  return filas.map((f) => ({
    id: f.id,
    negocio: f.negocio,
    rubro: f.rubro,
    colorPrincipal: f.color_principal,
    colorSecundario: f.color_secundario,
    logo: f.logo ?? undefined,
    whatsapp: f.whatsapp,
    email: f.email,
    caso: f.caso,
    creado: new Date(f.creado).toISOString(),
  }));
}

/** Arma el registro (con id nuevo) sin guardarlo. */
export function armarRegistro(datos: NuevoRegistro): Registro {
  return {
    id: idNuevo(),
    negocio: datos.negocio,
    rubro: datos.rubro,
    colorPrincipal: datos.colorPrincipal.toUpperCase(),
    colorSecundario: datos.colorSecundario.toUpperCase(),
    logo: datos.logo,
    whatsapp: datos.whatsapp,
    email: datos.email,
    caso: datos.caso,
    creado: new Date().toISOString(),
  };
}

export async function crearRegistro(datos: NuevoRegistro): Promise<Registro> {
  const r = armarRegistro(datos);
  if (!sql) {
    memoria.unshift(r);
    return r;
  }
  await asegurarTabla();
  await sql`
    insert into registros (id, negocio, rubro, color_principal, color_secundario, logo, whatsapp, email, caso, acepta_contacto_en, creado)
    values (${r.id}, ${r.negocio}, ${r.rubro}, ${r.colorPrincipal}, ${r.colorSecundario}, ${r.logo ?? null}, ${r.whatsapp}, ${r.email}, ${r.caso}, now(), ${r.creado})`;
  return r;
}

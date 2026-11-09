'use client';

/**
 * Almacenamiento de demos en el dispositivo del vendedor (localStorage).
 * Temporal hasta la base de datos de la plataforma (BRD 00, E2 y E4).
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { DemoConfig, DemoEstado } from './tipos';
import { crearEstadoInicial } from './rubros/restaurante/datos-ejemplo';
import { crearEstadoRepuestos } from './rubros/repuestos/datos-ejemplo';
import { crearEstadoTienda } from './rubros/tienda/datos-ejemplo';

function estadoInicial(config: DemoConfig): unknown {
  if (config.rubro === 'tienda') return crearEstadoTienda(config.moneda, config.variante);
  return config.rubro === 'repuestos' ? crearEstadoRepuestos(config.moneda) : crearEstadoInicial(config.moneda);
}

const CLAVE_DEMOS = 'acmias:demos';
const claveEstado = (slug: string) => `acmias:demo:${slug}`;
const EVENTO = 'acmias:cambio';

function leer<T>(clave: string, defecto: T): T {
  if (typeof window === 'undefined') return defecto;
  try {
    const v = window.localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    throw new Error('No hay espacio en este dispositivo. Borrá alguna demo vieja e intentá de nuevo.');
  }
  cache.delete(clave);
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: clave }));
}

// Cache para que useSyncExternalStore reciba siempre la misma referencia mientras no cambie el dato.
const cache = new Map<string, { raw: string | null; valor: unknown }>();

function leerCacheado<T>(clave: string, defecto: T): T {
  if (typeof window === 'undefined') return defecto;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(clave);
  } catch {
    raw = null;
  }
  const c = cache.get(clave);
  if (c && c.raw === raw) return c.valor as T;
  let valor: T = defecto;
  try {
    valor = raw ? (JSON.parse(raw) as T) : defecto;
  } catch {
    valor = defecto;
  }
  cache.set(clave, { raw, valor });
  return valor;
}

function suscribir(cb: () => void) {
  const h = () => cb();
  window.addEventListener('storage', h);
  window.addEventListener(EVENTO, h);
  return () => {
    window.removeEventListener('storage', h);
    window.removeEventListener(EVENTO, h);
  };
}

const VACIO: DemoConfig[] = [];

export function useDemos() {
  return useSyncExternalStore(suscribir, () => leerCacheado(CLAVE_DEMOS, VACIO), () => VACIO);
}

export function useDemo(slug: string) {
  const demos = useDemos();
  return demos.find((d) => d.slug === slug);
}

/** Estado de una demo de cualquier rubro (cada rubro define su forma). */
export function useEstadoDe<T>(slug: string) {
  const estado = useSyncExternalStore(
    suscribir,
    () => leerCacheado<T | null>(claveEstado(slug), null),
    () => null,
  );
  const actualizar = useCallback(
    (fn: (e: T) => T): string | null => {
      const actual = leer<T | null>(claveEstado(slug), null);
      if (!actual) return 'No encontramos los datos de esta demo en el dispositivo.';
      try {
        escribir(claveEstado(slug), fn(actual));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'No se pudo guardar el cambio.';
      }
    },
    [slug],
  );
  return [estado, actualizar] as const;
}


export function useEstado(slug: string) {
  return useEstadoDe<DemoEstado>(slug);
}

export function guardarDemo(config: DemoConfig) {
  // Primero el estado: si falta espacio, no queda una demo sin datos.
  if (!leer(claveEstado(config.slug), null)) {
    escribir(claveEstado(config.slug), estadoInicial(config));
  }
  const demos = leer<DemoConfig[]>(CLAVE_DEMOS, []);
  const otras = demos.filter((d) => d.slug !== config.slug);
  try {
    escribir(CLAVE_DEMOS, [config, ...otras]);
  } catch (e) {
    window.localStorage.removeItem(claveEstado(config.slug));
    cache.delete(claveEstado(config.slug));
    throw e;
  }
}

export function actualizarDemo(slug: string, cambios: Partial<DemoConfig>) {
  const demos = leer<DemoConfig[]>(CLAVE_DEMOS, []);
  escribir(CLAVE_DEMOS, demos.map((d) => (d.slug === slug ? { ...d, ...cambios } : d)));
}

export function borrarDemo(slug: string) {
  const demos = leer<DemoConfig[]>(CLAVE_DEMOS, []);
  escribir(CLAVE_DEMOS, demos.filter((d) => d.slug !== slug));
  window.localStorage.removeItem(claveEstado(slug));
  cache.delete(claveEstado(slug));
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function reiniciarDatos(slug: string, moneda: string, rubro: DemoConfig['rubro'] = 'restaurante', variante?: DemoConfig['variante']) {
  escribir(claveEstado(slug), estadoInicial({ moneda, rubro, variante } as DemoConfig));
}

export function existeSlug(slug: string) {
  return leer<DemoConfig[]>(CLAVE_DEMOS, []).some((d) => d.slug === slug);
}

export function crearSlug(nombre: string) {
  const base =
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'demo';
  let slug = base;
  let i = 2;
  while (existeSlug(slug)) slug = `${base}-${i++}`;
  return slug;
}

'use client';

import { useCallback, useState } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import type { EstadoRepuestos, MiVehiculo } from '@/lib/rubros/repuestos/tipos';

/** Demo de repuestos: configuración con la marca + catálogo guardado en el dispositivo. */
export function useDemoRepuestos(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'repuestos' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoRepuestos>(slug);
  const estado = config && e?.rubro === 'repuestos' ? e : null;
  return { config, estado, actualizar, tema, estilo, listo };
}

function leerLocal<T>(clave: string, defecto: T): T {
  try {
    const v = window.localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
}

/** Preferencia guardada en el celular del cliente (su auto, si es taller). */
export function usePreferencia<T>(clave: string, defecto: T) {
  const [valor, setValor] = useState<T>(() => (typeof window === 'undefined' ? defecto : leerLocal(clave, defecto)));
  const guardar = useCallback(
    (v: T) => {
      setValor(v);
      try {
        if (v === null || v === undefined) window.localStorage.removeItem(clave);
        else window.localStorage.setItem(clave, JSON.stringify(v));
      } catch {
        /* sin espacio: queda solo en memoria */
      }
    },
    [clave],
  );
  return [valor, guardar] as const;
}

export const useMiVehiculo = (slug: string) => usePreferencia<MiVehiculo | null>(`acmias:vehiculo:${slug}`, null);
export const useModoTaller = (slug: string) => usePreferencia<boolean>(`acmias:taller:${slug}`, false);

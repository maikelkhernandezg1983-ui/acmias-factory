'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import type { EstadoHotel } from '@/lib/rubros/hotel/tipos';

/** Demo del hotel: habitaciones, estadías y pedidos guardados en el dispositivo. */
export function useDemoHotel(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'hotel' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoHotel>(slug);
  const estado = config && e?.rubro === 'hotel' ? e : null;
  return { config, estado, actualizar, tema, estilo, listo };
}

export type ActualizarHotel = (fn: (e: EstadoHotel) => EstadoHotel) => string | null;

/** Hora actual que se renueva cada 30 segundos (para "hace 5 min" y demoras). */
export function useAhoraHotel() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

const sinSuscripcion = () => () => {};
const leerHab = () => new URLSearchParams(window.location.search).get('hab') ?? '';

/** Código de habitación que trae el QR (?hab=...). */
export function useCodigoHab() {
  return useSyncExternalStore(sinSuscripcion, leerHab, () => '');
}

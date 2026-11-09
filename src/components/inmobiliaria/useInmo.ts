'use client';

import { useEffect, useState } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import type { EstadoInmo } from '@/lib/rubros/inmobiliaria/tipos';

/** Demo de inmobiliaria: marca + propiedades, consultas, visitas y captaciones guardadas en el dispositivo. */
export function useDemoInmo(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'inmobiliaria' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoInmo>(slug);
  const estado = config && e?.rubro === 'inmobiliaria' ? e : null;
  return { config, estado, actualizar, tema, estilo, listo };
}

export type ActualizarInmo = (fn: (e: EstadoInmo) => EstadoInmo) => string | null;

export function useAhoraInmo() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

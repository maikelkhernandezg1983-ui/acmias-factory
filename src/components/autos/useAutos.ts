'use client';

import { useEffect, useState } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import type { EstadoAutos } from '@/lib/rubros/autos/tipos';

/** Demo de agencia de autos y motos: marca + stock, consultas y pruebas guardadas en el dispositivo. */
export function useDemoAutos(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'autos' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoAutos>(slug);
  const estado = config && e?.rubro === 'autos' ? e : null;
  return { config, estado, actualizar, tema, estilo, listo };
}

export type ActualizarAutos = (fn: (e: EstadoAutos) => EstadoAutos) => string | null;

export function useAhoraAutos() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

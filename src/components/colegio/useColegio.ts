'use client';

import { useEffect, useState } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import { asegurarPeriodo } from '@/lib/rubros/colegio/logica';
import { periodoDe } from '@/lib/rubros/contador/periodos';
import { codificarConfig } from '@/lib/utiles';
import type { EstadoColegio } from '@/lib/rubros/colegio/tipos';
import type { DemoConfig } from '@/lib/tipos';

export function useAhoraColegio() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

/** Demo del colegio guardada en el dispositivo; la cuota de cada mes del ciclo se crea sola. */
export function useDemoColegio(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'colegio' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoColegio>(slug);
  const estado = config && e?.rubro === 'colegio' ? e : null;
  const ahora = useAhoraColegio();
  const periodo = periodoDe(ahora);
  const falta = !!estado && asegurarPeriodo(estado, periodo) !== estado;
  useEffect(() => {
    if (falta) actualizar((x) => asegurarPeriodo(x, periodo));
  }, [falta, periodo, actualizar]);
  return { config, estado, actualizar, tema, estilo, listo, periodo, ahora };
}

export type ActualizarColegio = (fn: (e: EstadoColegio) => EstadoColegio) => string | null;

/** Enlace al portal de familias (con la configuración de la demo para abrir en cualquier celular). */
export const enlacePortal = (config: DemoConfig) => `${typeof window === 'undefined' ? '' : window.location.origin}/d/${config.slug}#c=${codificarConfig(config)}`;

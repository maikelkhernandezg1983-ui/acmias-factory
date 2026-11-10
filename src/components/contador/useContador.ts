'use client';

import { useEffect, useState } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import { asegurarPeriodo } from '@/lib/rubros/contador/logica';
import { periodoDe } from '@/lib/rubros/contador/periodos';
import type { EstadoContador } from '@/lib/rubros/contador/tipos';

/** Demo del estudio contable: cartera, cuotas y tareas guardadas en el dispositivo. */
export function useDemoContador(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'contador' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoContador>(slug);
  const estado = config && e?.rubro === 'contador' ? e : null;
  const ahora = useAhoraContador();
  const periodo = periodoDe(ahora);
  const falta = !!estado && asegurarPeriodo(estado, periodo) !== estado;
  // Al empezar un mes nuevo se crean solas la cuota y la tarea de cada cliente activo.
  useEffect(() => {
    if (falta) actualizar((x) => asegurarPeriodo(x, periodo));
  }, [falta, periodo, actualizar]);
  return { config, estado, actualizar, tema, estilo, listo, periodo, ahora };
}

export type ActualizarContador = (fn: (e: EstadoContador) => EstadoContador) => string | null;

export function useAhoraContador() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

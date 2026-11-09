'use client';

import { useEffect, useState } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import { correrSemanas } from '@/lib/rubros/barberia/datos-ejemplo';
import type { EstadoAgenda } from '@/lib/rubros/barberia/tipos';

/** Demo con agenda (barbería o consultorio): marca + agenda guardada en el dispositivo. */
export function useDemoBarberia(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'barberia' || c?.rubro === 'consultorio' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoAgenda>(slug);
  const estado = config && e?.rubro === config.rubro ? e : null;

  // Si la demo se abre semanas después de creada, la agenda de ejemplo se corre a la semana actual.
  useEffect(() => {
    if (!estado) return;
    const corrido = correrSemanas(estado);
    if (corrido) actualizar(() => corrido);
  }, [estado, actualizar]);

  return { config, estado, actualizar, tema, estilo, listo };
}

export type ActualizarAgenda = (fn: (e: EstadoAgenda) => EstadoAgenda) => string | null;

/** "Ahora" que avanza cada minuto (para no ofrecer horarios que ya pasaron). */
export function useAhora() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

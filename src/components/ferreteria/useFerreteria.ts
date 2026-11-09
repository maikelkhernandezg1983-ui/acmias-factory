'use client';

import { useMemo } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import { productos } from '@/lib/rubros/ferreteria/logica';
import type { EstadoFerreteria } from '@/lib/rubros/ferreteria/tipos';

/** Demo de ferretería: marca + estado guardado + catálogo (~3.000 productos) con los cambios del dueño. */
export function useDemoFerreteria(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'ferreteria' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoFerreteria>(slug);
  const estado = config && e?.rubro === 'ferreteria' ? e : null;
  const lista = useMemo(() => (estado && config ? productos(estado, config.moneda) : []), [estado, config]);
  return { config, estado, lista, actualizar, tema, estilo, listo };
}

export type ActualizarFer = (fn: (e: EstadoFerreteria) => EstadoFerreteria) => string | null;

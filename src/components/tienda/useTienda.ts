'use client';

import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import type { EstadoTienda } from '@/lib/rubros/tienda/tipos';

/** Demo de tienda: configuración con la marca + catálogo, stock y ventas del dispositivo. */
export function useDemoTienda(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'tienda' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoTienda>(slug);
  const estado = config && e?.rubro === 'tienda' ? e : null;
  return { config, estado, actualizar, tema, estilo, listo };
}

export type ActualizarTienda = (fn: (e: EstadoTienda) => EstadoTienda) => string | null;

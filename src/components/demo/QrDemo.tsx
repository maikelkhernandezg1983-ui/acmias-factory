'use client';

import { QrMesas } from './Impresiones';
import { useConfigCargada } from './useDemoCargada';
import { QrHabitaciones } from '@/components/hotel/QrHabitaciones';

/** Hoja de QR según el rubro: mesas del restaurante o habitaciones del hotel. */
export function QrDemo({ slug }: { slug: string }) {
  const { config } = useConfigCargada(slug);
  return config?.rubro === 'hotel' ? <QrHabitaciones slug={slug} /> : <QrMesas slug={slug} />;
}

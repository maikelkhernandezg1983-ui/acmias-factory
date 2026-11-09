'use client';

import { Carta } from './Carta';
import { PanelDuenio } from './PanelDuenio';
import { Sitio } from './Sitio';
import { Catalogo } from '@/components/repuestos/Catalogo';
import { PanelRepuestos } from '@/components/repuestos/PanelRepuestos';
import { SitioRepuestos } from '@/components/repuestos/SitioRepuestos';
import { Tienda } from '@/components/tienda/Tienda';
import { PanelTienda } from '@/components/tienda/PanelTienda';
import { SitioTienda } from '@/components/tienda/SitioTienda';
import { Reserva } from '@/components/barberia/Reserva';
import { PanelBarberia } from '@/components/barberia/PanelBarberia';
import { SitioBarberia } from '@/components/barberia/SitioBarberia';
import { DemoNoEncontrada, useConfigCargada } from './useDemoCargada';

type Vista = 'cliente' | 'panel' | 'sitio';

const VISTAS = {
  restaurante: { cliente: Carta, panel: PanelDuenio, sitio: Sitio },
  repuestos: { cliente: Catalogo, panel: PanelRepuestos, sitio: SitioRepuestos },
  tienda: { cliente: Tienda, panel: PanelTienda, sitio: SitioTienda },
  barberia: { cliente: Reserva, panel: PanelBarberia, sitio: SitioBarberia },
} as const;

/** Abre la pantalla que corresponde al rubro de la demo. */
export function PorRubro({ slug, vista }: { slug: string; vista: Vista }) {
  const { config, listo } = useConfigCargada(slug);
  // Sin config todavía (o llegó por enlace y se está importando): cada rubro decide; por defecto, restaurante.
  const rubro = config?.rubro ?? (listo ? leerRubroDelEnlace() : null);
  if (!rubro) return <DemoNoEncontrada listo={listo} />;
  const Componente = VISTAS[rubro][vista];
  return <Componente slug={slug} />;
}

function leerRubroDelEnlace(): keyof typeof VISTAS {
  try {
    const m = window.location.hash.match(/c=([A-Za-z0-9_-]+)/);
    if (!m) return 'restaurante';
    const json = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return json?.rubro in VISTAS ? json.rubro : 'restaurante';
  } catch {
    return 'restaurante';
  }
}

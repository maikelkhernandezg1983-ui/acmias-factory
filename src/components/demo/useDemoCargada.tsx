'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { guardarDemo, useDemo, useEstado } from '@/lib/almacen';
import { crearTema, temaComoEstilo } from '@/lib/marca';
import { decodificarConfig } from '@/lib/utiles';
import { VERSION_DATOS, fotoEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';

const sinSuscripcion = () => () => {};

/** Configuración de la demo (cualquier rubro): la toma del dispositivo o la importa del enlace compartido. */
export function useConfigCargada(slug: string) {
  const config = useDemo(slug);
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);

  useEffect(() => {
    if (!config) {
      const m = window.location.hash.match(/c=([A-Za-z0-9_-]+)/);
      const importada = m ? decodificarConfig(m[1]) : null;
      if (importada && importada.slug === slug) {
        try {
          guardarDemo(importada);
        } catch {
          /* sin espacio: se muestra "no encontrada" con instrucciones */
        }
      }
    }
  }, [config, slug]);

  const tema = useMemo(() => (config ? crearTema(config.colorPrincipal, config.colorSecundario) : null), [config]);
  const estilo = useMemo(() => (tema ? (temaComoEstilo(tema) as React.CSSProperties) : undefined), [tema]);
  return { config, tema, estilo, listo };
}

/** Demo de restaurante: configuración + carta guardada en el dispositivo. */
export function useDemoCargada(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'restaurante' ? c : undefined;
  const [estado, actualizar] = useEstado(slug);

  // Demos creadas con datos de ejemplo viejos: suman las fotos sin tocar lo que cargó el dueño.
  useEffect(() => {
    if (!config || !estado?.platos || (estado.version ?? 1) >= VERSION_DATOS) return;
    actualizar((e) => ({
      ...e,
      version: VERSION_DATOS,
      platos: e.platos.map((p) => (p.foto || p.importado ? p : { ...p, foto: fotoEjemplo(p.id) })),
    }));
  }, [config, estado, actualizar]);

  return { config, estado: config ? estado : null, actualizar, tema, estilo, listo };
}

export function DemoNoEncontrada({ listo }: { listo: boolean }) {
  if (!listo) return <div style={{ minHeight: '100vh', background: '#fff' }} aria-busy="true" />;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#0B1220', color: '#F6F9FC', textAlign: 'center' }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>Esta demo no está en este dispositivo</h1>
        <p style={{ color: '#9AA6B8', lineHeight: 1.5 }}>Las demos se guardan en el celular donde se crearon. Pedile al vendedor el enlace para compartir, o creá una nueva.</p>
        <Link href="/" className="btn btn-teal" style={{ marginTop: 16 }}>Ir al panel de demos</Link>
      </div>
    </main>
  );
}

export function AvisoDemo({ texto = 'Platos y precios de ejemplo' }: { texto?: string }) {
  return <div className="aviso-demo">Demo ilustrativa de ACMIAS · {texto}</div>;
}

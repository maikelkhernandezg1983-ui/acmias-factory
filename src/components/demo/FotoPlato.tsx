'use client';

import { useState } from 'react';
import { Ilustracion } from '@/components/Ilustracion';
import type { Ilustracion as TipoIlustracion } from '@/lib/tipos';

/**
 * Foto del plato con brillo de carga y respaldo: si la foto no carga (sin conexión,
 * enlace roto), se muestra la ilustración del plato sobre el color de la marca.
 */
export function FotoPlato({ src, tipo, className, prioridad }: { src?: string; tipo: TipoIlustracion; className?: string; prioridad?: boolean }) {
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const conFoto = src && estado !== 'error';
  return (
    <div className={`foto ${className ?? ''}`} data-estado={conFoto ? estado : 'ilustracion'}>
      {conFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading={prioridad ? 'eager' : 'lazy'}
          decoding="async"
          ref={(img) => {
            // Si la imagen ya estaba en caché, onLoad puede no dispararse después del montaje.
            if (img?.complete && img.naturalWidth > 0 && estado === 'cargando') setEstado('lista');
          }}
          onLoad={() => setEstado('lista')}
          onError={() => setEstado('error')}
        />
      ) : (
        <Ilustracion tipo={tipo} />
      )}
    </div>
  );
}

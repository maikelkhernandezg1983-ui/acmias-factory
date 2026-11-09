'use client';

import { useState } from 'react';
import type { IconoProducto, Producto } from '@/lib/rubros/tienda/tipos';

/** Foto del producto con brillo de carga; si no hay o no carga, una ilustración sobre el color de la marca. */
export function FotoProducto({ producto, className, prioridad }: { producto: Pick<Producto, 'foto' | 'icono'>; className?: string; prioridad?: boolean }) {
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const conFoto = producto.foto && estado !== 'error';
  return (
    <div className={`foto ${className ?? ''}`} data-estado={conFoto ? estado : 'ilustracion'}>
      {conFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={producto.foto}
          alt=""
          loading={prioridad ? 'eager' : 'lazy'}
          decoding="async"
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0 && estado === 'cargando') setEstado('lista');
          }}
          onLoad={() => setEstado('lista')}
          onError={() => setEstado('error')}
        />
      ) : (
        <IconoTienda icono={producto.icono} />
      )}
    </div>
  );
}

export function IconoTienda({ icono, size = 56 }: { icono: IconoProducto; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (icono) {
    case 'remera':
      return <svg {...p}><path d="M24 10c2 4 5 6 8 6s6-2 8-6l12 6 6 12-9 4v24H15V32l-9-4 6-12z" /><path d="M24 10c2 4 5 6 8 6s6-2 8-6" opacity=".5" /></svg>;
    case 'pantalon':
      return <svg {...p}><path d="M18 8h28l4 48H38l-6-30-6 30H14z" /><path d="M18 16h28M32 8v10" opacity=".5" /></svg>;
    case 'buzo':
      return <svg {...p}><path d="M22 10c0 6 4 10 10 10s10-4 10-10l12 7 4 30-8 2-2-18v29H16V31l-2 18-8-2 4-30z" /><path d="M24 40h16v8H24z" opacity=".55" /></svg>;
    case 'gorro':
      return <svg {...p}><path d="M14 40c0-14 8-24 18-24s18 10 18 24" /><path d="M12 40h40v8H12z" /><circle cx="32" cy="12" r="4" /><path d="M22 24v16M32 20v20M42 24v16" opacity=".5" /></svg>;
    case 'taza':
      return <svg {...p}><path d="M12 18h32v24a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10z" /><path d="M44 24h4a6 6 0 0 1 0 12h-4" /><path d="M22 8c-2 3 2 4 0 7M32 8c-2 3 2 4 0 7" opacity=".5" /></svg>;
    case 'vela':
      return <svg {...p}><path d="M18 26h28v26a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" /><path d="M32 26v-6" /><path d="M32 8c-4 5-4 8 0 10 4-2 4-5 0-10z" /><path d="M18 34h28" opacity=".5" /></svg>;
    case 'bolso':
      return <svg {...p}><path d="M12 24h40l-4 32H16z" /><path d="M22 24c0-10 4-14 10-14s10 4 10 14" /></svg>;
    case 'aros':
      return <svg {...p}><circle cx="22" cy="38" r="10" /><circle cx="44" cy="38" r="10" /><path d="M22 18v10M44 18v10" /><circle cx="22" cy="16" r="2" /><circle cx="44" cy="16" r="2" /></svg>;
    case 'bebida':
      return <svg {...p}><path d="M26 6h12v8l4 6v34a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V20l4-6z" /><path d="M22 30h20v14H22z" opacity=".55" /></svg>;
    case 'golosina':
      return <svg {...p}><path d="M20 22h24v20H20z" /><path d="M20 22l-10-6v32l10-6M44 22l10-6v32l-10-6" /><path d="M26 30h12M26 36h8" opacity=".5" /></svg>;
    case 'almacen':
      return <svg {...p}><path d="M16 14h32l-2 42H18z" /><path d="M16 14l4-6h24l4 6" /><path d="M20 28h24v14H20z" opacity=".55" /></svg>;
    case 'limpieza':
      return <svg {...p}><path d="M24 22h16v34H24z" /><path d="M28 22v-8h8l8 4-4 4" /><path d="M24 34h16" opacity=".5" /></svg>;
    case 'lacteo':
      return <svg {...p}><path d="M22 6h20v8l6 8v34H16V22l6-8z" /><path d="M16 30h32" /><path d="M26 40c2-3 4-3 6 0s4 3 6 0" opacity=".55" /></svg>;
  }
}

'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import { FOTO_PORTADA_TIENDA } from '@/lib/rubros/tienda/datos-ejemplo';
import { FotoProducto } from './FotoProducto';
import { useDemoTienda } from './useTienda';

/** Landing estándar de tienda (TIE-15) con productos destacados. */
export function SitioTienda({ slug }: { slug: string }) {
  const { config, estado, estilo, listo } = useDemoTienda(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const almacen = estado.variante === 'almacen';
  const destacados = estado.productos.filter((p) => p.destacado).slice(0, 4);
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`);
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Productos, stock y precios de ejemplo" />
      <section className="s-hero" style={almacen ? undefined : ({ '--portada': `url(${FOTO_PORTADA_TIENDA})` } as React.CSSProperties)}>
        <div className="s-in">
          <nav className="s-nav" aria-label="Principal">
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {config.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logo} alt="" style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', objectFit: 'contain', padding: 5 }} />
              ) : (
                <span className="c-inicial" style={{ width: 48, height: 48, fontSize: 22, borderRadius: 12 }} aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
              )}
              <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 20 }}>{config.negocio}</strong>
            </span>
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Ver productos</Link>
          </nav>
          <h1>{almacen ? 'Lo de todos los días, a una cuadra' : 'Elegí tu talle y tu color, con stock real'}</h1>
          <p>{almacen ? 'Armá tu pedido desde el celular y pasá a retirarlo o te lo llevamos.' : 'Mirá lo que hay antes de venir y pedí por WhatsApp para retirar o recibir en tu casa.'}</p>
          <div className="s-acciones">
            <Link href={`/d/${slug}`} className="s-btn uno">Ver productos</Link>
            <a href={wa} className="s-btn dos" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> Escribinos</a>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Lo más elegido</h2>
          <div className="s-grid">
            {destacados.map((p) => (
              <article key={p.id} className="s-plato">
                <FotoProducto producto={p} className="img" />
                <div className="t">
                  <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 19, display: 'block' }}>{p.nombre}</strong>
                  <span style={{ color: '#55555f', fontSize: 14 }}>{p.categoria}</span>
                  <div style={{ fontWeight: 800, marginTop: 8 }}>{formatoPrecio(p.precio, config.moneda)}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Categorías</h3><p>{estado.categorias.join(', ')}.</p></div>
          <div><h3>Entregas</h3><p>Retiro en el local o envío por {formatoPrecio(estado.costoEnvio, config.moneda)}.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del local]'}</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}

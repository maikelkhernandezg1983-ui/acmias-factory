'use client';

import Link from 'next/link';
import { AvisoDemo, DemoNoEncontrada, useDemoCargada } from './useDemoCargada';
import { Ilustracion } from '@/components/Ilustracion';
import { Icono } from '@/components/Icono';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';

/** Landing estándar del restaurante (RES-15), armada con la marca y los datos de la demo. */
export function Sitio({ slug }: { slug: string }) {
  const { config, estado, estilo, listo } = useDemoCargada(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const destacados = estado.platos.filter((p) => p.destacado && !p.agotado).slice(0, 6);
  const muestra = destacados.length ? destacados : estado.platos.filter((p) => !p.agotado).slice(0, 6);
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`);

  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo />
      <section className="s-hero">
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Ver carta</Link>
          </nav>
          <h1>{config.negocio}</h1>
          <p>Mirá la carta, elegí tranquilo y pedí por WhatsApp para comer acá, retirar{config.delivery ? ' o recibir en tu casa' : ''}.</p>
          <div className="s-acciones">
            <Link href={`/d/${slug}`} className="s-btn uno">Ver la carta</Link>
            <a href={wa} className="s-btn dos" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> Escribinos</a>
          </div>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-in">
          <h2>Lo que más se pide</h2>
          <div className="s-grid">
            {muestra.map((p) => (
              <article key={p.id} className="s-plato">
                <div className="img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.foto ? <img src={p.foto} alt="" /> : <Ilustracion tipo={p.ilustracion} />}
                </div>
                <div className="t">
                  <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 19, display: 'block' }}>{p.nombre}</strong>
                  <span style={{ color: '#55555f', fontSize: 14 }}>{p.descripcion}</span>
                  <div style={{ fontWeight: 800, marginTop: 8 }}>{formatoPrecio(p.precio, config.moneda)}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Horario</h3><p>Todos los días de {config.apertura} a {config.cierre}.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del local]'}</p></div>
          <div><h3>Pedidos</h3><p>Por WhatsApp, en la mesa con el QR{config.delivery ? ' o con delivery' : ''}.</p></div>
        </div>
      </section>

      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}

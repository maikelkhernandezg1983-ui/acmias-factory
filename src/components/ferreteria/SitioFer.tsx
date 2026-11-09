'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { CATEGORIAS } from '@/lib/rubros/ferreteria/catalogo';
import { FOTO_PORTADA_FER } from '@/lib/rubros/ferreteria/datos-ejemplo';
import { useDemoFerreteria } from './useFerreteria';

/** Landing estándar de ferretería (FER-15) con el buscador y "Mandanos tu lista". */
export function SitioFer({ slug }: { slug: string }) {
  const { config, estado, lista, listo, estilo } = useDemoFerreteria(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, te mando mi lista:\n`);
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Productos y precios de ejemplo" />
      <section className="s-hero" style={{ '--portada': `url(${FOTO_PORTADA_FER})` } as React.CSSProperties}>
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Buscar productos</Link>
          </nav>
          <h1>Mandanos tu lista y te respondemos con el presupuesto</h1>
          <p>Escribila como sea: &quot;3 caños de 50, 6 codos, 20 m de cable&quot;. Te contestamos con precio, stock y la unidad clara.</p>
          <div className="s-acciones">
            <a href={wa} className="s-btn uno" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> Mandanos tu lista</a>
            <Link href={`/d/${slug}`} className="s-btn dos"><Icono nombre="buscar" size={18} /> Buscar en {lista.length.toLocaleString('es')} productos</Link>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Lo que tenemos</h2>
          <ul className="sf-cats">
            {CATEGORIAS.map((c) => <li key={c}><Link href={`/d/${slug}`}>{c}<span>{lista.filter((p) => p.categoria === c).length.toLocaleString('es')} productos</span></Link></li>)}
          </ul>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>¿Sos profesional?</h3><p>Plomeros, electricistas y constructoras tienen lista de precios propia. Pedila por WhatsApp.</p></div>
          <div><h3>Presupuestos</h3><p>Válidos por 7 días, con la unidad clara (por metro, tira, rollo o caja) y sujetos a disponibilidad.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del local]'}</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}

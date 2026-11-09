'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { NOMBRE_OPERACION, precioProp, resumen, sufijo } from '@/lib/rubros/inmobiliaria/logica';
import { PropiedadArte } from './PropiedadArte';
import { useDemoInmo } from './useInmo';

/** Landing estándar de la inmobiliaria: destacadas, servicios y captación de propietarios. */
export function SitioInmo({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoInmo(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const activas = estado.propiedades.filter((p) => p.estado !== 'cerrada');
  const destacadas = [...activas.filter((p) => p.destacada), ...activas.filter((p) => !p.destacada)].slice(0, 3);
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Propiedades y precios de ejemplo" />
      <section className="s-hero au-s-hero">
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Ver propiedades</Link>
          </nav>
          <div className="au-s-grid">
            <div>
              <h1 style={{ maxWidth: '16ch' }}>Alquilá, comprá o vendé en tu zona</h1>
              <p>Propiedades con ficha completa, costos claros y visitas que agendás vos. Te respondemos por WhatsApp.</p>
              <div className="s-acciones">
                <Link href={`/d/${slug}`} className="s-btn uno"><Icono nombre="buscar" size={18} /> Ver las {activas.length} propiedades</Link>
                <a href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero que tasen mi propiedad.`)} className="s-btn dos" target="_blank" rel="noopener noreferrer"><Icono nombre="casa" size={18} /> Tasá tu propiedad</a>
              </div>
            </div>
            <div className="in-ciudad grande" aria-hidden="true">
              <span className="in-sol" />
              <PropiedadArte tipo="casa" color="#F2E6B8" className="in-c1" />
              <PropiedadArte tipo="departamento" color="#C9DBE8" className="in-c2 in-luces" />
              <PropiedadArte tipo="local" color="#EFD3CC" className="in-c3 in-luces" />
            </div>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Destacadas</h2>
          <div className="au-s-dest">
            {destacadas.map((p) => (
              <Link key={p.id} href={`/d/${slug}`} className="au-s-card">
                <span className="au-card-escena in-escena" style={{ '--tinte': p.color } as React.CSSProperties}><PropiedadArte tipo={p.tipo} color={p.color} /></span>
                <strong>{p.titulo}</strong>
                <span>{NOMBRE_OPERACION[p.operacion]} · {p.zona} · {resumen(p)} · {precioProp(p, config.moneda)} {sufijo(p)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Alquileres</h3><p>Costo de ingreso estimado en cada ficha y requisitos claros antes de visitar.</p></div>
          <div><h3>Ventas</h3><p>Tasación sin cargo, fotos y ficha completa. Te avisamos cada consulta.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección de la inmobiliaria]'}<br />Lunes a viernes de 10 a 18 h y sábados de 10 a 13 h.</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS · Imágenes ilustrativas</div>
      </footer>
    </div>
  );
}

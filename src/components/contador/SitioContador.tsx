'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { useDemoContador } from './useContador';

/** Landing estándar del estudio contable. */
export function SitioContador({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoContador(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Sitio de ejemplo" />
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Mi cuenta</Link>
          </nav>
          <div className="ct-s-hero">
            <h1>Tus impuestos al día, y vos sabiendo siempre en qué está tu trámite</h1>
            <p>Monotributo, responsables inscriptos, sociedades y empleadores. Te avisamos por WhatsApp cuando terminamos y ves tu cuenta cuando quieras.</p>
            <div className="s-acciones">
              <a href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero consultar por sus servicios.`)} className="s-btn uno" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Escribinos</a>
              <Link href={`/d/${slug}`} className="s-btn dos"><Icono nombre="usuario" size={18} /> Ver mi cuenta</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in s-info">
          <div><h3>Monotributo</h3><p>Altas, recategorizaciones y la declaración de cada mes, en fecha.</p></div>
          <div><h3>Responsables inscriptos y sociedades</h3><p>Declaraciones mensuales y anuales, libros y balances.</p></div>
          <div><h3>Empleadores</h3><p>Sueldos, cargas sociales y altas de personal.</p></div>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Cuenta clara</h3><p>Cada mes ves qué está pago y qué falta, sin preguntar.</p></div>
          <div><h3>Aviso al terminar</h3><p>Cuando terminamos tu trámite te llega un WhatsApp con el detalle y el costo.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del estudio]'}<br />Lunes a viernes de 9 a 17 h.</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { precioAuto } from '@/lib/rubros/autos/logica';
import { VehiculoArte } from './VehiculoArte';
import { useDemoAutos } from './useAutos';

/** Landing estándar de la agencia: destacados, financiación, permuta y prueba de manejo. */
export function SitioAutos({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoAutos(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const enStock = estado.vehiculos.filter((v) => v.estado !== 'vendido');
  const destacados = [...enStock.filter((v) => v.destacado), ...enStock.filter((v) => !v.destacado)].slice(0, 3);
  const heroe = destacados.find((v) => v.tipo === 'auto') ?? destacados[0];
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Vehículos y precios de ejemplo" />
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Ver stock</Link>
          </nav>
          <div className="au-s-grid">
            <div>
              <h1>Autos y motos con cuota, permuta y prueba de manejo</h1>
              <p>Mirá el stock real, simulá la cuota, contanos qué usado entregás y reservá la prueba. Te respondemos por WhatsApp.</p>
              <div className="s-acciones">
                <Link href={`/d/${slug}`} className="s-btn uno"><Icono nombre="buscar" size={18} /> Ver los {enStock.length} vehículos</Link>
                <a href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`)} className="s-btn dos" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> Escribinos</a>
              </div>
            </div>
            {heroe && <div className="au-escena grande" aria-hidden="true"><span className="au-velocidad" /><span className="au-velocidad dos" /><VehiculoArte carroceria={heroe.carroceria} color={heroe.colorHex} className="au-entra au-mover" /><span className="au-ruta" /></div>}
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Destacados</h2>
          <div className="au-s-dest">
            {destacados.map((v) => (
              <Link key={v.id} href={`/d/${slug}`} className="au-s-card au-mover-hover">
                <span className="au-card-escena" style={{ '--tinte': v.colorHex } as React.CSSProperties}><VehiculoArte carroceria={v.carroceria} color={v.colorHex} /></span>
                <strong>{v.modelo}</strong>
                <span>{v.cerokm ? '0 km' : `${v.anio} · ${v.km.toLocaleString('es')} km`} · {precioAuto(v.precio, config.moneda)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Financiación</h3><p>Simulá la cuota en cada vehículo. Plazos de {estado.ajustes.plazos.join(', ')} meses; la aprobación la define la financiera.</p></div>
          <div><h3>Tomamos tu usado</h3><p>Contanos qué entregás y te pasamos la oferta por WhatsApp, sujeta a revisión.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección de la agencia]'}<br />Lunes a viernes de 9 a 18 h y sábados de 9 a 13 h.</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS · Imágenes ilustrativas</div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { NOMBRE_TIPO_HAB, dinero } from '@/lib/rubros/hotel/logica';
import type { TipoHab } from '@/lib/rubros/hotel/tipos';
import { useDemoHotel } from './useHotel';

/** Landing del hotel: tipos de habitación con tarifa "desde" y reserva por WhatsApp. */
export function SitioHotel({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoHotel(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const tipos = (['estandar', 'doble', 'familiar', 'suite'] as TipoHab[])
    .map((t) => ({ t, hab: estado.habitaciones.filter((h) => h.tipo === t) }))
    .filter((x) => x.hab.length);
  const TEXTO: Record<TipoHab, string> = { estandar: 'Para viajar solo, con escritorio y ducha.', doble: 'Cama matrimonial o dos camas, ideal para dos.', familiar: 'Hasta cuatro personas, con espacio de sobra.', suite: 'Living, vista y bañera para descansar de verdad.' };
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Hotel y tarifas de ejemplo" />
      <section className="s-hero ho-s-hero">
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
            <a href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero consultar disponibilidad.`)} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }} target="_blank" rel="noopener noreferrer">Reservar</a>
          </nav>
          <div className="ct-s-hero">
            <h1>Descansá. Lo que necesites, lo pedís desde tu habitación</h1>
            <p>Escaneás el QR de tu habitación y pedís room service, toallas o ayuda sin llamar a nadie. Te respondemos al momento.</p>
            <div className="s-acciones">
              <a href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero consultar disponibilidad.`)} className="s-btn uno" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Consultar disponibilidad</a>
              <Link href={`/d/${slug}`} className="s-btn dos"><Icono nombre="qr" size={18} /> Probar el QR de habitación</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Habitaciones</h2>
          <div className="s-info">
            {tipos.map(({ t, hab }) => (
              <div key={t}>
                <h3>{NOMBRE_TIPO_HAB[t]}</h3>
                <p>{TEXTO[t]}</p>
                <p><strong>Desde {dinero(Math.min(...hab.map((h) => h.tarifa)), config.moneda)}</strong> la noche</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Desayuno</h3><p>{estado.ajustes.desayuno}, también a la habitación.</p></div>
          <div><h3>Room service</h3><p>{estado.ajustes.roomService}.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del hotel]'}<br />Check-out hasta las {estado.ajustes.checkout} h.</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}

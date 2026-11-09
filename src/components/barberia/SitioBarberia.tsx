'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import { FOTO_PORTADA_BARB, GALERIA_BARB } from '@/lib/rubros/barberia/datos-ejemplo';
import { hhmm, nombreDiaSemana } from '@/lib/rubros/barberia/agenda';
import { useDemoBarberia } from './useBarberia';

/** Landing estándar de barbería (BAR-15) con galería de trabajos. */
export function SitioBarberia({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoBarberia(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`);
  const abiertos = [1, 2, 3, 4, 5, 6, 0].filter((d) => estado.horario[d]);
  const h = abiertos.length ? estado.horario[abiertos[0]]! : null;
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Servicios, profesionales y fotos de ejemplo" />
      <section className="s-hero" style={{ '--portada': `url(${FOTO_PORTADA_BARB})` } as React.CSSProperties}>
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Reservar</Link>
          </nav>
          <h1>Tu turno, en tres toques y sin llamar</h1>
          <p>Elegí servicio, profesional y horario. Te confirmamos por WhatsApp y te recordamos el día antes.</p>
          <div className="s-acciones">
            <Link href={`/d/${slug}`} className="s-btn uno"><Icono nombre="calendario" size={18} /> Reservar turno</Link>
            <a href={wa} className="s-btn dos" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> Escribinos</a>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Trabajos</h2>
          <div className="sb-galeria">
            {GALERIA_BARB.map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={g.src} src={g.src} alt={g.alt} loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
            ))}
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Servicios</h2>
          <ul className="sb-servicios">
            {estado.servicios.map((s) => (
              <li key={s.id}>
                <span><strong>{s.nombre}</strong><small>{s.duracion} min · {s.descripcion}</small></span>
                <strong>{formatoPrecio(s.precio, config.moneda)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>El equipo</h3><p>{estado.profesionales.map((p) => `${p.nombre} (${p.especialidad.toLowerCase()})`).join(', ')}.</p></div>
          <div><h3>Horario</h3><p>{h ? `${abiertos.length > 2 && abiertos.every((d, i) => i === 0 || d === (abiertos[i - 1] + 1) % 7) ? `De ${nombreDiaSemana(abiertos[0])} a ${nombreDiaSemana(abiertos[abiertos.length - 1])}` : abiertos.map(nombreDiaSemana).join(', ')} de ${hhmm(h[0])} a ${hhmm(h[1])} h.` : 'A confirmar.'}</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del local]'}</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}

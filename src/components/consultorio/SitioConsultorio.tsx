'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { useDemoBarberia } from '@/components/barberia/useBarberia';
import { enlaceWhatsApp, formatoPrecio, soloDigitos } from '@/lib/utiles';
import { FOTO_PORTADA_CONS } from '@/lib/rubros/consultorio/datos-ejemplo';
import { hhmm, nombreDiaSemana } from '@/lib/rubros/barberia/agenda';
import { nombreProf } from './ReservaConsultorio';

/** Landing estándar de consultorio (CON-13): profesionales, coberturas y "Pedir turno". */
export function SitioConsultorio({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoBarberia(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const abiertos = [1, 2, 3, 4, 5, 6, 0].filter((d) => estado.horario[d]);
  const h = abiertos.length ? estado.horario[abiertos[0]]! : null;
  const seguidos = abiertos.length > 2 && abiertos.every((d, i) => i === 0 || d === (abiertos[i - 1] + 1) % 7);
  const dias = seguidos ? `De ${nombreDiaSemana(abiertos[0])} a ${nombreDiaSemana(abiertos[abiertos.length - 1])}` : abiertos.map(nombreDiaSemana).join(', ');
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Demo con datos ficticios" />
      <section className="s-hero" style={{ '--portada': `url(${FOTO_PORTADA_CONS})` } as React.CSSProperties}>
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Pedir turno</Link>
          </nav>
          <h1>Tu turno online, sin esperar al teléfono</h1>
          <p>Elegí profesional, tipo de consulta y horario. Te recordamos el turno por WhatsApp con un mensaje discreto.</p>
          <div className="s-acciones">
            <Link href={`/d/${slug}`} className="s-btn uno"><Icono nombre="calendario" size={18} /> Pedir turno</Link>
            <a href={`tel:+${soloDigitos(config.whatsapp)}`} className="s-btn dos"><Icono nombre="telefono" size={18} /> Llamar</a>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Profesionales</h2>
          <div className="sc-profs">
            {estado.profesionales.map((p) => (
              <article key={p.id}>
                <span className="bar-avatar grande" aria-hidden="true">{p.nombre.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
                <h3>{nombreProf(p)}</h3>
                <p>{p.especialidad} · {p.matricula}</p>
                <p className="con-cobs">{p.coberturas?.map((c) => <span key={c}>{c}</span>)}</p>
                {p.teleconsulta && <p className="con-video"><Icono nombre="ojo" size={14} /> También atiende por videollamada</p>}
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Consultas y valores particulares</h2>
          <ul className="sb-servicios">
            {estado.servicios.map((s) => (
              <li key={s.id}>
                <span><strong>{s.nombre}</strong><small>{s.duracion} min · {s.descripcion}</small></span>
                <strong>{formatoPrecio(s.precio, config.moneda)}</strong>
              </li>
            ))}
          </ul>
          <p style={{ color: '#6a6a74', fontSize: 14 }}>Con cobertura, consultá el copago al reservar.</p>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Coberturas</h3><p>{estado.coberturas?.join(', ')}.</p></div>
          <div><h3>Horario</h3><p>{h ? `${dias} de ${hhmm(h[0])} a ${hhmm(h[1])} h${estado.pausa ? ` (cerrado de ${hhmm(estado.pausa[0])} a ${hhmm(estado.pausa[1])})` : ''}.` : 'A confirmar.'}</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del consultorio]'}<br /><a href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta administrativa.`)} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a></p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS · Este sitio no da consejos médicos.</div>
      </footer>
    </div>
  );
}

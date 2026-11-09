'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import { CATEGORIAS_REP, FOTO_PORTADA_REP } from '@/lib/rubros/repuestos/datos-ejemplo';
import { nombreVehiculo } from '@/lib/rubros/repuestos/logica';
import { IconoPieza } from './IconoPieza';
import { useDemoRepuestos, useMiVehiculo } from './useRepuestos';

/** Landing estándar de repuestos (REP-15): el buscador "Mi vehículo" arriba de todo. */
export function SitioRepuestos({ slug }: { slug: string }) {
  const { config, estado, estilo, listo } = useDemoRepuestos(slug);
  const [, setMi] = useMiVehiculo(slug);
  const router = useRouter();
  const [vid, setVid] = useState('');
  const [anio, setAnio] = useState('');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const v = estado.vehiculos.find((x) => x.id === vid);
  const anios = v ? Array.from({ length: v.hasta - v.desde + 1 }, (_, i) => v.hasta - i) : [];
  const destacadas = estado.piezas.filter((p) => p.destacado).slice(0, 4);
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`);

  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Piezas, vehículos y precios de ejemplo" />
      <section className="s-hero" style={{ '--portada': `url(${FOTO_PORTADA_REP})` } as React.CSSProperties}>
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
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Ver catálogo</Link>
          </nav>
          <h1>La pieza justa para tu auto</h1>
          <p>Elegí tu vehículo y mirá solo lo que le sirve. Cotizá por WhatsApp con el auto y los códigos ya escritos.</p>
          <form
            className="s-buscador"
            onSubmit={(e) => { e.preventDefault(); if (v && anio) { setMi({ vehiculoId: v.id, anio: Number(anio) }); router.push(`/d/${slug}`); } }}
          >
            <label>
              <span>Vehículo</span>
              <select value={vid} onChange={(e) => { setVid(e.target.value); setAnio(''); }} required>
                <option value="">Elegí marca y modelo</option>
                {estado.vehiculos.map((x) => <option key={x.id} value={x.id}>{nombreVehiculo(x)}</option>)}
              </select>
            </label>
            <label>
              <span>Año</span>
              <select value={anio} onChange={(e) => setAnio(e.target.value)} disabled={!v} required>
                <option value="">Año</option>
                {anios.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <button type="submit" className="s-btn uno" disabled={!v || !anio}>Ver piezas</button>
          </form>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-in">
          <h2>Lo que más se cotiza</h2>
          <div className="s-grid">
            {destacadas.map((p) => (
              <article key={p.id} className="s-plato s-pieza">
                <div className="img"><IconoPieza categoria={p.categoria} size={64} /></div>
                <div className="t">
                  <code className="cod">{p.codigo}</code>
                  <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 19, display: 'block', marginTop: 6 }}>{p.nombre}</strong>
                  <span style={{ color: '#55555f', fontSize: 14 }}>{p.marca} · {p.origen === 'original' ? 'Original' : 'Alternativo'} · Garantía {p.garantiaMeses} meses</span>
                  <div style={{ fontWeight: 800, marginTop: 8 }}>{formatoPrecio(p.precio, config.moneda)}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Familias</h3><p>{CATEGORIAS_REP.map((c) => c.nombre).join(', ')}.</p></div>
          <div><h3>Talleres</h3><p>Lista de precios para talleres, cotizaciones de varias piezas y pedidos repetidos.</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del local]'}</p><p><a href={wa} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 700 }}><Icono nombre="whatsapp" size={16} /> Escribinos</a></p></div>
        </div>
      </section>

      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}>
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS · La compatibilidad se confirma con el vendedor.</div>
      </footer>
    </div>
  );
}

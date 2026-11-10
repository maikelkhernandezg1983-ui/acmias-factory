'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { DemoNoEncontrada, useDemoCargada } from './useDemoCargada';
import { Icono } from '@/components/Icono';
import { codificarConfig, formatoPrecio } from '@/lib/utiles';
import { ETIQUETAS } from '@/lib/tipos';

export function Barra({ slug, titulo }: { slug: string; titulo: string }) {
  return (
    <div className="impr-barra no-print">
      <Link href={`/d/${slug}/panel`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44 }}><Icono nombre="atras" /> Volver al panel</Link>
      <strong>{titulo}</strong>
      <button type="button" className="btn btn-teal btn-chico" onClick={() => window.print()}><Icono nombre="imprimir" size={16} /> Imprimir o guardar PDF</button>
    </div>
  );
}

export function QrMesas({ slug }: { slug: string }) {
  const { config, estilo, listo } = useDemoCargada(slug);
  const [qrs, setQrs] = useState<string[]>([]);
  const [errorQr, setErrorQr] = useState(false);

  useEffect(() => {
    if (!config) return;
    const base = `${window.location.origin}/d/${config.slug}`;
    const hash = `#c=${codificarConfig(config)}`;
    Promise.all(
      Array.from({ length: config.mesas }, (_, i) => QRCode.toDataURL(`${base}?mesa=${i + 1}${hash}`, { margin: 1, width: 340, errorCorrectionLevel: 'L' })),
    ).then(setQrs, () => setErrorQr(true));
  }, [config]);

  if (!config) return <DemoNoEncontrada listo={listo} />;
  return (
    <div className="impr" style={estilo}>
      <Barra slug={slug} titulo={`QR de ${config.mesas} mesas`} />
      {errorQr && <p role="alert" style={{ padding: 20 }}>No se pudieron generar los códigos QR. Recargá la página para intentar de nuevo.</p>}
      <div className="qr-grid">
        {qrs.map((src, i) => (
          <div key={i} className="qr-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {config.logo && <img src={config.logo} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />}
              <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 18 }}>{config.negocio}</strong>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`QR de la mesa ${i + 1}`} />
            <div style={{ fontFamily: 'var(--fuente-carta)', fontWeight: 800, fontSize: 26, color: 'var(--c-marca-texto)' }}>Mesa {i + 1}</div>
            <div style={{ fontSize: 13, color: '#55555f' }}>Escaneá para ver la carta y pedir</div>
            <Link className="no-imprimir qr-probar" href={`/d/${config.slug}?mesa=${i + 1}`}>Probar como mesa {i + 1}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CartaImprimible({ slug }: { slug: string }) {
  const { config, estado, estilo, listo } = useDemoCargada(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  return (
    <div className="impr" style={estilo}>
      <Barra slug={slug} titulo="Carta impresa" />
      <article className="hoja-carta">
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '6px solid var(--c-marca)', paddingBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {config.logo && <img src={config.logo} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} />}
          <div>
            <h1 style={{ font: '800 40px/1 var(--fuente-carta)', margin: 0, letterSpacing: '-0.02em' }}>{config.negocio}</h1>
            <div style={{ color: '#55555f', marginTop: 6 }}>Abierto de {config.apertura} a {config.cierre}{config.direccion ? ` · ${config.direccion}` : ''}</div>
          </div>
        </header>
        <div style={{ columnCount: 2, columnGap: 36 }}>
          {estado.categorias.map((c) => {
            const platos = estado.platos.filter((pl) => pl.categoria === c.id && !pl.agotado);
            if (!platos.length) return null;
            return (
              <section key={c.id} className="cat">
                <h2>{c.nombre}</h2>
                {platos.map((pl) => (
                  <div key={pl.id} style={{ padding: '6px 0', breakInside: 'avoid' }}>
                    <div className="plato-nom" style={{ fontSize: 15 }}>
                      <span className="nombre">{pl.nombre}</span>
                      <span className="puntos" aria-hidden="true" />
                      <span className="precio">{p(pl.precio)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#55555f' }}>{pl.descripcion}{pl.etiquetas.length > 0 && ` · ${pl.etiquetas.map((t) => ETIQUETAS[t]).join(', ')}`}</div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: '#6a6a74', marginTop: 24 }}>Precios finales. Consultá por alérgenos al personal. Esta carta sale de los mismos datos que la carta digital: cuando cambia un precio, se vuelve a imprimir igual.</p>
      </article>
    </div>
  );
}

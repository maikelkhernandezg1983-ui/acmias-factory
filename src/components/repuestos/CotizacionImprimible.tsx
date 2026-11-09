'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Icono } from '@/components/Icono';
import { DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { formatoPrecio } from '@/lib/utiles';
import { useDemoRepuestos } from './useRepuestos';

const sinSuscripcion = () => () => {};
const leerId = () => new URLSearchParams(window.location.search).get('id') ?? '';

/** Cotización con la marca del local, lista para imprimir o guardar como PDF (REP-08). */
export function CotizacionImprimible({ slug }: { slug: string }) {
  const { config, estado, estilo, listo } = useDemoRepuestos(slug);
  const id = useSyncExternalStore(sinSuscripcion, leerId, () => '');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const c = estado.cotizaciones.find((x) => x.id === id) ?? estado.cotizaciones[0];
  const p = (v: number) => formatoPrecio(v, config.moneda);

  return (
    <div className="impr" style={estilo}>
      <div className="impr-barra no-imprimir">
        <Link href={`/d/${slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44 }}><Icono nombre="atras" /> Volver al catálogo</Link>
        <button type="button" className="d-btn prim" onClick={() => window.print()}><Icono nombre="imprimir" size={18} /> Imprimir o guardar PDF</button>
      </div>
      {!c ? (
        <p style={{ padding: 24 }}>No encontramos esa cotización en este dispositivo.</p>
      ) : (
        <article className="hoja-carta cot-pdf">
          <header style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '6px solid var(--c-marca)', paddingBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {config.logo && <img src={config.logo} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} />}
            <div style={{ flex: 1 }}>
              <h1 style={{ font: '800 34px/1 var(--fuente-carta)', margin: 0 }}>{config.negocio}</h1>
              <div style={{ color: '#55555f', marginTop: 6 }}>Cotización N.º {c.id.toUpperCase()} · {new Date(c.fecha).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </header>
          <dl className="cot-datos">
            <div><dt>Vehículo</dt><dd>{c.vehiculo ?? 'A confirmar'}</dd></div>
            <div><dt>Cliente</dt><dd>{c.taller ?? 'Consumidor final'}</dd></div>
            <div><dt>Contacto del local</dt><dd>WhatsApp +{config.whatsapp}{config.direccion ? ` · ${config.direccion}` : ''}</dd></div>
          </dl>
          <table className="d-tabla cot-tabla">
            <thead><tr><th>Código</th><th>Pieza</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
            <tbody>
              {c.items.map((i) => (
                <tr key={i.piezaId}><td><code className="cod">{i.codigo}</code></td><td>{i.nombre}</td><td>{i.cantidad}</td><td>{p(i.precio)}</td><td>{p(i.precio * i.cantidad)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4}>Total estimado{c.taller ? ' (precio taller)' : ''}</td><td>{p(c.total)}</td></tr></tfoot>
          </table>
          <p style={{ fontSize: 13, color: '#55555f', marginTop: 24, lineHeight: 1.5 }}>
            Precios de referencia sujetos a confirmación de stock y compatibilidad. Esta cotización no es un comprobante fiscal. Demo ilustrativa hecha con ACMIAS.
          </p>
        </article>
      )}
    </div>
  );
}

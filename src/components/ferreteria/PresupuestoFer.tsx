'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { formatoPrecio } from '@/lib/utiles';
import { NOMBRE_TIPO, totalPresupuesto, venceEl } from '@/lib/rubros/ferreteria/logica';
import { useDemoFerreteria } from './useFerreteria';

/** Presupuesto con la marca del local, listo para imprimir o guardar como PDF (FER-07). */
export function PresupuestoFer({ slug, id }: { slug: string; id: string }) {
  const { config, estado, lista, estilo, listo } = useDemoFerreteria(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const pr = estado.presupuestos.find((x) => x.id === id);
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const cliente = pr && estado.clientes.find((c) => c.id === pr.clienteId);
  const fecha = (d: Date | string) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="impr" style={estilo}>
      <div className="impr-barra no-imprimir">
        <Link href={`/d/${slug}/panel`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44 }}><Icono nombre="atras" /> Volver</Link>
        <button type="button" className="d-btn prim" onClick={() => window.print()}><Icono nombre="imprimir" size={18} /> Imprimir o guardar PDF</button>
      </div>
      {!pr ? (
        <p style={{ padding: 24 }}>No encontramos ese presupuesto en este dispositivo.</p>
      ) : (
        <article className="hoja-carta cot-pdf">
          <header style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '6px solid var(--c-marca)', paddingBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {config.logo && <img src={config.logo} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} />}
            <div style={{ flex: 1 }}>
              <h1 style={{ font: '800 34px/1 var(--fuente-carta)', margin: 0 }}>{config.negocio}</h1>
              <div style={{ color: '#55555f', marginTop: 6 }}>Presupuesto N.º {pr.numero} · {fecha(pr.fecha)}</div>
            </div>
            {pr.estado === 'vendido' && <span className="bar-estado est-atendido">Vendido</span>}
          </header>
          <dl className="cot-datos">
            <div><dt>Cliente</dt><dd>{cliente ? `${cliente.nombre} · ${cliente.oficio}` : 'Cliente de paso'}</dd></div>
            <div><dt>Lista de precios</dt><dd>{NOMBRE_TIPO[pr.tipo]}{estado.descuentos[pr.tipo] ? ` (−${estado.descuentos[pr.tipo]} %)` : ''}</dd></div>
            <div><dt>Válido hasta</dt><dd>{fecha(venceEl(pr))}</dd></div>
            <div><dt>Contacto</dt><dd>WhatsApp +{config.whatsapp}{config.direccion ? ` · ${config.direccion}` : ''}</dd></div>
          </dl>
          <table className="d-tabla cot-tabla">
            <thead><tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Unidad</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
            <tbody>
              {pr.lineas.map((l, i) => {
                const prod = lista.find((x) => x.id === l.productoId);
                const u = prod?.unidades.find((x) => x.id === l.unidadId);
                return (
                  <tr key={i}>
                    <td><code className="cod">{prod?.codigo}</code></td>
                    <td>{prod?.nombre}{prod && prod.linea !== 'Estándar' ? ` · ${prod.linea}` : ''}{l.original ? <><br /><small style={{ color: '#6a6a74' }}>Pedido como: &quot;{l.original}&quot;</small></> : null}</td>
                    <td>{l.cantidad}</td>
                    <td>{u?.etiqueta}</td>
                    <td>{p(l.precio)}</td>
                    <td>{p(l.precio * l.cantidad)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={5}>Total</td><td>{p(totalPresupuesto(pr))}</td></tr></tfoot>
          </table>
          <p style={{ fontSize: 13, color: '#55555f', marginTop: 24, lineHeight: 1.5 }}>
            Sujeto a disponibilidad. Precios válidos hasta el {fecha(venceEl(pr))}. Este presupuesto no es un comprobante fiscal. Demo ilustrativa hecha con ACMIAS.
          </p>
        </article>
      )}
    </div>
  );
}

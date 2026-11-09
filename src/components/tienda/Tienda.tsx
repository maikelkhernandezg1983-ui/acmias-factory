'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { volarAlCarrito } from '@/components/efectos';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio, idCorto } from '@/lib/utiles';
import { FOTO_PORTADA_TIENDA } from '@/lib/rubros/tienda/datos-ejemplo';
import { buscarProductos, detalleVariante, mensajePedido, stockTotal, tieneVariantes } from '@/lib/rubros/tienda/logica';
import type { LineaPedido, PedidoTienda, Producto, Variante } from '@/lib/rubros/tienda/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { FotoProducto } from './FotoProducto';
import { useDemoTienda } from './useTienda';

export function Tienda({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoTienda(slug);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState<Producto | null>(null);
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [toast, setToast] = useState<{ id: number; texto: string } | null>(null);
  const [rebote, setRebote] = useState(0);
  const barraRef = useRef<HTMLButtonElement>(null);
  const avisos = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const lista = useMemo(() => {
    if (!estado) return [];
    const base = q.trim() ? buscarProductos(estado.productos, q) : estado.productos;
    return base.filter((p) => !categoria || p.categoria === categoria);
  }, [estado, q, categoria]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const almacen = estado.variante === 'almacen';
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const cantidad = lineas.reduce((s, l) => s + l.cantidad, 0);
  const subtotal = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const enCarrito = (vid: string) => lineas.find((l) => l.varianteId === vid)?.cantidad ?? 0;

  function agregar(pr: Producto, v: Variante, n: number, origen?: HTMLElement | null) {
    if (enCarrito(v.id) + n > v.stock) {
      setToast({ id: ++avisos.current, texto: `Solo quedan ${v.stock} de ${pr.nombre}${tieneVariantes(pr) ? ` (${detalleVariante(v)})` : ''}` });
      return;
    }
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.varianteId === v.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + n } : l));
      return [...ls, { productoId: pr.id, varianteId: v.id, nombre: pr.nombre, detalle: detalleVariante(v), precio: pr.precio, cantidad: n }];
    });
    setAbierto(null);
    setToast({ id: ++avisos.current, texto: `Agregaste ${pr.nombre}` });
    volarAlCarrito(origen ?? null, () => barraRef.current, () => setRebote((r) => r + 1));
    if ('vibrate' in navigator) navigator.vibrate?.(12);
  }

  return (
    <div className={`tie${almacen ? ' es-almacen' : ''}`} style={estilo}>
      <AvisoDemo texto="Productos, stock y precios de ejemplo" />
      <header className="tie-cab">
        <div className="tie-cab-in">
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" className="tie-logo" />
          ) : (
            <span className="tie-logo tie-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          )}
          <div className="tie-id">
            <h1>{config.negocio}</h1>
            <span>{almacen ? 'Pedí por WhatsApp y retirá o te lo llevamos' : 'Mirá talles y colores con stock real'}</span>
          </div>
        </div>
        {!almacen && (
          <div className="tie-vidriera" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FOTO_PORTADA_TIENDA} alt="" onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} />
          </div>
        )}
      </header>

      <div className="tie-barra-filtros">
        <div className="tie-buscar" role="search">
          <Icono nombre="buscar" size={18} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={almacen ? 'Buscar: yerba, leche…' : 'Buscar: remera, taza…'} aria-label="Buscar productos" />
        </div>
        <nav className="tie-cats" aria-label="Categorías">
          <button type="button" aria-pressed={!categoria} onClick={() => setCategoria(null)}>Todo</button>
          {estado.categorias.map((c) => (
            <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria((x) => (x === c ? null : c))}>{c}</button>
          ))}
        </nav>
      </div>

      <main className="tie-main">
        {lista.length === 0 && <p className="tie-vacio">No encontramos ese producto. Escribinos y te decimos si lo conseguimos.</p>}
        <div className="tie-grilla">
          {lista.map((pr, i) => {
            const total = stockTotal(pr);
            const unico = !tieneVariantes(pr) ? pr.variantes[0] : null;
            const colores = [...new Map(pr.variantes.filter((v) => v.colorHex).map((v) => [v.color, v.colorHex])).entries()];
            return (
              <article key={pr.id} className={`prod${total === 0 ? ' agotado' : ''}`} style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                <button type="button" className="prod-abrir" onClick={() => setAbierto(pr)} aria-label={`${pr.nombre}, ${p(pr.precio)}${total === 0 ? ', sin stock' : ''}`}>
                  <FotoProducto producto={pr} className="prod-foto" prioridad={i < 4} />
                  <span className="prod-txt">
                    <span className="prod-nom">{pr.nombre}</span>
                    <span className="prod-precio">{p(pr.precio)}</span>
                    {colores.length > 1 && (
                      <span className="prod-colores" aria-label={`Colores: ${colores.map((c) => c[0]).join(', ')}`}>
                        {colores.map(([n, h]) => <span key={n} style={{ background: h }} />)}
                      </span>
                    )}
                    <span className={`prod-stock${total === 0 ? ' sin' : total <= 3 ? ' pocas' : ''}`}>{total === 0 ? 'Sin stock' : total <= 3 ? `Últimas ${total}` : 'Hay stock'}</span>
                  </span>
                </button>
                {unico && unico.stock > 0 && (
                  <button type="button" className="prod-mas" aria-label={`Agregar ${pr.nombre} al pedido`} onClick={(e) => agregar(pr, unico, 1, e.currentTarget.parentElement?.querySelector<HTMLElement>('.prod-foto'))}>
                    <Icono nombre="mas" size={20} />
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <p className="c-pie">Precios finales. El stock se actualiza con cada venta del local. {config.direccion}<br />Hecho con ACMIAS.</p>
      </main>

      {cantidad > 0 && (
        <div className="barra-carrito">
          <button type="button" ref={barraRef} onClick={() => setVerCarrito(true)} key={`b-${rebote}`} data-rebote={rebote > 0 ? '1' : undefined}>
            <span className="barra-izq">
              <span className="barra-icono"><Icono nombre="carrito" /><span className="barra-n" key={cantidad}>{cantidad}</span></span>
              Ver pedido · {cantidad}
            </span>
            <span>{p(subtotal)}</span>
          </button>
        </div>
      )}

      {abierto && <HojaProducto producto={abierto} moneda={config.moneda} enCarrito={enCarrito} onCerrar={() => setAbierto(null)} onAgregar={agregar} />}
      {verCarrito && (
        <HojaPedido
          lineas={lineas}
          setLineas={setLineas}
          config={config}
          envio={estado.costoEnvio}
          stockDe={(vid) => estado.productos.flatMap((x) => x.variantes).find((v) => v.id === vid)?.stock ?? 0}
          onCerrar={() => setVerCarrito(false)}
          onEnviado={(pe) => {
            const err = actualizar((e) => ({ ...e, pedidos: [pe, ...e.pedidos] }));
            setLineas([]);
            setVerCarrito(false);
            setToast({ id: ++avisos.current, texto: err ? 'Pedido enviado. No se pudo guardar en el historial.' : 'Pedido enviado por WhatsApp' });
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span className="toast-check" aria-hidden="true"><Icono nombre="check" size={16} /></span>
          {toast.texto}
        </div>
      )}
    </div>
  );
}

function HojaProducto({ producto, moneda, enCarrito, onCerrar, onAgregar }: {
  producto: Producto;
  moneda: string;
  enCarrito: (vid: string) => number;
  onCerrar: () => void;
  onAgregar: (p: Producto, v: Variante, n: number, origen?: HTMLElement | null) => void;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const fotoRef = useRef<HTMLDivElement>(null);
  const colores = [...new Map(producto.variantes.filter((v) => v.color).map((v) => [v.color!, v.colorHex])).entries()];
  const talles = [...new Set(producto.variantes.map((v) => v.talle).filter(Boolean))] as string[];
  const primera = producto.variantes.find((v) => v.stock > 0) ?? producto.variantes[0];
  const [color, setColor] = useState(primera.color);
  const [talle, setTalle] = useState(primera.talle);
  const [n, setN] = useState(1);
  const variante = producto.variantes.find((v) => v.color === color && v.talle === talle);
  const disponible = variante ? variante.stock - enCarrito(variante.id) : 0;
  const stockDe = (c?: string, t?: string) => producto.variantes.find((v) => v.color === c && v.talle === t)?.stock ?? 0;

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja tie-hoja" role="dialog" aria-modal="true" aria-labelledby="t-prod" ref={ref}>
        <div ref={fotoRef}><FotoProducto producto={producto} className="hoja-foto" prioridad /></div>
        <div className="hoja-cab">
          <div>
            <h2 id="t-prod">{producto.nombre}</h2>
            <div className="tie-hoja-precio">{formatoPrecio(producto.precio, moneda)}</div>
          </div>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        {producto.descripcion && <p className="ficha-detalle" style={{ marginTop: 0 }}>{producto.descripcion}</p>}

        {colores.length > 0 && (
          <fieldset className="tie-opc">
            <legend>Color: <strong>{color}</strong></legend>
            <div className="swatches">
              {colores.map(([c, hex]) => {
                const hay = talles.length ? talles.some((t) => stockDe(c, t) > 0) : stockDe(c, undefined) > 0;
                return (
                  <button key={c} type="button" className="swatch" aria-pressed={color === c} aria-label={`${c}${hay ? '' : ', sin stock'}`} onClick={() => { setColor(c); setN(1); }} style={{ '--sw': hex } as React.CSSProperties} data-sin={hay ? undefined : '1'} />
                );
              })}
            </div>
          </fieldset>
        )}
        {talles.length > 0 && (
          <fieldset className="tie-opc">
            <legend>Talle</legend>
            <div className="talles">
              {talles.map((t) => {
                const s = stockDe(color, t);
                return (
                  <button key={t} type="button" className="talle" aria-pressed={talle === t} disabled={s === 0} aria-label={`Talle ${t}${s === 0 ? ', sin stock' : ''}`} onClick={() => { setTalle(t); setN(1); }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        {variante && (
          <p className={`tie-quedan${variante.stock === 0 ? ' sin' : variante.stock <= variante.minimo ? ' pocas' : ''}`} role="status">
            {variante.stock === 0 ? 'Sin stock en esta combinación' : variante.stock <= variante.minimo ? `¡Quedan ${variante.stock}!` : `Hay ${variante.stock} disponibles`}
          </p>
        )}
        <div className="hoja-pie">
          <div className="cant" role="group" aria-label="Cantidad">
            <button type="button" onClick={() => setN((x) => Math.max(1, x - 1))} aria-label="Restar uno"><Icono nombre="menos" /></button>
            <span aria-live="polite">{n}</span>
            <button type="button" onClick={() => setN((x) => Math.min(Math.max(1, disponible), x + 1))} aria-label="Sumar uno"><Icono nombre="mas" /></button>
          </div>
          <button type="button" className="c-cta" disabled={!variante || disponible < n} onClick={() => variante && onAgregar(producto, variante, n, fotoRef.current?.firstElementChild as HTMLElement | null)}>
            {disponible <= 0 && variante?.stock ? 'Ya está todo en tu pedido' : `Agregar · ${formatoPrecio(producto.precio * n, moneda)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function HojaPedido({ lineas, setLineas, config, envio, stockDe, onCerrar, onEnviado }: {
  lineas: LineaPedido[];
  setLineas: React.Dispatch<React.SetStateAction<LineaPedido[]>>;
  config: DemoConfig;
  envio: number;
  stockDe: (vid: string) => number;
  onCerrar: () => void;
  onEnviado: (p: PedidoTienda) => void;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [entrega, setEntrega] = useState<'retiro' | 'envio'>('retiro');
  const [direccion, setDireccion] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const sub = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const total = sub + (entrega === 'envio' ? envio : 0);

  function cambiar(vid: string, d: number) {
    setLineas((ls) => ls.map((l) => (l.varianteId === vid ? { ...l, cantidad: Math.min(stockDe(vid), l.cantidad + d) } : l)).filter((l) => l.cantidad > 0));
  }

  function enviar() {
    if (entrega === 'envio' && direccion.trim().length < 5) return setError('Escribí la dirección de entrega.');
    const texto = mensajePedido(config, lineas, entrega, envio, direccion.trim(), nombre.trim());
    window.open(enlaceWhatsApp(config.whatsapp, texto), '_blank', 'noopener');
    onEnviado({ id: idCorto(), fecha: new Date().toISOString(), items: lineas, total, entrega, direccion: direccion.trim() || undefined, nombre: nombre.trim() || undefined, estado: 'pendiente' });
  }

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja tie-hoja" role="dialog" aria-modal="true" aria-labelledby="t-ped" ref={ref}>
        <div className="hoja-cab">
          <h2 id="t-ped">Tu pedido</h2>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        <ul className="cot-lineas">
          {lineas.map((l) => (
            <li key={l.varianteId}>
              <div>
                <strong>{l.nombre}</strong>
                <span>{l.detalle} · {p(l.precio)}</span>
              </div>
              <div className="cant chica" role="group" aria-label={`Cantidad de ${l.nombre}`}>
                <button type="button" onClick={() => cambiar(l.varianteId, -1)} aria-label="Restar uno"><Icono nombre="menos" size={16} /></button>
                <span>{l.cantidad}</span>
                <button type="button" onClick={() => cambiar(l.varianteId, 1)} aria-label="Sumar uno"><Icono nombre="mas" size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
        <div className="segmento" role="group" aria-label="Entrega" style={{ marginTop: 16, gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" aria-pressed={entrega === 'retiro'} onClick={() => setEntrega('retiro')}>Retiro en el local</button>
          <button type="button" aria-pressed={entrega === 'envio'} onClick={() => setEntrega('envio')}>Envío · {p(envio)}</button>
        </div>
        {entrega === 'envio' && (
          <>
            <label className="c-lbl" htmlFor="tie-dir">Dirección de entrega</label>
            <input id="tie-dir" className="c-inp" value={direccion} onChange={(e) => { setDireccion(e.target.value); setError(''); }} autoComplete="street-address" />
          </>
        )}
        <label className="c-lbl" htmlFor="tie-nom">Tu nombre <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="tie-nom" className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
        {error && <p className="err" role="alert" style={{ color: '#b42318', fontSize: 14, margin: '8px 0 0' }}>{error}</p>}
        <div className="total"><span>Total</span><span>{p(total)}</span></div>
        <button type="button" className="c-cta" onClick={enviar} disabled={!lineas.length}><Icono nombre="whatsapp" /> Enviar pedido por WhatsApp</button>
        <p className="c-nota">El local confirma por WhatsApp y te reserva los productos.</p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { formatoPrecio } from '@/lib/utiles';
import { buscarProductos, descontar, detalleVariante, porCodigo, tieneVariantes } from '@/lib/rubros/tienda/logica';
import type { MedioPago, Producto, Variante } from '@/lib/rubros/tienda/tipos';
import { FotoProducto } from './FotoProducto';
import { useDemoTienda } from './useTienda';

type Linea = { producto: Producto; variante: Variante; cantidad: number };
const MEDIOS: { id: MedioPago; nombre: string }[] = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
];

/** Venta de mostrador (TIE-04): buscar o escanear, tocar y cobrar. El stock baja en el acto. */
export function Mostrador({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoTienda(slug);
  const [q, setQ] = useState('');
  const [elegido, setElegido] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Linea[]>([]);
  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [escaner, setEscaner] = useState(false);
  const [aviso, setAviso] = useState<{ id: number; texto: string; tipo: 'ok' | 'alerta' } | null>(null);
  const n = useRef(0);
  const buscador = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const resultados = useMemo(() => (estado ? buscarProductos(estado.productos, q).slice(0, 30) : []), [estado, q]);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const total = ticket.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);
  const enTicket = (vid: string) => ticket.find((l) => l.variante.id === vid)?.cantidad ?? 0;

  function sumar(pr: Producto, v: Variante) {
    if (enTicket(v.id) + 1 > v.stock) {
      setAviso({ id: ++n.current, texto: `No hay más stock de ${pr.nombre} (${detalleVariante(v)}).`, tipo: 'alerta' });
      return;
    }
    setTicket((t) => {
      const i = t.findIndex((l) => l.variante.id === v.id);
      if (i >= 0) return t.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [...t, { producto: pr, variante: v, cantidad: 1 }];
    });
    setElegido(null);
    if ('vibrate' in navigator) navigator.vibrate?.(10);
  }

  function porCodigoLeido(codigo: string) {
    const r = porCodigo(estado!.productos, codigo);
    if (!r) {
      setAviso({ id: ++n.current, texto: `No encontramos el código ${codigo}.`, tipo: 'alerta' });
      return false;
    }
    sumar(r.producto, r.variante);
    setAviso({ id: ++n.current, texto: `${r.producto.nombre} (${detalleVariante(r.variante)}) al ticket`, tipo: 'ok' });
    return true;
  }

  function cobrar() {
    const items = ticket.map((l) => ({ productoId: l.producto.id, varianteId: l.variante.id, cantidad: l.cantidad, precio: l.producto.precio }));
    let resultado: string | null = null;
    const err = actualizar((e) => {
      const r = descontar(e, items, 'mostrador', medio);
      if (typeof r === 'string') {
        resultado = r;
        return e;
      }
      return r;
    });
    if (resultado || err) return setAviso({ id: ++n.current, texto: resultado ?? err!, tipo: 'alerta' });
    const bajos = ticket.filter((l) => l.variante.stock - l.cantidad <= l.variante.minimo);
    setTicket([]);
    setQ('');
    setAviso({
      id: ++n.current,
      tipo: bajos.length ? 'alerta' : 'ok',
      texto: bajos.length
        ? `Venta cobrada. Atención: ${bajos.map((l) => `${l.producto.nombre} ${detalleVariante(l.variante)} quedó en ${l.variante.stock - l.cantidad}`).join('; ')}.`
        : `Venta cobrada en ${MEDIOS.find((m) => m.id === medio)!.nombre.toLowerCase()} · stock actualizado`,
    });
    buscador.current?.focus();
  }

  return (
    <div className="most" style={estilo}>
      <AvisoDemo texto="Productos, stock y precios de ejemplo" />
      <header className="most-cab">
        <div>
          <strong>{config.negocio}</strong>
          <span>Mostrador</span>
        </div>
        <nav>
          <Link className="d-btn" href={`/d/${slug}/panel`}><Icono nombre="grafico" size={18} /> Panel</Link>
        </nav>
      </header>
      <div className="most-cuerpo">
        <section className="most-buscar" aria-label="Productos">
          <div className="most-fila">
            <div className="tie-buscar grande">
              <Icono nombre="buscar" size={20} />
              <input
                ref={buscador}
                type="search"
                value={q}
                autoFocus
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  // Los lectores USB escriben el código y mandan Enter.
                  if (e.key === 'Enter' && /^\d{6,14}$/.test(q.trim()) && porCodigoLeido(q.trim())) setQ('');
                }}
                placeholder="Producto o código de barras"
                aria-label="Buscar producto o escribir código de barras"
              />
            </div>
            <button type="button" className="most-escanear" onClick={() => setEscaner(true)}>
              <Icono nombre="qr" size={20} /> Escanear
            </button>
          </div>
          <ul className="most-res">
            {resultados.map((pr) => {
              const abierto = elegido === pr.id;
              return (
                <li key={pr.id}>
                  <button
                    type="button"
                    className="most-prod"
                    onClick={() => (tieneVariantes(pr) ? setElegido(abierto ? null : pr.id) : sumar(pr, pr.variantes[0]))}
                    aria-expanded={tieneVariantes(pr) ? abierto : undefined}
                    disabled={!tieneVariantes(pr) && pr.variantes[0].stock === 0}
                  >
                    <FotoProducto producto={pr} className="most-mini" />
                    <span className="most-prod-txt"><strong>{pr.nombre}</strong><span>{tieneVariantes(pr) ? `${pr.variantes.length} variantes` : `Stock ${pr.variantes[0].stock}`}</span></span>
                    <span className="most-prod-precio">{p(pr.precio)}</span>
                  </button>
                  {abierto && (
                    <div className="most-variantes" role="group" aria-label={`Variantes de ${pr.nombre}`}>
                      {pr.variantes.map((v) => (
                        <button key={v.id} type="button" disabled={v.stock === 0} onClick={() => sumar(pr, v)}>
                          {v.colorHex && <span className="most-sw" style={{ background: v.colorHex }} aria-hidden="true" />}
                          {detalleVariante(v)} <small>({v.stock})</small>
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="most-ticket" aria-label="Ticket">
          <h2>Ticket</h2>
          {ticket.length === 0 ? (
            <p className="most-vacio">Buscá o escaneá un producto para empezar.</p>
          ) : (
            <ul className="cot-lineas">
              {ticket.map((l) => (
                <li key={l.variante.id}>
                  <div><strong>{l.producto.nombre}</strong><span>{detalleVariante(l.variante)} · {p(l.producto.precio)}</span></div>
                  <div className="cant chica" role="group" aria-label={`Cantidad de ${l.producto.nombre}`}>
                    <button type="button" onClick={() => setTicket((t) => t.map((x) => (x.variante.id === l.variante.id ? { ...x, cantidad: x.cantidad - 1 } : x)).filter((x) => x.cantidad > 0))} aria-label="Restar uno"><Icono nombre="menos" size={16} /></button>
                    <span>{l.cantidad}</span>
                    <button type="button" onClick={() => sumar(l.producto, l.variante)} aria-label="Sumar uno"><Icono nombre="mas" size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="segmento" role="group" aria-label="Medio de pago" style={{ marginTop: 14 }}>
            {MEDIOS.map((m) => <button key={m.id} type="button" aria-pressed={medio === m.id} onClick={() => setMedio(m.id)}>{m.nombre}</button>)}
          </div>
          <div className="total"><span>Total</span><span>{p(total)}</span></div>
          <button type="button" className="c-cta" onClick={cobrar} disabled={!ticket.length}>Cobrar {ticket.length ? p(total) : ''}</button>
          <p className="c-nota">No es un comprobante fiscal: la factura electrónica se integra con un proveedor habilitado.</p>
        </aside>
      </div>
      {escaner && <Escaner onCerrar={() => setEscaner(false)} onCodigo={(c) => { if (porCodigoLeido(c)) setEscaner(false); }} />}
      {aviso && (
        <div className={`toast${aviso.tipo === 'alerta' ? ' alerta' : ''}`} role="status" key={aviso.id}>
          <span className="toast-check" aria-hidden="true"><Icono nombre={aviso.tipo === 'alerta' ? 'info' : 'check'} size={16} /></span>
          {aviso.texto}
        </div>
      )}
    </div>
  );
}

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

function Escaner({ onCerrar, onCodigo }: { onCerrar: () => void; onCodigo: (c: string) => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const video = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<'iniciando' | 'leyendo' | 'sin-soporte' | 'sin-permiso'>('iniciando');
  const [manual, setManual] = useState('');
  const cb = useRef(onCodigo);
  useEffect(() => {
    cb.current = onCodigo;
  }, [onCodigo]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let activo = true;
    let timer: ReturnType<typeof setTimeout>;
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    (async () => {
      if (!Ctor || !navigator.mediaDevices?.getUserMedia) return setEstado('sin-soporte');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch {
        return activo && setEstado('sin-permiso');
      }
      if (!activo || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      setEstado('leyendo');
      const det = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'] });
      const leer = async () => {
        if (!activo || !video.current) return;
        try {
          const r = await det.detect(video.current);
          if (r[0]?.rawValue) cb.current(r[0].rawValue);
        } catch {
          /* cuadro sin código */
        }
        timer = setTimeout(leer, 300);
      };
      leer();
    })();
    return () => {
      activo = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-esc" ref={ref}>
        <div className="hoja-cab">
          <h2 id="t-esc">Escanear código</h2>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        <div className="esc-video">
          <video ref={video} muted playsInline />
          {estado === 'leyendo' && <span className="esc-linea" aria-hidden="true" />}
          {estado !== 'leyendo' && (
            <p>
              {estado === 'iniciando' && 'Abriendo la cámara…'}
              {estado === 'sin-soporte' && 'Este navegador no lee códigos con la cámara. Escribí el número que está debajo de las barras.'}
              {estado === 'sin-permiso' && 'No hay permiso para usar la cámara. Activalo en el navegador o escribí el número.'}
            </p>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onCodigo(manual.trim()); }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <label className="sr-only" htmlFor="esc-manual">Código de barras</label>
          <input id="esc-manual" className="c-inp" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ej. 7791000010003" />
          <button type="submit" className="d-btn prim">Agregar</button>
        </form>
      </div>
    </div>
  );
}

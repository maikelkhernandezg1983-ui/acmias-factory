'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AvisoDemo, DemoNoEncontrada, useDemoCargada } from './useDemoCargada';
import { Ilustracion } from '@/components/Ilustracion';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { ETIQUETAS, type ItemPedido, type ModoServicio, type Plato } from '@/lib/tipos';
import { enlaceWhatsApp, estaAbierto, formatoPrecio, idCorto, mensajePedido } from '@/lib/utiles';

type Linea = ItemPedido & { clave: string };

const sinSuscripcion = () => () => {};
function leerMesa() {
  const m = Number(new URLSearchParams(window.location.search).get('mesa'));
  return Number.isInteger(m) && m > 0 ? m : undefined;
}

export function Carta({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoCargada(slug);
  const [grande, setGrande] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('acmias:letra-grande') === '1');
  const mesaUrl = useSyncExternalStore(sinSuscripcion, leerMesa, () => undefined);
  const [activo, setActivo] = useState<string>('');
  const [platoAbierto, setPlatoAbierto] = useState<Plato | null>(null);
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [toast, setToast] = useState('');
  const [ahora, setAhora] = useState<Date>(() => new Date());
  const vistasRegistradas = useRef(new Set<string>());

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Categoría visible al hacer scroll
  useEffect(() => {
    if (!estado) return;
    const secciones = estado.categorias.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entradas) => {
        const vis = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActivo(vis[0].target.id.replace('cat-', ''));
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    secciones.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [estado]);

  const destacados = useMemo(() => estado?.platos.filter((p) => p.destacado && !p.agotado) ?? [], [estado]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;

  const abierto = estaAbierto(config.apertura, config.cierre, ahora);
  const mesa = mesaUrl && mesaUrl <= config.mesas ? mesaUrl : undefined;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const cantidadTotal = carrito.reduce((s, l) => s + l.cantidad, 0);
  const subtotal = carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);

  function abrirPlato(plato: Plato) {
    setPlatoAbierto(plato);
    if (!vistasRegistradas.current.has(plato.id)) {
      vistasRegistradas.current.add(plato.id);
      actualizar((e) => ({ ...e, vistas: { ...e.vistas, [plato.id]: (e.vistas[plato.id] ?? 0) + 1 } })); // si no hay espacio, la vista simplemente no se cuenta
    }
  }

  function agregar(plato: Plato, cantidad: number, nota: string) {
    setCarrito((c) => {
      const i = c.findIndex((l) => l.platoId === plato.id && l.nota === nota);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + cantidad } : l));
      return [...c, { clave: idCorto(), platoId: plato.id, nombre: plato.nombre, precio: plato.precio, cantidad, nota }];
    });
    setPlatoAbierto(null);
    setToast(`Agregaste ${cantidad} × ${plato.nombre}`);
  }

  function toggleLetra() {
    setGrande((g) => {
      window.localStorage.setItem('acmias:letra-grande', g ? '0' : '1');
      return !g;
    });
  }

  return (
    <div className={`carta${grande ? ' grande' : ''}`} style={estilo}>
      <AvisoDemo />
      <header className="c-head">
        <div className="c-head-in">
          <div className="c-id">
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt="" className="c-logo" />
            ) : (
              <span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
            )}
            <div>
              <h1 className="c-nombre">{config.negocio}</h1>
              <span className="c-estado">
                <span className="punto" aria-hidden="true" />
                {abierto ? `Abierto · cierra ${config.cierre}` : `Cerrado · abre ${config.apertura}`}
              </span>
            </div>
          </div>
          <div className="c-herr">
            <span className="c-modo">{mesa ? `Mesa ${mesa}` : 'Carta digital'}</span>
            <button type="button" className="c-btn-texto" onClick={toggleLetra} aria-pressed={grande}>
              <Icono nombre="texto" size={18} /> {grande ? 'Letra normal' : 'Letra grande'}
            </button>
          </div>
        </div>
        <nav className="c-tabs" aria-label="Categorías">
          <div className="c-tabs-in">
            {estado.categorias.map((c) => (
              <a key={c.id} href={`#cat-${c.id}`} className="c-tab" aria-current={activo === c.id}>
                {c.nombre}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <main className="c-main">
        {!abierto && (
          <p role="status" style={{ background: '#fff4e5', padding: '12px 14px', borderRadius: 12, marginTop: 16, fontSize: '0.9em' }}>
            Ahora estamos cerrados. Podés mirar la carta y pedir desde las {config.apertura}.
          </p>
        )}

        {destacados.length > 0 && (
          <section aria-labelledby="t-dest" style={{ paddingTop: 10 }}>
            <h2 id="t-dest" className="sr-only">Recomendados de hoy</h2>
            <div className="c-dest">
              {destacados.map((d) => (
                <button key={d.id} type="button" className="c-dest-card" onClick={() => abrirPlato(d)}>
                  <div className="c-dest-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {d.foto ? <img src={d.foto} alt="" /> : <Ilustracion tipo={d.ilustracion} />}
                  </div>
                  <div className="c-dest-txt">
                    <strong>{d.nombre}</strong>
                    <span style={{ fontWeight: 700 }}>{p(d.precio)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {estado.categorias.map((c) => {
          const platos = estado.platos.filter((pl) => pl.categoria === c.id);
          if (!platos.length) return null;
          return (
            <section key={c.id} id={`cat-${c.id}`} className="c-sec" aria-labelledby={`t-${c.id}`}>
              <h2 id={`t-${c.id}`}>{c.nombre}</h2>
              {platos.map((pl) => (
                <button key={pl.id} type="button" className={`plato${pl.agotado ? ' agotado' : ''}`} onClick={() => abrirPlato(pl)} disabled={pl.agotado} aria-label={`${pl.nombre}, ${p(pl.precio)}${pl.agotado ? ', agotado' : ''}`}>
                  <div>
                    <div className="plato-nom">
                      <span className="nombre">{pl.nombre}</span>
                      <span className="puntos" aria-hidden="true" />
                      <span className="precio">{p(pl.precio)}</span>
                    </div>
                    <p className="plato-desc">{pl.descripcion}</p>
                    <div className="tags">
                      {pl.agotado && <span className="tag agot">Agotado hoy</span>}
                      {pl.etiquetas.map((t) => <span key={t} className="tag">{ETIQUETAS[t]}</span>)}
                    </div>
                  </div>
                  <div className="plato-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {pl.foto ? <img src={pl.foto} alt="" /> : <Ilustracion tipo={pl.ilustracion} />}
                  </div>
                </button>
              ))}
            </section>
          );
        })}

        <p className="c-pie">
          Precios finales con impuestos incluidos. Consultá por alérgenos al personal: la información de alérgenos la informa el local.
          {config.direccion && <><br />{config.direccion}</>}
          <br />Hecho con ACMIAS.
        </p>
      </main>

      {cantidadTotal > 0 && (
        <div className="barra-carrito">
          <button type="button" onClick={() => setVerCarrito(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Icono nombre="carrito" /> Ver pedido · {cantidadTotal}</span>
            <span>{p(subtotal)}</span>
          </button>
        </div>
      )}

      {platoAbierto && <HojaPlato plato={platoAbierto} moneda={config.moneda} onCerrar={() => setPlatoAbierto(null)} onAgregar={agregar} abierto={abierto} />}
      {verCarrito && (
        <HojaCarrito
          lineas={carrito}
          setLineas={setCarrito}
          mesaInicial={mesa}
          onCerrar={() => setVerCarrito(false)}
          onEnviado={(pedido) => {
            const err = actualizar((e) => ({ ...e, pedidos: [pedido, ...e.pedidos] }));
            setCarrito([]);
            setVerCarrito(false);
            setToast(err ? 'Pedido enviado. No se pudo guardar en el historial de este dispositivo.' : 'Pedido enviado por WhatsApp');
          }}
          config={config}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function HojaPlato({ plato, moneda, onCerrar, onAgregar, abierto }: { plato: Plato; moneda: string; onCerrar: () => void; onAgregar: (p: Plato, c: number, n: string) => void; abierto: boolean }) {
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-plato" ref={ref}>
        <div className="plato-img" style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {plato.foto ? <img src={plato.foto} alt="" /> : <Ilustracion tipo={plato.ilustracion} />}
        </div>
        <div className="hoja-cab">
          <div>
            <h3 id="t-plato">{plato.nombre}</h3>
            <p style={{ margin: '6px 0 0', color: '#55555f', lineHeight: 1.45 }}>{plato.descripcion}</p>
          </div>
          <button className="x" onClick={onCerrar} aria-label="Cerrar" autoFocus><Icono nombre="cerrar" /></button>
        </div>
        <div className="tags">{plato.etiquetas.map((t) => <span key={t} className="tag">{ETIQUETAS[t]}</span>)}</div>
        {plato.alergenos.length > 0 && <p style={{ fontSize: '0.85em', color: '#55555f', margin: '10px 0 0' }}>Contiene: {plato.alergenos.join(', ')}.</p>}
        <label className="c-lbl" htmlFor="nota">Aclaraciones</label>
        <input id="nota" className="c-inp" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: sin cebolla" maxLength={80} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <div className="cant">
            <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} aria-label="Quitar uno"><Icono nombre="menos" /></button>
            <span aria-live="polite">{cantidad}</span>
            <button type="button" onClick={() => setCantidad((c) => Math.min(20, c + 1))} aria-label="Agregar uno"><Icono nombre="mas" /></button>
          </div>
          <button type="button" className="c-cta" style={{ marginTop: 0 }} onClick={() => onAgregar(plato, cantidad, nota.trim())} disabled={!abierto}>
            {abierto ? `Agregar · ${formatoPrecio(plato.precio * cantidad, moneda)}` : 'Cerrado ahora'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HojaCarrito({ lineas, setLineas, mesaInicial, onCerrar, onEnviado, config }: {
  lineas: Linea[];
  setLineas: React.Dispatch<React.SetStateAction<Linea[]>>;
  mesaInicial?: number;
  onCerrar: () => void;
  onEnviado: (p: import('@/lib/tipos').Pedido) => void;
  config: import('@/lib/tipos').DemoConfig;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const modos: { id: ModoServicio; nombre: string }[] = [
    { id: 'mesa', nombre: 'En la mesa' },
    { id: 'llevar', nombre: 'Para llevar' },
    ...(config.delivery ? [{ id: 'delivery' as const, nombre: 'Delivery' }] : []),
  ];
  const [modo, setModo] = useState<ModoServicio>(mesaInicial ? 'mesa' : 'llevar');
  const [mesa, setMesa] = useState(mesaInicial ?? 1);
  const [direccion, setDireccion] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const subtotal = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const envio = modo === 'delivery' ? config.costoEnvio : 0;

  function cambiar(clave: string, d: number) {
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, cantidad: l.cantidad + d } : l)).filter((l) => l.cantidad > 0));
  }

  function enviar() {
    if (modo === 'delivery' && direccion.trim().length < 5) {
      setError('Escribí la dirección de entrega.');
      return;
    }
    const items = lineas.map(({ clave: _c, ...i }) => { void _c; return i; });
    const texto = mensajePedido({ config, items, modo, mesa: modo === 'mesa' ? mesa : undefined, direccion: direccion.trim(), nombre: nombre.trim(), envio });
    window.open(enlaceWhatsApp(config.whatsapp, texto), '_blank', 'noopener,noreferrer');
    onEnviado({ id: idCorto(), fecha: new Date().toISOString(), modo, mesa: modo === 'mesa' ? mesa : undefined, direccion: direccion.trim() || undefined, items, total: subtotal + envio });
  }

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-carrito" ref={ref}>
        <div className="hoja-cab">
          <h3 id="t-carrito">Tu pedido</h3>
          <button className="x" onClick={onCerrar} aria-label="Cerrar" autoFocus><Icono nombre="cerrar" /></button>
        </div>
        {lineas.length === 0 && <p>Tu pedido está vacío. Elegí algo de la carta.</p>}
        {lineas.map((l) => (
          <div key={l.clave} className="linea-item">
            <div>
              <strong>{l.nombre}</strong>
              {l.nota && <div style={{ fontSize: '0.85em', color: '#55555f' }}>{l.nota}</div>}
              <div style={{ fontSize: '0.9em', marginTop: 2 }}>{p(l.precio * l.cantidad)}</div>
            </div>
            <div className="cant">
              <button type="button" onClick={() => cambiar(l.clave, -1)} aria-label={`Quitar un ${l.nombre}`}><Icono nombre="menos" /></button>
              <span>{l.cantidad}</span>
              <button type="button" onClick={() => cambiar(l.clave, 1)} aria-label={`Agregar un ${l.nombre}`}><Icono nombre="mas" /></button>
            </div>
          </div>
        ))}

        <span className="c-lbl" id="lbl-modo">¿Cómo lo querés?</span>
        <div className="segmento" role="group" aria-labelledby="lbl-modo" style={{ gridTemplateColumns: `repeat(${modos.length}, 1fr)` }}>
          {modos.map((m) => <button key={m.id} type="button" aria-pressed={modo === m.id} onClick={() => setModo(m.id)}>{m.nombre}</button>)}
        </div>

        {modo === 'mesa' && (
          <>
            <label className="c-lbl" htmlFor="mesa">Mesa</label>
            <select id="mesa" className="c-inp" value={mesa} onChange={(e) => setMesa(Number(e.target.value))}>
              {Array.from({ length: config.mesas }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Mesa {n}</option>)}
            </select>
          </>
        )}
        {modo === 'delivery' && (
          <>
            <label className="c-lbl" htmlFor="dir">Dirección de entrega</label>
            <input id="dir" className="c-inp" value={direccion} onChange={(e) => { setDireccion(e.target.value); setError(''); }} placeholder="Calle, número, piso" autoComplete="street-address" />
            {error && <p role="alert" style={{ color: '#b3261e', fontSize: '0.85em', margin: '6px 0 0' }}>{error}</p>}
          </>
        )}
        <label className="c-lbl" htmlFor="nom">Tu nombre <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="nom" className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" />

        {modo === 'delivery' && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}><span>Envío</span><span>{p(envio)}</span></div>}
        <div className="total"><span>Total</span><span>{p(subtotal + envio)}</span></div>
        <button type="button" className="c-cta" onClick={enviar} disabled={lineas.length === 0}>
          <Icono nombre="whatsapp" /> Enviar pedido por WhatsApp
        </button>
        <p style={{ fontSize: '0.78em', color: '#6a6a74', textAlign: 'center', margin: '10px 0 0' }}>Se abre WhatsApp con tu pedido escrito. El local lo confirma por ahí.</p>
      </div>
    </div>
  );
}

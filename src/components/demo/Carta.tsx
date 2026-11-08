'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AvisoDemo, DemoNoEncontrada, useDemoCargada } from './useDemoCargada';
import { FotoPlato } from './FotoPlato';
import { FOTO_PORTADA } from '@/lib/rubros/restaurante/datos-ejemplo';
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
  const [toast, setToast] = useState<{ id: number; texto: string } | null>(null);
  const [rebote, setRebote] = useState(0);
  const [ahora, setAhora] = useState<Date>(() => new Date());
  const [portadaOk, setPortadaOk] = useState(true);
  const vistasRegistradas = useRef(new Set<string>());
  const barraRef = useRef<HTMLButtonElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const indicadorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
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
      { rootMargin: '-120px 0px -60% 0px' },
    );
    secciones.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [estado]);

  const activoEf = activo || estado?.categorias[0]?.id || '';

  // Indicador deslizante de la pestaña activa: sigue a la categoría y la mantiene a la vista.
  useEffect(() => {
    const cont = tabsRef.current;
    const ind = indicadorRef.current;
    if (!cont || !ind) return;
    const tab = cont.querySelector<HTMLElement>(`[data-cat="${activoEf}"]`);
    if (!tab) return;
    ind.style.setProperty('--x', `${tab.offsetLeft}px`);
    ind.style.setProperty('--w', `${tab.offsetWidth}px`);
    ind.dataset.listo = '1';
    const destino = tab.offsetLeft - (cont.clientWidth - tab.offsetWidth) / 2;
    cont.scrollTo({ left: destino, behavior: 'smooth' });
  }, [activoEf, grande]);

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

  function agregar(plato: Plato, cantidad: number, nota: string, origen?: HTMLElement | null) {
    setCarrito((c) => {
      const i = c.findIndex((l) => l.platoId === plato.id && l.nota === nota);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + cantidad } : l));
      return [...c, { clave: idCorto(), platoId: plato.id, nombre: plato.nombre, precio: plato.precio, cantidad, nota }];
    });
    setPlatoAbierto(null);
    setToast({ id: Date.now(), texto: `Agregaste ${cantidad} × ${plato.nombre}` });
    volarAlCarrito(origen ?? null, () => barraRef.current, () => setRebote((r) => r + 1));
    if ('vibrate' in navigator) navigator.vibrate?.(12);
  }

  function toggleLetra() {
    setGrande((g) => {
      window.localStorage.setItem('acmias:letra-grande', g ? '0' : '1');
      return !g;
    });
  }

  let indice = 0;

  return (
    <div className={`carta${grande ? ' grande' : ''}`} style={estilo}>
      <AvisoDemo />
      <header className={`c-hero${portadaOk ? '' : ' sin-foto'}`}>
        {portadaOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="c-hero-foto" src={FOTO_PORTADA} alt="" fetchPriority="high" onError={() => setPortadaOk(false)} />
        )}
        <div className="c-hero-velo" aria-hidden="true" />
        <div className="c-hero-in">
          <div className="c-herr">
            <span className="c-modo">{mesa ? `Mesa ${mesa}` : 'Carta digital'}</span>
            <button type="button" className="c-btn-texto" onClick={toggleLetra} aria-pressed={grande}>
              <Icono nombre="texto" size={18} /> {grande ? 'Letra normal' : 'Letra grande'}
            </button>
          </div>
          <div className="c-id">
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt="" className="c-logo" />
            ) : (
              <span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
            )}
            <div className="c-id-txt">
              <h1 className="c-nombre">{config.negocio}</h1>
              <span className={`c-estado${abierto ? ' abierto' : ''}`}>
                <span className="punto" aria-hidden="true" />
                {abierto ? `Abierto · cierra ${config.cierre}` : `Cerrado · abre ${config.apertura}`}
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav className="c-tabs" aria-label="Categorías">
        <div className="c-tabs-in" ref={tabsRef}>
          <span className="c-tab-ind" ref={indicadorRef} aria-hidden="true" />
          {estado.categorias.map((c) => (
            <a key={c.id} href={`#cat-${c.id}`} data-cat={c.id} className="c-tab" aria-current={activoEf === c.id} onClick={() => setActivo(c.id)}>
              {c.nombre}
            </a>
          ))}
        </div>
      </nav>

      <main className="c-main">
        {!abierto && (
          <p role="status" className="c-cerrado">
            <Icono nombre="reloj" size={18} /> Ahora estamos cerrados. Podés mirar la carta y pedir desde las {config.apertura}.
          </p>
        )}

        {destacados.length > 0 && (
          <section aria-labelledby="t-dest" className="c-dest-sec">
            <h2 id="t-dest" className="c-dest-tit">Recomendados de hoy</h2>
            <div className="c-dest">
              {destacados.map((d, i) => (
                <button key={d.id} type="button" className="c-dest-card" style={{ '--i': i } as React.CSSProperties} onClick={() => abrirPlato(d)}>
                  <FotoPlato src={d.foto} tipo={d.ilustracion} className="c-dest-img" prioridad />
                  <span className="c-dest-txt">
                    <strong>{d.nombre}</strong>
                    <span className="c-dest-precio">{p(d.precio)}</span>
                  </span>
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
                <div key={pl.id} className={`plato${pl.agotado ? ' agotado' : ''}`} style={{ '--i': Math.min(indice++, 10) } as React.CSSProperties}>
                  <button type="button" className="plato-abrir" onClick={() => abrirPlato(pl)} disabled={pl.agotado} aria-label={`${pl.nombre}, ${p(pl.precio)}${pl.agotado ? ', agotado' : ''}`}>
                    <span className="plato-txt">
                      <span className="plato-nom">
                        <span className="nombre">{pl.nombre}</span>
                        <span className="puntos" aria-hidden="true" />
                        <span className="precio">{p(pl.precio)}</span>
                      </span>
                      <span className="plato-desc">{pl.descripcion}</span>
                      <span className="tags">
                        {pl.agotado && <span className="tag agot">Agotado hoy</span>}
                        {pl.etiquetas.map((t) => <span key={t} className="tag">{ETIQUETAS[t]}</span>)}
                      </span>
                    </span>
                    <FotoPlato src={pl.foto} tipo={pl.ilustracion} className="plato-img" />
                  </button>
                  {!pl.agotado && abierto && (
                    <button
                      type="button"
                      className="plato-mas"
                      aria-label={`Sumar ${pl.nombre} al pedido`}
                      onClick={(e) => agregar(pl, 1, '', e.currentTarget.parentElement?.querySelector<HTMLElement>('.plato-img'))}
                    >
                      <Icono nombre="mas" size={20} />
                    </button>
                  )}
                </div>
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
          <button type="button" ref={barraRef} onClick={() => setVerCarrito(true)} key={`b-${rebote}`} data-rebote={rebote > 0 ? '1' : undefined}>
            <span className="barra-izq">
              <span className="barra-icono"><Icono nombre="carrito" /><span className="barra-n" key={cantidadTotal}>{cantidadTotal}</span></span>
              Ver pedido · {cantidadTotal}
            </span>
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
            setToast({ id: Date.now(), texto: err ? 'Pedido enviado. No se pudo guardar en el historial de este dispositivo.' : 'Pedido enviado por WhatsApp' });
          }}
          config={config}
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

/** Animación "vuela al carrito": una copia de la foto viaja en arco hasta la barra del pedido. */
function volarAlCarrito(origen: HTMLElement | null, destino: () => HTMLElement | null, alLlegar: () => void) {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!origen || reducido || typeof origen.animate !== 'function') {
    alLlegar();
    return;
  }
  // La copia se toma ya: el origen puede desaparecer (la hoja del plato se cierra al agregar).
  const r = origen.getBoundingClientRect();
  const copia = origen.cloneNode(true) as HTMLElement;
  copia.classList.add('volando');
  Object.assign(copia.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.appendChild(copia);
  // El destino se mide en el cuadro siguiente: con el primer plato la barra recién aparece.
  requestAnimationFrame(() => {
    const d = destino()?.getBoundingClientRect();
    const fx = d ? d.left + 38 : window.innerWidth / 2;
    const fy = d ? d.top + d.height / 2 : window.innerHeight - 40;
    const dx = fx - (r.left + r.width / 2);
    const dy = fy - (r.top + r.height / 2);
    const anim = copia.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, borderRadius: '16px' },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(0.55) rotate(-8deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(6deg)`, opacity: 0.4, borderRadius: '50%' },
      ],
      { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.75, 0.4)' },
    );
    anim.onfinish = () => {
      copia.remove();
      alLlegar();
    };
    anim.oncancel = () => copia.remove();
  });
}

function HojaPlato({ plato, moneda, onCerrar, onAgregar, abierto }: { plato: Plato; moneda: string; onCerrar: () => void; onAgregar: (p: Plato, c: number, n: string, origen?: HTMLElement | null) => void; abierto: boolean }) {
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const fotoRef = useRef<HTMLDivElement>(null);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-plato" ref={ref}>
        <div ref={fotoRef}>
          <FotoPlato src={plato.foto} tipo={plato.ilustracion} className="hoja-foto" prioridad />
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
          <button type="button" className="c-cta" style={{ marginTop: 0 }} onClick={() => onAgregar(plato, cantidad, nota.trim(), fotoRef.current?.querySelector<HTMLElement>('.hoja-foto'))} disabled={!abierto}>
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
  // La mesa solo sale del QR: así el pedido queda atado a la mesa donde está sentado el cliente.
  const mesa = mesaInicial;
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
    if (modo === 'mesa' && !mesa) {
      setError('Escaneá el QR de tu mesa para pedir desde la mesa.');
      return;
    }
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
            {mesa ? (
              <div className="mesa-qr" role="note">
                <span className="mesa-num">{mesa}</span>
                <span><strong>Mesa {mesa}</strong><br />Tomada del QR de tu mesa. El mozo te lo lleva ahí.</span>
              </div>
            ) : (
              <div className="mesa-qr sin" role="note">
                <Icono nombre="qr" size={26} />
                <span><strong>Escaneá el QR de tu mesa</strong><br />Está en la mesa. Así el pedido llega a tu mesa sin errores.</span>
              </div>
            )}
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
        <button type="button" className="c-cta" onClick={enviar} disabled={lineas.length === 0 || (modo === 'mesa' && !mesa)}>
          <Icono nombre="whatsapp" /> Enviar pedido por WhatsApp
        </button>
        <p style={{ fontSize: '0.78em', color: '#6a6a74', textAlign: 'center', margin: '10px 0 0' }}>Se abre WhatsApp con tu pedido escrito. El local lo confirma por ahí.</p>
      </div>
    </div>
  );
}

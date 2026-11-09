'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { volarAlCarrito } from '@/components/efectos';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import { CATEGORIAS } from '@/lib/rubros/ferreteria/catalogo';
import { TEXTO_STOCK, buscar, complementos, estadoStock, leerLista, lineaDesde, mensajePresupuesto, precioUnidad, problema, unidadElegida } from '@/lib/rubros/ferreteria/logica';
import type { Presupuesto, Producto } from '@/lib/rubros/ferreteria/tipos';
import { useDemoFerreteria } from './useFerreteria';

interface Item { p: Producto; unidad: string; cantidad: number }

const ICONO_CAT: Record<string, string> = { Plomería: '🔧', Electricidad: '⚡', Tornillería: '🔩', Pinturas: '🎨', Herramientas: '🛠️', Construcción: '🧱', Jardín: '🌱' };

/** Catálogo del cliente (FER-03, FER-04, FER-12) con "Mandanos tu lista". */
const nuevoId = () => `pr-${Math.random().toString(36).slice(2, 8)}`;

export function CatalogoFer({ slug }: { slug: string }) {
  const { config, estado, lista, actualizar, estilo, listo } = useDemoFerreteria(slug);
  const [q, setQ] = useState('');
  const qd = useDeferredValue(q);
  const [cat, setCat] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<Producto | null>(null);
  const [pedido, setPedido] = useState<Item[]>([]);
  const [verPedido, setVerPedido] = useState(false);
  const [verLista, setVerLista] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rebote, setRebote] = useState(0);
  const barra = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const prob = useMemo(() => (qd.trim().length > 6 ? problema(qd) : null), [qd]);
  const resultados = useMemo(() => {
    if (!estado) return [];
    if (prob) return lista.filter((p) => prob.familias.includes(p.familia) && p.linea === 'Estándar');
    const base = qd.trim().length > 1 ? buscar(lista, qd, estado.palabras, 400) : cat ? lista.filter((p) => p.categoria === cat && p.linea === 'Estándar') : [];
    return base.filter((p) => !cat || p.categoria === cat).slice(0, 48);
  }, [estado, lista, qd, cat, prob]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const f = (v: number) => formatoPrecio(v, config.moneda);
  const n = pedido.length;

  function agregar(p: Producto, unidad: string, cantidad: number, origen?: HTMLElement | null) {
    setPedido((ps) => {
      const i = ps.findIndex((x) => x.p.id === p.id && x.unidad === unidad);
      if (i >= 0) return ps.map((x, j) => (j === i ? { ...x, cantidad: x.cantidad + cantidad } : x));
      return [...ps, { p, unidad, cantidad }];
    });
    setAbierto(null);
    setToast(`Sumaste ${p.nombre}`);
    volarAlCarrito(origen ?? null, () => barra.current, () => setRebote((r) => r + 1));
  }

  function enviarPresupuesto(items: Item[], extra?: string) {
    const pres: Presupuesto = {
      id: nuevoId(),
      numero: estado!.proximoNumero,
      fecha: new Date().toISOString(),
      clienteId: null,
      tipo: 'paso',
      lineas: items.map((i) => lineaDesde(i.p, i.unidad, i.cantidad, 0)),
      estado: 'abierto',
      origen: 'web',
      validezDias: 7,
    };
    actualizar((e) => ({ ...e, presupuestos: [pres, ...e.presupuestos], proximoNumero: e.proximoNumero + 1 }));
    const msg = mensajePresupuesto(pres, lista, { negocio: config!.negocio, moneda: config!.moneda, enlace: `${window.location.origin}/d/${slug}/presupuesto/${pres.id}` }).replace(/^Hola, te paso el presupuesto/, 'Hola, armé este pedido en la web. Presupuesto');
    window.open(enlaceWhatsApp(config!.whatsapp, extra ? `${msg}\n\n${extra}` : msg), '_blank', 'noopener');
    setPedido([]);
    setVerPedido(false);
    setVerLista(false);
    setToast('Listo: te respondemos por WhatsApp con stock confirmado.');
  }

  return (
    <div className="fer" style={estilo}>
      <AvisoDemo texto="Productos, precios y stock de ejemplo" />
      <header className="fer-cab">
        <div className="fer-cab-in">
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" className="tie-logo" />
          ) : (
            <span className="tie-logo tie-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          )}
          <div className="tie-id">
            <h1>{config.negocio}</h1>
            <span>{lista.length.toLocaleString('es')} productos · Buscá con tus palabras</span>
          </div>
        </div>
        <div className="fer-buscar" role="search">
          <Icono nombre="buscar" size={20} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder='Probá: "tubo de 2", "foco 9w" o "pierde la canilla"' aria-label="Buscar productos" />
        </div>
        <button type="button" className="fer-lista-btn" onClick={() => setVerLista(true)}>
          <Icono nombre="lista" size={20} />
          <span><strong>¿Tenés una lista?</strong> Pegala y te armamos el presupuesto</span>
        </button>
      </header>

      <nav className="fer-cats" aria-label="Categorías">
        {CATEGORIAS.map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat((x) => (x === c ? null : c))}><span aria-hidden="true">{ICONO_CAT[c]}</span>{c}</button>
        ))}
      </nav>

      <main className="fer-main">
        {prob && (
          <div className="fer-problema" role="status">
            <strong>{prob.titulo}</strong>
            <p>{prob.consejo}</p>
          </div>
        )}
        {!qd.trim() && !cat ? (
          <div className="fer-vacio">
            <p>Escribí lo que necesitás como lo dirías en el mostrador. Entendemos &quot;tubo&quot;, &quot;caño&quot; y &quot;PVC 2&quot;.</p>
            <div className="bar-acciones">{['tubo de 2', 'cable 2,5', 'latex blanco 4 litros', 'pierde la canilla'].map((x) => <button key={x} type="button" className="d-btn" onClick={() => setQ(x)}>{x}</button>)}</div>
          </div>
        ) : resultados.length === 0 ? (
          <p className="tie-vacio">No lo encontramos. Escribinos o mandanos la lista y te lo buscamos.</p>
        ) : (
          <ul className="fer-res-lista">
            {resultados.map((p, i) => {
              const st = estadoStock(p);
              return (
                <li key={p.id} style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                  <button type="button" className="fer-item" onClick={() => setAbierto(p)}>
                    <span className="fer-item-ico" aria-hidden="true">{ICONO_CAT[p.categoria]}</span>
                    <span className="fer-item-txt">
                      <strong>{p.nombre}</strong>
                      <span>{p.linea} · {p.codigo}</span>
                      <span className={`fer-stock ${st}`}>{TEXTO_STOCK[st]}</span>
                    </span>
                    <span className="fer-item-precio">{f(precioUnidad(p, p.unidades[0], 0))}<small>por {p.unidades[0].etiqueta}</small></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="c-pie">Precios de lista para clientes de paso. ¿Sos profesional? Pedí tu precio especial. Sujeto a disponibilidad. {config.direccion}<br />Hecho con ACMIAS.</p>
      </main>

      {pedido.length > 0 && (
        <div className="barra-carrito">
          <button type="button" ref={barra} onClick={() => setVerPedido(true)} key={`b-${rebote}`} data-rebote={rebote > 0 ? '1' : undefined}>
            <span className="barra-izq"><span className="barra-icono"><Icono nombre="carrito" /><span className="barra-n" key={n}>{n}</span></span>Ver pedido · {n}</span>
            <span>{f(pedido.reduce((s, i) => s + precioUnidad(i.p, i.p.unidades.find((u) => u.id === i.unidad)!, 0) * i.cantidad, 0))}</span>
          </button>
        </div>
      )}

      {abierto && <Ficha p={abierto} lista={lista} f={f} onCerrar={() => setAbierto(null)} onAgregar={agregar} onVer={setAbierto} />}
      {verPedido && <HojaPedido items={pedido} f={f} onCerrar={() => setVerPedido(false)} onQuitar={(i) => setPedido((ps) => ps.filter((_, j) => j !== i))} onEnviar={() => enviarPresupuesto(pedido)} />}
      {verLista && <HojaLista lista={lista} estado={estado} f={f} onCerrar={() => setVerLista(false)} onEnviar={enviarPresupuesto} />}
      {toast && <div className="toast" role="status"><span className="toast-check"><Icono nombre="check" size={16} /></span>{toast}</div>}
    </div>
  );
}

function Ficha({ p, lista, f, onCerrar, onAgregar, onVer }: { p: Producto; lista: Producto[]; f: (v: number) => string; onCerrar: () => void; onAgregar: (p: Producto, u: string, c: number, o?: HTMLElement | null) => void; onVer: (p: Producto) => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [unidad, setUnidad] = useState(p.unidades[0].id);
  const [cant, setCant] = useState(1);
  const u = p.unidades.find((x) => x.id === unidad)!;
  const st = estadoStock(p);
  const otras = lista.filter((x) => x.familia === p.familia && x.medida === p.medida && x.variante === p.variante && x.id !== p.id);
  const comp = complementos(lista, p);
  const icoRef = useRef<HTMLDivElement>(null);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-fp" ref={ref}>
        <div className="hoja-cab">
          <div>
            <h3 id="t-fp">{p.nombre}</h3>
            <p style={{ margin: '4px 0 0', color: '#55555f' }}>{p.linea} · {p.codigo} · <span className={`fer-stock ${st}`}>{TEXTO_STOCK[st]}</span></p>
          </div>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <div ref={icoRef} className="fer-ficha-ico" aria-hidden="true">{ICONO_CAT[p.categoria]}</div>
        {p.unidades.length > 1 && (
          <div className="bar-coberturas" role="group" aria-label="Unidad de venta">
            {p.unidades.map((x) => <button key={x.id} type="button" aria-pressed={unidad === x.id} onClick={() => setUnidad(x.id)}>Por {x.etiqueta} · {f(precioUnidad(p, x, 0))}</button>)}
          </div>
        )}
        <p className="fer-ficha-precio">{f(precioUnidad(p, u, 0))} <small>por {u.etiqueta}</small></p>
        {otras.length > 0 && (
          <div className="fer-lineas-alt">
            <span>Otras calidades:</span>
            {otras.map((o) => <button key={o.id} type="button" className="d-btn" onClick={() => onVer(o)}>{o.linea} · {f(precioUnidad(o, o.unidades[0], 0))}</button>)}
          </div>
        )}
        {comp.length > 0 && (
          <div className="fer-comp">
            <strong>Con esto se suele llevar</strong>
            {comp.map((c) => (
              <button key={c.id} type="button" onClick={() => onAgregar(c, c.unidades[0].id, 1)}>
                <span>{c.nombre}</span><span>{f(precioUnidad(c, c.unidades[0], 0))}</span><Icono nombre="mas" size={16} />
              </button>
            ))}
          </div>
        )}
        <div className="hoja-pie" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <div className="cant">
            <button type="button" aria-label="Menos" onClick={() => setCant((c) => Math.max(1, c - 1))}><Icono nombre="menos" /></button>
            <span aria-live="polite">{cant}</span>
            <button type="button" aria-label="Más" onClick={() => setCant((c) => c + 1)}><Icono nombre="mas" /></button>
          </div>
          <button type="button" className="bar-btn prim grande" disabled={st === 'sin'} onClick={() => onAgregar(p, unidad, cant, icoRef.current)}>{st === 'sin' ? 'Sin stock' : `Sumar al pedido · ${f(precioUnidad(p, u, 0) * cant)}`}</button>
        </div>
      </div>
    </div>
  );
}

function HojaPedido({ items, f, onCerrar, onQuitar, onEnviar }: { items: Item[]; f: (v: number) => string; onCerrar: () => void; onQuitar: (i: number) => void; onEnviar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const total = items.reduce((s, i) => s + precioUnidad(i.p, i.p.unidades.find((u) => u.id === i.unidad)!, 0) * i.cantidad, 0);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-ped" ref={ref}>
        <div className="hoja-cab"><h3 id="t-ped">Tu pedido</h3><button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button></div>
        <ul className="fer-ped">
          {items.map((i, k) => {
            const u = i.p.unidades.find((x) => x.id === i.unidad)!;
            return <li key={k}><span>{i.cantidad} × {i.p.nombre} <small>({u.etiqueta})</small></span><strong>{f(precioUnidad(i.p, u, 0) * i.cantidad)}</strong><button type="button" className="x" aria-label={`Quitar ${i.p.nombre}`} onClick={() => onQuitar(k)}><Icono nombre="basura" size={16} /></button></li>;
          })}
        </ul>
        <p className="fer-ficha-precio">Total {f(total)}</p>
        <p className="bar-ayuda">Te confirmamos stock y precio final por WhatsApp. Válido 7 días, sujeto a disponibilidad.</p>
        <button type="button" className="bar-btn prim grande" onClick={onEnviar}><Icono nombre="whatsapp" size={18} /> Pedir presupuesto por WhatsApp</button>
      </div>
    </div>
  );
}

/** "Mandanos tu lista": el cliente pega la lista y ve el presupuesto armado; lo dudoso lo confirma el vendedor. */
function HojaLista({ lista, estado, f, onCerrar, onEnviar }: { lista: Producto[]; estado: Parameters<typeof leerLista>[2]; f: (v: number) => string; onCerrar: () => void; onEnviar: (items: Item[], extra?: string) => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [texto, setTexto] = useState('');
  const [leidas, setLeidas] = useState<ReturnType<typeof leerLista> | null>(null);
  const items: Item[] = (leidas ?? []).filter((l) => l.elegido).map((l) => ({ p: l.elegido!, unidad: unidadElegida(l.elegido!, l), cantidad: l.cantidad }));
  const dudas = (leidas ?? []).filter((l) => !l.elegido);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-lis" ref={ref}>
        <div className="hoja-cab"><h3 id="t-lis">Mandanos tu lista</h3><button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button></div>
        <label className="sr-only" htmlFor="lista-cli">Tu lista</label>
        <textarea id="lista-cli" className="c-inp" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Escribí un producto por renglón:\n3 caños de 50\n6 codos\n20 m cable 2,5'} />
        <button type="button" className="bar-btn prim" style={{ marginTop: 8 }} disabled={!texto.trim()} onClick={() => setLeidas(leerLista(texto, lista, estado))}>Armar presupuesto</button>
        {leidas && (
          <>
            <ul className="fer-ped" style={{ marginTop: 12 }}>
              {leidas.map((l, i) => (
                <li key={i} className={l.elegido ? '' : 'dudosa'}>
                  {l.elegido ? (
                    <>
                      <span>{l.cantidad} × {l.elegido.nombre} <small>({l.elegido.unidades.find((u) => u.id === unidadElegida(l.elegido!, l))?.etiqueta})</small></span>
                      <strong>{f(precioUnidad(l.elegido, l.elegido.unidades.find((u) => u.id === unidadElegida(l.elegido!, l))!, 0) * l.cantidad)}</strong>
                    </>
                  ) : (
                    <span>&quot;{l.original}&quot; · <em>{l.opciones.length ? `Lo confirma el vendedor (${l.opciones.map((o) => o.nombre).join(' o ')})` : 'Lo busca el vendedor'}</em></span>
                  )}
                </li>
              ))}
            </ul>
            <button type="button" className="bar-btn prim grande" style={{ marginTop: 12 }} disabled={!items.length && !dudas.length} onClick={() => onEnviar(items, dudas.length ? `Para confirmar:\n${dudas.map((d) => `• ${d.original}`).join('\n')}` : undefined)}>
              <Icono nombre="whatsapp" size={18} /> Enviar por WhatsApp
            </button>
          </>
        )}
      </div>
    </div>
  );
}


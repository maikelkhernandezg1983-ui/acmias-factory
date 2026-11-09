'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { formatoPrecio, soloDigitos } from '@/lib/utiles';
import { CATEGORIAS_REP, TALLER_EJEMPLO } from '@/lib/rubros/repuestos/datos-ejemplo';
import { TEXTO_STOCK, estadoStock, nombreVehiculo } from '@/lib/rubros/repuestos/logica';
import type { EstadoRepuestos, Pieza } from '@/lib/rubros/repuestos/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { IconoPieza } from './IconoPieza';
import { ImportadorPlanilla } from './ImportadorPlanilla';
import { useDemoRepuestos } from './useRepuestos';

type Pestana = 'catalogo' | 'precios' | 'demanda' | 'importar' | 'ajustes';
const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'catalogo', nombre: 'Catálogo y stock' },
  { id: 'precios', nombre: 'Subir precios' },
  { id: 'demanda', nombre: 'Cotizaciones y demanda' },
  { id: 'importar', nombre: 'Cargar planilla' },
  { id: 'ajustes', nombre: 'Ajustes' },
];

export type ActualizarRep = (fn: (e: EstadoRepuestos) => EstadoRepuestos) => string | null;

export function PanelRepuestos({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoRepuestos(slug);
  const [pestana, setPestana] = useState<Pestana>('catalogo');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;

  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Piezas, vehículos y precios de ejemplo" />
      <header className="duenio-top">
        <div className="duenio-top-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt="" style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', objectFit: 'contain', padding: 4 }} />
            ) : (
              <span style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--c-acento)', color: 'var(--c-sobre-acento)', fontWeight: 800 }}>{config.negocio[0]?.toUpperCase()}</span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{config.negocio}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Panel del dueño</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="ojo" size={18} /> Ver catálogo</Link>
            <Link className="d-btn" href={`/d/${slug}/sitio`}><Icono nombre="tienda" size={18} /> Sitio</Link>
          </nav>
        </div>
      </header>
      <div className="d-tabs" role="tablist" aria-label="Secciones del panel">
        {PESTANAS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-controls={`pan-${t.id}`} aria-selected={pestana === t.id} className="d-tab" onClick={() => setPestana(t.id)}>
            {t.nombre}
          </button>
        ))}
      </div>
      <main className="d-main" role="tabpanel" id={`pan-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {pestana === 'catalogo' && <EditorCatalogo estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'precios' && <SubirPrecios estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'demanda' && <Demanda estado={estado} moneda={config.moneda} />}
        {pestana === 'importar' && <ImportadorPlanilla estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} config={config} estado={estado} actualizar={actualizar} />}
      </main>
    </div>
  );
}

function EditorCatalogo({ estado, actualizar, moneda }: { estado: EstadoRepuestos; actualizar: ActualizarRep; moneda: string }) {
  const [aviso, setAviso] = useState('');
  const [agregando, setAgregando] = useState<string | null>(null);

  function cambiar(id: string, cambios: Partial<Pieza>) {
    const err = actualizar((e) => ({ ...e, piezas: e.piezas.map((p) => (p.id === id ? { ...p, ...cambios } : p)) }));
    if (err) setAviso(err);
  }

  return (
    <section className="d-card" aria-labelledby="t-cat">
      <h2 id="t-cat">Tu catálogo</h2>
      <p className="sub">Cambiá precio y stock, y sumá una compatibilidad cuando confirmes que una pieza sirve para otro auto: el catálogo aprende.</p>
      <p className="sub" style={{ background: 'var(--c-acento-suave)', padding: '8px 12px', borderRadius: 10 }}>Por ahora los cambios se guardan en este dispositivo. Cuando conectemos la base de datos, se verán en todos los celulares.</p>
      {aviso && <p role="status" style={{ fontSize: 14 }}>{aviso}</p>}
      {CATEGORIAS_REP.map((c) => {
        const piezas = estado.piezas.filter((p) => p.categoria === c.id);
        if (!piezas.length) return null;
        return (
          <div key={c.id} style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 15, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}><IconoPieza categoria={c.id} size={22} /> {c.nombre}</h3>
            <div className="d-scroll">
              <table className="d-tabla">
                <thead><tr><th>Pieza</th><th>Precio</th><th>Stock</th><th>Se muestra</th><th>Sirve para</th></tr></thead>
                <tbody>
                  {piezas.map((p) => {
                    const faltan = estado.vehiculos.filter((v) => !p.compat.includes(v.id));
                    return (
                      <tr key={p.id}>
                        <td>
                          <code className="cod">{p.codigo}</code> {p.nombre}
                          <div style={{ fontSize: 12, color: '#55555f' }}>{p.marca} · {p.origen === 'original' ? 'Original' : 'Alternativo'}{p.importado && ' · Importada de planilla'}</div>
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`pr-${p.id}`}>Precio de {p.codigo}</label>
                          <input key={`${p.id}-${p.precio}`} id={`pr-${p.id}`} className="d-precio" type="number" min={0} step="any" defaultValue={p.precio} onBlur={(e) => { const v = Number(e.target.value); if (e.target.value.trim() === '' || !Number.isFinite(v) || v < 0) { e.target.value = String(p.precio); return; } if (v !== p.precio) cambiar(p.id, { precio: v }); }} />
                          <div style={{ fontSize: 12, color: '#55555f', marginTop: 2 }}>{formatoPrecio(p.precio, moneda)}</div>
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`st-${p.id}`}>Stock de {p.codigo}</label>
                          <input key={`${p.id}-s${p.stock}`} id={`st-${p.id}`} className="d-precio" style={{ width: 80 }} type="number" min={0} step={1} defaultValue={p.stock} onBlur={(e) => { const v = Math.floor(Number(e.target.value)); if (!Number.isFinite(v) || v < 0) { e.target.value = String(p.stock); return; } if (v !== p.stock) cambiar(p.id, { stock: v }); }} />
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginTop: 4 }}>
                            <input type="checkbox" checked={p.aPedido} onChange={(e) => cambiar(p.id, { aPedido: e.target.checked })} /> A pedido si no hay
                          </label>
                        </td>
                        <td><span className={`stock ${estadoStock(p)}`}><span className="punto" aria-hidden="true" />{TEXTO_STOCK[estadoStock(p)]}</span></td>
                        <td style={{ minWidth: 220 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {estado.vehiculos.filter((v) => p.compat.includes(v.id)).map((v) => <span key={v.id} className="tag">{v.marca} {v.modelo}</span>)}
                          </div>
                          {faltan.length > 0 && (agregando === p.id ? (
                            <select
                              className="d-precio"
                              style={{ marginTop: 6, width: '100%' }}
                              autoFocus
                              defaultValue=""
                              aria-label={`Agregar compatibilidad a ${p.codigo}`}
                              onChange={(e) => { if (e.target.value) { cambiar(p.id, { compat: [...p.compat, e.target.value] }); setAviso(`Listo: ${p.codigo} ahora figura para ese auto.`); } setAgregando(null); }}
                              onBlur={() => setAgregando(null)}
                            >
                              <option value="">Elegí el auto…</option>
                              {faltan.map((v) => <option key={v.id} value={v.id}>{nombreVehiculo(v)} {v.desde}–{v.hasta}</option>)}
                            </select>
                          ) : (
                            <button type="button" className="d-btn" style={{ minHeight: 34, marginTop: 6 }} onClick={() => setAgregando(p.id)}><Icono nombre="mas" size={14} /> Agregar compatibilidad</button>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SubirPrecios({ estado, actualizar, moneda }: { estado: EstadoRepuestos; actualizar: ActualizarRep; moneda: string }) {
  const [filtro, setFiltro] = useState('todas');
  const [porcentaje, setPorcentaje] = useState(8);
  const [hecho, setHecho] = useState('');
  const marcas = [...new Set(estado.piezas.map((p) => p.marca))].sort();
  const afectados = estado.piezas.filter((p) => filtro === 'todas' || p.categoria === filtro.replace('cat:', '') || p.marca === filtro.replace('marca:', ''));
  const nuevo = (precio: number) => {
    const v = precio * (1 + porcentaje / 100);
    return v < 20 ? Math.round(v * 2) / 2 : v < 200 ? Math.round(v) : Math.round(v / 10) * 10;
  };
  const valido = porcentaje !== 0 && porcentaje > -90 && porcentaje <= 300;

  function aplicar() {
    const ant: Record<string, number> = {};
    afectados.forEach((p) => (ant[p.id] = p.precio));
    const err = actualizar((e) => ({ ...e, deshacerPrecios: ant, piezas: e.piezas.map((p) => (ant[p.id] !== undefined ? { ...p, precio: nuevo(p.precio) } : p)) }));
    setHecho(err ?? `Actualizaste ${afectados.length} precios.`);
  }
  function deshacer() {
    const ant = estado.deshacerPrecios;
    if (!ant) return;
    const err = actualizar((e) => ({ ...e, deshacerPrecios: undefined, piezas: e.piezas.map((p) => (ant[p.id] !== undefined ? { ...p, precio: ant[p.id] } : p)) }));
    setHecho(err ?? 'Volviste a los precios anteriores.');
  }

  return (
    <section className="d-card" aria-labelledby="t-precios">
      <h2 id="t-precios">Subir precios en un paso</h2>
      <p className="sub">Por marca (cuando el proveedor manda lista nueva) o por familia. Revisá la vista previa antes de aplicar; si te equivocás, lo deshacés.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>
          Qué piezas
          <select className="d-precio" style={{ width: 240 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todas">Todo el catálogo</option>
            <optgroup label="Por marca">{marcas.map((m) => <option key={m} value={`marca:${m}`}>{m}</option>)}</optgroup>
            <optgroup label="Por familia">{CATEGORIAS_REP.map((c) => <option key={c.id} value={`cat:${c.id}`}>{c.nombre}</option>)}</optgroup>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>
          Porcentaje
          <input className="d-precio" type="number" value={porcentaje} min={-89} max={300} onChange={(e) => setPorcentaje(Number(e.target.value))} />
        </label>
        <button type="button" className="d-btn prim" onClick={aplicar} disabled={!valido || afectados.length === 0}>Aplicar a {afectados.length} piezas</button>
        {estado.deshacerPrecios && <button type="button" className="d-btn" onClick={deshacer}><Icono nombre="deshacer" size={18} /> Deshacer</button>}
      </div>
      {hecho && <p role="status" style={{ fontSize: 14, marginTop: 12 }}>{hecho}</p>}
      <div className="d-scroll" style={{ marginTop: 16 }}>
        <table className="d-tabla">
          <thead><tr><th>Pieza</th><th>Hoy</th><th>Nuevo</th></tr></thead>
          <tbody>
            {afectados.map((p) => (
              <tr key={p.id}><td><code className="cod">{p.codigo}</code> {p.nombre} <span style={{ color: '#55555f' }}>· {p.marca}</span></td><td>{formatoPrecio(p.precio, moneda)}</td><td><strong>{valido ? formatoPrecio(nuevo(p.precio), moneda) : '—'}</strong></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Demanda({ estado, moneda }: { estado: EstadoRepuestos; moneda: string }) {
  const total = estado.cotizaciones.reduce((s, c) => s + c.total, 0);
  const deTaller = estado.cotizaciones.filter((c) => c.taller).length;
  const aPedido = estado.piezas.filter((p) => estadoStock(p) !== 'disponible').length;
  const ranking = useMemo(() => Object.entries(estado.sinResultado).sort((a, b) => b[1] - a[1]).slice(0, 10), [estado.sinResultado]);
  const max = Math.max(1, ...ranking.map((r) => r[1]));

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="l">Cotizaciones</div><div className="v">{estado.cotizaciones.length}</div></div>
        <div className="kpi"><div className="l">Total cotizado</div><div className="v">{formatoPrecio(total, moneda)}</div></div>
        <div className="kpi"><div className="l">De talleres</div><div className="v">{deTaller}</div></div>
        <div className="kpi"><div className="l">Piezas con poco stock</div><div className="v">{aPedido}</div></div>
      </div>

      <section className="d-card" style={{ marginTop: 16 }} aria-labelledby="t-sin">
        <h2 id="t-sin">Lo que te buscan y no tenés</h2>
        <p className="sub">Búsquedas sin resultado o sin stock. Es demanda que hoy se va a otro local: usala para decidir qué comprar.</p>
        {ranking.length === 0 && <p className="sub">Todavía no hay búsquedas sin resultado.</p>}
        {ranking.map(([t, n]) => (
          <div key={t} className="ranking-fila sin-foto">
            <span className="nom">“{t}”</span>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap', color: '#55555f' }}>{n} {n === 1 ? 'vez' : 'veces'}</span>
            <span className="barra" aria-hidden="true"><span style={{ width: `${(n / max) * 100}%` }} /></span>
          </div>
        ))}
      </section>

      <section className="d-card" aria-labelledby="t-cots">
        <h2 id="t-cots">Cotizaciones recibidas</h2>
        <p className="sub">Las marcadas como ejemplo vienen con la demo. Llegan con el auto y los códigos: el vendedor solo confirma.</p>
        <div className="d-scroll">
          <table className="d-tabla">
            <thead><tr><th>Cuándo</th><th>Quién</th><th>Vehículo</th><th>Piezas</th><th>Total</th></tr></thead>
            <tbody>
              {estado.cotizaciones.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{c.taller ?? 'Cliente'}{c.ejemplo && <span className="tag" style={{ marginLeft: 6 }}>Ejemplo</span>}</td>
                  <td>{c.vehiculo ?? '—'}</td>
                  <td>{c.items.map((i) => `${i.cantidad} × ${i.codigo}`).join(', ')}</td>
                  <td><strong>{formatoPrecio(c.total, moneda)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Ajustes({ slug, config, estado, actualizar }: { slug: string; config: DemoConfig; estado: EstadoRepuestos; actualizar: ActualizarRep }) {
  const [msg, setMsg] = useState('');
  function guardar(form: HTMLFormElement) {
    const f = new FormData(form);
    const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
    if (wa.length < 8) return setMsg('Revisá el WhatsApp: incluí código de país y de área.');
    const desc = Math.min(50, Math.max(0, Math.round(Number(f.get('descuento')) || 0)));
    try {
      actualizarDemo(slug, { whatsapp: wa, direccion: String(f.get('direccion') ?? '').trim() });
      const err = actualizar((e) => ({ ...e, descuentoTaller: desc }));
      setMsg(err ?? 'Ajustes guardados.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudieron guardar los ajustes.');
    }
  }
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">Ajustes del local</h2>
      <form onSubmit={(e) => { e.preventDefault(); guardar(e.currentTarget); }} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp para cotizaciones<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Dirección<input name="direccion" className="c-inp" defaultValue={config.direccion} /></label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Descuento de la lista Taller (%)<input name="descuento" type="number" min={0} max={50} className="c-inp" defaultValue={estado.descuentoTaller} /></label>
        <p className="sub" style={{ margin: 0 }}>Taller de ejemplo: {TALLER_EJEMPLO}.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver al catálogo de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, 'repuestos'); setMsg('El catálogo volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}

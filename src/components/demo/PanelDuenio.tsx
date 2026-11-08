'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AvisoDemo, DemoNoEncontrada, useDemoCargada } from './useDemoCargada';
import { Importador } from './Importador';
import { Icono } from '@/components/Icono';
import { Ilustracion } from '@/components/Ilustracion';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { reducirImagen, validarImagen } from '@/lib/imagen';
import { formatoPrecio, soloDigitos } from '@/lib/utiles';
import type { DemoEstado, Plato } from '@/lib/tipos';

type Pestana = 'carta' | 'precios' | 'pedidos' | 'importar' | 'ajustes';

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'carta', nombre: 'Carta' },
  { id: 'precios', nombre: 'Subir precios' },
  { id: 'pedidos', nombre: 'Pedidos y vistas' },
  { id: 'importar', nombre: 'Importar menú' },
  { id: 'ajustes', nombre: 'Ajustes' },
];

export function PanelDuenio({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoCargada(slug);
  const [pestana, setPestana] = useState<Pestana>('carta');

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;

  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo />
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
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="ojo" size={18} /> Ver carta</Link>
            <Link className="d-btn" href={`/d/${slug}/qr`}><Icono nombre="qr" size={18} /> QR por mesa</Link>
            <Link className="d-btn" href={`/d/${slug}/imprimir`}><Icono nombre="imprimir" size={18} /> Carta impresa</Link>
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
        {pestana === 'carta' && <EditorCarta estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'precios' && <AumentoMasivo estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'pedidos' && <PedidosYVistas estado={estado} moneda={config.moneda} />}
        {pestana === 'importar' && <Importador estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} />}
      </main>
    </div>
  );
}

type Actualizar = (fn: (e: DemoEstado) => DemoEstado) => string | null;

function Miniatura({ plato }: { plato: Plato }) {
  return (
    <span className="mini-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {plato.foto ? <img src={plato.foto} alt="" /> : <Ilustracion tipo={plato.ilustracion} />}
    </span>
  );
}

function EditorCarta({ estado, actualizar, moneda }: { estado: DemoEstado; actualizar: Actualizar; moneda: string }) {
  const [aviso, setAviso] = useState('');

  function cambiar(id: string, cambios: Partial<Plato>) {
    const err = actualizar((e) => ({ ...e, platos: e.platos.map((p) => (p.id === id ? { ...p, ...cambios } : p)) }));
    if (err) setAviso(err);
    return !err;
  }

  async function subirFoto(id: string, file?: File) {
    if (!file) return;
    const err = validarImagen(file);
    if (err) return setAviso(err);
    try {
      if (cambiar(id, { foto: await reducirImagen(file, 640, 'image/jpeg', 0.8) })) setAviso('Foto actualizada.');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar la foto.');
    }
  }

  return (
    <section className="d-card" aria-labelledby="t-carta">
      <h2 id="t-carta">Tu carta</h2>
      <p className="sub">Cambiá precios, marcá lo que se agotó o destacá platos. Se ve en la carta al instante.</p>
      <p className="sub" style={{ background: 'var(--c-acento-suave)', padding: '8px 12px', borderRadius: 10 }}>Por ahora los cambios se guardan en este dispositivo. Cuando conectemos la base de datos, se verán en todos los celulares.</p>
      {aviso && <p role="status" style={{ fontSize: 14, margin: '0 0 10px' }}>{aviso}</p>}
      {estado.categorias.map((c) => {
        const platos = estado.platos.filter((p) => p.categoria === c.id);
        if (!platos.length) return null;
        return (
          <div key={c.id} style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 15, margin: '0 0 6px' }}>{c.nombre}</h3>
            <div className="d-scroll">
              <table className="d-tabla">
                <thead>
                  <tr><th>Plato</th><th>Precio</th><th>Agotado</th><th>Destacado</th><th>Foto</th></tr>
                </thead>
                <tbody>
                  {platos.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Miniatura plato={p} />
                          <span>{p.nombre}{p.importado && <span className="tag" style={{ marginLeft: 6 }}>Importado</span>}</span>
                        </span>
                      </td>
                      <td>
                        <label className="sr-only" htmlFor={`pr-${p.id}`}>Precio de {p.nombre}</label>
                        <input key={`${p.id}-${p.precio}`} id={`pr-${p.id}`} className="d-precio" type="number" min={0} step="any" defaultValue={p.precio} onBlur={(e) => { const v = Number(e.target.value); if (e.target.value.trim() === '' || !Number.isFinite(v) || v < 0) { e.target.value = String(p.precio); return; } if (v !== p.precio) cambiar(p.id, { precio: v }); }} />
                        <div style={{ fontSize: 12, color: '#55555f', marginTop: 2 }}>{formatoPrecio(p.precio, moneda)}</div>
                      </td>
                      <td><button type="button" role="switch" aria-checked={!!p.agotado} aria-label={`${p.nombre} agotado`} className="switch" onClick={() => cambiar(p.id, { agotado: !p.agotado })} /></td>
                      <td><button type="button" role="switch" aria-checked={!!p.destacado} aria-label={`${p.nombre} destacado`} className="switch" onClick={() => cambiar(p.id, { destacado: !p.destacado })} /></td>
                      <td>
                        <label className="d-btn" style={{ minHeight: 38, cursor: 'pointer' }}>
                          <Icono nombre="subir" size={16} /> {p.foto ? 'Cambiar' : 'Subir'}
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { subirFoto(p.id, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function AumentoMasivo({ estado, actualizar, moneda }: { estado: DemoEstado; actualizar: Actualizar; moneda: string }) {
  const [categoria, setCategoria] = useState('todas');
  const [porcentaje, setPorcentaje] = useState(10);
  const [hecho, setHecho] = useState('');

  const afectados = estado.platos.filter((p) => categoria === 'todas' || p.categoria === categoria);
  const nuevo = (precio: number) => {
    const v = precio * (1 + porcentaje / 100);
    return v < 20 ? Math.round(v * 2) / 2 : v < 200 ? Math.round(v) : Math.round(v / 10) * 10;
  };
  const valido = porcentaje !== 0 && porcentaje > -90 && porcentaje <= 300;

  function aplicar() {
    const anteriores: Record<string, number> = {};
    afectados.forEach((p) => (anteriores[p.id] = p.precio));
    const err = actualizar((e) => ({ ...e, deshacerPrecios: anteriores, platos: e.platos.map((p) => (anteriores[p.id] !== undefined ? { ...p, precio: nuevo(p.precio) } : p)) }));
    setHecho(err ?? `Actualizaste ${afectados.length} precios.`);
  }

  function deshacer() {
    const ant = estado.deshacerPrecios;
    if (!ant) return;
    const err = actualizar((e) => ({ ...e, deshacerPrecios: undefined, platos: e.platos.map((p) => (ant[p.id] !== undefined ? { ...p, precio: ant[p.id] } : p)) }));
    setHecho(err ?? 'Volviste a los precios anteriores.');
  }

  return (
    <section className="d-card" aria-labelledby="t-precios">
      <h2 id="t-precios">Subir precios en un paso</h2>
      <p className="sub">Elegí una categoría o toda la carta y el porcentaje. Revisá la vista previa antes de aplicar.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>
          Categoría
          <select className="d-precio" style={{ width: 220 }} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="todas">Toda la carta</option>
            {estado.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>
          Porcentaje
          <input className="d-precio" type="number" value={porcentaje} min={-89} max={300} onChange={(e) => setPorcentaje(Number(e.target.value))} />
        </label>
        <button type="button" className="d-btn prim" onClick={aplicar} disabled={!valido || afectados.length === 0}>Aplicar a {afectados.length} platos</button>
        {estado.deshacerPrecios && <button type="button" className="d-btn" onClick={deshacer}><Icono nombre="deshacer" size={18} /> Deshacer</button>}
      </div>
      {hecho && <p role="status" style={{ fontSize: 14, marginTop: 12 }}>{hecho}</p>}
      <div className="d-scroll" style={{ marginTop: 16 }}>
        <table className="d-tabla">
          <thead><tr><th>Plato</th><th>Hoy</th><th>Nuevo</th></tr></thead>
          <tbody>
            {afectados.map((p) => (
              <tr key={p.id}><td>{p.nombre}</td><td>{formatoPrecio(p.precio, moneda)}</td><td><strong>{valido ? formatoPrecio(nuevo(p.precio), moneda) : '—'}</strong></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PedidosYVistas({ estado, moneda }: { estado: DemoEstado; moneda: string }) {
  const hoy = new Date().toDateString();
  const pedidosHoy = estado.pedidos.filter((p) => new Date(p.fecha).toDateString() === hoy || p.ejemplo);
  const total = pedidosHoy.reduce((s, p) => s + p.total, 0);
  const porModo = (m: string) => pedidosHoy.filter((p) => p.modo === m).length;

  const ranking = useMemo(() => {
    const pedidos: Record<string, number> = {};
    estado.pedidos.forEach((p) => p.items.forEach((i) => (pedidos[i.platoId] = (pedidos[i.platoId] ?? 0) + i.cantidad)));
    return estado.platos
      .map((p) => ({ plato: p, vistas: estado.vistas[p.id] ?? 0, pedidos: pedidos[p.id] ?? 0 }))
      .filter((r) => r.vistas || r.pedidos)
      .sort((a, b) => b.vistas - a.vistas)
      .slice(0, 8);
  }, [estado]);
  const maxV = Math.max(1, ...ranking.map((r) => r.vistas));

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="l">Pedidos de hoy</div><div className="v">{pedidosHoy.length}</div></div>
        <div className="kpi"><div className="l">Total de hoy</div><div className="v">{formatoPrecio(total, moneda)}</div></div>
        <div className="kpi"><div className="l">Ticket promedio</div><div className="v">{formatoPrecio(pedidosHoy.length ? total / pedidosHoy.length : 0, moneda)}</div></div>
        <div className="kpi"><div className="l">Mesa · Llevar · Delivery</div><div className="v">{porModo('mesa')} · {porModo('llevar')} · {porModo('delivery')}</div></div>
      </div>

      <section className="d-card" style={{ marginTop: 16 }} aria-labelledby="t-ranking">
        <h2 id="t-ranking">Lo más visto de la carta</h2>
        <p className="sub">Vistas contra pedidos: si un plato se mira mucho y se pide poco, quizás conviene revisar el precio o la foto.</p>
        {ranking.map((r) => (
          <div key={r.plato.id} className="ranking-fila">
            <Miniatura plato={r.plato} />
            <span className="nom">{r.plato.nombre}</span>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap', color: '#55555f' }}>{r.vistas} vistas · {r.pedidos} pedidos</span>
            <span className="barra" aria-hidden="true"><span style={{ width: `${(r.vistas / maxV) * 100}%` }} /></span>
          </div>
        ))}
      </section>

      <section className="d-card" aria-labelledby="t-pedidos">
        <h2 id="t-pedidos">Pedidos de hoy</h2>
        <p className="sub">Los marcados como ejemplo vienen con la demo. Los demás se enviaron desde esta carta.</p>
        <div className="d-scroll">
          <table className="d-tabla">
            <thead><tr><th>Hora</th><th>Modo</th><th>Detalle</th><th>Total</th></tr></thead>
            <tbody>
              {pedidosHoy.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{p.modo === 'mesa' ? `Mesa ${p.mesa ?? ''}` : p.modo === 'llevar' ? 'Para llevar' : 'Delivery'}{p.ejemplo && <span className="tag" style={{ marginLeft: 6 }}>Ejemplo</span>}</td>
                  <td>{p.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(', ')}</td>
                  <td><strong>{formatoPrecio(p.total, moneda)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Ajustes({ slug }: { slug: string }) {
  const { config } = useDemoCargada(slug);
  const [msg, setMsg] = useState('');
  if (!config) return null;

  function guardar(form: HTMLFormElement) {
    const f = new FormData(form);
    const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
    if (wa.length < 8) return setMsg('Revisá el WhatsApp: incluí código de país y de área.');
    try {
      actualizarDemo(slug, {
      whatsapp: wa,
      apertura: String(f.get('apertura')),
      cierre: String(f.get('cierre')),
      mesas: Math.min(60, Math.max(1, Number(f.get('mesas')) || 1)),
      delivery: f.get('delivery') === 'on',
      costoEnvio: Math.max(0, Number(f.get('envio')) || 0),
      direccion: String(f.get('direccion') ?? '').trim(),
      });
      setMsg('Ajustes guardados.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudieron guardar los ajustes.');
    }
  }

  return (
    <section className="d-card" aria-labelledby="t-ajustes">
      <h2 id="t-ajustes">Ajustes del local</h2>
      <form onSubmit={(e) => { e.preventDefault(); guardar(e.currentTarget); }} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp para pedidos<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Abre<input name="apertura" type="time" className="c-inp" defaultValue={config.apertura} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Cierra<input name="cierre" type="time" className="c-inp" defaultValue={config.cierre} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Mesas<input name="mesas" type="number" min={1} max={60} className="c-inp" defaultValue={config.mesas} /></label>
        </div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600, minHeight: 44 }}><input name="delivery" type="checkbox" defaultChecked={config.delivery} style={{ width: 20, height: 20 }} /> Hace delivery</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Costo de envío<input name="envio" type="number" min={0} className="c-inp" defaultValue={config.costoEnvio} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Dirección<input name="direccion" className="c-inp" defaultValue={config.direccion} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los platos de ejemplo? Se pierden los cambios de la carta.')) { reiniciarDatos(slug, config.moneda); setMsg('La carta volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}

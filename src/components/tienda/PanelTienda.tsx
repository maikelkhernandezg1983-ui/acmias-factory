'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { enlaceWhatsApp, formatoPrecio, soloDigitos } from '@/lib/utiles';
import {
  alertasStock,
  descontar,
  detalleVariante,
  diasHasta,
  inicioDelDia,
  mensajeProveedor,
  noRotan,
  porVencer,
  reposicion,
  resumenVentas,
  stockTotal,
  sumarEntrada,
  topProductos,
} from '@/lib/rubros/tienda/logica';
import type { EstadoTienda, Producto } from '@/lib/rubros/tienda/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { FotoProducto } from './FotoProducto';
import { ImportadorTienda } from './ImportadorTienda';
import { useDemoTienda, type ActualizarTienda } from './useTienda';

type Pestana = 'alertas' | 'pedidos' | 'stock' | 'ventas' | 'precios' | 'importar' | 'ajustes';
const DIA = 86_400_000;

export function PanelTienda({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoTienda(slug);
  const [pestana, setPestana] = useState<Pestana>('alertas');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const pendientes = estado.pedidos.filter((p) => p.estado === 'pendiente').length;
  const nAlertas = alertasStock(estado.productos).length + porVencer(estado.productos).length;
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'alertas', nombre: `Alertas y reposición${nAlertas ? ` (${nAlertas})` : ''}` },
    { id: 'pedidos', nombre: `Pedidos de WhatsApp${pendientes ? ` (${pendientes})` : ''}` },
    { id: 'stock', nombre: 'Stock y entradas' },
    { id: 'ventas', nombre: 'Ventas' },
    { id: 'precios', nombre: 'Subir precios' },
    { id: 'importar', nombre: 'Cargar planilla' },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];

  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Productos, stock y precios de ejemplo" />
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
            <Link className="d-btn" href={`/d/${slug}/mostrador`}><Icono nombre="carrito" size={18} /> Mostrador</Link>
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="ojo" size={18} /> Ver tienda</Link>
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
        {pestana === 'alertas' && <Alertas estado={estado} actualizar={actualizar} config={config} />}
        {pestana === 'pedidos' && <Pedidos estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'stock' && <Stock estado={estado} actualizar={actualizar} />}
        {pestana === 'ventas' && <Ventas estado={estado} moneda={config.moneda} />}
        {pestana === 'precios' && <Precios estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'importar' && <ImportadorTienda estado={estado} actualizar={actualizar} moneda={config.moneda} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} config={config} estado={estado} actualizar={actualizar} />}
      </main>
    </div>
  );
}

function Mini({ p }: { p: Producto }) {
  return <FotoProducto producto={p} className="mini-thumb" />;
}

function Alertas({ estado, actualizar, config }: { estado: EstadoTienda; actualizar: ActualizarTienda; config: DemoConfig }) {
  const faltantes = alertasStock(estado.productos);
  const vencen = porVencer(estado.productos);
  const filas = useMemo(() => reposicion(estado), [estado]);
  const [cant, setCant] = useState<Record<string, number>>({});
  const elegidas = filas.map((f) => ({ ...f, sugerido: cant[f.variante.id] ?? f.sugerido })).filter((f) => f.sugerido > 0);

  return (
    <>
      <section className="d-card" aria-labelledby="t-falt">
        <h2 id="t-falt">Por quedarte sin stock</h2>
        <p className="sub">Productos en el mínimo o por debajo. Se calcula solo con cada venta del mostrador y cada pedido confirmado.</p>
        {faltantes.length === 0 && <p className="sub">Todo en orden: nada por debajo del mínimo.</p>}
        <ul className="alertas">
          {faltantes.map(({ producto, variante }) => (
            <li key={variante.id} className={variante.stock === 0 ? 'cero' : ''}>
              <Mini p={producto} />
              <div>
                <strong>{producto.nombre}{producto.variantes.length > 1 ? ` · ${detalleVariante(variante)}` : ''}</strong>
                <span>{variante.stock === 0 ? 'Sin stock' : `Quedan ${variante.stock}`} (mínimo {variante.minimo}) · se venden {(reposicionDiaria(estado, variante.id) * 7).toLocaleString('es', { maximumFractionDigits: 1 })} por semana</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {estado.variante === 'almacen' && (
        <section className="d-card" aria-labelledby="t-venc">
          <h2 id="t-venc">Vence pronto</h2>
          <p className="sub">Lotes que vencen en los próximos 7 días: ponelos adelante, en oferta o pedí el cambio al proveedor.</p>
          {vencen.length === 0 && <p className="sub">Nada vence esta semana.</p>}
          <ul className="alertas">
            {vencen.map(({ producto, lote }) => {
              const d = diasHasta(lote.vence);
              return (
                <li key={lote.id} className={d < 0 ? 'cero' : ''}>
                  <Mini p={producto} />
                  <div>
                    <strong>{producto.nombre}</strong>
                    <span>{lote.cantidad} u. · {d < 0 ? `venció hace ${-d} ${-d === 1 ? 'día' : 'días'}` : d === 0 ? 'vence hoy' : `vence en ${d} ${d === 1 ? 'día' : 'días'}`} ({new Date(`${lote.vence}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })})</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="d-card" aria-labelledby="t-repo">
        <h2 id="t-repo">Pedido sugerido al proveedor</h2>
        <p className="sub">Ventas promedio de las últimas 4 semanas × {estado.coberturaDias} días de cobertura − stock actual. Ajustá las cantidades y mandalo por WhatsApp.</p>
        <div className="d-scroll">
          <table className="d-tabla">
            <thead><tr><th>Producto</th><th>Stock</th><th>Vende por día</th><th>Pedir</th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.variante.id}>
                  <td>{f.producto.nombre}{f.producto.variantes.length > 1 ? <span style={{ color: '#55555f' }}> · {detalleVariante(f.variante)}</span> : null}</td>
                  <td>{f.variante.stock}</td>
                  <td>{f.diaria.toLocaleString('es', { maximumFractionDigits: 1 })}</td>
                  <td>
                    <label className="sr-only" htmlFor={`rp-${f.variante.id}`}>Cantidad a pedir de {f.producto.nombre} {detalleVariante(f.variante)}</label>
                    <input id={`rp-${f.variante.id}`} className="d-precio" style={{ width: 80 }} type="number" min={0} value={cant[f.variante.id] ?? f.sugerido} onChange={(e) => setCant((c) => ({ ...c, [f.variante.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <a className={`d-btn prim${elegidas.length ? '' : ' deshabilitado'}`} aria-disabled={!elegidas.length} href={elegidas.length ? enlaceWhatsApp(estado.proveedor.whatsapp, mensajeProveedor(config, estado.proveedor.nombre, elegidas)) : undefined} target="_blank" rel="noopener noreferrer">
            <Icono nombre="whatsapp" size={18} /> Enviar pedido a {estado.proveedor.nombre}
          </a>
          <span className="sub" style={{ margin: 0 }}>{elegidas.length} productos · {elegidas.reduce((s, f) => s + f.sugerido, 0)} unidades</span>
        </div>
        <EntradaRapida estado={estado} actualizar={actualizar} />
      </section>
    </>
  );
}

function reposicionDiaria(estado: EstadoTienda, varianteId: string) {
  const desde = Date.now() - 28 * DIA;
  return estado.movimientos.filter((m) => m.varianteId === varianteId && m.cantidad < 0 && m.origen !== 'ajuste' && new Date(m.fecha).getTime() >= desde).reduce((s, m) => s - m.cantidad, 0) / 28;
}

function EntradaRapida({ estado, actualizar }: { estado: EstadoTienda; actualizar: ActualizarTienda }) {
  const [msg, setMsg] = useState('');
  return (
    <p className="sub" style={{ marginTop: 14 }}>
      ¿Llegó la mercadería? Cargala en <strong>Stock y entradas</strong> y las alertas se actualizan solas.
      {msg && <span role="status"> {msg}</span>}
      <button type="button" className="d-btn" style={{ marginLeft: 8, minHeight: 36 }} onClick={() => {
        // Atajo de demo: recibe todo lo sugerido de una vez.
        const filas = reposicion(estado);
        if (!filas.length) return setMsg('No hay nada para reponer.');
        const err = actualizar((e) => filas.reduce((acc, f) => sumarEntrada(acc, f.producto.id, f.variante.id, f.sugerido), e));
        setMsg(err ?? `Recibiste ${filas.length} productos: stock actualizado.`);
      }}>Recibir todo lo sugerido</button>
    </p>
  );
}

function Pedidos({ estado, actualizar, moneda }: { estado: EstadoTienda; actualizar: ActualizarTienda; moneda: string }) {
  const [msg, setMsg] = useState('');
  function confirmar(id: string) {
    const pe = estado.pedidos.find((x) => x.id === id);
    if (!pe) return;
    let problema: string | null = null;
    const err = actualizar((e) => {
      const r = descontar(e, pe.items.map((i) => ({ productoId: i.productoId, varianteId: i.varianteId, cantidad: i.cantidad, precio: i.precio })), 'whatsapp');
      if (typeof r === 'string') {
        problema = r;
        return e;
      }
      return { ...r, pedidos: r.pedidos.map((x) => (x.id === id ? { ...x, estado: 'confirmado' as const } : x)) };
    });
    setMsg(problema ?? err ?? 'Pedido confirmado: el stock ya se descontó.');
  }
  function cancelar(id: string) {
    const err = actualizar((e) => ({ ...e, pedidos: e.pedidos.map((x) => (x.id === id ? { ...x, estado: 'cancelado' as const } : x)) }));
    setMsg(err ?? 'Pedido cancelado.');
  }
  return (
    <section className="d-card" aria-labelledby="t-ped">
      <h2 id="t-ped">Pedidos de WhatsApp</h2>
      <p className="sub">Llegan desde la tienda con producto, talle, color y cantidad. Al confirmar, el stock se descuenta solo.</p>
      {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
      <div className="d-scroll">
        <table className="d-tabla">
          <thead><tr><th>Cuándo</th><th>Cliente</th><th>Detalle</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>
            {estado.pedidos.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td>{p.nombre ?? 'Cliente'}{p.ejemplo && <span className="tag" style={{ marginLeft: 6 }}>Ejemplo</span>}<div style={{ fontSize: 12, color: '#55555f' }}>{p.entrega === 'envio' ? `Envío: ${p.direccion}` : 'Retira en el local'}</div></td>
                <td>{p.items.map((i) => `${i.cantidad} × ${i.nombre} (${i.detalle})`).join(', ')}</td>
                <td><strong>{formatoPrecio(p.total, moneda)}</strong></td>
                <td>
                  {p.estado === 'pendiente' ? (
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" className="d-btn prim" style={{ minHeight: 36 }} onClick={() => confirmar(p.id)} aria-label={`Confirmar pedido de ${p.nombre ?? 'cliente'}`}>Confirmar</button>
                      <button type="button" className="d-btn" style={{ minHeight: 36 }} onClick={() => cancelar(p.id)}>Cancelar</button>
                    </span>
                  ) : (
                    <span className={`tag ${p.estado === 'confirmado' ? 'conf-alta' : 'conf-baja'}`}>{p.estado === 'confirmado' ? 'Confirmado' : 'Cancelado'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stock({ estado, actualizar }: { estado: EstadoTienda; actualizar: ActualizarTienda }) {
  const [msg, setMsg] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const almacen = estado.variante === 'almacen';

  function cambiar(pid: string, vid: string, campo: 'minimo', valor: number) {
    const err = actualizar((e) => ({ ...e, productos: e.productos.map((p) => (p.id !== pid ? p : { ...p, variantes: p.variantes.map((v) => (v.id === vid ? { ...v, [campo]: valor } : v)) })) }));
    if (err) setMsg(err);
  }

  return (
    <section className="d-card" aria-labelledby="t-stock">
      <h2 id="t-stock">Stock y entradas de mercadería</h2>
      <p className="sub">Cada venta y cada pedido confirmado descuentan solos. Acá cargás lo que entra y fijás el mínimo para las alertas.</p>
      {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
      {estado.productos.map((p) => (
        <div key={p.id} className="stock-prod">
          <button type="button" className="stock-cab" aria-expanded={abierto === p.id} onClick={() => setAbierto((x) => (x === p.id ? null : p.id))}>
            <Mini p={p} />
            <span><strong>{p.nombre}</strong><span>{p.categoria} · {p.variantes.length > 1 ? `${p.variantes.length} variantes · ` : ''}stock {stockTotal(p)}</span></span>
            <Icono nombre={abierto === p.id ? 'menos' : 'mas'} size={18} />
          </button>
          {abierto === p.id && (
            <div className="d-scroll">
              <table className="d-tabla">
                <thead><tr><th>Variante</th><th>Código</th><th>Stock</th><th>Mínimo</th><th>Entrada</th></tr></thead>
                <tbody>
                  {p.variantes.map((v) => (
                    <FilaVariante key={v.id} p={p} v={v} almacen={almacen} onMinimo={(n) => cambiar(p.id, v.id, 'minimo', n)} onEntrada={(n, vence) => {
                      const err = actualizar((e) => sumarEntrada(e, p.id, v.id, n, vence));
                      setMsg(err ?? `Entraron ${n} de ${p.nombre}${p.variantes.length > 1 ? ` (${detalleVariante(v)})` : ''}.`);
                    }} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function FilaVariante({ p, v, almacen, onMinimo, onEntrada }: { p: Producto; v: Producto['variantes'][number]; almacen: boolean; onMinimo: (n: number) => void; onEntrada: (n: number, vence?: string) => void }) {
  const [n, setN] = useState(0);
  const [vence, setVence] = useState('');
  const nombre = `${p.nombre} ${detalleVariante(v)}`;
  return (
    <tr className={v.stock <= v.minimo ? 'fila-baja' : ''}>
      <td>{detalleVariante(v)}{v.lotes?.length ? <div style={{ fontSize: 12, color: '#55555f' }}>{v.lotes.filter((l) => l.cantidad > 0).map((l) => `${l.cantidad} vence ${l.vence.slice(8)}/${l.vence.slice(5, 7)}`).join(' · ')}</div> : null}</td>
      <td><code style={{ fontSize: 12 }}>{v.codigoBarras}</code></td>
      <td><strong>{v.stock}</strong></td>
      <td>
        <label className="sr-only" htmlFor={`mi-${v.id}`}>Mínimo de {nombre}</label>
        <input key={`${v.id}-${v.minimo}`} id={`mi-${v.id}`} className="d-precio" style={{ width: 70 }} type="number" min={0} defaultValue={v.minimo} onBlur={(e) => { const x = Math.floor(Number(e.target.value)); if (Number.isFinite(x) && x >= 0 && x !== v.minimo) onMinimo(x); }} />
      </td>
      <td>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="sr-only" htmlFor={`en-${v.id}`}>Unidades que entran de {nombre}</label>
          <input id={`en-${v.id}`} className="d-precio" style={{ width: 70 }} type="number" min={0} value={n || ''} placeholder="0" onChange={(e) => setN(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
          {almacen && (
            <>
              <label className="sr-only" htmlFor={`ve-${v.id}`}>Vencimiento del lote de {nombre}</label>
              <input id={`ve-${v.id}`} className="d-precio" style={{ width: 150 }} type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
            </>
          )}
          <button type="button" className="d-btn" style={{ minHeight: 36 }} disabled={!n} onClick={() => { onEntrada(n, vence || undefined); setN(0); setVence(''); }} aria-label={`Sumar entrada de ${nombre}`}>Sumar</button>
        </span>
      </td>
    </tr>
  );
}

function Ventas({ estado, moneda }: { estado: EstadoTienda; moneda: string }) {
  // La hora se toma una vez al abrir la pestaña.
  const [ahora] = useState(() => Date.now());
  const hoy = inicioDelDia(ahora);
  const rHoy = resumenVentas(estado.movimientos, hoy, ahora + 1);
  const rAyer = resumenVentas(estado.movimientos, hoy - DIA, hoy);
  const rSem = resumenVentas(estado.movimientos, ahora - 7 * DIA, ahora + 1);
  const rSemAnt = resumenVentas(estado.movimientos, ahora - 14 * DIA, ahora - 7 * DIA);
  const top = topProductos(estado.productos, estado.movimientos, 7);
  const quietos = noRotan(estado.productos, estado.movimientos, 30);
  const max = Math.max(1, ...top.map((t) => t.unidades));
  const p = (v: number) => formatoPrecio(v, moneda);
  const vs = (a: number, b: number) => (b ? `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))} % vs. ${'anterior'}` : '—');
  const ultimos = [...estado.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12);
  const nombre = (pid: string) => estado.productos.find((x) => x.id === pid)?.nombre ?? '—';

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="l">Ventas de hoy</div><div className="v">{p(rHoy.total)}</div><div className="l">{vs(rHoy.total, rAyer.total).replace('anterior', 'ayer')}</div></div>
        <div className="kpi"><div className="l">Últimos 7 días</div><div className="v">{p(rSem.total)}</div><div className="l">{vs(rSem.total, rSemAnt.total).replace('anterior', 'semana anterior')}</div></div>
        <div className="kpi"><div className="l">Unidades en 7 días</div><div className="v">{rSem.unidades}</div></div>
        <div className="kpi"><div className="l">Productos sin vender en 30 días</div><div className="v">{quietos.length}</div></div>
      </div>
      <section className="d-card" style={{ marginTop: 16 }} aria-labelledby="t-top">
        <h2 id="t-top">Lo más vendido de la semana</h2>
        {top.map((t) => (
          <div key={t.producto.id} className="ranking-fila">
            <Mini p={t.producto} />
            <span className="nom">{t.producto.nombre}</span>
            <span style={{ fontSize: 13, color: '#55555f', whiteSpace: 'nowrap' }}>{t.unidades} u.</span>
            <span className="barra" aria-hidden="true"><span style={{ width: `${(t.unidades / max) * 100}%` }} /></span>
          </div>
        ))}
      </section>
      <section className="d-card" aria-labelledby="t-quietos">
        <h2 id="t-quietos">Lo que no rota</h2>
        <p className="sub">Sin ventas en los últimos 30 días: candidatos a liquidar, combinar en promo o dejar de comprar.</p>
        {quietos.length === 0 && <p className="sub">Todo se movió este mes.</p>}
        <ul className="alertas">
          {quietos.map((q) => (
            <li key={q.id}><Mini p={q} /><div><strong>{q.nombre}</strong><span>{stockTotal(q)} u. en stock · {p(q.precio * stockTotal(q))} inmovilizados</span></div></li>
          ))}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-mov">
        <h2 id="t-mov">Últimos movimientos</h2>
        <div className="d-scroll">
          <table className="d-tabla">
            <thead><tr><th>Cuándo</th><th>Producto</th><th>Cantidad</th><th>Origen</th></tr></thead>
            <tbody>
              {ultimos.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{nombre(m.productoId)}</td>
                  <td>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                  <td>{{ mostrador: 'Mostrador', whatsapp: 'WhatsApp', entrada: 'Entrada', ajuste: 'Ajuste' }[m.origen]}{m.medio ? ` · ${m.medio}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Precios({ estado, actualizar, moneda }: { estado: EstadoTienda; actualizar: ActualizarTienda; moneda: string }) {
  const [cat, setCat] = useState('todas');
  const [pc, setPc] = useState(10);
  const [hecho, setHecho] = useState('');
  const afectados = estado.productos.filter((p) => cat === 'todas' || p.categoria === cat);
  const nuevo = (v0: number) => {
    const v = v0 * (1 + pc / 100);
    return v < 20 ? Math.round(v * 2) / 2 : v < 200 ? Math.round(v) : Math.round(v / 10) * 10;
  };
  const valido = pc !== 0 && pc > -90 && pc <= 300;
  return (
    <section className="d-card" aria-labelledby="t-pre">
      <h2 id="t-pre">Subir precios en un paso</h2>
      <p className="sub">Por categoría o toda la tienda, con vista previa. Si te equivocás, lo deshacés.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Categoría
          <select className="d-precio" style={{ width: 220 }} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="todas">Toda la tienda</option>
            {estado.categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Porcentaje
          <input className="d-precio" type="number" value={pc} onChange={(e) => setPc(Number(e.target.value))} />
        </label>
        <button type="button" className="d-btn prim" disabled={!valido || !afectados.length} onClick={() => {
          const ant: Record<string, number> = {};
          afectados.forEach((p) => (ant[p.id] = p.precio));
          const err = actualizar((e) => ({ ...e, deshacerPrecios: ant, productos: e.productos.map((p) => (ant[p.id] !== undefined ? { ...p, precio: nuevo(p.precio) } : p)) }));
          setHecho(err ?? `Actualizaste ${afectados.length} precios.`);
        }}>Aplicar a {afectados.length} productos</button>
        {estado.deshacerPrecios && <button type="button" className="d-btn" onClick={() => {
          const ant = estado.deshacerPrecios!;
          const err = actualizar((e) => ({ ...e, deshacerPrecios: undefined, productos: e.productos.map((p) => (ant[p.id] !== undefined ? { ...p, precio: ant[p.id] } : p)) }));
          setHecho(err ?? 'Volviste a los precios anteriores.');
        }}><Icono nombre="deshacer" size={18} /> Deshacer</button>}
      </div>
      {hecho && <p role="status" style={{ fontSize: 14, marginTop: 12 }}>{hecho}</p>}
      <div className="d-scroll" style={{ marginTop: 16 }}>
        <table className="d-tabla">
          <thead><tr><th>Producto</th><th>Hoy</th><th>Nuevo</th></tr></thead>
          <tbody>{afectados.map((p) => <tr key={p.id}><td>{p.nombre}</td><td>{formatoPrecio(p.precio, moneda)}</td><td><strong>{valido ? formatoPrecio(nuevo(p.precio), moneda) : '—'}</strong></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function Ajustes({ slug, config, estado, actualizar }: { slug: string; config: DemoConfig; estado: EstadoTienda; actualizar: ActualizarTienda }) {
  const [msg, setMsg] = useState('');
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">Ajustes de la tienda</h2>
      <form
        style={{ display: 'grid', gap: 12, maxWidth: 520 }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
          const prov = soloDigitos(String(f.get('provWa') ?? ''));
          if (wa.length < 8 || prov.length < 8) return setMsg('Revisá los WhatsApp: incluí código de país y de área.');
          try {
            actualizarDemo(slug, { whatsapp: wa, direccion: String(f.get('direccion') ?? '').trim() });
            const err = actualizar((x) => ({
              ...x,
              proveedor: { nombre: String(f.get('provNombre') ?? '').trim() || x.proveedor.nombre, whatsapp: prov },
              coberturaDias: Math.min(90, Math.max(1, Math.floor(Number(f.get('cobertura')) || 14))),
              costoEnvio: Math.max(0, Number(f.get('envio')) || 0),
            }));
            setMsg(err ?? 'Ajustes guardados.');
          } catch (er) {
            setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.');
          }
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp de la tienda<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Dirección<input name="direccion" className="c-inp" defaultValue={config.direccion} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Proveedor<input name="provNombre" className="c-inp" defaultValue={estado.proveedor.nombre} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp del proveedor<input name="provWa" className="c-inp" defaultValue={estado.proveedor.whatsapp} inputMode="tel" /></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Días de cobertura<input name="cobertura" type="number" min={1} max={90} className="c-inp" defaultValue={estado.coberturaDias} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Costo de envío<input name="envio" type="number" min={0} className="c-inp" defaultValue={estado.costoEnvio} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, 'tienda', estado.variante); setMsg('La tienda volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}

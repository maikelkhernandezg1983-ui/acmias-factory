'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { leerArchivo } from '@/components/repuestos/ImportadorPlanilla';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { enlaceWhatsApp, formatoPrecio, soloDigitos } from '@/lib/utiles';
import { CATEGORIAS, catalogoBase, sinAcentos } from '@/lib/rubros/ferreteria/catalogo';
import { NOMBRE_TIPO, buscar, estadoStock, faltantes, mensajePresupuesto, mensajeProveedor, mensajeRecordar, sugerido, totalPresupuesto, venceEl, venderPresupuesto } from '@/lib/rubros/ferreteria/logica';
import type { EstadoFerreteria, Producto, TipoCliente } from '@/lib/rubros/ferreteria/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { Cotizador } from './Cotizador';
import { useDemoFerreteria, type ActualizarFer } from './useFerreteria';

type Pestana = 'cotizador' | 'presupuestos' | 'clientes' | 'stock' | 'precios' | 'sinonimos' | 'ajustes';
const DIA = 86_400_000;
const origen = () => (typeof window !== 'undefined' ? window.location.origin : '');

export function PanelFerreteria({ slug }: { slug: string }) {
  const { config, estado, lista, actualizar, estilo, listo } = useDemoFerreteria(slug);
  const [pestana, setPestana] = useState<Pestana>('cotizador');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const abiertos = estado.presupuestos.filter((p) => p.estado === 'abierto').length;
  const nFalt = faltantes(lista).length;
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'cotizador', nombre: 'Cotizador' },
    { id: 'presupuestos', nombre: `Presupuestos${abiertos ? ` (${abiertos})` : ''}` },
    { id: 'clientes', nombre: 'Clientes' },
    { id: 'stock', nombre: `Stock y reposición${nFalt ? ` (${nFalt})` : ''}` },
    { id: 'precios', nombre: 'Precios y proveedores' },
    { id: 'sinonimos', nombre: 'Sinónimos' },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];
  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Productos, precios y clientes de ejemplo" />
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
              <div style={{ fontSize: 13, opacity: 0.9 }}>Mostrador y panel · {lista.length.toLocaleString('es')} productos</div>
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
        {pestana === 'cotizador' && <Cotizador config={config} estado={estado} lista={lista} actualizar={actualizar} slug={slug} />}
        {pestana === 'presupuestos' && <Presupuestos config={config} estado={estado} lista={lista} actualizar={actualizar} slug={slug} />}
        {pestana === 'clientes' && <Clientes config={config} estado={estado} actualizar={actualizar} />}
        {pestana === 'stock' && <Stock config={config} estado={estado} lista={lista} actualizar={actualizar} />}
        {pestana === 'precios' && <Precios config={config} estado={estado} lista={lista} actualizar={actualizar} />}
        {pestana === 'sinonimos' && <Sinonimos estado={estado} lista={lista} actualizar={actualizar} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} config={config} estado={estado} actualizar={actualizar} />}
      </main>
    </div>
  );
}

// ---------------- Presupuestos (FER-08, FER-11) ----------------

function Presupuestos({ config, estado, lista, actualizar, slug }: { config: DemoConfig; estado: EstadoFerreteria; lista: Producto[]; actualizar: ActualizarFer; slug: string }) {
  const [ahora] = useState(() => Date.now());
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState<'abierto' | 'vendido' | 'todos'>('abierto');
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const listaP = estado.presupuestos.filter((x) => filtro === 'todos' || x.estado === filtro);
  const abiertos = estado.presupuestos.filter((x) => x.estado === 'abierto');
  const vendidos = estado.presupuestos.filter((x) => x.estado === 'vendido');
  return (
    <section className="d-card" aria-labelledby="t-pres">
      <h2 id="t-pres">Presupuestos</h2>
      <p className="sub">{abiertos.length} abiertos por {p(abiertos.reduce((s, x) => s + totalPresupuesto(x), 0))} · {vendidos.length} convertidos en venta. Los que llevan días sin respuesta, recordalos con un toque.</p>
      <div className="ag-profs" role="group" aria-label="Filtrar presupuestos" style={{ marginBottom: 12 }}>
        {(['abierto', 'vendido', 'todos'] as const).map((f) => <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{f === 'abierto' ? 'Abiertos' : f === 'vendido' ? 'Vendidos' : 'Todos'}</button>)}
      </div>
      {msg && <p role="status" className="fer-aviso">{msg}</p>}
      <ul className="fer-pres">
        {listaP.map((x) => {
          const c = estado.clientes.find((y) => y.id === x.clienteId);
          const dias = Math.floor((ahora - +new Date(x.fecha)) / DIA);
          const vencido = x.estado === 'abierto' && +venceEl(x) < ahora;
          const enlace = `${origen()}/d/${slug}/presupuesto/${x.id}`;
          return (
            <li key={x.id} className={x.estado}>
              <div className="fer-pres-txt">
                <strong>N.º {x.numero} · {c?.nombre ?? 'Cliente de paso'}</strong>
                <span>{x.lineas.length} productos · {p(totalPresupuesto(x))} · {NOMBRE_TIPO[x.tipo]}</span>
                <span className={dias >= 3 && x.estado === 'abierto' ? 'fer-viejo' : ''}>{x.estado === 'vendido' ? 'Vendido' : vencido ? 'Vencido' : dias === 0 ? 'Enviado hoy' : `Enviado hace ${dias} ${dias === 1 ? 'día' : 'días'}`}{x.recordado ? ' · recordado' : ''}</span>
              </div>
              <div className="bar-acciones">
                <Link className="d-btn" href={`/d/${slug}/presupuesto/${x.id}`}>PDF</Link>
                {x.estado === 'abierto' && (
                  <>
                    <a className="d-btn" href={enlaceWhatsApp(c?.whatsapp ?? '', dias >= 1 ? mensajeRecordar(x, { negocio: config.negocio, enlace, cliente: c?.nombre }) : mensajePresupuesto(x, lista, { negocio: config.negocio, moneda: config.moneda, enlace, cliente: c?.nombre }))} target="_blank" rel="noopener noreferrer" onClick={() => dias >= 1 && actualizar((e) => ({ ...e, presupuestos: e.presupuestos.map((y) => (y.id === x.id ? { ...y, recordado: new Date().toISOString() } : y)) }))}>
                      <Icono nombre="whatsapp" size={16} /> {dias >= 1 ? 'Recordar' : 'Reenviar'}
                    </a>
                    <button type="button" className="d-btn prim" onClick={() => {
                      let fallo = '';
                      const err = actualizar((e) => {
                        const r = venderPresupuesto(e, x.id, lista);
                        if (typeof r === 'string') {
                          fallo = r;
                          return e;
                        }
                        return r;
                      });
                      setMsg(fallo || err || `Presupuesto N.º ${x.numero} convertido en venta. Se descontó el stock.`);
                    }}><Icono nombre="check" size={16} /> Convertir en venta</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {!listaP.length && <li>No hay presupuestos acá.</li>}
      </ul>
    </section>
  );
}

// ---------------- Clientes (FER-09, FER-10) ----------------

function Clientes({ config, estado, actualizar }: { config: DemoConfig; estado: EstadoFerreteria; actualizar: ActualizarFer }) {
  const [abierto, setAbierto] = useState<string | null>(estado.clientes[0]?.id ?? null);
  const [msg, setMsg] = useState('');
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const c = estado.clientes.find((x) => x.id === abierto);
  const suyos = c ? estado.presupuestos.filter((x) => x.clienteId === c.id) : [];
  return (
    <>
      <section className="d-card" aria-labelledby="t-listas">
        <h2 id="t-listas">Listas de precios por tipo de cliente</h2>
        <p className="sub">Se aplican solas en el cotizador según el cliente elegido.</p>
        <div className="fer-listas">
          {(Object.keys(NOMBRE_TIPO) as TipoCliente[]).map((t) => (
            <label key={t}>{NOMBRE_TIPO[t]}
              <span><input className="c-inp" type="number" min={0} max={60} value={estado.descuentos[t]} onChange={(e) => actualizar((x) => ({ ...x, descuentos: { ...x.descuentos, [t]: Math.min(60, Math.max(0, Number(e.target.value) || 0)) } }))} /> % de descuento</span>
            </label>
          ))}
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-cli">
        <h2 id="t-cli">Clientes frecuentes</h2>
        <div className="ag-profs" role="group" aria-label="Clientes" style={{ marginBottom: 12 }}>
          {estado.clientes.map((x) => <button key={x.id} type="button" aria-pressed={abierto === x.id} onClick={() => setAbierto(x.id)}>{x.nombre}</button>)}
        </div>
        {c && (
          <div className="fer-ficha">
            <div>
              <strong style={{ fontSize: 18 }}>{c.nombre}</strong>
              <p className="sub" style={{ margin: '2px 0 8px' }}>{c.oficio} · Lista {NOMBRE_TIPO[c.tipo].toLowerCase()} (−{estado.descuentos[c.tipo]} %) · +{c.whatsapp}</p>
              <div className="met-grid">
                <div className="met"><strong>{suyos.filter((x) => x.estado === 'vendido').length}</strong><span>Compras</span></div>
                <div className="met"><strong>{p(suyos.filter((x) => x.estado === 'vendido').reduce((s, x) => s + totalPresupuesto(x), 0))}</strong><span>Comprado</span></div>
                <div className="met"><strong>{suyos.filter((x) => x.estado === 'abierto').length}</strong><span>Presupuestos abiertos</span></div>
              </div>
            </div>
            <ul className="fc-hist" style={{ marginTop: 12 }}>
              {suyos.map((x) => <li key={x.id}><span>N.º {x.numero} · {new Date(x.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span><span>{x.lineas.length} productos · {p(totalPresupuesto(x))}</span><span className={`bar-estado ${x.estado === 'vendido' ? 'est-atendido' : 'est-reservado'}`}>{x.estado === 'vendido' ? 'Vendido' : 'Abierto'}</span></li>)}
              {!suyos.length && <li>Todavía no tiene presupuestos.</li>}
            </ul>
          </div>
        )}
        <form
          className="fer-nuevo-cli"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const nombre = String(f.get('nombre') ?? '').trim();
            const wa = soloDigitos(String(f.get('wa') ?? ''));
            if (nombre.length < 2 || wa.length < 8) return setMsg('Completá nombre y WhatsApp con código de área.');
            const id = `cl-${Math.random().toString(36).slice(2, 7)}`;
            const err = actualizar((x) => ({ ...x, clientes: [...x.clientes, { id, nombre, oficio: String(f.get('oficio') ?? '').trim() || 'Cliente', tipo: f.get('tipo') as TipoCliente, whatsapp: wa }] }));
            setMsg(err ?? `${nombre} agregado.`);
            if (!err) {
              setAbierto(id);
              e.currentTarget.reset();
            }
          }}
        >
          <h3>Nuevo cliente</h3>
          <input name="nombre" className="c-inp" placeholder="Nombre" aria-label="Nombre del cliente" />
          <input name="oficio" className="c-inp" placeholder="Oficio (plomero, gasista…)" aria-label="Oficio" />
          <input name="wa" className="c-inp" placeholder="WhatsApp" inputMode="tel" aria-label="WhatsApp del cliente" />
          <select name="tipo" className="c-inp" aria-label="Lista de precios" defaultValue="profesional">{(Object.keys(NOMBRE_TIPO) as TipoCliente[]).map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}</select>
          <button type="submit" className="d-btn prim">Agregar</button>
        </form>
        {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
      </section>
    </>
  );
}

// ---------------- Stock y reposición (FER-14) ----------------

function Stock({ config, estado, lista, actualizar }: { config: DemoConfig; estado: EstadoFerreteria; lista: Producto[]; actualizar: ActualizarFer }) {
  const [cat, setCat] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const falt = faltantes(lista).filter((p) => !cat || p.categoria === cat);
  const muestra = falt.slice(0, 40);
  return (
    <section className="d-card" aria-labelledby="t-stock">
      <h2 id="t-stock">Stock bajo el mínimo</h2>
      <p className="sub">{falt.length} productos por debajo del mínimo. El pedido sugerido repone hasta tres veces el mínimo.</p>
      <div className="ag-profs" role="group" aria-label="Categoría" style={{ marginBottom: 12 }}>
        <button type="button" aria-pressed={!cat} onClick={() => setCat(null)}>Todas</button>
        {CATEGORIAS.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="bar-acciones" style={{ marginBottom: 12 }}>
        <a className="d-btn prim" href={enlaceWhatsApp(estado.proveedor.whatsapp, mensajeProveedor(muestra.slice(0, 25), config.negocio))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={16} /> Pedir al proveedor ({Math.min(25, muestra.length)})</a>
        <button type="button" className="d-btn" onClick={() => {
          const err = actualizar((e) => ({ ...e, stock: { ...e.stock, ...Object.fromEntries(muestra.map((p) => [p.id, p.stock + sugerido(p)])) } }));
          setMsg(err ?? `Recibiste ${muestra.length} productos: el stock se actualizó.`);
        }}>Recibir lo sugerido</button>
      </div>
      {msg && <p role="status" className="fer-aviso">{msg}</p>}
      <div className="d-scroll">
        <table className="d-tabla">
          <thead><tr><th>Producto</th><th>Stock</th><th>Mínimo</th><th>Sugerido</th></tr></thead>
          <tbody>
            {muestra.map((p) => (
              <tr key={p.id} className={p.stock === 0 ? 'fila-baja' : ''}>
                <td><strong>{p.nombre}</strong><br /><small>{p.codigo} · {p.linea}</small></td>
                <td><span className={`fer-stock ${estadoStock(p)}`}>{p.stock} {p.base === 'm' ? 'm' : 'u.'}</span></td>
                <td>{p.minimo}</td>
                <td><strong>{sugerido(p)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {falt.length > muestra.length && <p className="sub" style={{ marginTop: 8 }}>Y {falt.length - muestra.length} más.</p>}
    </section>
  );
}

// ---------------- Precios y proveedores (FER-13) ----------------

function Precios({ config, estado, lista, actualizar }: { config: DemoConfig; estado: EstadoFerreteria; lista: Producto[]; actualizar: ActualizarFer }) {
  const [cat, setCat] = useState('todas');
  const [pc, setPc] = useState(8);
  const [msg, setMsg] = useState('');
  const [importados, setImportados] = useState<{ p: Producto; nuevo: number }[] | null>(null);
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const afectados = useMemo(() => lista.filter((x) => cat === 'todas' || x.categoria === cat), [lista, cat]);
  const nuevo = (v: number) => (v < 20 ? Math.round(v * (1 + pc / 100) * 100) / 100 : Math.round(v * (1 + pc / 100)));
  const valido = pc !== 0 && pc > -90 && pc <= 300;

  async function importar(f?: File) {
    if (!f) return;
    try {
      const filas = await leerArchivo(f);
      const porCodigo = new Map(lista.map((x) => [sinAcentos(x.codigo), x]));
      const out: { p: Producto; nuevo: number }[] = [];
      for (const fila of filas) {
        const prod = porCodigo.get(sinAcentos(String(fila[0] ?? '').trim()));
        const precio = Number(String(fila.find((c, i) => i > 0 && /^\d+([.,]\d+)?$/.test(String(c).trim())) ?? '').replace(',', '.'));
        if (prod && precio > 0) out.push({ p: prod, nuevo: precio });
      }
      if (!out.length) return setMsg('No encontramos códigos del catálogo en la lista. La primera columna tiene que ser el código (ej.: PVC-0003) y otra columna el precio.');
      setImportados(out);
      setMsg(`Encontramos ${out.length} productos en la lista del proveedor. Revisá y aplicá.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No pudimos leer el archivo.');
    }
  }

  return (
    <>
      <section className="d-card" aria-labelledby="t-aum">
        <h2 id="t-aum">Aumento por porcentaje</h2>
        <p className="sub">Por categoría o todo el catálogo, con vista previa. Si te equivocás, lo deshacés.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Categoría
            <select className="c-inp" style={{ width: 220 }} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="todas">Todo el catálogo</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Porcentaje
            <input className="c-inp" style={{ width: 120 }} type="number" value={pc} onChange={(e) => setPc(Number(e.target.value))} />
          </label>
          <button type="button" className="d-btn prim" disabled={!valido} onClick={() => {
            const ant: Record<string, number> = {};
            const nuevos: Record<string, number> = {};
            afectados.forEach((x) => { ant[x.id] = x.precio; nuevos[x.id] = nuevo(x.precio); });
            const err = actualizar((e) => ({ ...e, deshacerPrecios: ant, precios: { ...e.precios, ...nuevos } }));
            setMsg(err ?? `Actualizaste ${afectados.length.toLocaleString('es')} precios.`);
          }}>Aplicar a {afectados.length.toLocaleString('es')} productos</button>
          {estado.deshacerPrecios && <button type="button" className="d-btn" onClick={() => {
            const ant = estado.deshacerPrecios!;
            const err = actualizar((e) => ({ ...e, deshacerPrecios: undefined, precios: { ...e.precios, ...ant } }));
            setMsg(err ?? 'Volviste a los precios anteriores.');
          }}><Icono nombre="deshacer" size={18} /> Deshacer</button>}
        </div>
        <div className="d-scroll" style={{ marginTop: 14 }}>
          <table className="d-tabla">
            <thead><tr><th>Producto</th><th>Hoy</th><th>Nuevo</th></tr></thead>
            <tbody>{afectados.slice(0, 8).map((x) => <tr key={x.id}><td>{x.nombre} · {x.linea}</td><td>{p(x.precio)}</td><td><strong>{valido ? p(nuevo(x.precio)) : '—'}</strong></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-prov">
        <h2 id="t-prov">Lista del proveedor</h2>
        <p className="sub">Subí la lista del proveedor (.csv o .xlsx) con código y precio: se actualizan solo esos productos. <a href="/ejemplos/lista-proveedor-ferreteria.csv" download>Descargar lista de ejemplo</a>.</p>
        <label className="d-btn" style={{ cursor: 'pointer' }}><Icono nombre="planilla" size={18} /> Elegir archivo<input type="file" accept=".csv,.xlsx,text/csv" hidden onChange={(e) => { importar(e.target.files?.[0]); e.target.value = ''; }} /></label>
        {msg && <p role="status" className="fer-aviso" style={{ marginTop: 10 }}>{msg}</p>}
        {importados && (
          <>
            <div className="d-scroll" style={{ marginTop: 10 }}>
              <table className="d-tabla">
                <thead><tr><th>Código</th><th>Producto</th><th>Hoy</th><th>Proveedor</th></tr></thead>
                <tbody>{importados.slice(0, 30).map(({ p: x, nuevo: n }) => <tr key={x.id}><td>{x.codigo}</td><td>{x.nombre}</td><td>{p(x.precio)}</td><td><strong>{p(n)}</strong></td></tr>)}</tbody>
              </table>
            </div>
            <div className="bar-acciones" style={{ marginTop: 10 }}>
              <button type="button" className="d-btn prim" onClick={() => {
                const ant = Object.fromEntries(importados.map(({ p: x }) => [x.id, x.precio]));
                const err = actualizar((e) => ({ ...e, deshacerPrecios: ant, precios: { ...e.precios, ...Object.fromEntries(importados.map(({ p: x, nuevo: n }) => [x.id, n])) } }));
                setMsg(err ?? `Aplicaste ${importados.length} precios del proveedor. Podés deshacerlo arriba.`);
                setImportados(null);
              }}>Aplicar {importados.length} precios</button>
              <button type="button" className="d-btn" onClick={() => setImportados(null)}>Cancelar</button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

// ---------------- Sinónimos (FER-02, FER-06) ----------------

function Sinonimos({ estado, lista, actualizar }: { estado: EstadoFerreteria; lista: Producto[]; actualizar: ActualizarFer }) {
  const [palabra, setPalabra] = useState('');
  const [igual, setIgual] = useState('');
  const [prueba, setPrueba] = useState('tubo de 2');
  const resultados = useMemo(() => buscar(lista, prueba, estado.palabras, 5), [lista, prueba, estado.palabras]);
  const aprendidos = Object.entries(estado.aprendidos);
  return (
    <>
      <section className="d-card" aria-labelledby="t-sin">
        <h2 id="t-sin">Cómo habla tu cliente</h2>
        <p className="sub">Palabras que tus clientes usan y significan lo mismo que una del catálogo. Ya vienen cargadas las comunes (tubo = caño, foco = lámpara, taco = tarugo).</p>
        <form className="fer-sin-form" onSubmit={(e) => {
          e.preventDefault();
          const a = sinAcentos(palabra.trim());
          const b = sinAcentos(igual.trim());
          if (!a || !b || a.includes(' ')) return;
          actualizar((x) => ({ ...x, palabras: { ...x.palabras, [a]: b } }));
          setPalabra('');
          setIgual('');
        }}>
          <input className="c-inp" value={palabra} onChange={(e) => setPalabra(e.target.value)} placeholder="Cuando dicen…" aria-label="Palabra del cliente" />
          <span>=</span>
          <input className="c-inp" value={igual} onChange={(e) => setIgual(e.target.value)} placeholder="…es como decir" aria-label="Palabra del catálogo" />
          <button type="submit" className="d-btn prim">Agregar</button>
        </form>
        <ul className="fer-chips">
          {Object.entries(estado.palabras).map(([a, b]) => (
            <li key={a}>{a} = {b} <button type="button" aria-label={`Quitar ${a}`} onClick={() => actualizar((x) => { const pal = { ...x.palabras }; delete pal[a]; return { ...x, palabras: pal }; })}><Icono nombre="cerrar" size={12} /></button></li>
          ))}
        </ul>
        <div className="tie-buscar" role="search" style={{ marginTop: 14 }}>
          <Icono nombre="buscar" size={18} />
          <input type="search" value={prueba} onChange={(e) => setPrueba(e.target.value)} aria-label="Probar la búsqueda" placeholder="Probá una búsqueda" />
        </div>
        <ul className="fer-mini" style={{ marginTop: 6 }}>
          {resultados.map((r) => <li key={r.id}><span className="fer-mini-fila">{r.nombre} <span>{r.linea} · {r.codigo}</span></span></li>)}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-apr">
        <h2 id="t-apr">Aprendido de los presupuestos</h2>
        <p className="sub">Cada vez que elegís una línea dudosa en el cotizador, se guarda acá. Es un activo de tu ferretería.</p>
        <ul className="alertas">
          {aprendidos.map(([frase, id]) => {
            const prod = lista.find((x) => x.id === id);
            return (
              <li key={frase}>
                <Icono nombre="chispa" size={18} />
                <div style={{ flex: 1 }}><strong>&quot;{frase}&quot;</strong><span>{prod?.nombre ?? 'Producto dado de baja'}</span></div>
                <button type="button" className="x" aria-label={`Olvidar ${frase}`} onClick={() => actualizar((x) => { const a = { ...x.aprendidos }; delete a[frase]; return { ...x, aprendidos: a }; })}><Icono nombre="basura" size={16} /></button>
              </li>
            );
          })}
          {!aprendidos.length && <li>Todavía no hay nada aprendido. Probá el cotizador con la lista de ejemplo y elegí la línea en amarillo.</li>}
        </ul>
      </section>
    </>
  );
}

// ---------------- Ajustes ----------------

function Ajustes({ slug, config, estado, actualizar }: { slug: string; config: DemoConfig; estado: EstadoFerreteria; actualizar: ActualizarFer }) {
  const [msg, setMsg] = useState('');
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">Ajustes de la ferretería</h2>
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
            const err = actualizar((x) => ({ ...x, proveedor: { nombre: String(f.get('provNombre') ?? '').trim() || x.proveedor.nombre, whatsapp: prov } }));
            setMsg(err ?? 'Ajustes guardados.');
          } catch (er) {
            setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.');
          }
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp de la ferretería<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Dirección<input name="direccion" className="c-inp" defaultValue={config.direccion} /></label>
        <div className="fila-2">
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Proveedor<input name="provNombre" className="c-inp" defaultValue={estado.proveedor.nombre} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp del proveedor<input name="provWa" className="c-inp" defaultValue={estado.proveedor.whatsapp} inputMode="tel" /></label>
        </div>
        <p className="sub" style={{ margin: 0 }}>Catálogo de ejemplo: {catalogoBase(config.moneda).length.toLocaleString('es')} productos generados. En la puesta en marcha cargamos el catálogo real, sus unidades y sinónimos.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, 'ferreteria'); setMsg('La ferretería volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}


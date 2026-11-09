'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { reducirImagen } from '@/lib/imagen';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import { LISTA_MUESTRA } from '@/lib/rubros/ferreteria/datos-ejemplo';
import { NOMBRE_TIPO, TEXTO_STOCK, buscar, claveFrase, complementos, estadoStock, leerLista, lineaDesde, mensajePresupuesto, precioUnidad, totalPresupuesto, unidadElegida, type LineaLeida } from '@/lib/rubros/ferreteria/logica';
import type { EstadoFerreteria, LineaPresupuesto, Presupuesto, Producto, TipoCliente } from '@/lib/rubros/ferreteria/tipos';
import type { DemoConfig } from '@/lib/tipos';
import type { ActualizarFer } from './useFerreteria';

type Fila = LineaLeida & { key: number; unidad: string; producto: Producto | null; agregada?: boolean };

/** Cotizador (FER-05 a FER-07): lista en texto o foto → presupuesto con precios del catálogo. */
const nuevoId = () => `pr-${Math.random().toString(36).slice(2, 8)}`;

export function Cotizador({ config, estado, lista, actualizar, slug }: { config: DemoConfig; estado: EstadoFerreteria; lista: Producto[]; actualizar: ActualizarFer; slug: string }) {
  const [texto, setTexto] = useState('');
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [clienteId, setClienteId] = useState<string>('');
  const [foto, setFoto] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [ms, setMs] = useState<number | null>(null);
  const [hecho, setHecho] = useState<Presupuesto | null>(null);
  const [busca, setBusca] = useState('');
  const inputFoto = useRef<HTMLInputElement>(null);
  const claveFila = useRef(0);

  const cliente = estado.clientes.find((c) => c.id === clienteId) ?? null;
  const tipo: TipoCliente = cliente?.tipo ?? 'paso';
  const desc = estado.descuentos[tipo];
  const p = (v: number) => formatoPrecio(v, config.moneda);

  function procesar(t: string, origen?: string) {
    const t0 = performance.now();
    const leidas = leerLista(t, lista, estado);
    setMs(performance.now() - t0);
    setFilas(leidas.map((l) => ({ ...l, key: ++claveFila.current, producto: l.elegido, unidad: l.elegido ? unidadElegida(l.elegido, l) : '' })));
    setHecho(null);
    setAviso(origen ?? '');
  }

  async function leerFoto(file?: File) {
    if (!file) return;
    setLeyendo(true);
    setAviso('');
    try {
      const data = await reducirImagen(file, 1600, 'image/jpeg', 0.85);
      setFoto(data);
      const r = await fetch('/api/leer-lista', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imagen: data }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setAviso(j.error ?? 'No pudimos leer la foto.');
        return;
      }
      setTexto(j.texto);
      procesar(j.texto, j.ilegibles ? `La IA no pudo leer ${j.ilegibles} renglón(es): revisalos en la foto.` : 'La IA transcribió la foto. Los productos y precios salen del catálogo.');
    } catch {
      setAviso('No pudimos leer la foto. Probá de nuevo o pegá la lista como texto.');
    } finally {
      setLeyendo(false);
    }
  }

  function elegir(f: Fila, prod: Producto) {
    setFilas((fs) => fs!.map((x) => (x.key === f.key ? { ...x, producto: prod, confianza: 'alta', unidad: unidadElegida(prod, x) } : x)));
    if (f.descripcion && !f.agregada) {
      // FER-06: la próxima vez que escriban lo mismo, ya sabemos qué es.
      const clave = claveFrase(f.descripcion);
      actualizar((e) => ({ ...e, aprendidos: { ...e.aprendidos, [clave]: prod.id } }));
      setAviso(`Aprendido: cuando pidan "${f.descripcion}", va a ser ${prod.nombre}.`);
    }
  }

  const listas = (filas ?? []).filter((f) => f.producto);
  const lineas: LineaPresupuesto[] = listas.map((f) => lineaDesde(f.producto!, f.unidad, f.cantidad, desc, f.original));
  const total = totalPresupuesto({ lineas });
  const pendientes = (filas ?? []).filter((f) => !f.producto).length;
  const sugeridos = useMemo(() => {
    const ya = new Set((filas ?? []).flatMap((f) => (f.producto ? [f.producto.familia] : f.opciones.map((o) => o.familia))));
    const out = new Map<string, Producto>();
    for (const f of filas ?? []) if (f.producto) for (const c of complementos(lista, f.producto)) if (!ya.has(c.familia)) out.set(c.id, c);
    return [...out.values()].slice(0, 4);
  }, [filas, lista]);
  const resultados = useMemo(() => (busca.trim().length > 1 ? buscar(lista, busca, estado.palabras, 6) : []), [busca, lista, estado.palabras]);

  function agregar(prod: Producto) {
    setFilas((fs) => [...(fs ?? []), { key: ++claveFila.current, original: prod.nombre, cantidad: 1, unidadId: null, descripcion: '', elegido: prod, opciones: [prod], confianza: 'alta', producto: prod, unidad: prod.unidades[0].id, agregada: true }]);
    setBusca('');
  }

  function guardar(enviar: boolean) {
    const numero = estado.proximoNumero;
    const pres: Presupuesto = {
      id: nuevoId(),
      numero,
      fecha: new Date().toISOString(),
      clienteId: cliente?.id ?? null,
      tipo,
      lineas,
      estado: 'abierto',
      origen: texto.trim() ? 'lista' : 'mostrador',
      validezDias: 7,
    };
    const err = actualizar((e) => ({ ...e, presupuestos: [pres, ...e.presupuestos], proximoNumero: e.proximoNumero + 1 }));
    if (err) return setAviso(err);
    setHecho(pres);
    if (enviar) {
      const enlace = `${window.location.origin}/d/${slug}/presupuesto/${pres.id}`;
      window.open(enlaceWhatsApp(cliente?.whatsapp ?? '', mensajePresupuesto(pres, lista, { negocio: config.negocio, moneda: config.moneda, enlace, cliente: cliente?.nombre })), '_blank', 'noopener');
    }
  }

  return (
    <section className="d-card" aria-labelledby="t-cot">
      <h2 id="t-cot">Cotizador</h2>
      <p className="sub">Pegá la lista como te la mandaron o sacale una foto. Los productos y los precios salen siempre del catálogo; lo dudoso queda en amarillo para que elijas.</p>

      <div className="fer-entrada">
        <div className="fer-entrada-txt">
          <label htmlFor="lista-txt" className="fer-lbl">Lista del cliente</label>
          <textarea id="lista-txt" className="c-inp" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Ej.:\n3 caños de 50\n6 codos\n20 m cable 2,5'} />
          <div className="bar-acciones" style={{ marginTop: 8 }}>
            <button type="button" className="d-btn prim" disabled={!texto.trim()} onClick={() => { setFoto(null); procesar(texto); }}><Icono nombre="chispa" size={18} /> Armar presupuesto</button>
            <button type="button" className="d-btn" disabled={leyendo} onClick={() => inputFoto.current?.click()}><Icono nombre="subir" size={18} /> {leyendo ? 'Leyendo la foto…' : 'Subir foto de la lista'}</button>
            <button type="button" className="d-btn" onClick={() => { setFoto('/ejemplos/lista-plomero.svg'); setTexto(LISTA_MUESTRA); procesar(LISTA_MUESTRA, 'Lista de ejemplo: la foto es ilustrativa y ya viene transcripta. Con la clave de IA activada, se leen fotos reales.'); }}>Probar con la lista de ejemplo</button>
            <input ref={inputFoto} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { leerFoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="Foto de la lista" className="fer-foto" />
        )}
      </div>
      {aviso && <p className="fer-aviso" role="status"><Icono nombre="info" size={16} /> {aviso}</p>}

      {filas && (
        <div className="fer-res">
          <div className="fer-res-cab">
            <label className="fer-lbl">Cliente
              <select className="c-inp" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Cliente de paso</option>
                {estado.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {NOMBRE_TIPO[c.tipo]}{estado.descuentos[c.tipo] ? ` (−${estado.descuentos[c.tipo]} %)` : ''}</option>)}
              </select>
            </label>
            {ms !== null && <span className="chip-rep">Armado en {ms < 1000 ? `${Math.max(0.01, ms / 1000).toFixed(2)} s` : `${(ms / 1000).toFixed(1)} s`}</span>}
            {pendientes > 0 && <span className="chip-rep dudosa">{pendientes} para revisar</span>}
          </div>

          <ol className="fer-lineas">
            {filas.map((f, i) => (
              <li key={f.key} className={`fer-linea ${f.producto ? 'ok' : f.confianza === 'baja' ? 'dudosa' : 'nada'}`} style={{ '--i': i } as React.CSSProperties}>
                <div className="fer-orig">{f.agregada ? 'Agregado a mano' : `"${f.original}"`}{f.aprendido && <span className="chip-rep">Aprendido</span>}</div>
                {f.producto ? (
                  <FilaElegida f={f} p={p} desc={desc} onCambiar={(cambios) => setFilas((fs) => fs!.map((x) => (x.key === f.key ? { ...x, ...cambios } : x)))} onQuitar={() => setFilas((fs) => fs!.filter((x) => x.key !== f.key))} />
                ) : f.confianza === 'baja' ? (
                  <div className="fer-opciones">
                    <strong>¿Cuál es?</strong>
                    {f.opciones.map((o) => (
                      <button key={o.id} type="button" className="d-btn" onClick={() => elegir(f, o)}>
                        {o.nombre} <small>{p(precioUnidad(o, o.unidades.find((u) => u.id === unidadElegida(o, f)) ?? o.unidades[0], desc))}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="fer-opciones"><strong>No lo encontramos en el catálogo.</strong> <span>Buscalo abajo o quitá la línea.</span> <button type="button" className="d-btn" onClick={() => setFilas((fs) => fs!.filter((x) => x.key !== f.key))}>Quitar</button></div>
                )}
              </li>
            ))}
          </ol>

          {sugeridos.length > 0 && (
            <div className="fer-sugeridos">
              <strong>¿Le sumás?</strong>
              {sugeridos.map((s) => <button key={s.id} type="button" className="d-btn" onClick={() => agregar(s)}><Icono nombre="mas" size={16} /> {s.nombre}</button>)}
            </div>
          )}

          <div className="fer-agregar">
            <div className="tie-buscar" role="search" style={{ margin: 0 }}>
              <Icono nombre="buscar" size={18} />
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Agregar otro producto: tubo de 2, cinta aisladora…" aria-label="Agregar producto" />
            </div>
            {resultados.length > 0 && (
              <ul className="fer-mini">
                {resultados.map((r) => <li key={r.id}><button type="button" onClick={() => agregar(r)}>{r.nombre} <span>{r.linea} · {r.codigo}</span><strong>{p(precioUnidad(r, r.unidades[0], desc))}</strong></button></li>)}
              </ul>
            )}
          </div>

          <div className="fer-total">
            <div>
              <span>Total{tipo !== 'paso' ? ` con precio ${NOMBRE_TIPO[tipo].toLowerCase()} (−${desc} %)` : ''}</span>
              <strong>{p(total)}</strong>
              <small>Válido 7 días. Sujeto a disponibilidad.</small>
            </div>
            <div className="bar-acciones">
              <button type="button" className="d-btn prim" disabled={!lineas.length || pendientes > 0} onClick={() => guardar(true)}><Icono nombre="whatsapp" size={18} /> Guardar y enviar por WhatsApp</button>
              <button type="button" className="d-btn" disabled={!lineas.length || pendientes > 0} onClick={() => guardar(false)}>Solo guardar</button>
            </div>
            {pendientes > 0 && <small className="bar-err">Elegí las líneas en amarillo antes de enviar.</small>}
          </div>
          {hecho && (
            <p className="bar-ok" role="status" style={{ marginTop: 12 }}>
              <Icono nombre="check" size={18} /> <span>Presupuesto N.º {hecho.numero} guardado. <Link href={`/d/${slug}/presupuesto/${hecho.id}`}>Ver PDF con la marca</Link></span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function FilaElegida({ f, p, desc, onCambiar, onQuitar }: { f: Fila; p: (v: number) => string; desc: number; onCambiar: (c: Partial<Fila>) => void; onQuitar: () => void }) {
  const prod = f.producto!;
  const u = prod.unidades.find((x) => x.id === f.unidad) ?? prod.unidades[0];
  const precio = precioUnidad(prod, u, desc);
  const st = estadoStock(prod);
  const necesita = f.cantidad * u.factor;
  return (
    <div className="fer-elegida">
      <div className="fer-prod">
        <strong>{prod.nombre}</strong>
        <span>{prod.codigo} · {prod.linea} · <span className={`fer-stock ${st}`}>{prod.stock < necesita && st !== 'sin' ? `Hay ${prod.stock} ${prod.base === 'm' ? 'm' : 'u.'}` : TEXTO_STOCK[st]}</span></span>
        {f.opciones.length > 1 && !f.agregada && (
          <details className="fer-otras">
            <summary>Cambiar</summary>
            {f.opciones.filter((o) => o.id !== prod.id).map((o) => <button key={o.id} type="button" onClick={() => onCambiar({ producto: o, unidad: unidadElegida(o, f) })}>{o.nombre}</button>)}
          </details>
        )}
      </div>
      <label className="sr-only" htmlFor={`cant-${f.key}`}>Cantidad</label>
      <input id={`cant-${f.key}`} className="c-inp fer-cant" type="number" min={1} value={f.cantidad} onChange={(e) => onCambiar({ cantidad: Math.max(1, Number(e.target.value) || 1) })} />
      {prod.unidades.length > 1 ? (
        <select className="c-inp fer-uni" aria-label="Unidad" value={u.id} onChange={(e) => onCambiar({ unidad: e.target.value })}>
          {prod.unidades.map((x) => <option key={x.id} value={x.id}>{x.etiqueta}</option>)}
        </select>
      ) : (
        <span className="fer-uni-fija">{u.etiqueta}</span>
      )}
      <span className="fer-precio"><small>{p(precio)} c/u</small><strong>{p(precio * f.cantidad)}</strong></span>
      <button type="button" className="x" aria-label={`Quitar ${prod.nombre}`} onClick={onQuitar}><Icono nombre="basura" size={16} /></button>
    </div>
  );
}

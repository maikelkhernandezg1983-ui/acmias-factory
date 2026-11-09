'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { volarAlCarrito } from '@/components/efectos';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { formatoPrecio, idCorto } from '@/lib/utiles';
import { CATEGORIAS_REP, FOTO_PORTADA_REP, TALLER_EJEMPLO } from '@/lib/rubros/repuestos/datos-ejemplo';
import {
  TEXTO_STOCK,
  buscar,
  enlaceWhatsApp,
  esCompatible,
  estadoStock,
  etiquetaVehiculo,
  mensajeCotizacion,
  nombreVehiculo,
  precioPara,
  type Resultado,
} from '@/lib/rubros/repuestos/logica';
import type { CategoriaRep, Cotizacion, LineaCotizacion, MiVehiculo, Pieza, Vehiculo } from '@/lib/rubros/repuestos/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { IconoPieza } from './IconoPieza';
import { useDemoRepuestos, useMiVehiculo, useModoTaller } from './useRepuestos';

export function Catalogo({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoRepuestos(slug);
  const [mi, setMi] = useMiVehiculo(slug);
  const [taller, setTaller] = useModoTaller(slug);
  const [categoria, setCategoria] = useState<CategoriaRep | null>(null);
  const [termino, setTermino] = useState('');
  const [verTodo, setVerTodo] = useState(false);
  const [ficha, setFicha] = useState<Pieza | null>(null);
  const [lineas, setLineas] = useState<LineaCotizacion[]>([]);
  const [verCotizacion, setVerCotizacion] = useState(false);
  const [verTaller, setVerTaller] = useState(false);
  const [cambiarAuto, setCambiarAuto] = useState(false);
  const [toast, setToast] = useState<{ id: number; texto: string } | null>(null);
  const [rebote, setRebote] = useState(0);
  const barraRef = useRef<HTMLButtonElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);
  const registradas = useRef(new Set<string>());
  const avisos = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const vehiculo = useMemo(() => (mi && estado ? estado.vehiculos.find((v) => v.id === mi.vehiculoId) : undefined), [mi, estado]);
  const textoVehiculo = vehiculo && mi ? etiquetaVehiculo(vehiculo, mi.anio) : undefined;
  const busqueda = termino.trim();

  const resultados: Resultado[] = useMemo(() => {
    if (!estado) return [];
    if (busqueda.length >= 2) return buscar(estado.piezas, busqueda);
    return estado.piezas
      .filter((p) => !categoria || p.categoria === categoria)
      .filter((p) => verTodo || !mi || esCompatible(p, mi))
      .map((pieza) => ({ pieza, tipo: 'nombre' as const, exacto: false }));
  }, [estado, busqueda, categoria, verTodo, mi]);

  // Lo que se busca y no hay: queda en el panel del dueño como demanda perdida.
  useEffect(() => {
    if (!estado || busqueda.length < 3) return;
    const sinStock = resultados.length > 0 && resultados.every((r) => estadoStock(r.pieza) === 'sin');
    if (resultados.length > 0 && !sinStock) return;
    const clave = sinStock ? `${busqueda} (sin stock)` : busqueda;
    const t = setTimeout(() => {
      if (registradas.current.has(clave.toLowerCase())) return;
      registradas.current.add(clave.toLowerCase());
      actualizar((e) => ({ ...e, sinResultado: { ...e.sinResultado, [clave]: (e.sinResultado[clave] ?? 0) + 1 } }));
    }, 1200);
    return () => clearTimeout(t);
  }, [busqueda, resultados, estado, actualizar]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;

  const p = (v: number) => formatoPrecio(v, config.moneda);
  const precio = (pz: Pieza) => precioPara(pz, taller, estado.descuentoTaller);
  const cantidad = lineas.reduce((s, l) => s + l.cantidad, 0);
  const subtotal = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const compatiblesPorCat = (c: CategoriaRep) => estado.piezas.filter((pz) => pz.categoria === c && (!mi || esCompatible(pz, mi))).length;

  function sumar(pz: Pieza, n: number, origen?: HTMLElement | null) {
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.piezaId === pz.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + n } : l));
      return [...ls, { piezaId: pz.id, codigo: pz.codigo, nombre: pz.nombre, precio: precio(pz), cantidad: n }];
    });
    setFicha(null);
    setToast({ id: ++avisos.current, texto: `Sumaste ${pz.codigo} a la cotización` });
    volarAlCarrito(origen ?? null, () => barraRef.current, () => setRebote((r) => r + 1));
    if ('vibrate' in navigator) navigator.vibrate?.(12);
  }

  function elegirCategoria(c: CategoriaRep) {
    setTermino('');
    setCategoria((x) => (x === c ? null : c));
    requestAnimationFrame(() => resultadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function cambiarModoTaller(v: boolean) {
    setTaller(v);
    // Las líneas ya armadas pasan al precio que corresponde.
    setLineas((ls) => ls.map((l) => {
      const pz = estado!.piezas.find((x) => x.id === l.piezaId);
      return pz ? { ...l, precio: precioPara(pz, v, estado!.descuentoTaller) } : l;
    }));
  }

  const elegirAuto = !mi || cambiarAuto;
  const titulo = busqueda.length >= 2
    ? `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'} para “${busqueda}”`
    : `${categoria ? CATEGORIAS_REP.find((c) => c.id === categoria)!.nombre : 'Todas las piezas'}${mi && !verTodo ? ' que le sirven a tu auto' : ''}`;

  return (
    <div className={`rep${taller ? ' es-taller' : ''}`} style={estilo}>
      <AvisoDemo texto="Piezas, vehículos y precios de ejemplo" />
      <header className="rep-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="rep-hero-foto" src={FOTO_PORTADA_REP} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div className="rep-hero-velo" aria-hidden="true" />
        <div className="rep-hero-in">
          <div className="rep-top">
            <div className="rep-id">
              {config.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logo} alt="" className="rep-logo" />
              ) : (
                <span className="rep-logo rep-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
              )}
              <h1 className="rep-nombre">{config.negocio}</h1>
            </div>
            <button type="button" className={`rep-taller-btn${taller ? ' activo' : ''}`} onClick={() => setVerTaller(true)}>
              <Icono nombre="llave" size={18} /> {taller ? TALLER_EJEMPLO : 'Soy taller'}
            </button>
          </div>
          <p className="rep-lema">Elegí tu auto y te mostramos solo las piezas que le sirven.</p>
        </div>
      </header>

      <main className="rep-main">
        <section className={`garage${elegirAuto ? ' abierto' : ''}`} aria-labelledby="t-garage">
          {elegirAuto ? (
            <SelectorVehiculo
              vehiculos={estado.vehiculos}
              inicial={mi}
              onElegir={(v) => { setMi(v); setCambiarAuto(false); setVerTodo(false); }}
              onCancelar={mi ? () => setCambiarAuto(false) : undefined}
            />
          ) : (
            <div className="patente-fila">
              <h2 id="t-garage" className="sr-only">Tu vehículo</h2>
              <div className="patente" key={textoVehiculo}>
                <span className="patente-banda" aria-hidden="true" />
                <span className="patente-txt">
                  <small>Buscando para</small>
                  <strong>{textoVehiculo}</strong>
                </span>
              </div>
              <button type="button" className="rep-link" onClick={() => setCambiarAuto(true)}>Cambiar auto</button>
            </div>
          )}
        </section>

        <div className="rep-buscador" role="search">
          <Icono nombre="buscar" size={20} />
          <input
            type="search"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Código o pieza: FA-210, pastillas…"
            aria-label="Buscar por código propio, OEM, equivalente o nombre"
            autoComplete="off"
            spellCheck={false}
          />
          {termino && <button type="button" className="rep-limpiar" onClick={() => setTermino('')} aria-label="Borrar búsqueda"><Icono nombre="cerrar" size={18} /></button>}
        </div>

        {busqueda.length < 2 && (
          <nav className="rep-cats" aria-label="Categorías">
            {CATEGORIAS_REP.map((c, i) => {
              const n = compatiblesPorCat(c.id);
              return (
                <button key={c.id} type="button" className="rep-cat" aria-pressed={categoria === c.id} onClick={() => elegirCategoria(c.id)} style={{ '--i': i } as React.CSSProperties}>
                  <span className="rep-cat-ico"><IconoPieza categoria={c.id} size={34} /></span>
                  <span className="rep-cat-nom">{c.nombre}</span>
                  <span className="rep-cat-n">{mi ? `${n} para tu auto` : `${n} piezas`}</span>
                </button>
              );
            })}
          </nav>
        )}

        <section className="rep-res" aria-labelledby="t-res" ref={resultadosRef}>
          <div className="rep-res-cab">
            <h2 id="t-res" aria-live="polite">{titulo}</h2>
            {mi && busqueda.length < 2 && (
              <label className="rep-todo">
                <input type="checkbox" checked={verTodo} onChange={(e) => setVerTodo(e.target.checked)} /> Ver también las que no figuran para tu auto
              </label>
            )}
          </div>

          {resultados.length === 0 && (
            <div className="rep-vacio">
              <IconoPieza categoria={categoria ?? 'filtros'} size={44} />
              <p>
                {busqueda.length >= 2
                  ? 'No encontramos ese código. Mandanos la consulta y te respondemos con la pieza que va.'
                  : 'No tenemos cargada una pieza de esta familia para tu auto. Consultanos: puede estar a pedido.'}
              </p>
              <a
                className="rep-btn-wa"
                href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, busco ${busqueda || CATEGORIAS_REP.find((c) => c.id === categoria)?.nombre.toLowerCase() || 'una pieza'}${textoVehiculo ? ` para ${textoVehiculo}` : ''}. ¿Lo tienen?`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icono nombre="whatsapp" size={18} /> Consultar por WhatsApp
              </a>
            </div>
          )}

          <div className="rep-lista">
            {resultados.map(({ pieza: pz, codigo, tipo }, i) => {
              const est = estadoStock(pz);
              const sirve = esCompatible(pz, mi);
              return (
                <article key={pz.id} className={`pieza${est === 'sin' ? ' sin-stock' : ''}`} style={{ '--i': Math.min(i, 10) } as React.CSSProperties}>
                  <button type="button" className="pieza-abrir" onClick={() => setFicha(pz)} aria-label={`${pz.nombre} ${pz.codigo}, ${p(precio(pz))}`}>
                    <span className="pieza-ico"><IconoPieza categoria={pz.categoria} size={40} /></span>
                    <span className="pieza-txt">
                      <span className="pieza-cods">
                        <code className="cod">{pz.codigo}</code>
                        {codigo && tipo !== 'codigo' && <span className="cod-match">{tipo === 'oem' ? 'OEM' : 'Equivale a'} {codigo}</span>}
                      </span>
                      <strong className="pieza-nom">{pz.nombre}</strong>
                      <span className="pieza-meta">
                        {pz.marca}
                        <span className={`origen ${pz.origen}`}>{pz.origen === 'original' ? 'Original' : 'Alternativo'}</span>
                      </span>
                      {mi && (
                        <span className={`pieza-compat${sirve ? ' si' : ''}`}>
                          <Icono nombre={sirve ? 'check' : 'info'} size={15} />
                          {sirve ? `Sirve para tu ${vehiculo!.modelo} ${vehiculo!.motor}` : 'No figura para tu auto'}
                        </span>
                      )}
                    </span>
                    <span className="pieza-der">
                      <span className="pieza-precio">{p(precio(pz))}</span>
                      {taller && <span className="pieza-lista">Lista {p(pz.precio)}</span>}
                      <span className={`stock ${est}`}><span className="punto" aria-hidden="true" />{TEXTO_STOCK[est]}</span>
                    </span>
                  </button>
                  {est !== 'sin' && (
                    <button type="button" className="pieza-mas" aria-label={`Sumar ${pz.codigo} a la cotización`} onClick={(e) => sumar(pz, 1, e.currentTarget.parentElement?.querySelector<HTMLElement>('.pieza-ico'))}>
                      <Icono nombre="mas" size={18} /> Cotizar
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <p className="rep-pie">
          Precios de referencia sujetos a confirmación. La compatibilidad la confirma el vendedor antes de la venta. Esta cotización no es un comprobante fiscal.
          {config.direccion && <><br />{config.direccion}</>}
          <br />Hecho con ACMIAS.
        </p>
      </main>

      {cantidad > 0 && (
        <div className="barra-carrito rep-barra">
          <button type="button" ref={barraRef} onClick={() => setVerCotizacion(true)} key={`b-${rebote}`} data-rebote={rebote > 0 ? '1' : undefined}>
            <span className="barra-izq">
              <span className="barra-icono"><Icono nombre="lista" /><span className="barra-n" key={cantidad}>{cantidad}</span></span>
              Ver cotización · {cantidad}
            </span>
            <span>{p(subtotal)}</span>
          </button>
        </div>
      )}

      {ficha && (
        <FichaPieza
          pieza={ficha}
          vehiculos={estado.vehiculos}
          mi={mi}
          precio={precio(ficha)}
          config={config}
          textoVehiculo={textoVehiculo}
          onCerrar={() => setFicha(null)}
          onSumar={sumar}
        />
      )}
      {verCotizacion && (
        <HojaCotizacion
          lineas={lineas}
          setLineas={setLineas}
          config={config}
          textoVehiculo={textoVehiculo}
          taller={taller ? TALLER_EJEMPLO : undefined}
          onCerrar={() => setVerCotizacion(false)}
          onGuardar={(c) => {
            const err = actualizar((e) => ({ ...e, cotizaciones: [c, ...e.cotizaciones] }));
            setLineas([]);
            setVerCotizacion(false);
            setToast({ id: ++avisos.current, texto: err ? 'Cotización enviada. No se pudo guardar en el historial.' : 'Cotización enviada por WhatsApp' });
          }}
          slug={slug}
        />
      )}
      {verTaller && (
        <HojaTaller
          taller={taller}
          descuento={estado.descuentoTaller}
          historial={estado.cotizaciones.filter((c) => c.taller === TALLER_EJEMPLO)}
          moneda={config.moneda}
          onCerrar={() => setVerTaller(false)}
          onCambiar={(v) => { cambiarModoTaller(v); setToast({ id: ++avisos.current, texto: v ? `Entraste como ${TALLER_EJEMPLO}` : 'Saliste del modo taller' }); }}
          onRepetir={(c) => {
            const nuevas = c.items
              .map((l) => {
                const pz = estado.piezas.find((x) => x.id === l.piezaId);
                return pz ? { ...l, precio: precioPara(pz, true, estado.descuentoTaller) } : null;
              })
              .filter(Boolean) as LineaCotizacion[];
            setLineas(nuevas);
            setVerTaller(false);
            setVerCotizacion(true);
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

function SelectorVehiculo({ vehiculos, inicial, onElegir, onCancelar }: { vehiculos: Vehiculo[]; inicial: MiVehiculo | null; onElegir: (v: MiVehiculo) => void; onCancelar?: () => void }) {
  const ini = vehiculos.find((v) => v.id === inicial?.vehiculoId);
  const [marca, setMarca] = useState<string | null>(ini?.marca ?? null);
  const [vid, setVid] = useState<string | null>(ini?.id ?? null);
  const marcas = [...new Set(vehiculos.map((v) => v.marca))];
  const modelos = vehiculos.filter((v) => v.marca === marca);
  const elegido = vehiculos.find((v) => v.id === vid);
  const anios = elegido ? Array.from({ length: elegido.hasta - elegido.desde + 1 }, (_, i) => elegido.hasta - i) : [];
  const paso = !marca ? 1 : !elegido ? 2 : 3;

  return (
    <div className="selector">
      <div className="selector-cab">
        <h2 id="t-garage">¿Para qué auto buscás?</h2>
        {onCancelar && <button type="button" className="rep-link" onClick={onCancelar}>Cancelar</button>}
      </div>
      <ol className="pasos" aria-label="Pasos">
        {['Marca', 'Modelo y motor', 'Año'].map((n, i) => (
          <li key={n} className={paso === i + 1 ? 'actual' : paso > i + 1 ? 'hecho' : ''}>
            <button type="button" disabled={paso <= i + 1} onClick={() => { if (i === 0) { setMarca(null); setVid(null); } if (i === 1) setVid(null); }}>
              {paso > i + 1 ? (i === 0 ? marca : `${elegido?.modelo} ${elegido?.motor}`) : n}
            </button>
          </li>
        ))}
      </ol>
      <div className="opciones" role="group" aria-label={paso === 1 ? 'Marca' : paso === 2 ? 'Modelo y motor' : 'Año'} key={paso}>
        {paso === 1 && marcas.map((m) => <button key={m} type="button" className="opcion" onClick={() => setMarca(m)}>{m}</button>)}
        {paso === 2 && modelos.map((v) => (
          <button key={v.id} type="button" className="opcion" onClick={() => setVid(v.id)}>
            <strong>{v.modelo}</strong> <span>{v.motor} · {v.desde}–{v.hasta}</span>
          </button>
        ))}
        {paso === 3 && anios.map((a) => <button key={a} type="button" className="opcion anio" onClick={() => onElegir({ vehiculoId: elegido!.id, anio: a })}>{a}</button>)}
      </div>
    </div>
  );
}

function FichaPieza({ pieza, vehiculos, mi, precio, config, textoVehiculo, onCerrar, onSumar }: {
  pieza: Pieza;
  vehiculos: Vehiculo[];
  mi: MiVehiculo | null;
  precio: number;
  config: DemoConfig;
  textoVehiculo?: string;
  onCerrar: () => void;
  onSumar: (p: Pieza, n: number, origen?: HTMLElement | null) => void;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const icoRef = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(1);
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const est = estadoStock(pieza);
  const sirve = esCompatible(pieza, mi);
  const compat = vehiculos.filter((v) => pieza.compat.includes(v.id));
  const mensaje = mensajeCotizacion({ config, items: [{ piezaId: pieza.id, codigo: pieza.codigo, nombre: pieza.nombre, precio, cantidad: n }], vehiculo: textoVehiculo });

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja rep-hoja" role="dialog" aria-modal="true" aria-labelledby="t-ficha" ref={ref}>
        <div className="ficha-ico" ref={icoRef}><IconoPieza categoria={pieza.categoria} size={92} /></div>
        <div className="hoja-cab">
          <div>
            <code className="cod">{pieza.codigo}</code>
            <h2 id="t-ficha">{pieza.nombre}</h2>
          </div>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        <div className="ficha-chips">
          <span className={`origen ${pieza.origen}`}>{pieza.origen === 'original' ? 'Original' : 'Alternativo'}</span>
          <span className="chip-rep">{pieza.marca}</span>
          <span className="chip-rep">{pieza.procedencia === 'importado' ? 'Importado' : 'Nacional'}</span>
          <span className="chip-rep">Garantía {pieza.garantiaMeses} meses</span>
          <span className={`stock ${est}`}><span className="punto" aria-hidden="true" />{TEXTO_STOCK[est]}</span>
        </div>
        {pieza.detalle && <p className="ficha-detalle">{pieza.detalle}</p>}
        {(pieza.oem.length > 0 || pieza.equivalentes.length > 0) && (
          <dl className="ficha-cods">
            {pieza.oem.length > 0 && <><dt>OEM</dt><dd>{pieza.oem.map((c) => <code key={c}>{c}</code>)}</dd></>}
            {pieza.equivalentes.length > 0 && <><dt>Equivalentes</dt><dd>{pieza.equivalentes.map((c) => <code key={c}>{c}</code>)}</dd></>}
          </dl>
        )}
        <h3 className="ficha-sub">Sirve para</h3>
        <ul className="ficha-compat">
          {compat.map((v) => (
            <li key={v.id} className={mi?.vehiculoId === v.id ? 'tuyo' : ''}>
              <span>{nombreVehiculo(v)}</span>
              <span>{v.desde}–{v.hasta}</span>
              {mi?.vehiculoId === v.id && <strong>Tu auto</strong>}
            </li>
          ))}
        </ul>
        <p className={`ficha-aviso${mi && !sirve ? ' alerta' : ''}`} role="note">
          <Icono nombre="info" size={18} />
          {mi && !sirve ? 'Esta pieza no figura para tu auto. ' : ''}Confirmá la compatibilidad con el vendedor antes de comprar.
        </p>
        <div className="hoja-pie">
          <div className="cant" role="group" aria-label="Cantidad">
            <button type="button" onClick={() => setN((x) => Math.max(1, x - 1))} aria-label="Restar uno"><Icono nombre="menos" /></button>
            <span aria-live="polite">{n}</span>
            <button type="button" onClick={() => setN((x) => Math.min(99, x + 1))} aria-label="Sumar uno"><Icono nombre="mas" /></button>
          </div>
          <button type="button" className="c-cta" disabled={est === 'sin'} onClick={() => onSumar(pieza, n, icoRef.current?.firstElementChild as HTMLElement | null)}>
            Sumar a la cotización · {p(precio * n)}
          </button>
        </div>
        <a className="rep-btn-wa ancho" href={enlaceWhatsApp(config.whatsapp, mensaje)} target="_blank" rel="noopener noreferrer">
          <Icono nombre="whatsapp" size={18} /> Consultar esta pieza por WhatsApp
        </a>
      </div>
    </div>
  );
}

function HojaCotizacion({ lineas, setLineas, config, textoVehiculo, taller, onCerrar, onGuardar, slug }: {
  lineas: LineaCotizacion[];
  setLineas: React.Dispatch<React.SetStateAction<LineaCotizacion[]>>;
  config: DemoConfig;
  textoVehiculo?: string;
  taller?: string;
  onCerrar: () => void;
  onGuardar: (c: Cotizacion) => void;
  slug: string;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);

  function cambiar(id: string, d: number) {
    setLineas((ls) => ls.map((l) => (l.piezaId === id ? { ...l, cantidad: l.cantidad + d } : l)).filter((l) => l.cantidad > 0));
  }

  function armar(): Cotizacion {
    return { id: idCorto(), fecha: new Date().toISOString(), vehiculo: textoVehiculo, taller, items: lineas, total };
  }

  function enviar() {
    const texto = mensajeCotizacion({ config, items: lineas, vehiculo: textoVehiculo, taller, nombre: nombre.trim() });
    window.open(enlaceWhatsApp(config.whatsapp, texto), '_blank', 'noopener');
    onGuardar(armar());
  }

  function pdf() {
    const c = armar();
    onGuardar(c);
    router.push(`/d/${slug}/cotizacion?id=${c.id}`);
  }

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja rep-hoja" role="dialog" aria-modal="true" aria-labelledby="t-cot" ref={ref}>
        <div className="hoja-cab">
          <h2 id="t-cot">Tu cotización</h2>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        <div className={`cot-auto${textoVehiculo ? '' : ' falta'}`}>
          <Icono nombre={textoVehiculo ? 'check' : 'info'} size={18} />
          {textoVehiculo ? <span>Para <strong>{textoVehiculo}</strong></span> : <span>No elegiste tu auto. Podés mandarla igual y aclararlo en el chat.</span>}
        </div>
        {taller && <div className="cot-auto taller"><Icono nombre="llave" size={18} /><span>Precios de taller para <strong>{taller}</strong></span></div>}
        <ul className="cot-lineas">
          {lineas.map((l) => (
            <li key={l.piezaId}>
              <div>
                <code className="cod">{l.codigo}</code>
                <strong>{l.nombre}</strong>
                <span>{p(l.precio)} c/u</span>
              </div>
              <div className="cant chica" role="group" aria-label={`Cantidad de ${l.codigo}`}>
                <button type="button" onClick={() => cambiar(l.piezaId, -1)} aria-label="Restar uno"><Icono nombre="menos" size={16} /></button>
                <span>{l.cantidad}</span>
                <button type="button" onClick={() => cambiar(l.piezaId, 1)} aria-label="Sumar uno"><Icono nombre="mas" size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
        {!taller && (
          <>
            <label className="c-lbl" htmlFor="cot-nombre">Tu nombre <span style={{ fontWeight: 400 }}>(opcional)</span></label>
            <input id="cot-nombre" className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
          </>
        )}
        <div className="total"><span>Total estimado</span><span>{p(total)}</span></div>
        <button type="button" className="c-cta" onClick={enviar} disabled={lineas.length === 0}>
          <Icono nombre="whatsapp" /> Enviar cotización por WhatsApp
        </button>
        <button type="button" className="rep-btn-sec" onClick={pdf} disabled={lineas.length === 0}>Ver en PDF con la marca del local</button>
        <p className="c-nota">Se abre WhatsApp con la lista, tu auto y los códigos. El local confirma compatibilidad y stock por ahí.</p>
      </div>
    </div>
  );
}

function HojaTaller({ taller, descuento, historial, moneda, onCerrar, onCambiar, onRepetir }: {
  taller: boolean;
  descuento: number;
  historial: Cotizacion[];
  moneda: string;
  onCerrar: () => void;
  onCambiar: (v: boolean) => void;
  onRepetir: (c: Cotizacion) => void;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const p = (v: number) => formatoPrecio(v, moneda);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja rep-hoja" role="dialog" aria-modal="true" aria-labelledby="t-taller" ref={ref}>
        <div className="hoja-cab">
          <h2 id="t-taller">{taller ? TALLER_EJEMPLO : 'Portal de talleres'}</h2>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" /></button>
        </div>
        {!taller ? (
          <>
            <p className="ficha-detalle">Los talleres entran con su usuario y ven su precio de taller ({descuento} % menos que el precio de lista), arman cotizaciones de varias piezas y repiten pedidos anteriores.</p>
            <button type="button" className="c-cta" onClick={() => { onCambiar(true); }}>Entrar como {TALLER_EJEMPLO} (ejemplo)</button>
            <p className="c-nota">En la demo se entra sin contraseña. En el sistema real, cada taller tiene su usuario.</p>
          </>
        ) : (
          <>
            <p className="ficha-detalle">Estás viendo precios de taller: {descuento} % menos que la lista.</p>
            <h3 className="ficha-sub">Cotizaciones anteriores</h3>
            {historial.length === 0 && <p className="c-nota">Todavía no hay cotizaciones de este taller.</p>}
            <ul className="hist">
              {historial.map((c) => (
                <li key={c.id}>
                  <div>
                    <strong>{c.items.map((i) => i.codigo).join(' · ')}</strong>
                    <span>{new Date(c.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}{c.vehiculo ? ` · ${c.vehiculo}` : ''} · {p(c.total)}</span>
                  </div>
                  <button type="button" className="rep-btn-sec chico" onClick={() => onRepetir(c)} aria-label={`Repetir cotización ${c.items.map((i) => i.codigo).join(', ')}`}>Repetir</button>
                </li>
              ))}
            </ul>
            <button type="button" className="rep-btn-sec" onClick={() => { onCambiar(false); onCerrar(); }}>Salir del modo taller</button>
          </>
        )}
      </div>
    </div>
  );
}

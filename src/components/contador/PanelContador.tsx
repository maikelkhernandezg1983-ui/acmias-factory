'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { NOMBRE_CATEGORIA, NOMBRE_ESTADO_PAGO, anularPago, cambiarHonorario, confirmarPago, cuentaDe, dinero, ingresos, marcarAvisada, mensajeDeuda, mensajePago, mensajeTarea, nombreCompleto, registrarAcceso, resumen, sumarCuota, terminarTarea, reabrirTarea, type EstadoPago } from '@/lib/rubros/contador/logica';
import { mesCorto, nombreMes, sumarMeses } from '@/lib/rubros/contador/periodos';
import type { ClienteC, Cuota, EstadoContador, Tarea } from '@/lib/rubros/contador/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { ImportarClientes } from './ImportarClientes';
import { useDemoContador, type ActualizarContador } from './useContador';

type Pestana = 'tablero' | 'tareas' | 'clientes' | 'deudas' | 'importar' | 'ajustes';
interface Props { config: DemoConfig; estado: EstadoContador; actualizar: ActualizarContador; periodo: string; ahora: number }

const mayus = (s: string) => s[0].toUpperCase() + s.slice(1);
const LUZ: Record<EstadoPago, string> = { 'al-dia': 'verde', 'por-vencer': 'amarillo', debe: 'rojo' };

export function EstadoPagoChip({ estado }: { estado: EstadoPago }) {
  return (
    <span className={`sem-luz ${LUZ[estado]}`}>
      <span className="sem-punto" aria-hidden="true" />
      {NOMBRE_ESTADO_PAGO[estado]}
    </span>
  );
}

export function PanelContador({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo, periodo, ahora } = useDemoContador(slug);
  const [pestana, setPestana] = useState<Pestana>('tablero');
  const [ficha, setFicha] = useState<string | null>(null);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const r = resumen(estado, periodo, ahora);
  const props: Props = { config, estado, actualizar, periodo, ahora };
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'tablero', nombre: 'Tablero' },
    { id: 'tareas', nombre: `Tareas del mes (${r.tareasHechas}/${r.tareasTotal})` },
    { id: 'clientes', nombre: `Clientes (${r.activos})` },
    { id: 'deudas', nombre: `Deudas${r.conDeuda ? ` (${r.conDeuda})` : ''}` },
    { id: 'importar', nombre: 'Importar' },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];
  const cliente = ficha ? estado.clientes.find((c) => c.id === ficha) : undefined;
  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Clientes, claves y montos ficticios" />
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
              <div style={{ fontSize: 13, opacity: 0.9 }}>{mayus(nombreMes(periodo))} · {r.activos} clientes activos</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="usuario" size={18} /> Portal del cliente</Link>
            <Link className="d-btn" href={`/d/${slug}/sitio`}><Icono nombre="tienda" size={18} /> Sitio</Link>
          </nav>
        </div>
      </header>
      <div className="d-tabs" role="tablist" aria-label="Secciones del panel">
        {PESTANAS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-controls={`pan-${t.id}`} aria-selected={pestana === t.id} className="d-tab" onClick={() => setPestana(t.id)}>{t.nombre}</button>
        ))}
      </div>
      <main className="d-main" role="tabpanel" id={`pan-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {pestana === 'tablero' && <Tablero {...props} onFicha={setFicha} onIr={setPestana} />}
        {pestana === 'tareas' && <Tareas {...props} />}
        {pestana === 'clientes' && <Clientes {...props} onFicha={setFicha} />}
        {pestana === 'deudas' && <Deudas {...props} onFicha={setFicha} />}
        {pestana === 'importar' && <ImportarClientes estado={estado} actualizar={actualizar} moneda={config.moneda} periodo={periodo} onListo={() => setPestana('clientes')} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} {...props} />}
      </main>
      {cliente && <Ficha {...props} cliente={cliente} onCerrar={() => setFicha(null)} />}
    </div>
  );
}

// ---------------- Tablero

function Tablero({ config, estado, actualizar, periodo, ahora, onFicha, onIr }: Props & { onFicha: (id: string) => void; onIr: (p: Pestana) => void }) {
  const r = resumen(estado, periodo, ahora);
  const serie = ingresos(estado, periodo, 6);
  const max = Math.max(1, ...serie.flatMap((s) => [s.facturado, s.cobrado]));
  const informadas = estado.cuotas.filter((q) => q.estado === 'pendiente' && q.informada).sort((a, b) => (b.informada ?? '').localeCompare(a.informada ?? ''));
  const nombre = (id: string) => { const c = estado.clientes.find((x) => x.id === id); return c ? nombreCompleto(c) : ''; };
  const pct = r.facturado ? Math.round((r.cobrado / r.facturado) * 100) : 0;
  return (
    <>
      <section className="d-card" aria-labelledby="t-tab">
        <h2 id="t-tab">{mayus(nombreMes(periodo))}</h2>
        <div className="met-grid">
          <div className="met"><strong>{dinero(r.cobrado, config.moneda)}</strong><span>Cobrado del mes ({pct} %)</span></div>
          <div className="met"><strong>{dinero(r.porCobrar, config.moneda)}</strong><span>Por cobrar del mes</span></div>
          <div className="met"><strong>{dinero(r.deudaVencida, config.moneda)}</strong><span>Deuda vencida de {r.conDeuda} clientes</span></div>
          <div className="met"><strong>{r.alDia} de {r.activos}</strong><span>Clientes al día</span></div>
          <div className="met"><strong>{r.tareasHechas} de {r.tareasTotal}</strong><span>{estado.ajustes.tareaMensual} terminadas</span></div>
        </div>
        <div className="ct-progreso" aria-label={`Tareas del mes: ${r.tareasHechas} de ${r.tareasTotal}`}><span style={{ width: `${r.tareasTotal ? (r.tareasHechas / r.tareasTotal) * 100 : 0}%` }} /></div>
        <div className="bar-acciones" style={{ marginTop: 12 }}>
          <button type="button" className="d-btn prim" onClick={() => onIr('tareas')}>Seguir con las tareas</button>
          {r.sinAvisar > 0 && <button type="button" className="d-btn" onClick={() => onIr('tareas')}>{r.sinAvisar === 1 ? '1 terminada sin avisar' : `${r.sinAvisar} terminadas sin avisar`}</button>}
          {r.conDeuda > 0 && <button type="button" className="d-btn" onClick={() => onIr('deudas')}>Ver deudas</button>}
        </div>
      </section>

      <section className="d-card" aria-labelledby="t-ing">
        <h2 id="t-ing">Ingresos mensuales</h2>
        <p className="sub">Facturado: honorarios de cada mes. Cobrado: lo que entró en cada mes.</p>
        <div className="ct-ley" aria-hidden="true"><span className="fac">Facturado</span><span className="cob">Cobrado</span></div>
        <ul className="ct-barras">
          {serie.map((s) => (
            <li key={s.periodo}>
              <div className="ct-par">
                <span className="fac" style={{ height: `${(s.facturado / max) * 100}%` }} title={`Facturado ${dinero(s.facturado, config.moneda)}`} />
                <span className="cob" style={{ height: `${(s.cobrado / max) * 100}%` }} title={`Cobrado ${dinero(s.cobrado, config.moneda)}`} />
              </div>
              <strong>{dinero(s.cobrado, config.moneda)}</strong>
              <span>{mesCorto(s.periodo)}</span>
              <span className="sr-only">Facturado {dinero(s.facturado, config.moneda)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="d-card" aria-labelledby="t-inf">
        <h2 id="t-inf">Pagos que avisaron los clientes</h2>
        <p className="sub">Los clientes avisan desde su portal; el pago queda confirmado solo cuando lo confirmás vos.</p>
        {informadas.length ? (
          <ul className="au-leads">
            {informadas.map((q) => (
              <li key={q.id}>
                <div className="au-lead-txt">
                  <strong>{nombre(q.clienteId)}</strong>
                  <span>{nombreMes(q.periodo)} · {dinero(q.monto, config.moneda)}</span>
                </div>
                <div className="au-lead-acc">
                  <button type="button" className="d-btn" onClick={() => onFicha(q.clienteId)}>Ver cuenta</button>
                  <button type="button" className="d-btn prim" onClick={() => actualizar((e) => confirmarPago(e, q.id, 'transferencia'))}><Icono nombre="check" size={16} /> Confirmar pago</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="tie-vacio">No hay pagos por confirmar.</p>}
      </section>
    </>
  );
}

// ---------------- Tareas del mes, en el orden de la cartera

function Tareas({ config, estado, actualizar, periodo, ahora }: Props) {
  const [ver, setVer] = useState<'pendientes' | 'terminadas' | 'todas'>('pendientes');
  const [msg, setMsg] = useState('');
  const clientes = useMemo(() => new Map(estado.clientes.map((c) => [c.id, c])), [estado.clientes]);
  const delMes = estado.tareas
    .filter((t) => t.periodo === periodo && clientes.get(t.clienteId)?.activo)
    .sort((a, b) => (clientes.get(a.clienteId)?.orden ?? 0) - (clientes.get(b.clienteId)?.orden ?? 0));
  const siguiente = delMes.find((t) => t.estado === 'pendiente');
  const lista = delMes.filter((t) => ver === 'todas' || (ver === 'pendientes' ? t.estado === 'pendiente' : t.estado === 'terminada'));
  const hechas = delMes.filter((t) => t.estado === 'terminada').length;
  const ctx = { negocio: config.negocio, moneda: config.moneda };

  function terminar(t: Tarea, c: ClienteC) {
    const fecha = new Date();
    // El mensaje sale con la tarea ya terminada y la cuenta del cliente al día de hoy.
    const despues = terminarTarea(estado, t.id, fecha);
    const texto = mensajeTarea(c, { ...t, estado: 'terminada' }, despues, ctx, ahora);
    if (c.whatsapp) window.open(enlaceWhatsApp(c.whatsapp, texto), '_blank', 'noopener,noreferrer');
    actualizar((e) => {
      const x = terminarTarea(e, t.id, fecha);
      return c.whatsapp ? marcarAvisada(x, t.id, fecha) : x;
    });
    setMsg(c.whatsapp ? `N° ${c.orden} ${nombreCompleto(c)}: terminada y avisada por WhatsApp.` : `N° ${c.orden} ${nombreCompleto(c)}: terminada. No tiene WhatsApp cargado.`);
  }

  return (
    <section className="d-card" aria-labelledby="t-tar">
      <h2 id="t-tar" style={{ textTransform: 'none' }}>{estado.ajustes.tareaMensual} de {nombreMes(periodo)}</h2>
      <p className="sub">En el orden de tu cartera. Al terminar, se abre el WhatsApp del cliente con la tarea, el costo del mes y lo que debe.</p>
      <div className="ct-progreso" aria-hidden="true"><span style={{ width: `${delMes.length ? (hechas / delMes.length) * 100 : 0}%` }} /></div>
      <p className="sub" style={{ marginTop: 6 }}>{hechas} de {delMes.length} terminadas</p>
      {siguiente && (() => {
        const c = clientes.get(siguiente.clienteId)!;
        const cuenta = cuentaDe(estado, c.id, ahora);
        return (
          <div className="ct-sigue" aria-live="polite">
            <span className="ct-num" aria-hidden="true">{c.orden}</span>
            <div style={{ minWidth: 0 }}>
              <small>Sigue en la fila</small>
              <strong>N° {c.orden} · {nombreCompleto(c)}</strong>
              <span>{c.usuario} · {NOMBRE_CATEGORIA[c.categoria]} · <EstadoPagoChip estado={cuenta.estado} /></span>
            </div>
            <button type="button" className="d-btn prim" onClick={() => terminar(siguiente, c)}><Icono nombre="whatsapp" size={16} /> Terminar y avisar</button>
          </div>
        );
      })()}
      {!siguiente && delMes.length > 0 && <p className="ct-listo" role="status">Terminaste todas las tareas del mes.</p>}
      {msg && <p role="status" className="sub">{msg}</p>}
      <div className="ag-profs" role="group" aria-label="Ver tareas" style={{ margin: '12px 0' }}>
        {(['pendientes', 'terminadas', 'todas'] as const).map((v) => <button key={v} type="button" aria-pressed={ver === v} onClick={() => setVer(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
      </div>
      <ul className="ct-tareas">
        {lista.map((t) => {
          const c = clientes.get(t.clienteId)!;
          const cuenta = cuentaDe(estado, c.id, ahora);
          const sigue = t.id === siguiente?.id;
          return (
            <li key={t.id} className={`${t.estado}${sigue ? ' sigue' : ''}`}>
              <span className="ct-num" aria-hidden="true">{c.orden}</span>
              <div className="ct-tarea-txt">
                <strong>{nombreCompleto(c)}</strong>
                <span>{c.usuario} · {dinero(c.honorario, config.moneda)} · <EstadoPagoChip estado={cuenta.estado} /></span>
                {t.estado === 'terminada' && <small>Terminada{t.avisada ? ' y avisada' : ', falta avisar'}</small>}
              </div>
              <div className="au-lead-acc">
                {t.estado === 'pendiente' ? (
                  <button type="button" className={`d-btn${sigue ? ' prim' : ''}`} aria-label={`Terminar y avisar a ${nombreCompleto(c)}`} onClick={() => terminar(t, c)}><Icono nombre="check" size={16} /> Terminar y avisar</button>
                ) : (
                  <>
                    {!t.avisada && c.whatsapp && <a className="d-btn prim" href={enlaceWhatsApp(c.whatsapp, mensajeTarea(c, t, estado, ctx, ahora))} target="_blank" rel="noopener noreferrer" onClick={() => actualizar((e) => marcarAvisada(e, t.id))}><Icono nombre="whatsapp" size={16} /> Avisar</a>}
                    <button type="button" className="d-btn" aria-label={`Reabrir la tarea de ${nombreCompleto(c)}`} onClick={() => actualizar((e) => reabrirTarea(e, t.id))}>Reabrir</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {!lista.length && <li className="tie-vacio">No hay tareas acá.</li>}
      </ul>
    </section>
  );
}

// ---------------- Clientes

/** Clave oculta con ojito: se ve 15 segundos y cada vista queda registrada. */
export function ClaveOculta({ cliente, actualizar }: { cliente: ClienteC; actualizar: ActualizarContador }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 15_000);
    return () => clearTimeout(t);
  }, [visible]);
  if (!cliente.clave) return <span className="ct-sinclave">Sin clave</span>;
  return (
    <span className="ct-clave">
      <code aria-live="polite">{visible ? cliente.clave : '••••••••'}</code>
      <button
        type="button"
        className="ct-ojo"
        aria-pressed={visible}
        aria-label={visible ? `Ocultar la clave de ${nombreCompleto(cliente)}` : `Ver la clave de ${nombreCompleto(cliente)}`}
        title={visible ? 'Ocultar' : 'Ver por 15 segundos'}
        onClick={() => {
          if (!visible) actualizar((e) => registrarAcceso(e, cliente.id, 'Vio la clave'));
          setVisible((v) => !v);
        }}
      >
        <Icono nombre={visible ? 'ojoNo' : 'ojo'} size={18} />
      </button>
    </span>
  );
}

function Clientes({ config, estado, actualizar, ahora, onFicha }: Props & { onFicha: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<EstadoPago | 'informada' | 'todos'>('todos');
  const [cuantos, setCuantos] = useState(50);
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filas = estado.clientes
    .filter((c) => c.activo)
    .map((c) => ({ c, cuenta: cuentaDe(estado, c.id, ahora) }))
    .filter(({ c }) => !q || n(`${c.nombre} ${c.apellido} ${c.usuario} ${soloDigitos(c.usuario)} ${c.orden}`).includes(n(q.trim())))
    .filter(({ cuenta }) => filtro === 'todos' || (filtro === 'informada' ? cuenta.informada : cuenta.estado === filtro))
    .sort((a, b) => a.c.orden - b.c.orden);
  const inactivos = estado.clientes.filter((c) => !c.activo).length;
  return (
    <section className="d-card" aria-labelledby="t-cli">
      <h2 id="t-cli">Clientes</h2>
      <p className="sub">Tocá el ojito para ver una clave durante 15 segundos; queda registrado en Ajustes. Tocá el nombre para ver el historial de pagos.</p>
      <div className="ct-filtros">
        <label className="ct-buscar">
          <Icono nombre="buscar" size={18} />
          <span className="sr-only">Buscar clientes</span>
          <input className="c-inp" type="search" placeholder="Nombre, apellido, usuario o N°" value={q} onChange={(e) => { setQ(e.target.value); setCuantos(50); }} aria-label="Buscar clientes" />
        </label>
        <div className="ag-profs" role="group" aria-label="Filtrar por estado de pago">
          {(['todos', 'al-dia', 'por-vencer', 'debe', 'informada'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => { setFiltro(f); setCuantos(50); }}>{f === 'todos' ? 'Todos' : f === 'informada' ? 'Avisaron que pagaron' : f === 'por-vencer' ? 'Mes por pagar' : NOMBRE_ESTADO_PAGO[f]}</button>
          ))}
        </div>
      </div>
      <p className="sub" style={{ margin: '0 0 8px' }}>{filas.length === 1 ? '1 cliente' : `${filas.length.toLocaleString('es')} clientes`}{inactivos ? ` · ${inactivos} dado de baja` : ''}</p>
      <div className="d-scroll">
        <table className="d-tabla ct-tabla">
          <thead><tr><th>N°</th><th>Nombre</th><th>Apellido</th><th>Usuario</th><th>Clave</th><th>Honorario</th><th>Estado</th></tr></thead>
          <tbody>
            {filas.slice(0, cuantos).map(({ c, cuenta }) => (
              <tr key={c.id}>
                <td className="ct-n">{c.orden}</td>
                <td><button type="button" className="ct-link" onClick={() => onFicha(c.id)}>{c.nombre}</button></td>
                <td>{c.apellido || '—'}</td>
                <td className="ct-mono">{c.usuario || '—'}</td>
                <td><ClaveOculta cliente={c} actualizar={actualizar} /></td>
                <td className="ct-num-col">{dinero(c.honorario, config.moneda)}</td>
                <td><EstadoPagoChip estado={cuenta.estado} />{cuenta.deuda > 0 && <small className="ct-deuda">{dinero(cuenta.deuda, config.moneda)}</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filas.length && <p className="tie-vacio">No hay clientes con ese filtro.</p>}
      {filas.length > cuantos && <button type="button" className="d-btn" style={{ marginTop: 10 }} onClick={() => setCuantos((x) => x + 100)}>Ver {Math.min(100, filas.length - cuantos)} más</button>}
    </section>
  );
}

function Ficha({ config, estado, actualizar, periodo, ahora, cliente: c, onCerrar }: Props & { cliente: ClienteC; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const cuenta = cuentaDe(estado, c.id, ahora);
  const [honorario, setHonorario] = useState(String(c.honorario));
  const [msg, setMsg] = useState('');
  const ctx = { negocio: config.negocio, moneda: config.moneda };
  // Últimos 12 meses de la cartera (desde el alta).
  const desde = c.alta.slice(0, 7);
  const meses = Array.from({ length: 12 }, (_, i) => sumarMeses(periodo, i - 11)).filter((p) => p >= desde);
  const cuotaDe = (p: string) => cuenta.cuotas.find((q) => q.periodo === p);
  const tareaDe = (p: string) => estado.tareas.find((t) => t.clienteId === c.id && t.periodo === p);
  const pagar = (q: Cuota) => {
    actualizar((e) => confirmarPago(e, q.id, 'transferencia'));
    setMsg(`Pago de ${nombreMes(q.periodo)} confirmado.`);
  };
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja ct-ficha" role="dialog" aria-modal="true" aria-labelledby="ct-t-ficha" ref={ref}>
        <div className="hoja-cab">
          <div>
            <h2 id="ct-t-ficha">N° {c.orden} · {nombreCompleto(c)}</h2>
            <p className="sub" style={{ margin: 0 }}>{NOMBRE_CATEGORIA[c.categoria]} · cliente desde {nombreMes(desde)}</p>
          </div>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={20} /></button>
        </div>
        <dl className="ct-datos">
          <div><dt>Usuario</dt><dd className="ct-mono">{c.usuario || '—'}</dd></div>
          <div><dt>Clave</dt><dd><ClaveOculta cliente={c} actualizar={actualizar} /></dd></div>
          <div><dt>WhatsApp</dt><dd>{c.whatsapp ? `+${c.whatsapp}` : 'Sin cargar'}</dd></div>
          <div><dt>Estado</dt><dd><EstadoPagoChip estado={cuenta.estado} /></dd></div>
        </dl>
        <div className="ct-resumen">
          <div><span>Debe (vencido)</span><strong>{dinero(cuenta.deuda, config.moneda)}</strong></div>
          <div><span>Total pendiente</span><strong>{dinero(cuenta.total, config.moneda)}</strong></div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const v = Number(soloDigitos(honorario));
            if (!v) return setMsg('Escribí un honorario válido.');
            actualizar((x) => cambiarHonorario(x, c.id, v, periodo));
            setMsg('Honorario actualizado. Si la cuota del mes no estaba paga, también cambió.');
          }}>
            <label htmlFor="ct-hon">Honorario mensual</label>
            <span style={{ display: 'flex', gap: 6 }}><input id="ct-hon" className="c-inp" inputMode="numeric" value={honorario} onChange={(e) => setHonorario(e.target.value)} /><button type="submit" className="d-btn">Guardar</button></span>
          </form>
        </div>
        {msg && <p role="status" className="sub">{msg}</p>}
        <h3 className="ct-h3">Historial de pagos</h3>
        <ul className="ct-meses">
          {[...meses].reverse().map((p) => {
            const q = cuotaDe(p);
            const t = tareaDe(p);
            const venc = q && q.estado === 'pendiente' && cuenta.vencidas.includes(q);
            return (
              <li key={p} className={q ? (q.estado === 'pagada' ? 'pagada' : venc ? 'vencida' : 'pendiente') : 'sin'}>
                <div className="ct-mes-txt">
                  <strong style={{ textTransform: 'capitalize' }}>{nombreMes(p)}</strong>
                  <span>
                    {q ? dinero(q.monto, config.moneda) : 'Sin cuota'}
                    {q?.estado === 'pagada' && q.pagada ? ` · pagó el ${new Date(q.pagada).toLocaleDateString('es')}${q.medio ? ` (${q.medio})` : ''}` : ''}
                    {q?.estado === 'pendiente' ? (venc ? ' · vencida' : ' · por pagar') : ''}
                    {q?.informada ? ' · el cliente avisó que pagó' : ''}
                  </span>
                  {t && <small>{t.nombre}: {t.estado === 'terminada' ? 'terminada' : 'pendiente'}</small>}
                </div>
                <div className="au-lead-acc">
                  {q?.estado === 'pendiente' && <button type="button" className="d-btn prim" aria-label={`Confirmar pago de ${nombreMes(p)}`} onClick={() => pagar(q)}><Icono nombre="check" size={16} /> Confirmar pago</button>}
                  {q?.estado === 'pagada' && (
                    <>
                      {c.whatsapp && <a className="d-btn" href={enlaceWhatsApp(c.whatsapp, mensajePago(c, q, ctx))} target="_blank" rel="noopener noreferrer" aria-label={`Enviar comprobante de ${nombreMes(p)}`}><Icono nombre="whatsapp" size={16} /> Comprobante</a>}
                      <button type="button" className="d-btn" aria-label={`Anular pago de ${nombreMes(p)}`} onClick={() => { actualizar((e) => anularPago(e, q.id)); setMsg(`Pago de ${nombreMes(p)} anulado.`); }}>Anular</button>
                    </>
                  )}
                  {!q && <button type="button" className="d-btn" onClick={() => actualizar((e) => sumarCuota(e, c.id, p, c.honorario))}>Sumar cuota</button>}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="bar-acciones" style={{ marginTop: 14 }}>
          {c.whatsapp && cuenta.total > 0 && <a className="d-btn prim" href={enlaceWhatsApp(c.whatsapp, mensajeDeuda(c, estado, ctx, ahora))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={16} /> Recordar lo pendiente</a>}
          <button type="button" className="d-btn" onClick={() => { actualizar((e) => ({ ...e, clientes: e.clientes.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x)) })); onCerrar(); }}>{c.activo ? 'Dar de baja' : 'Reactivar'}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Deudas

function Deudas({ config, estado, actualizar, ahora, onFicha }: Props & { onFicha: (id: string) => void }) {
  const [hecho, setHecho] = useState<string[]>([]);
  const ctx = { negocio: config.negocio, moneda: config.moneda };
  const deudores = estado.clientes
    .filter((c) => c.activo)
    .map((c) => ({ c, cuenta: cuentaDe(estado, c.id, ahora) }))
    .filter(({ cuenta }) => cuenta.deuda > 0)
    .sort((a, b) => b.cuenta.deuda - a.cuenta.deuda || a.c.orden - b.c.orden);
  const total = deudores.reduce((t, d) => t + d.cuenta.deuda, 0);
  const proximo = deudores.find(({ c }) => !hecho.includes(c.id) && c.whatsapp);
  const recordar = (c: ClienteC) => {
    setHecho((h) => [...h, c.id]);
    actualizar((e) => registrarAcceso(e, c.id, 'Recordatorio de deuda por WhatsApp'));
  };
  return (
    <section className="d-card" aria-labelledby="t-deu">
      <h2 id="t-deu">Control de deudas</h2>
      <p className="sub">{deudores.length} clientes deben {dinero(total, config.moneda)} vencidos. El recordatorio sale con el detalle de cada mes y el alias para pagar.</p>
      {proximo && (
        <a className="d-btn prim" style={{ marginBottom: 12 }} href={enlaceWhatsApp(proximo.c.whatsapp, mensajeDeuda(proximo.c, estado, ctx, ahora))} target="_blank" rel="noopener noreferrer" onClick={() => recordar(proximo.c)}>
          <Icono nombre="whatsapp" size={16} /> Recordar al siguiente: {nombreCompleto(proximo.c)}
        </a>
      )}
      <ul className="au-leads">
        {deudores.map(({ c, cuenta }) => (
          <li key={c.id}>
            <span className="ct-num" aria-hidden="true">{c.orden}</span>
            <div className="au-lead-txt">
              <strong><button type="button" className="ct-link" onClick={() => onFicha(c.id)}>{nombreCompleto(c)}</button> <span className="sem-luz rojo"><span className="sem-punto" aria-hidden="true" />{dinero(cuenta.deuda, config.moneda)}</span></strong>
              <span>{cuenta.vencidas.length === 1 ? '1 mes' : `${cuenta.vencidas.length} meses`}: {cuenta.vencidas.map((q) => mesCorto(q.periodo)).join(', ')}{cuenta.informada ? ' · avisó que pagó' : ''}</span>
              {hecho.includes(c.id) && <small>Recordado hoy</small>}
            </div>
            <div className="au-lead-acc">
              {c.whatsapp ? <a className="d-btn" href={enlaceWhatsApp(c.whatsapp, mensajeDeuda(c, estado, ctx, ahora))} target="_blank" rel="noopener noreferrer" aria-label={`Recordar a ${nombreCompleto(c)}`} onClick={() => recordar(c)}><Icono nombre="whatsapp" size={16} /> Recordar</a> : <span className="sub">Sin WhatsApp</span>}
            </div>
          </li>
        ))}
        {!deudores.length && <li className="tie-vacio">Nadie debe meses vencidos.</li>}
      </ul>
    </section>
  );
}

// ---------------- Ajustes

function Ajustes({ slug, config, estado, actualizar }: Props & { slug: string }) {
  const [msg, setMsg] = useState('');
  const nombre = (id: string) => { const c = estado.clientes.find((x) => x.id === id); return c ? `N° ${c.orden} ${nombreCompleto(c)}` : 'Cliente'; };
  return (
    <>
      <section className="d-card" aria-labelledby="t-aj">
        <h2 id="t-aj">Ajustes del estudio</h2>
        <form
          style={{ display: 'grid', gap: 12, maxWidth: 560 }}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
            if (wa.length < 8) return setMsg('Revisá el WhatsApp: incluí código de país y de área.');
            const dia = Math.min(28, Math.max(1, Number(f.get('dia')) || 10));
            const tarea = String(f.get('tarea') ?? '').trim().slice(0, 60) || 'Declaración mensual';
            const alias = String(f.get('alias') ?? '').trim().slice(0, 60);
            try {
              actualizarDemo(slug, { whatsapp: wa });
              const err = actualizar((x) => ({ ...x, ajustes: { tareaMensual: tarea, diaVencimiento: dia, alias: alias || x.ajustes.alias }, tareas: x.tareas.map((t) => (t.estado === 'pendiente' ? { ...t, nombre: tarea } : t)) }));
              setMsg(err ?? 'Ajustes guardados.');
            } catch (er) {
              setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.');
            }
          }}
        >
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp del estudio<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Tarea que se repite cada mes<input name="tarea" className="c-inp" defaultValue={estado.ajustes.tareaMensual} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Día de vencimiento<input name="dia" className="c-inp" inputMode="numeric" defaultValue={estado.ajustes.diaVencimiento} /></label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Alias para transferir<input name="alias" className="c-inp" defaultValue={estado.ajustes.alias} /></label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="d-btn prim">Guardar ajustes</button>
            <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios y los clientes importados.')) { reiniciarDatos(slug, config.moneda, 'contador'); setMsg('El estudio volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
          </div>
          {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
        </form>
      </section>
      <section className="d-card" aria-labelledby="t-acc">
        <h2 id="t-acc">Registro de accesos a claves</h2>
        <p className="sub">Cada vez que alguien toca el ojito queda anotado. En la versión real se registra también quién fue.</p>
        {estado.accesos.length ? (
          <ul className="ct-accesos">
            {estado.accesos.slice(0, 30).map((a, i) => <li key={i}><span>{new Date(a.fecha).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}</span><span>{nombre(a.clienteId)}</span><span>{a.accion}</span></li>)}
          </ul>
        ) : <p className="tie-vacio">Todavía nadie miró una clave.</p>}
      </section>
    </>
  );
}

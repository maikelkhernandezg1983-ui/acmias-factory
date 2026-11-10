'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { codificarConfig, enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { NOMBRE_AREA, NOMBRE_CATEGORIA_RS, NOMBRE_ESTADO_HAB, NOMBRE_TIPO_HAB, avanzar, cambiarEstadoHab, cancelar, checkin, checkout, cuenta, dinero, estadiaActiva, fechaCorta, fechaLocal, hace, mensajeBienvenida, mensajeCuenta, metricas, minutosDesde, nuevaReserva } from '@/lib/rubros/hotel/logica';
import type { Area, EstadoHab, EstadoHotel, Estadia, Habitacion, Solicitud } from '@/lib/rubros/hotel/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { useAhoraHotel, useDemoHotel, type ActualizarHotel } from './useHotel';

type Pestana = 'pedidos' | 'habitaciones' | 'movimientos' | 'carta' | 'metricas' | 'ajustes';
interface Props { slug: string; config: DemoConfig; estado: EstadoHotel; actualizar: ActualizarHotel; ahora: number }

/** Enlace del QR de la habitación (lleva la configuración de la demo para abrir en cualquier celular). */
const enlaceHuesped = (config: DemoConfig, h: Habitacion) => `${typeof window === 'undefined' ? '' : window.location.origin}/d/${config.slug}?hab=${h.codigo}#c=${codificarConfig(config)}`;

export function PanelHotel({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoHotel(slug);
  const ahora = useAhoraHotel();
  const [pestana, setPestana] = useState<Pestana>('pedidos');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const m = metricas(estado, ahora);
  const props: Props = { slug, config, estado, actualizar, ahora };
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'pedidos', nombre: `Pedidos${m.abiertos ? ` (${m.abiertos})` : ''}` },
    { id: 'habitaciones', nombre: 'Habitaciones' },
    { id: 'movimientos', nombre: `Llegadas y salidas${m.llegadas + m.salidas ? ` (${m.llegadas + m.salidas})` : ''}` },
    { id: 'carta', nombre: 'Room service' },
    { id: 'metricas', nombre: 'Métricas' },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];
  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Huéspedes, pedidos y tarifas de ejemplo" />
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
              <div style={{ fontSize: 13, opacity: 0.9 }}>Ocupación {m.ocupacion} % · {m.ocupadas} de {m.habilitadas} habitaciones</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}/qr`}><Icono nombre="qr" size={18} /> QR de habitaciones</Link>
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
        {pestana === 'pedidos' && <Pedidos {...props} />}
        {pestana === 'habitaciones' && <Habitaciones {...props} />}
        {pestana === 'movimientos' && <Movimientos {...props} />}
        {pestana === 'carta' && <CartaRS {...props} />}
        {pestana === 'metricas' && <Metricas {...props} />}
        {pestana === 'ajustes' && <Ajustes {...props} />}
      </main>
    </div>
  );
}

// ---------------- Pedidos por área

const COLUMNAS: { estado: Solicitud['estado']; titulo: string }[] = [
  { estado: 'nueva', titulo: 'Nuevos' },
  { estado: 'en-curso', titulo: 'En curso' },
  { estado: 'lista', titulo: 'Listos hoy' },
];
const DEMORA_MIN = 10;

function Pedidos({ config, estado, actualizar, ahora }: Props) {
  const [area, setArea] = useState<Area | 'todas'>('todas');
  const hoy = fechaLocal(ahora);
  const num = (id: string) => estado.habitaciones.find((h) => h.id === id)?.numero ?? '—';
  const visibles = estado.solicitudes
    .filter((s) => area === 'todas' || s.area === area)
    .filter((s) => s.estado === 'nueva' || s.estado === 'en-curso' || (s.estado === 'lista' && fechaLocal(new Date(s.lista ?? s.fecha)) === hoy));
  const abiertasPor = (a: Area) => estado.solicitudes.filter((s) => s.area === a && (s.estado === 'nueva' || s.estado === 'en-curso')).length;
  return (
    <section className="d-card" aria-labelledby="t-ped">
      <h2 id="t-ped">Pedidos de las habitaciones</h2>
      <p className="sub">Llegan desde el QR de cada habitación, separados por área. Los nuevos con más de {DEMORA_MIN} minutos se marcan en rojo.</p>
      <div className="ag-profs" role="group" aria-label="Área" style={{ marginBottom: 14 }}>
        <button type="button" aria-pressed={area === 'todas'} onClick={() => setArea('todas')}>Todas</button>
        {(['cocina', 'limpieza', 'mantenimiento', 'recepcion'] as Area[]).map((a) => (
          <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(a)}>{NOMBRE_AREA[a]}{abiertasPor(a) ? ` (${abiertasPor(a)})` : ''}</button>
        ))}
      </div>
      <div className="ho-tablero">
        {COLUMNAS.map((col) => {
          const lista = visibles.filter((s) => s.estado === col.estado).sort((a, b) => (col.estado === 'lista' ? (b.lista ?? '').localeCompare(a.lista ?? '') : a.fecha.localeCompare(b.fecha)));
          return (
            <section key={col.estado} className={`ho-col c-${col.estado}`} aria-label={`${col.titulo}: ${lista.length}`}>
              <h3>{col.titulo} <span>{lista.length}</span></h3>
              <ul>
                {lista.map((s) => {
                  const min = minutosDesde(s.fecha, ahora);
                  const demora = s.estado === 'nueva' && min >= DEMORA_MIN;
                  return (
                    <li key={s.id} className={`ho-tarjeta a-${s.area}${demora ? ' demora' : ''}`}>
                      <div className="ho-tarjeta-cab">
                        <strong className="ho-num-hab">{num(s.habitacionId)}</strong>
                        <span className="ho-area">{NOMBRE_AREA[s.area]}</span>
                        <span className="ho-tiempo">{s.estado === 'lista' ? `listo ${hace(s.lista ?? s.fecha, ahora)}` : hace(s.fecha, ahora)}</span>
                      </div>
                      <strong className="ho-que">{s.area === 'cocina' ? s.items?.map((l) => `${l.cantidad} × ${l.nombre}`).join(' · ') : s.tipo}</strong>
                      {(s.detalle || s.para) && <span className="ho-detalle">{s.para ? `Para las ${s.para}. ` : ''}{s.detalle ? `“${s.detalle}”` : ''}</span>}
                      {s.total > 0 && <span className="ho-detalle">{dinero(s.total, config.moneda)} a la habitación</span>}
                      {s.estado !== 'lista' && (
                        <div className="ho-acc">
                          <button type="button" className="d-btn prim" aria-label={`${s.estado === 'nueva' ? 'Tomar' : 'Marcar listo'}: ${s.tipo} de la ${num(s.habitacionId)}`} onClick={() => actualizar((e) => avanzar(e, s.id))}>{s.estado === 'nueva' ? 'Tomar' : 'Marcar listo'}</button>
                          <button type="button" className="d-btn" aria-label={`Cancelar: ${s.tipo} de la ${num(s.habitacionId)}`} onClick={() => actualizar((e) => cancelar(e, s.id))}>Cancelar</button>
                        </div>
                      )}
                    </li>
                  );
                })}
                {!lista.length && <li className="ho-vacio">Nada por acá.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

// ---------------- Habitaciones

function Habitaciones(props: Props) {
  const { estado, ahora } = props;
  const [abierta, setAbierta] = useState<string | null>(null);
  const pisos = [...new Set(estado.habitaciones.map((h) => h.piso))].sort();
  const cuenta2 = (e: EstadoHab) => estado.habitaciones.filter((h) => h.estado === e).length;
  const hoy = fechaLocal(ahora);
  const hab = abierta ? estado.habitaciones.find((h) => h.id === abierta) : undefined;
  return (
    <section className="d-card" aria-labelledby="t-hab">
      <h2 id="t-hab">Habitaciones</h2>
      <div className="ho-leyenda">
        {(['ocupada', 'libre', 'limpieza', 'mantenimiento'] as EstadoHab[]).map((e) => <span key={e} className={`ho-ley e-${e}`}><i aria-hidden="true" />{NOMBRE_ESTADO_HAB[e]}: {cuenta2(e)}</span>)}
      </div>
      {pisos.map((p) => (
        <div key={p} className="ho-piso">
          <h3>Piso {p}</h3>
          <div className="ho-grilla">
            {estado.habitaciones.filter((h) => h.piso === p).map((h) => {
              const s = estadiaActiva(estado, h.id);
              const abiertos = estado.solicitudes.filter((x) => x.habitacionId === h.id && (x.estado === 'nueva' || x.estado === 'en-curso')).length;
              return (
                <button key={h.id} type="button" className={`ho-hab-tile e-${h.estado}`} onClick={() => setAbierta(h.id)} aria-label={`Habitación ${h.numero}, ${NOMBRE_ESTADO_HAB[h.estado]}${s ? `, ${s.huesped}` : ''}`}>
                  <strong>{h.numero}</strong>
                  <span>{NOMBRE_TIPO_HAB[h.tipo]}</span>
                  <small>{s ? `${s.huesped.split(' ')[0]}${s.salida <= hoy ? ' · sale hoy' : ''}` : NOMBRE_ESTADO_HAB[h.estado]}</small>
                  {abiertos > 0 && <em className="ho-badge" aria-hidden="true">{abiertos}</em>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {hab && <FichaHab {...props} hab={hab} onCerrar={() => setAbierta(null)} />}
    </section>
  );
}

function FichaHab({ slug, config, estado, actualizar, ahora, hab, onCerrar }: Props & { hab: Habitacion; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const s = estadiaActiva(estado, hab.id);
  const c = s ? cuenta(estado, s.id) : null;
  const [msg, setMsg] = useState('');
  const ctx = { negocio: config.negocio, moneda: config.moneda };
  const pedidos = s ? estado.solicitudes.filter((x) => x.estadiaId === s.id && x.estado !== 'cancelada').sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6) : [];
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja ho-ficha" role="dialog" aria-modal="true" aria-labelledby="ho-t-ficha" ref={ref}>
        <div className="hoja-cab">
          <div>
            <h2 id="ho-t-ficha">Habitación {hab.numero}</h2>
            <p className="sub" style={{ margin: 0 }}>{NOMBRE_TIPO_HAB[hab.tipo]} · hasta {hab.capacidad} {hab.capacidad === 1 ? 'persona' : 'personas'} · {dinero(hab.tarifa, config.moneda)} la noche</p>
          </div>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={20} /></button>
        </div>
        {s && c ? (
          <>
            <div className="ho-estadia">
              <strong>{s.huesped}</strong>
              <span>{s.personas} {s.personas === 1 ? 'persona' : 'personas'} · {fechaCorta(s.entrada)} al {fechaCorta(s.salida)} · +{s.whatsapp}</span>
            </div>
            <ul className="ho-resumen">
              <li><span>Alojamiento ({c.noches} {c.noches === 1 ? 'noche' : 'noches'})</span><span>{dinero(c.alojamiento, config.moneda)}</span></li>
              {c.cargos.map((x) => <li key={x.id}><span>{x.concepto}</span><span>{dinero(x.monto, config.moneda)}</span></li>)}
              <li className="total"><span>Total de la cuenta</span><span>{dinero(c.total, config.moneda)}</span></li>
            </ul>
            {pedidos.length > 0 && <p className="sub">Últimos pedidos: {pedidos.map((x) => `${x.tipo} (${hace(x.fecha, ahora)})`).join(' · ')}</p>}
            <div className="bar-acciones">
              <a className="d-btn" href={`/d/${slug}?hab=${hab.codigo}`} target="_blank" rel="noopener noreferrer"><Icono nombre="ojo" size={16} /> Ver como huésped</a>
              <a className="d-btn" href={enlaceWhatsApp(s.whatsapp, mensajeBienvenida(s, hab, estado, enlaceHuesped(config, hab), ctx))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={16} /> Enviar bienvenida</a>
              <a className="d-btn prim" href={enlaceWhatsApp(s.whatsapp, mensajeCuenta(s, hab, estado, ctx))} target="_blank" rel="noopener noreferrer" onClick={() => { actualizar((e) => checkout(e, s.id)); onCerrar(); }}><Icono nombre="check" size={16} /> Check-out y enviar cuenta</a>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 10px' }}>Estado: <strong>{NOMBRE_ESTADO_HAB[hab.estado]}</strong></p>
            <div className="ag-profs" role="group" aria-label="Cambiar estado">
              {(['libre', 'limpieza', 'mantenimiento'] as EstadoHab[]).map((e) => (
                <button key={e} type="button" aria-pressed={hab.estado === e} onClick={() => { actualizar((x) => cambiarEstadoHab(x, hab.id, e)); setMsg(`La ${hab.numero} quedó ${NOMBRE_ESTADO_HAB[e].toLowerCase()}.`); }}>{e === 'libre' ? 'Lista para usar' : NOMBRE_ESTADO_HAB[e]}</button>
              ))}
            </div>
            <Reserva estado={estado} actualizar={actualizar} ahora={ahora} hab={hab} onListo={(t) => setMsg(t)} />
          </>
        )}
        {msg && <p role="status" className="sub">{msg}</p>}
      </div>
    </div>
  );
}

function Reserva({ estado, actualizar, ahora, hab, onListo }: { estado: EstadoHotel; actualizar: ActualizarHotel; ahora: number; hab?: Habitacion; onListo: (t: string) => void }) {
  const hoy = fechaLocal(ahora);
  const manana = fechaLocal(ahora + 86_400_000);
  const [f, setF] = useState({ habitacionId: hab?.id ?? estado.habitaciones.find((h) => h.estado !== 'mantenimiento')!.id, huesped: '', whatsapp: '', personas: '2', entrada: hoy, salida: manana });
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="ho-reserva"
      onSubmit={(e) => {
        e.preventDefault();
        const wa = soloDigitos(f.whatsapp);
        if (wa.length < 8) return setError('Escribí el WhatsApp con código de país y de área.');
        let fallo = '';
        const err = actualizar((x) => {
          const r = nuevaReserva(x, { ...f, whatsapp: wa, personas: Math.max(1, Number(f.personas) || 1) });
          if ('error' in r) { fallo = r.error; return x; }
          return r;
        });
        if (err || fallo) return setError(err || fallo);
        setError('');
        const n = estado.habitaciones.find((h) => h.id === f.habitacionId)?.numero;
        onListo(`Reserva de ${f.huesped.trim()} en la ${n} guardada${f.entrada === hoy ? ': aparece en las llegadas de hoy' : ''}.`);
        setF((x) => ({ ...x, huesped: '', whatsapp: '' }));
      }}
    >
      <h3>Nueva reserva</h3>
      <div className="ho-reserva-campos">
        {!hab && (
          <label>Habitación
            <select className="c-inp" value={f.habitacionId} onChange={set('habitacionId')}>
              {estado.habitaciones.filter((h) => h.estado !== 'mantenimiento').map((h) => <option key={h.id} value={h.id}>{h.numero} · {NOMBRE_TIPO_HAB[h.tipo]}</option>)}
            </select>
          </label>
        )}
        <label>Huésped<input className="c-inp" value={f.huesped} onChange={set('huesped')} autoComplete="off" /></label>
        <label>WhatsApp<input className="c-inp" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></label>
        <label>Personas<input className="c-inp" inputMode="numeric" value={f.personas} onChange={set('personas')} /></label>
        <label>Entrada<input className="c-inp" type="date" value={f.entrada} onChange={set('entrada')} /></label>
        <label>Salida<input className="c-inp" type="date" value={f.salida} onChange={set('salida')} /></label>
      </div>
      {error && <p className="bar-err" role="alert">{error}</p>}
      <div><button type="submit" className="d-btn prim">Guardar reserva</button></div>
    </form>
  );
}

// ---------------- Llegadas y salidas

function Movimientos({ config, estado, actualizar, ahora }: Props) {
  const [msg, setMsg] = useState('');
  const hoy = fechaLocal(ahora);
  const ctx = { negocio: config.negocio, moneda: config.moneda };
  const habDe = (s: Estadia) => estado.habitaciones.find((h) => h.id === s.habitacionId)!;
  const llegadas = estado.estadias.filter((s) => s.estado === 'reservada' && s.entrada <= hoy).sort((a, b) => habDe(a).numero.localeCompare(habDe(b).numero));
  const salidas = estado.estadias.filter((s) => s.estado === 'activa' && s.salida <= hoy).sort((a, b) => habDe(a).numero.localeCompare(habDe(b).numero));
  const proximas = estado.estadias.filter((s) => s.estado === 'reservada' && s.entrada > hoy).sort((a, b) => a.entrada.localeCompare(b.entrada));
  return (
    <>
      {msg && <p role="status" className="ct-listo">{msg}</p>}
      <section className="d-card" aria-labelledby="t-lle">
        <h2 id="t-lle">Llegadas de hoy</h2>
        <ul className="au-leads">
          {llegadas.map((s) => {
            const h = habDe(s);
            return (
              <li key={s.id}>
                <span className="ho-num-hab grande">{h.numero}</span>
                <div className="au-lead-txt">
                  <strong>{s.huesped}</strong>
                  <span>{NOMBRE_TIPO_HAB[h.tipo]} · {s.personas} {s.personas === 1 ? 'persona' : 'personas'} · hasta el {fechaCorta(s.salida)}</span>
                  {h.estado !== 'libre' && <small className="ho-alerta">La habitación está {NOMBRE_ESTADO_HAB[h.estado].toLowerCase()}</small>}
                </div>
                <div className="au-lead-acc">
                  {h.estado === 'limpieza' && <button type="button" className="d-btn" onClick={() => actualizar((e) => cambiarEstadoHab(e, h.id, 'libre'))}>Marcar lista</button>}
                  <a
                    className="d-btn prim"
                    href={enlaceWhatsApp(s.whatsapp, mensajeBienvenida(s, h, estado, enlaceHuesped(config, h), ctx))}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Check-in de ${s.huesped}`}
                    onClick={(ev) => {
                      let fallo = '';
                      actualizar((e) => { const r = checkin(e, s.id); if ('error' in r) { fallo = r.error; return e; } return r; });
                      if (fallo) { ev.preventDefault(); setMsg(fallo); } else setMsg(`Check-in de ${s.huesped} en la ${h.numero}. Le mandamos la bienvenida con el wifi y el enlace de su habitación.`);
                    }}
                  >
                    <Icono nombre="check" size={16} /> Check-in y bienvenida
                  </a>
                </div>
              </li>
            );
          })}
          {!llegadas.length && <li className="tie-vacio">No quedan llegadas para hoy.</li>}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-sal">
        <h2 id="t-sal">Salidas de hoy</h2>
        <ul className="au-leads">
          {salidas.map((s) => {
            const h = habDe(s);
            const c = cuenta(estado, s.id);
            return (
              <li key={s.id}>
                <span className="ho-num-hab grande">{h.numero}</span>
                <div className="au-lead-txt">
                  <strong>{s.huesped}</strong>
                  <span>{c.noches} {c.noches === 1 ? 'noche' : 'noches'} · {c.cargos.length === 1 ? '1 consumo' : `${c.cargos.length} consumos`} · total {dinero(c.total, config.moneda)}</span>
                </div>
                <div className="au-lead-acc">
                  <a className="d-btn prim" href={enlaceWhatsApp(s.whatsapp, mensajeCuenta(s, h, estado, ctx))} target="_blank" rel="noopener noreferrer" aria-label={`Check-out de ${s.huesped}`} onClick={() => { actualizar((e) => checkout(e, s.id)); setMsg(`Check-out de ${s.huesped}: la ${h.numero} quedó para limpiar.`); }}>
                    <Icono nombre="whatsapp" size={16} /> Check-out y enviar cuenta
                  </a>
                </div>
              </li>
            );
          })}
          {!salidas.length && <li className="tie-vacio">No quedan salidas para hoy.</li>}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-res">
        <h2 id="t-res">Reservas</h2>
        {proximas.length > 0 && (
          <ul className="au-leads" style={{ marginBottom: 14 }}>
            {proximas.map((s) => <li key={s.id}><span className="ho-num-hab grande">{habDe(s).numero}</span><div className="au-lead-txt"><strong>{s.huesped}</strong><span>{fechaCorta(s.entrada)} al {fechaCorta(s.salida)} · {s.personas} {s.personas === 1 ? 'persona' : 'personas'}</span></div></li>)}
          </ul>
        )}
        <Reserva estado={estado} actualizar={actualizar} ahora={ahora} onListo={setMsg} />
      </section>
    </>
  );
}

// ---------------- Carta de room service

function CartaRS({ config, estado, actualizar }: Props) {
  return (
    <section className="d-card" aria-labelledby="t-carta">
      <h2 id="t-carta">Carta de room service</h2>
      <p className="sub">Lo que no esté disponible se ve como &quot;No disponible ahora&quot; en el QR de las habitaciones.</p>
      <ul className="au-stock">
        {estado.carta.map((it) => (
          <li key={it.id}>
            <div className="au-stock-txt">
              <strong>{it.nombre}</strong>
              <span>{NOMBRE_CATEGORIA_RS[it.categoria]} · {it.descripcion}</span>
            </div>
            <div className="au-stock-acc">
              <label className="au-precio-ed">
                <span className="sr-only">Precio de {it.nombre}</span>
                <input className="c-inp" inputMode="numeric" defaultValue={it.precio} aria-label={`Precio de ${it.nombre}`} onBlur={(e) => { const v = Number(soloDigitos(e.target.value)); if (v > 0 && v !== it.precio) actualizar((x) => ({ ...x, carta: x.carta.map((c) => (c.id === it.id ? { ...c, precio: v } : c)) })); }} />
              </label>
              <label className="au-switch"><input type="checkbox" checked={it.disponible} onChange={(e) => actualizar((x) => ({ ...x, carta: x.carta.map((c) => (c.id === it.id ? { ...c, disponible: e.target.checked } : c)) }))} aria-label={`${it.nombre} disponible`} /><span>{it.disponible ? 'Disponible' : 'Agotado'}</span></label>
            </div>
          </li>
        ))}
      </ul>
      <p className="sub">Precios en {config.moneda}.</p>
    </section>
  );
}

// ---------------- Métricas

function Metricas({ config, estado, ahora }: Props) {
  const m = metricas(estado, ahora);
  const max = Math.max(1, ...m.masPedidos.map(([, n]) => n));
  return (
    <>
      <section className="d-card" aria-labelledby="t-met">
        <h2 id="t-met">Hoy en el hotel</h2>
        <div className="met-grid">
          <div className="met"><strong>{m.ocupacion} %</strong><span>Ocupación ({m.ocupadas} de {m.habilitadas})</span></div>
          <div className="met"><strong>{m.pedidosHoy}</strong><span>Pedidos desde las habitaciones</span></div>
          <div className="met"><strong>{dinero(m.roomServiceHoy, config.moneda)}</strong><span>Room service de hoy</span></div>
          <div className="met"><strong>{dinero(m.roomService7, config.moneda)}</strong><span>Room service en 7 días</span></div>
          <div className="met"><strong>{m.llegadas} / {m.salidas}</strong><span>Llegadas y salidas pendientes</span></div>
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-area">
        <h2 id="t-area">Tiempos por área (7 días)</h2>
        <div className="d-scroll">
          <table className="d-tabla">
            <thead><tr><th>Área</th><th>Pedidos</th><th>Lo toman en</th><th>Lo resuelven en</th></tr></thead>
            <tbody>
              {m.porArea.map((a) => <tr key={a.area}><td>{NOMBRE_AREA[a.area]}</td><td>{a.pedidos}</td><td>{a.respuesta === null ? '—' : `${a.respuesta} min`}</td><td>{a.resolucion === null ? '—' : `${a.resolucion} min`}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-top">
        <h2 id="t-top">Lo más pedido al room service</h2>
        <ul className="met-barras">
          {m.masPedidos.map(([n, c]) => <li key={n}><span>{n}</span><span className="ag-barra grande"><span style={{ width: `${(c / max) * 100}%` }} /></span><strong>{c}</strong></li>)}
        </ul>
      </section>
    </>
  );
}

// ---------------- Ajustes

function Ajustes({ slug, config, estado, actualizar }: Props) {
  const [msg, setMsg] = useState('');
  const campo = (name: string, label: string, valor: string) => <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>{label}<input name={name} className="c-inp" defaultValue={valor} /></label>;
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">Ajustes del hotel</h2>
      <form
        style={{ display: 'grid', gap: 12, maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const v = (k: string) => String(f.get(k) ?? '').trim().slice(0, 60);
          const wa = soloDigitos(v('whatsapp'));
          if (wa.length < 8) return setMsg('Revisá el WhatsApp de recepción: incluí código de país y de área.');
          try {
            actualizarDemo(slug, { whatsapp: wa });
            const err = actualizar((x) => ({ ...x, ajustes: { wifiRed: v('wifiRed') || x.ajustes.wifiRed, wifiClave: v('wifiClave') || x.ajustes.wifiClave, checkout: v('checkout') || x.ajustes.checkout, desayuno: v('desayuno') || x.ajustes.desayuno, roomService: v('roomService') || x.ajustes.roomService } }));
            setMsg(err ?? 'Ajustes guardados.');
          } catch (er) {
            setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.');
          }
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp de recepción<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {campo('wifiRed', 'Red de wifi', estado.ajustes.wifiRed)}
          {campo('wifiClave', 'Clave de wifi', estado.ajustes.wifiClave)}
          {campo('desayuno', 'Horario de desayuno', estado.ajustes.desayuno)}
          {campo('roomService', 'Horario de room service', estado.ajustes.roomService)}
          {campo('checkout', 'Hora de check-out', estado.ajustes.checkout)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <Link className="d-btn" href={`/d/${slug}/qr`}><Icono nombre="qr" size={16} /> Imprimir QR de habitaciones</Link>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, 'hotel'); setMsg('El hotel volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}

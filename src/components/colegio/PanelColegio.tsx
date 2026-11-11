'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { mesCorto, nombreMes } from '@/lib/rubros/contador/periodos';
import {
  NOMBRE_ESTADO_PAGO, NOMBRE_PREINSCRIPCION, anularPago, confirmarPago, cuentaFamilia, cursoDe, diaLargo, diaLocal, dinero, faltasDe, guardarLista, hijosDe, ingresos, lectura,
  mensajeAusencia, mensajeAutorizacion, mensajeComunicado, mensajeDeuda, mensajePreinscripcion, nombreAlumno, nombreDestino, nuevaAutorizacion, nuevoComunicado, resumen, respuestas, vacantes, type EstadoPago,
} from '@/lib/rubros/colegio/logica';
import type { Destino, EstadoColegio, Familia, Presencia } from '@/lib/rubros/colegio/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { ImportarAlumnos } from './ImportarAlumnos';
import { enlacePortal, useDemoColegio, type ActualizarColegio } from './useColegio';

type Pestana = 'tablero' | 'asistencia' | 'comunicados' | 'autorizaciones' | 'cuotas' | 'alumnos' | 'inscripciones' | 'ajustes';
interface Props { slug: string; config: DemoConfig; estado: EstadoColegio; actualizar: ActualizarColegio; periodo: string; ahora: number }

const LUZ: Record<EstadoPago, string> = { 'al-dia': 'verde', 'por-vencer': 'amarillo', debe: 'rojo' };
const mayus = (s: string) => s[0].toUpperCase() + s.slice(1);

export function EstadoPagoChip({ estado }: { estado: EstadoPago }) {
  return <span className={`sem-luz ${LUZ[estado]}`}><span className="sem-punto" aria-hidden="true" />{NOMBRE_ESTADO_PAGO[estado]}</span>;
}

export function PanelColegio({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo, periodo, ahora } = useDemoColegio(slug);
  const [pestana, setPestana] = useState<Pestana>('tablero');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const r = resumen(estado, periodo, ahora);
  const props: Props = { slug, config, estado, actualizar, periodo, ahora };
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'tablero', nombre: 'Tablero' },
    { id: 'asistencia', nombre: `Asistencia (${r.asistenciaHoy.cursosTomados}/${estado.cursos.length})` },
    { id: 'comunicados', nombre: 'Comunicados' },
    { id: 'autorizaciones', nombre: `Autorizaciones${r.autorizacionesSinResponder ? ` (${r.autorizacionesSinResponder})` : ''}` },
    { id: 'cuotas', nombre: `Cuotas${r.conDeuda ? ` (${r.conDeuda})` : ''}` },
    { id: 'alumnos', nombre: `Alumnos (${r.alumnos})` },
    { id: 'inscripciones', nombre: `Inscripciones${r.preinscripcionesNuevas ? ` (${r.preinscripcionesNuevas})` : ''}` },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];
  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Alumnos, familias y montos ficticios" />
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
              <div style={{ fontSize: 13, opacity: 0.9 }}>{r.alumnos} alumnos · {r.familias} familias · {estado.cursos.length} cursos</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="usuario" size={18} /> Portal de familias</Link>
            <Link className="d-btn" href={`/d/${slug}/sitio`}><Icono nombre="tienda" size={18} /> Sitio</Link>
          </nav>
        </div>
      </header>
      <div className="d-tabs" role="tablist" aria-label="Secciones del panel">
        {PESTANAS.map((t) => <button key={t.id} role="tab" id={`tab-${t.id}`} aria-controls={`pan-${t.id}`} aria-selected={pestana === t.id} className="d-tab" onClick={() => setPestana(t.id)}>{t.nombre}</button>)}
      </div>
      <main className="d-main" role="tabpanel" id={`pan-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {pestana === 'tablero' && <Tablero {...props} onIr={setPestana} />}
        {pestana === 'asistencia' && <Asistencia {...props} />}
        {pestana === 'comunicados' && <Comunicados {...props} />}
        {pestana === 'autorizaciones' && <Autorizaciones {...props} />}
        {pestana === 'cuotas' && <Cuotas {...props} />}
        {pestana === 'alumnos' && <Alumnos {...props} />}
        {pestana === 'inscripciones' && <Inscripciones {...props} />}
        {pestana === 'ajustes' && <Ajustes {...props} />}
      </main>
    </div>
  );
}

// ---------------- Tablero

function Tablero({ config, estado, actualizar, periodo, ahora, onIr }: Props & { onIr: (p: Pestana) => void }) {
  const r = resumen(estado, periodo, ahora);
  const serie = ingresos(estado, periodo, 6);
  const max = Math.max(1, ...serie.flatMap((s) => [s.facturado, s.cobrado]));
  const informadas = estado.cuotas.filter((q) => q.estado === 'pendiente' && q.informada);
  const fam = (id: string) => estado.familias.find((f) => f.id === id)?.responsable ?? '';
  const ultimo = estado.comunicados[0];
  const lu = ultimo ? lectura(estado, ultimo) : null;
  return (
    <>
      <section className="d-card" aria-labelledby="t-hoy">
        <h2 id="t-hoy">Hoy, {diaLargo(diaLocal(ahora))}</h2>
        <div className="met-grid">
          <div className="met"><strong>{r.asistenciaHoy.cursosTomados} de {estado.cursos.length}</strong><span>Cursos con lista tomada ({r.asistenciaHoy.pct} % presentes)</span></div>
          <div className="met"><strong>{lu ? `${lu.pct} %` : '—'}</strong><span>Leyeron el último comunicado</span></div>
          <div className="met"><strong>{r.autorizacionesSinResponder}</strong><span>Autorizaciones sin responder</span></div>
          <div className="met"><strong>{r.preinscripcionesNuevas}</strong><span>Preinscripciones nuevas</span></div>
        </div>
        <div className="bar-acciones" style={{ marginTop: 12 }}>
          <button type="button" className="d-btn prim" onClick={() => onIr('asistencia')}>Tomar lista</button>
          <button type="button" className="d-btn" onClick={() => onIr('comunicados')}>Nuevo comunicado</button>
          <button type="button" className="d-btn" onClick={() => onIr('autorizaciones')}>Ver autorizaciones</button>
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-cuo">
        <h2 id="t-cuo">Cuotas de {nombreMes(periodo)}</h2>
        <div className="met-grid">
          <div className="met"><strong>{dinero(r.cobrado, config.moneda)}</strong><span>Cobrado del mes</span></div>
          <div className="met"><strong>{dinero(r.porCobrar, config.moneda)}</strong><span>Por cobrar del mes</span></div>
          <div className="met"><strong>{dinero(r.deuda, config.moneda)}</strong><span>Deuda vencida de {r.conDeuda} familias</span></div>
          <div className="met"><strong>{r.alDia} de {r.familias}</strong><span>Familias al día</span></div>
        </div>
        <div className="ct-ley" aria-hidden="true" style={{ marginTop: 14 }}><span className="fac">Facturado</span><span className="cob">Cobrado</span></div>
        <ul className="ct-barras">
          {serie.map((s) => (
            <li key={s.periodo}>
              <div className="ct-par">
                <span className="fac" style={{ height: `${(s.facturado / max) * 100}%` }} />
                <span className="cob" style={{ height: `${(s.cobrado / max) * 100}%` }} />
              </div>
              <strong>{dinero(s.cobrado, config.moneda)}</strong>
              <span>{mesCorto(s.periodo)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-inf">
        <h2 id="t-inf">Pagos que avisaron las familias</h2>
        <p className="sub">Avisan desde el portal; el pago queda confirmado solo cuando lo confirma el colegio.</p>
        {informadas.length ? (
          <ul className="au-leads">
            {informadas.map((q) => (
              <li key={q.id}>
                <div className="au-lead-txt"><strong>{fam(q.familiaId)}</strong><span>{nombreMes(q.periodo)} · {dinero(q.monto, config.moneda)}</span></div>
                <div className="au-lead-acc"><button type="button" className="d-btn prim" onClick={() => actualizar((e) => confirmarPago(e, q.id))}><Icono nombre="check" size={16} /> Confirmar pago</button></div>
              </li>
            ))}
          </ul>
        ) : <p className="tie-vacio">No hay pagos por confirmar.</p>}
      </section>
    </>
  );
}

// ---------------- Asistencia

function Asistencia({ config, estado, actualizar, ahora }: Props) {
  const hoy = diaLocal(ahora);
  const finde = [0, 6].includes(new Date(ahora).getDay());
  const [cursoId, setCursoId] = useState(estado.cursos.find((c) => !estado.alumnos.some((a) => a.cursoId === c.id && estado.asistencia[hoy]?.[a.id]))?.id ?? estado.cursos[0].id);
  const alumnos = estado.alumnos.filter((a) => a.activo && a.cursoId === cursoId).sort((a, b) => a.apellido.localeCompare(b.apellido));
  const guardada = estado.asistencia[hoy] ?? {};
  const tomada = alumnos.some((a) => guardada[a.id]);
  const [borrador, setBorrador] = useState<Record<string, Presencia>>({});
  const valor = (id: string): Presencia => borrador[id] ?? guardada[id] ?? 'presente';
  const ausentes = alumnos.filter((a) => guardada[a.id] === 'ausente');
  const ctx = { negocio: config.negocio, moneda: config.moneda, enlace: enlacePortal(config) };
  const curso = cursoDe(estado, cursoId)!;
  return (
    <section className="d-card" aria-labelledby="t-asi">
      <h2 id="t-asi">Asistencia de hoy</h2>
      <p className="sub">{mayus(diaLargo(hoy))}. Todos empiezan presentes: tocá solo a los que faltaron o llegaron tarde.</p>
      {finde && <p className="ct-alerta" role="note">Hoy no hay clases. Igual podés probar la toma de lista.</p>}
      <div className="ag-profs" role="group" aria-label="Curso" style={{ margin: '4px 0 14px', flexWrap: 'wrap' }}>
        {estado.cursos.map((c) => {
          const ok = estado.alumnos.some((a) => a.cursoId === c.id && guardada[a.id]);
          return <button key={c.id} type="button" aria-pressed={cursoId === c.id} onClick={() => { setCursoId(c.id); setBorrador({}); }}>{c.nombre}{ok ? ' ✓' : ''}</button>;
        })}
      </div>
      <h3 className="ct-h3" style={{ marginTop: 0 }}>{curso.nombre} · {curso.docente} · {alumnos.length} alumnos{tomada ? ' · lista tomada' : ''}</h3>
      <ul className="co-lista">
        {alumnos.map((a) => (
          <li key={a.id} className={`p-${valor(a.id)}`}>
            <span className="co-nombre">{a.apellido}, {a.nombre}</span>
            <div className="co-seg" role="group" aria-label={`Asistencia de ${nombreAlumno(a)}`}>
              {(['presente', 'ausente', 'tarde'] as Presencia[]).map((p) => (
                <button key={p} type="button" aria-pressed={valor(a.id) === p} onClick={() => setBorrador((b) => ({ ...b, [a.id]: p }))}>{p === 'presente' ? 'P' : p === 'ausente' ? 'A' : 'T'}<span className="sr-only"> {p}</span></button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="bar-acciones" style={{ marginTop: 12 }}>
        <button type="button" className="d-btn prim" onClick={() => {
          const lista = Object.fromEntries(alumnos.map((a) => [a.id, valor(a.id)]));
          actualizar((e) => guardarLista(e, hoy, lista));
          setBorrador({});
        }}>{tomada ? 'Actualizar lista' : 'Guardar lista'} de {curso.nombre}</button>
        <span className="sub" style={{ alignSelf: 'center' }}>{alumnos.filter((a) => valor(a.id) === 'ausente').length} ausentes · {alumnos.filter((a) => valor(a.id) === 'tarde').length} tarde</span>
      </div>
      {tomada && ausentes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 className="ct-h3">Avisar a las familias de los ausentes</h3>
          <ul className="au-leads">
            {ausentes.map((a) => {
              const f = estado.familias.find((x) => x.id === a.familiaId)!;
              const just = estado.justificaciones.find((j) => j.alumnoId === a.id && j.dia === hoy);
              return (
                <li key={a.id}>
                  <div className="au-lead-txt"><strong>{nombreAlumno(a)}</strong><span>{f.responsable}{just ? ` · justificó: “${just.motivo}”` : ''}</span></div>
                  <div className="au-lead-acc">{f.whatsapp && !just && <a className="d-btn prim" href={enlaceWhatsApp(f.whatsapp, mensajeAusencia(f, a, hoy, ctx))} target="_blank" rel="noopener noreferrer" aria-label={`Avisar a la familia de ${nombreAlumno(a)}`}><Icono nombre="whatsapp" size={16} /> Avisar</a>}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------- Comunicados

function Comunicados({ config, estado, actualizar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [para, setPara] = useState('todos');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const ctx = { negocio: config.negocio, moneda: config.moneda, enlace: enlacePortal(config) };
  return (
    <>
      <section className="d-card" aria-labelledby="t-ncom">
        <h2 id="t-ncom">Nuevo comunicado</h2>
        <form className="co-form" onSubmit={(ev) => {
          ev.preventDefault();
          const destino: Destino = para === 'todos' ? { tipo: 'todos' } : { tipo: 'curso', id: para };
          let fallo = '';
          const err = actualizar((e) => { const r = nuevoComunicado(e, { titulo, texto, destino }); if ('error' in r) { fallo = r.error; return e; } return r; });
          if (err || fallo) return setError(err || fallo);
          setError('');
          setMsg(`Comunicado publicado para ${nombreDestino(estado, destino).toLowerCase() === 'todo el colegio' ? 'todo el colegio' : nombreDestino(estado, destino)}. Las familias lo ven en el portal.`);
          setTitulo(''); setTexto('');
        }}>
          <label>Título<input className="c-inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} /></label>
          <label>Para<select className="c-inp" value={para} onChange={(e) => setPara(e.target.value)}><option value="todos">Todo el colegio</option>{estado.cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <label className="ancho">Texto<textarea className="c-inp" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} /></label>
          {error && <p className="bar-err ancho" role="alert">{error}</p>}
          <div className="ancho"><button type="submit" className="d-btn prim">Publicar comunicado</button></div>
        </form>
        {msg && <p role="status" className="ct-listo">{msg}</p>}
      </section>
      <section className="d-card" aria-labelledby="t-com">
        <h2 id="t-com">Comunicados enviados</h2>
        <ul className="co-items">
          {estado.comunicados.map((c) => {
            const l = lectura(estado, c);
            return (
              <li key={c.id}>
                <div className="co-item-cab">
                  <div><strong>{c.titulo}</strong><span>{nombreDestino(estado, c.destino)} · {new Date(c.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span></div>
                  <span className="co-pct">{l.leidos} de {l.total} familias lo leyeron</span>
                </div>
                <div className="ct-progreso" aria-hidden="true"><span style={{ width: `${l.pct}%` }} /></div>
                {l.pendientes.length > 0 && <button type="button" className="d-btn" style={{ marginTop: 10 }} aria-expanded={abierto === c.id} onClick={() => setAbierto(abierto === c.id ? null : c.id)}>{abierto === c.id ? 'Ocultar' : `Ver las ${l.pendientes.length} que no lo leyeron`}</button>}
                {abierto === c.id && (
                  <ul className="au-leads" style={{ marginTop: 10 }}>
                    {l.pendientes.map((f) => (
                      <li key={f.id}>
                        <div className="au-lead-txt"><strong>{f.responsable}</strong><span>{hijosDe(estado, f.id).map((a) => `${a.nombre} (${cursoDe(estado, a.cursoId)?.nombre})`).join(', ')}</span></div>
                        <div className="au-lead-acc">{f.whatsapp && <a className="d-btn" href={enlaceWhatsApp(f.whatsapp, mensajeComunicado(f, c, ctx))} target="_blank" rel="noopener noreferrer" aria-label={`Recordar a ${f.responsable}`}><Icono nombre="whatsapp" size={16} /> Recordar</a>}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

// ---------------- Autorizaciones

function Autorizaciones({ config, estado, actualizar, ahora }: Props) {
  const [f, setF] = useState({ titulo: '', detalle: '', dia: diaLocal(ahora + 7 * 86_400_000), cursoIds: [] as string[] });
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState<string | null>(estado.autorizaciones[0]?.id ?? null);
  const ctx = { negocio: config.negocio, moneda: config.moneda, enlace: enlacePortal(config) };
  return (
    <>
      <section className="d-card" aria-labelledby="t-aut">
        <h2 id="t-aut">Autorizaciones</h2>
        <p className="sub">Salidas, campamentos o actividades: cada familia autoriza con un toque desde el portal.</p>
        <ul className="co-items">
          {estado.autorizaciones.map((a) => {
            const r = respuestas(estado, a);
            return (
              <li key={a.id}>
                <div className="co-item-cab">
                  <div><strong>{a.titulo}</strong><span>{mayus(diaLargo(a.dia))} · {a.cursoIds.map((id) => cursoDe(estado, id)?.nombre).join(' y ')}</span></div>
                  <span className="co-pct">{r.si.length} autorizaron · {r.no.length} no · {r.sin.length} sin responder</span>
                </div>
                <div className="co-barra" aria-hidden="true">
                  <span className="si" style={{ width: `${(r.si.length / Math.max(1, r.total)) * 100}%` }} />
                  <span className="no" style={{ width: `${(r.no.length / Math.max(1, r.total)) * 100}%` }} />
                </div>
                <button type="button" className="d-btn" style={{ marginTop: 10 }} aria-expanded={abierta === a.id} onClick={() => setAbierta(abierta === a.id ? null : a.id)}>{abierta === a.id ? 'Ocultar' : 'Ver por alumno'}</button>
                {abierta === a.id && (
                  <ul className="au-leads" style={{ marginTop: 10 }}>
                    {[...r.sin, ...r.no].map((al) => {
                      const fam = estado.familias.find((x) => x.id === al.familiaId)!;
                      const resp = a.respuestas[al.id];
                      return (
                        <li key={al.id}>
                          <div className="au-lead-txt"><strong>{nombreAlumno(al)} <span className={`sem-luz ${resp ? 'rojo' : 'amarillo'}`}><span className="sem-punto" aria-hidden="true" />{resp ? 'No autorizó' : 'Sin responder'}</span></strong><span>{cursoDe(estado, al.cursoId)?.nombre} · {fam.responsable}</span></div>
                          <div className="au-lead-acc">{!resp && fam.whatsapp && <a className="d-btn" href={enlaceWhatsApp(fam.whatsapp, mensajeAutorizacion(fam, a, al, ctx))} target="_blank" rel="noopener noreferrer" aria-label={`Recordar a la familia de ${nombreAlumno(al)}`}><Icono nombre="whatsapp" size={16} /> Recordar</a>}</div>
                        </li>
                      );
                    })}
                    {!r.sin.length && !r.no.length && <li className="tie-vacio">Todas las familias autorizaron.</li>}
                  </ul>
                )}
              </li>
            );
          })}
          {!estado.autorizaciones.length && <li className="tie-vacio">Todavía no hay autorizaciones.</li>}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-naut">
        <h2 id="t-naut">Pedir una autorización</h2>
        <form className="co-form" onSubmit={(ev) => {
          ev.preventDefault();
          let fallo = '';
          const err = actualizar((e) => { const r = nuevaAutorizacion(e, f); if ('error' in r) { fallo = r.error; return e; } return r; });
          if (err || fallo) return setError(err || fallo);
          setError('');
          setF((x) => ({ ...x, titulo: '', detalle: '', cursoIds: [] }));
          setAbierta(null);
        }}>
          <label>Título<input className="c-inp" value={f.titulo} onChange={(e) => setF((x) => ({ ...x, titulo: e.target.value }))} placeholder="Ej.: Salida al teatro" /></label>
          <label>Día<input className="c-inp" type="date" value={f.dia} onChange={(e) => setF((x) => ({ ...x, dia: e.target.value }))} /></label>
          <label className="ancho">Detalle<textarea className="c-inp" rows={2} value={f.detalle} onChange={(e) => setF((x) => ({ ...x, detalle: e.target.value }))} placeholder="Horario, transporte, qué llevar" /></label>
          <fieldset className="ancho co-cursos"><legend>Cursos</legend>
            {estado.cursos.map((c) => <label key={c.id}><input type="checkbox" checked={f.cursoIds.includes(c.id)} onChange={(e) => setF((x) => ({ ...x, cursoIds: e.target.checked ? [...x.cursoIds, c.id] : x.cursoIds.filter((y) => y !== c.id) }))} /> {c.nombre}</label>)}
          </fieldset>
          {error && <p className="bar-err ancho" role="alert">{error}</p>}
          <div className="ancho"><button type="submit" className="d-btn prim">Pedir autorización</button></div>
        </form>
      </section>
    </>
  );
}

// ---------------- Cuotas

function Cuotas(props: Props) {
  const { config, estado, ahora } = props;
  const [filtro, setFiltro] = useState<'todas' | EstadoPago | 'informada'>('todas');
  const [ficha, setFicha] = useState<string | null>(null);
  const [recordadas, setRecordadas] = useState<string[]>([]);
  const ctx = { negocio: config.negocio, moneda: config.moneda, enlace: enlacePortal(config) };
  const filas = useMemo(() => estado.familias.map((f) => ({ f, c: cuentaFamilia(estado, f.id, ahora), hijos: hijosDe(estado, f.id) })).filter((x) => x.hijos.length), [estado, ahora]);
  const lista = filas.filter(({ c }) => filtro === 'todas' || (filtro === 'informada' ? c.informada : c.estado === filtro)).sort((a, b) => b.c.deuda - a.c.deuda || a.f.responsable.localeCompare(b.f.responsable));
  const siguiente = filas.filter(({ c, f }) => c.deuda > 0 && f.whatsapp && !recordadas.includes(f.id)).sort((a, b) => b.c.deuda - a.c.deuda)[0];
  const familia = ficha ? estado.familias.find((f) => f.id === ficha) : undefined;
  return (
    <section className="d-card" aria-labelledby="t-cuotas">
      <h2 id="t-cuotas">Cuotas por familia</h2>
      <p className="sub">Una cuota por familia con el detalle de cada hijo: {estado.ajustes.descuentoHermano} % de descuento desde el segundo hermano, más las becas.</p>
      {siguiente && (
        <a className="d-btn prim" style={{ marginBottom: 12 }} href={enlaceWhatsApp(siguiente.f.whatsapp, mensajeDeuda(siguiente.f, estado, ctx, ahora))} target="_blank" rel="noopener noreferrer" onClick={() => setRecordadas((x) => [...x, siguiente.f.id])}>
          <Icono nombre="whatsapp" size={16} /> Recordar deuda al siguiente: {siguiente.f.responsable}
        </a>
      )}
      <div className="ag-profs" role="group" aria-label="Filtrar familias" style={{ margin: '0 0 12px', flexWrap: 'wrap' }}>
        {(['todas', 'al-dia', 'por-vencer', 'debe', 'informada'] as const).map((x) => <button key={x} type="button" aria-pressed={filtro === x} onClick={() => setFiltro(x)}>{x === 'todas' ? 'Todas' : x === 'informada' ? 'Avisaron que pagaron' : x === 'por-vencer' ? 'Mes por pagar' : NOMBRE_ESTADO_PAGO[x]}</button>)}
      </div>
      <div className="d-scroll">
        <table className="d-tabla ct-tabla">
          <thead><tr><th>Familia</th><th>Hijos</th><th>Cuota</th><th>Estado</th></tr></thead>
          <tbody>
            {lista.map(({ f, c, hijos }) => (
              <tr key={f.id}>
                <td><button type="button" className="ct-link" onClick={() => setFicha(f.id)}>{f.responsable}</button></td>
                <td>{hijos.map((a) => `${a.nombre} (${cursoDe(estado, a.cursoId)?.nombre})`).join(', ')}</td>
                <td className="ct-num-col">{dinero(c.cuotas.at(-1)?.monto ?? 0, config.moneda)}</td>
                <td><EstadoPagoChip estado={c.estado} />{c.deuda > 0 && <small className="ct-deuda">{dinero(c.deuda, config.moneda)}</small>}{recordadas.includes(f.id) && <small className="co-hecho">Recordado hoy</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!lista.length && <p className="tie-vacio">No hay familias con ese filtro.</p>}
      {familia && <FichaFamilia {...props} f={familia} onCerrar={() => setFicha(null)} />}
    </section>
  );
}

function FichaFamilia({ config, estado, actualizar, ahora, f, onCerrar }: Props & { f: Familia; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const c = cuentaFamilia(estado, f.id, ahora);
  const ultima = c.cuotas.at(-1);
  const ctx = { negocio: config.negocio, moneda: config.moneda, enlace: enlacePortal(config) };
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja ct-ficha" role="dialog" aria-modal="true" aria-labelledby="co-t-fam" ref={ref}>
        <div className="hoja-cab">
          <div><h2 id="co-t-fam">{f.responsable}</h2><p className="sub" style={{ margin: 0 }}>Código del portal: <strong>{f.codigo}</strong>{f.whatsapp ? ` · +${f.whatsapp}` : ''}</p></div>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={20} /></button>
        </div>
        {ultima && (
          <ul className="ho-resumen">
            {ultima.detalle.map((d) => { const a = estado.alumnos.find((x) => x.id === d.alumnoId); return <li key={d.alumnoId}><span>{a ? `${nombreAlumno(a)} · ${cursoDe(estado, a.cursoId)?.nombre}` : 'Alumno'}{d.nota ? ` (${d.nota})` : ''}</span><span>{dinero(d.monto, config.moneda)}</span></li>; })}
            <li className="total"><span>Cuota mensual</span><span>{dinero(ultima.monto, config.moneda)}</span></li>
          </ul>
        )}
        <div className="ct-resumen" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div><span>Debe (vencido)</span><strong>{dinero(c.deuda, config.moneda)}</strong></div>
          <div><span>Total pendiente</span><strong>{dinero(c.total, config.moneda)}</strong></div>
        </div>
        <h3 className="ct-h3">Cuotas del ciclo</h3>
        <ul className="ct-meses">
          {[...c.cuotas].reverse().map((q) => {
            const venc = c.vencidas.includes(q);
            return (
              <li key={q.id} className={q.estado === 'pagada' ? 'pagada' : venc ? 'vencida' : 'pendiente'}>
                <div className="ct-mes-txt"><strong>{mayus(nombreMes(q.periodo))}</strong><span>{dinero(q.monto, config.moneda)} · {q.estado === 'pagada' ? `pagó el ${new Date(q.pagada!).toLocaleDateString('es')}` : venc ? 'vencida' : 'por pagar'}{q.informada ? ' · la familia avisó que pagó' : ''}</span></div>
                <div className="au-lead-acc">
                  {q.estado === 'pendiente'
                    ? <button type="button" className="d-btn prim" aria-label={`Confirmar pago de ${nombreMes(q.periodo)}`} onClick={() => actualizar((e) => confirmarPago(e, q.id))}><Icono nombre="check" size={16} /> Confirmar pago</button>
                    : <button type="button" className="d-btn" aria-label={`Anular pago de ${nombreMes(q.periodo)}`} onClick={() => actualizar((e) => anularPago(e, q.id))}>Anular</button>}
                </div>
              </li>
            );
          })}
        </ul>
        {f.whatsapp && c.total > 0 && <div className="bar-acciones" style={{ marginTop: 14 }}><a className="d-btn prim" href={enlaceWhatsApp(f.whatsapp, mensajeDeuda(f, estado, ctx, ahora))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={16} /> Recordar lo pendiente</a></div>}
      </div>
    </div>
  );
}

// ---------------- Alumnos

function Alumnos({ config, estado, actualizar, periodo }: Props) {
  const [curso, setCurso] = useState<string>('todos');
  const [q, setQ] = useState('');
  const [importar, setImportar] = useState(false);
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = estado.alumnos
    .filter((a) => a.activo && (curso === 'todos' || a.cursoId === curso))
    .filter((a) => !q || n(`${a.nombre} ${a.apellido} ${estado.familias.find((f) => f.id === a.familiaId)?.responsable ?? ''}`).includes(n(q.trim())))
    .sort((a, b) => (cursoDe(estado, a.cursoId)?.orden ?? 0) - (cursoDe(estado, b.cursoId)?.orden ?? 0) || a.apellido.localeCompare(b.apellido));
  return (
    <section className="d-card" aria-labelledby="t-alu">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div><h2 id="t-alu">Alumnos</h2><p className="sub">Los hermanos comparten familia: una sola cuota y un solo acceso al portal.</p></div>
        <button type="button" className="d-btn prim" aria-expanded={importar} onClick={() => setImportar((x) => !x)}><Icono nombre="subir" size={18} /> Importar desde Excel</button>
      </div>
      {importar && <ImportarAlumnos estado={estado} actualizar={actualizar} moneda={config.moneda} periodo={periodo} onListo={() => setImportar(false)} />}
      <div className="ct-filtros" style={{ marginTop: 12 }}>
        <label className="ct-buscar"><Icono nombre="buscar" size={18} /><input className="c-inp" type="search" placeholder="Alumno o responsable" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar alumnos" /></label>
        <div className="ag-profs" role="group" aria-label="Curso" style={{ flexWrap: 'wrap' }}>
          <button type="button" aria-pressed={curso === 'todos'} onClick={() => setCurso('todos')}>Todos</button>
          {estado.cursos.map((c) => <button key={c.id} type="button" aria-pressed={curso === c.id} onClick={() => setCurso(c.id)}>{c.nombre}</button>)}
        </div>
      </div>
      <p className="sub" style={{ margin: '0 0 8px' }}>{lista.length} alumnos</p>
      <div className="d-scroll">
        <table className="d-tabla ct-tabla">
          <thead><tr><th>Alumno</th><th>Curso</th><th>Responsable</th><th>Faltas</th><th>Beca</th></tr></thead>
          <tbody>
            {lista.slice(0, 200).map((a) => {
              const f = estado.familias.find((x) => x.id === a.familiaId);
              const faltas = faltasDe(estado, a.id);
              return (
                <tr key={a.id}>
                  <td><strong>{a.apellido}, {a.nombre}</strong></td>
                  <td>{cursoDe(estado, a.cursoId)?.nombre}</td>
                  <td>{f?.responsable}</td>
                  <td>{faltas.length}{faltas.length ? ` (${faltas.filter((x) => x.justificada).length} justif.)` : ''}</td>
                  <td>
                    <select className="c-inp co-beca" aria-label={`Beca de ${nombreAlumno(a)}`} value={a.beca} onChange={(e) => actualizar((x) => ({ ...x, alumnos: x.alumnos.map((y) => (y.id === a.id ? { ...y, beca: Number(e.target.value) } : y)) }))}>
                      {[0, 25, 50, 75, 100].map((b) => <option key={b} value={b}>{b ? `${b} %` : 'Sin beca'}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="sub" style={{ marginTop: 8 }}>Un cambio de beca se aplica desde la próxima cuota.</p>
    </section>
  );
}

// ---------------- Inscripciones

function Inscripciones({ config, estado, actualizar }: Props) {
  return (
    <>
      <section className="d-card" aria-labelledby="t-vac">
        <h2 id="t-vac">Vacantes para el próximo ciclo</h2>
        <p className="sub">Cupo de cada curso menos los alumnos que pasan de año y las inscripciones aceptadas.</p>
        <div className="co-vacantes">
          {estado.cursos.map((c) => { const v = vacantes(estado, c.id); return <div key={c.id} className={v === 0 ? 'lleno' : v <= 3 ? 'pocas' : undefined}><strong>{v}</strong><span>{c.nombre}</span></div>; })}
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-pre">
        <h2 id="t-pre">Preinscripciones</h2>
        <p className="sub">Llegan desde el sitio del colegio. Cambiá el estado y avisale a la familia con el mensaje ya escrito.</p>
        <ul className="au-leads">
          {estado.preinscripciones.map((p) => {
            const c = cursoDe(estado, p.cursoId);
            return (
              <li key={p.id} className={p.estado === 'nueva' ? 'nueva' : undefined}>
                <div className="au-lead-txt">
                  <strong>{p.alumno}</strong>
                  <span>Para {c?.nombre} · {p.responsable}{p.hermanoEnElColegio ? ' · tiene hermano en el colegio' : ''}</span>
                  {p.comentario && <span>“{p.comentario}”</span>}
                </div>
                <div className="au-lead-acc">
                  <select className="c-inp" aria-label={`Estado de la preinscripción de ${p.alumno}`} value={p.estado} onChange={(e) => actualizar((x) => ({ ...x, preinscripciones: x.preinscripciones.map((y) => (y.id === p.id ? { ...y, estado: e.target.value as typeof p.estado } : y)) }))}>
                    {(Object.keys(NOMBRE_PREINSCRIPCION) as (typeof p.estado)[]).map((s) => <option key={s} value={s}>{NOMBRE_PREINSCRIPCION[s]}</option>)}
                  </select>
                  <a className="d-btn prim" href={enlaceWhatsApp(p.whatsapp, mensajePreinscripcion(p, c, { negocio: config.negocio }))} target="_blank" rel="noopener noreferrer" aria-label={`Escribir a ${p.responsable}`}><Icono nombre="whatsapp" size={16} /> Escribir</a>
                </div>
              </li>
            );
          })}
          {!estado.preinscripciones.length && <li className="tie-vacio">Todavía no hay preinscripciones.</li>}
        </ul>
      </section>
    </>
  );
}

// ---------------- Ajustes

function Ajustes({ slug, config, estado, actualizar }: Props) {
  const [msg, setMsg] = useState('');
  const num = (name: string, label: string, valor: number) => <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>{label}<input name={name} className="c-inp" inputMode="numeric" defaultValue={valor} /></label>;
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">Ajustes del colegio</h2>
      <form style={{ display: 'grid', gap: 12, maxWidth: 600 }} onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const n = (k: string) => Number(soloDigitos(String(f.get(k) ?? ''))) || 0;
        const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
        if (wa.length < 8) return setMsg('Revisá el WhatsApp del colegio.');
        try {
          actualizarDemo(slug, { whatsapp: wa });
          const err = actualizar((x) => ({ ...x, ajustes: { ...x.ajustes, cuotaInicial: n('inicial') || x.ajustes.cuotaInicial, cuotaPrimaria: n('primaria') || x.ajustes.cuotaPrimaria, descuentoHermano: Math.min(100, n('hermano')), diaVencimiento: Math.min(28, Math.max(1, n('dia') || 10)), alias: String(f.get('alias') ?? '').trim().slice(0, 60) || x.ajustes.alias } }));
          setMsg(err ?? 'Ajustes guardados. Las cuotas nuevas usan estos valores.');
        } catch (er) { setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.'); }
      }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp del colegio<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {num('inicial', 'Cuota nivel inicial', estado.ajustes.cuotaInicial)}
          {num('primaria', 'Cuota primaria', estado.ajustes.cuotaPrimaria)}
          {num('hermano', 'Descuento por hermano (%)', estado.ajustes.descuentoHermano)}
          {num('dia', 'Día de vencimiento', estado.ajustes.diaVencimiento)}
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Alias para transferir<input name="alias" className="c-inp" defaultValue={estado.ajustes.alias} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, 'colegio'); setMsg('El colegio volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
      <p className="sub" style={{ marginTop: 16 }}>Por cuidado de los chicos, la demo no guarda fotos, datos de salud ni notas.</p>
    </section>
  );
}


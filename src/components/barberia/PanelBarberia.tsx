'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { enlaceWhatsApp, formatoPrecio, soloDigitos } from '@/lib/utiles';
import {
  NOMBRE_ESTADO,
  abierto,
  bloqueosDelDia,
  claveDia,
  conMinutos,
  deClave,
  delDia,
  diaCorto,
  fechaCorta,
  hhmm,
  hora,
  huecos,
  inicioDia,
  lunesDe,
  minutosDe,
  minutosDisponibles,
  minutosOcupados,
  nombreDia,
  nombreDiaSemana,
  sumarDias,
  turnosDelDia,
} from '@/lib/rubros/barberia/agenda';
import { canjearSellos, cambiarEstado, historialCliente, mensajeConfirmacion, mensajeEspera, mensajeRecordatorio, metricas, reservar } from '@/lib/rubros/barberia/logica';
import type { Cliente, EnEspera, EstadoAgenda, Turno } from '@/lib/rubros/barberia/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { useAhora, useDemoBarberia, type ActualizarAgenda } from './useBarberia';
import { Pacientes } from '@/components/consultorio/Pacientes';

type Pestana = 'agenda' | 'espera' | 'clientes' | 'bloqueos' | 'metricas' | 'ajustes';
const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const origen = () => (typeof window !== 'undefined' ? window.location.origin : '');

export function PanelBarberia({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoBarberia(slug);
  const [pestana, setPestana] = useState<Pestana>('agenda');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const cons = estado.rubro === 'consultorio';
  const enEspera = estado.espera.filter((x) => !x.avisado).length;
  const avisar = estado.espera.filter((x) => x.avisado).length;
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'agenda', nombre: 'Agenda' },
    { id: 'espera', nombre: `Lista de espera${enEspera + avisar ? ` (${enEspera + avisar})` : ''}` },
    { id: 'clientes', nombre: cons ? 'Pacientes' : 'Clientes' },
    { id: 'bloqueos', nombre: 'Bloqueos y vacaciones' },
    { id: 'metricas', nombre: 'Métricas' },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];
  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto={cons ? 'Demo con datos ficticios' : 'Servicios, profesionales y turnos de ejemplo'} />
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
              <div style={{ fontSize: 13, opacity: 0.9 }}>{cons ? 'Agenda de la secretaría' : 'Panel del dueño'}</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="ojo" size={18} /> Ver reservas</Link>
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
        {pestana === 'agenda' && <Agenda config={config} estado={estado} actualizar={actualizar} slug={slug} />}
        {pestana === 'espera' && <Espera config={config} estado={estado} actualizar={actualizar} slug={slug} />}
        {pestana === 'clientes' && (cons ? <Pacientes estado={estado} actualizar={actualizar} /> : <Clientes estado={estado} actualizar={actualizar} />)}
        {pestana === 'bloqueos' && <Bloqueos estado={estado} actualizar={actualizar} />}
        {pestana === 'metricas' && <Metricas estado={estado} moneda={config.moneda} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} config={config} estado={estado} actualizar={actualizar} />}
      </main>
    </div>
  );
}

// ---------------- Agenda (BAR-09) ----------------

function Agenda({ config, estado, actualizar, slug }: { config: DemoConfig; estado: EstadoAgenda; actualizar: ActualizarAgenda; slug: string }) {
  const ahora = useAhora();
  const [vista, setVista] = useState<'dia' | 'semana'>('dia');
  const [dia, setDia] = useState(() => claveDia(ahora));
  const [prof, setProf] = useState<string | null>(null);
  const [abierto_, setAbierto] = useState<Turno | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const fecha = deClave(dia);
  const lunes = lunesDe(fecha);
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => abierto(estado.horario, d));
  const profs = estado.profesionales.filter((p) => !prof || p.id === prof);
  const h = abierto(estado.horario, fecha);
  const del = turnosDelDia(estado.turnos, fecha);
  const activos = del.filter((t) => t.estado !== 'cancelado');
  const turnoAbierto = abierto_ ? estado.turnos.find((t) => t.id === abierto_.id) ?? null : null;

  return (
    <section className="d-card" aria-labelledby="t-ag">
      <div className="ag-cab">
        <div>
          <h2 id="t-ag">{vista === 'dia' ? `Agenda ${delDia(fecha, new Date(ahora))}` : `Semana del ${fechaCorta(lunes)}`}</h2>
          <p className="sub">{vista === 'dia' ? (h ? `${activos.length} turnos · ${hhmm(h[0])} a ${hhmm(h[1])} h` : 'Cerrado este día') : 'Tocá un día para ver el detalle.'}</p>
        </div>
        <div className="ag-ctrl">
          <div className="seg" role="group" aria-label="Vista">
            <button type="button" aria-pressed={vista === 'dia'} onClick={() => setVista('dia')}>Día</button>
            <button type="button" aria-pressed={vista === 'semana'} onClick={() => setVista('semana')}>Semana</button>
          </div>
          <button type="button" className="d-btn prim" onClick={() => setNuevo(true)} disabled={!h}><Icono nombre="mas" size={18} /> Nuevo turno</button>
        </div>
      </div>

      <div className="ag-nav">
        <button type="button" className="x" aria-label={vista === 'dia' ? 'Día anterior' : 'Semana anterior'} onClick={() => setDia(claveDia(sumarDias(fecha, vista === 'dia' ? -1 : -7)))}><Icono nombre="atras" size={18} /></button>
        <div className="ag-dias" role="group" aria-label="Días de la semana">
          {Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).map((d) => (
            <button key={claveDia(d)} type="button" aria-pressed={vista === 'dia' && claveDia(d) === dia} disabled={!abierto(estado.horario, d)} data-hoy={claveDia(d) === claveDia(ahora) ? '1' : undefined} onClick={() => { setDia(claveDia(d)); setVista('dia'); }}>
              <span>{diaCorto(d)}</span><strong>{d.getDate()}</strong>
            </button>
          ))}
        </div>
        <button type="button" className="x" aria-label={vista === 'dia' ? 'Día siguiente' : 'Semana siguiente'} style={{ transform: 'scaleX(-1)' }} onClick={() => setDia(claveDia(sumarDias(fecha, vista === 'dia' ? 1 : 7)))}><Icono nombre="atras" size={18} /></button>
        {dia !== claveDia(ahora) && <button type="button" className="d-btn" onClick={() => setDia(claveDia(ahora))}>Hoy</button>}
      </div>

      <div className="ag-profs" role="group" aria-label="Profesional">
        <button type="button" aria-pressed={!prof} onClick={() => setProf(null)}>Todos</button>
        {estado.profesionales.map((p) => (
          <button key={p.id} type="button" aria-pressed={prof === p.id} onClick={() => setProf((x) => (x === p.id ? null : p.id))}>
            <span className="bar-avatar mini" aria-hidden="true">{iniciales(p.nombre)}</span>{p.nombre.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="ag-leyenda" aria-hidden="true">
        {(['reservado', 'confirmado', 'atendido', 'ausente'] as const).map((e) => <span key={e} className={`est-${e}`}>{NOMBRE_ESTADO[e]}</span>)}
        <span className="bloq">Bloqueado</span>
      </div>

      {vista === 'semana' ? (
        <div className="d-scroll">
          <table className="d-tabla ag-semana">
            <thead><tr><th>Profesional</th>{semana.map((d) => <th key={claveDia(d)}>{diaCorto(d)} {d.getDate()}</th>)}</tr></thead>
            <tbody>
              {profs.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.nombre.split(' ')[0]}</strong></td>
                  {semana.map((d) => {
                    const disp = minutosDisponibles(estado, p, d);
                    const oc = disp ? Math.min(1, minutosOcupados(estado.turnos, p.id, d) / disp) : 0;
                    const n = turnosDelDia(estado.turnos, d).filter((t) => t.profId === p.id && t.estado !== 'cancelado').length;
                    return (
                      <td key={claveDia(d)}>
                        <button type="button" className="ag-celda" onClick={() => { setDia(claveDia(d)); setProf(p.id); setVista('dia'); }} aria-label={`${p.nombre}, ${nombreDia(d)}: ${n} turnos, ${Math.round(oc * 100)}% ocupado`}>
                          {disp === 0 ? <span className="ag-libre">No atiende</span> : <><strong>{n}</strong> turnos<span className="ag-barra"><span style={{ width: `${oc * 100}%` }} /></span><small>{Math.round(oc * 100)}%</small></>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !h ? (
        <p className="tie-vacio">El local no abre este día.</p>
      ) : (
        <Linea estado={estado} fecha={fecha} profs={profs} inicio={h[0]} fin={h[1]} ahora={ahora} onTurno={setAbierto} />
      )}

      {turnoAbierto && <FichaTurno config={config} estado={estado} turno={turnoAbierto} actualizar={actualizar} slug={slug} onCerrar={() => setAbierto(null)} />}
      {nuevo && h && <NuevoTurno estado={estado} fecha={fecha} actualizar={actualizar} onCerrar={() => setNuevo(false)} profInicial={prof} />}
    </section>
  );
}

function Linea({ estado, fecha, profs, inicio, fin, ahora, onTurno }: { estado: EstadoAgenda; fecha: Date; profs: EstadoAgenda['profesionales']; inicio: number; fin: number; ahora: number; onTurno: (t: Turno) => void }) {
  const K = 1.5; // px por minuto
  const alto = (fin - inicio) * K;
  const del = turnosDelDia(estado.turnos, fecha).filter((t) => t.estado !== 'cancelado');
  const bloq = bloqueosDelDia(estado.bloqueos, fecha);
  const esHoy = claveDia(fecha) === claveDia(ahora);
  const yAhora = (minutosDe(new Date(ahora)) - inicio) * K;
  const horas: number[] = [];
  for (let m = Math.ceil(inicio / 60) * 60; m <= fin; m += 60) horas.push(m);
  const pos = (desde: number, hasta: number) => {
    const a = Math.max(inicio, desde);
    const z = Math.min(fin, hasta);
    return { top: (a - inicio) * K, height: Math.max(0, (z - a) * K) };
  };
  return (
    <div className="ag-linea" style={{ '--cols': profs.length } as React.CSSProperties}>
      <div className="ag-col-cab">
        <span />
        {profs.map((p) => <strong key={p.id}>{p.nombre.split(' ')[0]}</strong>)}
      </div>
      <div className="ag-cuerpo" style={{ height: alto }}>
        <div className="ag-horas">
          {horas.map((m) => <span key={m} style={{ top: (m - inicio) * K }}>{hhmm(m)}</span>)}
        </div>
        {profs.map((p) => (
          <div key={p.id} className="ag-col" aria-label={`Turnos de ${p.nombre}`}>
            {horas.map((m) => <span key={m} className="ag-raya" style={{ top: (m - inicio) * K }} />)}
            {estado.pausa && (() => { const s = pos(estado.pausa[0], estado.pausa[1]); return s.height ? <div className="ag-bloq" style={s}><span>Cerrado</span></div> : null; })()}
            {bloq.filter((b) => b.profId === null || b.profId === p.id).map((b) => {
              const d0 = +conMinutos(fecha, 0);
              const s = pos(Math.max(0, (+new Date(b.desde) - d0) / 60_000), Math.min(1440, (+new Date(b.hasta) - d0) / 60_000));
              return s.height ? <div key={b.id} className="ag-bloq" style={s}><span>{b.motivo}</span></div> : null;
            })}
            {del.filter((t) => t.profId === p.id).map((t) => {
              const s = estado.servicios.find((x) => x.id === t.servicioId);
              const c = estado.clientes.find((x) => x.id === t.clienteId);
              const st = pos(minutosDe(t.inicio), minutosDe(t.fin));
              return (
                <button key={t.id} type="button" className={`ag-turno est-${t.estado}${st.height < 50 ? ' corto' : ''}${t.sobreturno ? ' sobre' : ''}`} style={st} onClick={() => onTurno(t)}>
                  <span className="ag-t-h">{hora(t.inicio)}{t.sobreturno ? ' · ST' : ''}{t.modalidad === 'video' ? ' · Video' : ''}</span>
                  <span className="ag-t-c">{c?.nombre ?? 'Cliente'}</span>
                  <span className="ag-t-s">{s?.nombre}</span>
                </button>
              );
            })}
          </div>
        ))}
        {esHoy && yAhora > 0 && yAhora < alto && <div className="ag-ahora" style={{ top: yAhora }} aria-hidden="true" />}
      </div>
    </div>
  );
}

function FichaTurno({ config, estado, turno, actualizar, slug, onCerrar }: { config: DemoConfig; estado: EstadoAgenda; turno: Turno; actualizar: ActualizarAgenda; slug: string; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const ahora = useAhora();
  const [avisados, setAvisados] = useState<EnEspera[]>([]);
  const [msg, setMsg] = useState('');
  const s = estado.servicios.find((x) => x.id === turno.servicioId)!;
  const p = estado.profesionales.find((x) => x.id === turno.profId)!;
  const c = estado.clientes.find((x) => x.id === turno.clienteId);
  const ctx = { negocio: config.negocio, moneda: config.moneda, direccion: config.direccion, enlaceTurno: `${origen()}/d/${slug}/turno/${turno.token}` };
  const futuro = +new Date(turno.inicio) > ahora;
  const cambiar = (nuevo: Turno['estado']) => {
    let av: EnEspera[] = [];
    const err = actualizar((e) => {
      const r = cambiarEstado(e, turno.id, nuevo);
      av = r.avisados;
      return r.estado;
    });
    setAvisados(av);
    setMsg(err ?? `Turno marcado como ${NOMBRE_ESTADO[nuevo].toLowerCase()}.`);
  };
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-turno" ref={ref}>
        <div className="hoja-cab">
          <div>
            <h3 id="t-turno">{c?.nombre ?? 'Cliente'}</h3>
            <p style={{ margin: '4px 0 0', color: '#55555f' }}>{s.nombre} · {nombreDia(turno.inicio)} {hora(turno.inicio)} a {hora(turno.fin)} h · {p.nombre.split(' ')[0]}</p>
          </div>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 12px' }}>
          <span className={`bar-estado est-${turno.estado}`}>{NOMBRE_ESTADO[turno.estado]}</span>
          <span className="chip-rep">{turno.origen === 'online' ? 'Reservó online' : 'Cargado a mano'}</span>
          {c && estado.rubro === 'barberia' && <span className="chip-rep"><Icono nombre="estrella" size={12} /> {c.sellos}/{estado.metaSellos} sellos</span>}
          {turno.cobertura && <span className="chip-rep">{turno.cobertura}{c?.afiliado && turno.cobertura === c.cobertura ? ` · ${c.afiliado}` : ''}</span>}
          {turno.sobreturno && <span className="chip-rep sobre">Sobreturno</span>}
          {turno.modalidad === 'video' && <span className="chip-rep">Videollamada</span>}
          {c && c.ausencias > 0 && <span className="chip-rep ausencias">{c.ausencias} {c.ausencias === 1 ? 'ausencia' : 'ausencias'}</span>}
        </p>
        {c?.notas && <p className="bar-notas"><Icono nombre="texto" size={16} /> {c.notas}</p>}
        <div className="bar-acciones" style={{ marginBottom: 12 }}>
          {turno.estado === 'reservado' && <button type="button" className="d-btn prim" onClick={() => cambiar('confirmado')}>Confirmar</button>}
          {(turno.estado === 'reservado' || turno.estado === 'confirmado') && (
            <>
              <button type="button" className="d-btn" onClick={() => cambiar('atendido')}><Icono nombre="check" size={16} /> Atendido</button>
              <button type="button" className="d-btn" onClick={() => cambiar('ausente')}>No vino</button>
              <button type="button" className="d-btn peligro" onClick={() => cambiar('cancelado')}>Cancelar</button>
            </>
          )}
          {(turno.estado === 'atendido' || turno.estado === 'ausente') && <button type="button" className="d-btn" onClick={() => cambiar('confirmado')}><Icono nombre="deshacer" size={16} /> Deshacer</button>}
        </div>
        {c && futuro && turno.estado !== 'cancelado' && (
          <div className="bar-acciones" style={{ marginBottom: 12 }}>
            <a className="d-btn" href={enlaceWhatsApp(c.whatsapp, mensajeConfirmacion(estado, turno, c, ctx))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={16} /> Enviar confirmación</a>
            <a className="d-btn" href={enlaceWhatsApp(c.whatsapp, mensajeRecordatorio(estado, turno, c, ctx))} target="_blank" rel="noopener noreferrer"><Icono nombre="reloj" size={16} /> Enviar recordatorio</a>
          </div>
        )}
        {msg && <p role="status" style={{ fontSize: 14, margin: '0 0 8px' }}>{msg}</p>}
        {avisados.length > 0 && <AvisoEspera estado={estado} avisados={avisados} config={config} slug={slug} />}
      </div>
    </div>
  );
}

function AvisoEspera({ estado, avisados, config, slug }: { estado: EstadoAgenda; avisados: EnEspera[]; config: DemoConfig; slug: string }) {
  return (
    <div className="bar-ok" role="status">
      <Icono nombre="whatsapp" size={18} />
      <div>
        <strong>Se liberó el horario y {avisados.length === 1 ? 'hay 1 persona' : `hay ${avisados.length} personas`} en la lista de espera.</strong>
        {avisados.map((x) => (
          <a key={x.id} className="d-btn" style={{ marginTop: 6 }} href={enlaceWhatsApp(x.whatsapp, mensajeEspera(estado, x, { negocio: config.negocio, moneda: config.moneda, enlaceReserva: `${origen()}/d/${slug}` }))} target="_blank" rel="noopener noreferrer">
            Avisar a {x.nombre.split(' ')[0]} por WhatsApp
          </a>
        ))}
      </div>
    </div>
  );
}

function NuevoTurno({ estado, fecha, actualizar, onCerrar, profInicial }: { estado: EstadoAgenda; fecha: Date; actualizar: ActualizarAgenda; onCerrar: () => void; profInicial: string | null }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const ahora = useAhora();
  const [sid, setSid] = useState(estado.servicios[0].id);
  const [pid, setPid] = useState<string | null>(profInicial);
  const [ini, setIni] = useState<string>('');
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [err, setErr] = useState('');
  const [sobre, setSobre] = useState(false);
  const cons = estado.rubro === 'consultorio';
  const [cob, setCob] = useState(cons ? (estado.coberturas?.at(-1) ?? '') : '');
  const s = estado.servicios.find((x) => x.id === sid)!;
  // En el panel se puede cargar a mano un turno de hoy aunque falte poco (walk-in): sin anticipación.
  const libres = useMemo(() => {
    if (!sobre) return huecos(estado, s, pid, fecha, Math.min(ahora, +inicioDia(fecha)) - 3_600_000);
    // Sobreturno (CON-07): cualquier horario dentro del día, aunque esté ocupado.
    const h = estado.horario[fecha.getDay()];
    const prof = pid ?? estado.profesionales.find((p) => p.servicios.includes(sid))?.id;
    if (!h || !prof) return [];
    const res = [];
    for (let m = h[0]; m + s.duracion <= h[1]; m += 15) res.push({ inicio: +conMinutos(fecha, m), profId: prof });
    return res;
  }, [estado, s, sid, pid, fecha, ahora, sobre]);
  const elegido = libres.find((h) => String(h.inicio) === ini) ?? libres[0];
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-nuevo" ref={ref}>
        <div className="hoja-cab">
          <h3 id="t-nuevo">Nuevo turno · {nombreDia(fecha)}</h3>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <form
          className="bar-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!elegido) return setErr('No hay horarios libres para ese servicio este día.');
            if (nombre.trim().length < 2) return setErr(cons ? 'Escribí el nombre del paciente.' : 'Escribí el nombre del cliente.');
            let fallo = '';
            const error = actualizar((x) => {
              const r = reservar(x, { servicioId: sid, profId: elegido.profId, inicio: elegido.inicio, nombre, whatsapp: wa, origen: 'manual', sobreturno: sobre, ...(cons && cob ? { cobertura: cob } : {}) });
              if ('error' in r) {
                fallo = r.error;
                return x;
              }
              return r.estado;
            });
            if (fallo || error) return setErr(fallo || error || '');
            onCerrar();
          }}
        >
          <label>{cons ? 'Tipo de consulta' : 'Servicio'}
            <select className="c-inp" value={sid} onChange={(e) => { setSid(e.target.value); setIni(''); }}>
              {estado.servicios.map((x) => <option key={x.id} value={x.id}>{x.nombre} ({x.duracion} min)</option>)}
            </select>
          </label>
          <label>Profesional
            <select className="c-inp" value={pid ?? ''} onChange={(e) => { setPid(e.target.value || null); setIni(''); }}>
              {!sobre && <option value="">El primero libre</option>}
              {estado.profesionales.filter((p) => p.servicios.includes(sid)).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          {cons && <label className="bl-check" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}><input type="checkbox" checked={sobre} onChange={(e) => { setSobre(e.target.checked); setIni(''); }} style={{ width: 20, height: 20 }} /> Sobreturno (aunque el horario esté ocupado)</label>}
          <label>Hora
            <select className="c-inp" value={elegido ? String(elegido.inicio) : ''} onChange={(e) => setIni(e.target.value)} disabled={!libres.length}>
              {libres.length ? libres.map((h) => <option key={h.inicio} value={h.inicio}>{hora(new Date(h.inicio))} · {estado.profesionales.find((p) => p.id === h.profId)?.nombre.split(' ')[0]}</option>) : <option>Sin horarios libres</option>}
            </select>
          </label>
          <label>{cons ? 'Paciente' : 'Cliente'}
            <input className="c-inp" list="clientes-lista" value={nombre} onChange={(e) => {
              setNombre(e.target.value);
              const c = estado.clientes.find((x) => x.nombre === e.target.value);
              if (c) {
                setWa(c.whatsapp);
                if (c.cobertura) setCob(c.cobertura);
              }
            }} />
            <datalist id="clientes-lista">{estado.clientes.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
          </label>
          <label>WhatsApp (opcional)<input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" /></label>
          {cons && (
            <label>Cobertura
              <select className="c-inp" value={cob} onChange={(e) => setCob(e.target.value)}>
                {estado.coberturas?.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          )}
          {err && <p className="bar-err" role="alert">{err}</p>}
          <button type="submit" className="bar-btn prim grande">Guardar turno</button>
        </form>
      </div>
    </div>
  );
}

// ---------------- Lista de espera (BAR-08) ----------------

function Espera({ config, estado, actualizar, slug }: { config: DemoConfig; estado: EstadoAgenda; actualizar: ActualizarAgenda; slug: string }) {
  const lista = [...estado.espera].sort((a, b) => (a.avisado ? 0 : 1) - (b.avisado ? 0 : 1) || a.dia.localeCompare(b.dia));
  return (
    <section className="d-card" aria-labelledby="t-esp">
      <h2 id="t-esp">Lista de espera</h2>
      <p className="sub">Cuando alguien cancela o cambia su turno, la gente anotada para ese día queda lista para avisar con un toque.</p>
      {lista.length === 0 ? <p className="tie-vacio">Nadie en espera por ahora.</p> : (
        <ul className="alertas">
          {lista.map((x) => {
            const s = estado.servicios.find((y) => y.id === x.servicioId);
            const p = x.profId ? estado.profesionales.find((y) => y.id === x.profId) : null;
            return (
              <li key={x.id} className={x.avisado ? 'avisar' : 'esperando'}>
                <span className="bar-avatar" aria-hidden="true">{iniciales(x.nombre)}</span>
                <div style={{ flex: 1 }}>
                  <strong>{x.nombre}</strong>
                  <span>{s?.nombre} · {nombreDia(x.dia + 'T12:00:00')}{p ? ` · con ${p.nombre.split(' ')[0]}` : ''}</span>
                  <span style={{ fontSize: 13 }}>{x.avisado ? 'Se liberó un turno: avisale ahora.' : 'Esperando que se libere un lugar.'}</span>
                </div>
                <a className={`d-btn${x.avisado ? ' prim' : ''}`} href={enlaceWhatsApp(x.whatsapp, mensajeEspera(estado, x, { negocio: config.negocio, moneda: config.moneda, enlaceReserva: `${origen()}/d/${slug}` }))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={16} /> Avisar</a>
                <button type="button" className="x" aria-label={`Quitar a ${x.nombre} de la lista`} onClick={() => actualizar((e) => ({ ...e, espera: e.espera.filter((y) => y.id !== x.id) }))}><Icono nombre="basura" size={16} /></button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------- Clientes (BAR-11, BAR-12) ----------------

function Clientes({ estado, actualizar }: { estado: EstadoAgenda; actualizar: ActualizarAgenda }) {
  const ahora = useAhora();
  const [q, setQ] = useState('');
  const [abierto_, setAbierto] = useState<string | null>(null);
  const ultimo = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of estado.turnos) if (t.estado === 'atendido' && (!m.has(t.clienteId) || t.inicio > m.get(t.clienteId)!)) m.set(t.clienteId, t.inicio);
    return m;
  }, [estado.turnos]);
  const lista = estado.clientes
    .filter((c) => !q.trim() || c.nombre.toLowerCase().includes(q.trim().toLowerCase()) || c.whatsapp.includes(soloDigitos(q)) && soloDigitos(q).length > 2)
    .sort((a, b) => b.sellos - a.sellos || a.nombre.localeCompare(b.nombre));
  const c = abierto_ ? estado.clientes.find((x) => x.id === abierto_) : null;
  return (
    <section className="d-card" aria-labelledby="t-cli">
      <h2 id="t-cli">Clientes</h2>
      <p className="sub">Cada turno atendido suma un sello. Con {estado.metaSellos} sellos: {estado.beneficio.toLowerCase()}.</p>
      <div className="tie-buscar" role="search" style={{ marginBottom: 12 }}>
        <Icono nombre="buscar" size={18} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o WhatsApp" aria-label="Buscar clientes" />
      </div>
      <ul className="cli-lista">
        {lista.map((x) => {
          const u = ultimo.get(x.id);
          const nuevo = +new Date(x.creado) > ahora - 14 * 86_400_000;
          return (
            <li key={x.id}>
              <button type="button" onClick={() => setAbierto(x.id)}>
                <span className="bar-avatar" aria-hidden="true">{iniciales(x.nombre)}</span>
                <span className="cli-txt">
                  <strong>{x.nombre}{nuevo && <span className="chip-rep nuevo">Nuevo</span>}{x.ausencias > 1 && <span className="chip-rep ausencias">{x.ausencias} ausencias</span>}</strong>
                  <span>{u ? `Última visita: ${nombreDia(u)}` : 'Todavía no vino'}</span>
                </span>
                <Sellos n={x.sellos} meta={estado.metaSellos} />
              </button>
            </li>
          );
        })}
      </ul>
      {c && <FichaCliente estado={estado} cliente={c} actualizar={actualizar} onCerrar={() => setAbierto(null)} />}
    </section>
  );
}

function Sellos({ n, meta }: { n: number; meta: number }) {
  return (
    <span className={`sellos${n >= meta ? ' lleno' : ''}`} aria-label={`${n} de ${meta} sellos`} role="img">
      {Array.from({ length: meta }, (_, i) => <span key={i} data-on={i < n ? '1' : undefined} />)}
    </span>
  );
}

function FichaCliente({ estado, cliente, actualizar, onCerrar }: { estado: EstadoAgenda; cliente: Cliente; actualizar: ActualizarAgenda; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [notas, setNotas] = useState(cliente.notas);
  const [msg, setMsg] = useState('');
  const hist = historialCliente(estado, cliente.id).slice(0, 8);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-fc" ref={ref}>
        <div className="hoja-cab">
          <div>
            <h3 id="t-fc">{cliente.nombre}</h3>
            <p style={{ margin: '4px 0 0', color: '#55555f' }}>+{cliente.whatsapp}</p>
          </div>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <div className="fc-sellos">
          <Sellos n={cliente.sellos} meta={estado.metaSellos} />
          <span>{cliente.sellos >= estado.metaSellos ? `¡Tiene ${estado.beneficio.toLowerCase()}!` : `Le faltan ${estado.metaSellos - cliente.sellos} para ${estado.beneficio.toLowerCase()}.`}</span>
          {cliente.sellos >= estado.metaSellos && <button type="button" className="d-btn prim" onClick={() => { const e = actualizar((x) => canjearSellos(x, cliente.id)); setMsg(e ?? 'Beneficio canjeado.'); }}>Canjear beneficio</button>}
        </div>
        {cliente.ausencias > 0 && <p className="bar-notas"><Icono nombre="info" size={16} /> Faltó {cliente.ausencias} {cliente.ausencias === 1 ? 'vez' : 'veces'} sin avisar. Conviene mandarle recordatorio.</p>}
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, margin: '12px 0' }}>Notas (preferencias, cómo le gusta el corte)
          <textarea className="c-inp" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
        <button type="button" className="d-btn prim" onClick={() => { const e = actualizar((x) => ({ ...x, clientes: x.clientes.map((y) => (y.id === cliente.id ? { ...y, notas: notas.trim() } : y)) })); setMsg(e ?? 'Notas guardadas.'); }}>Guardar notas</button>
        {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
        <h4 style={{ margin: '18px 0 8px' }}>Últimos turnos</h4>
        <ul className="fc-hist">
          {hist.map((t) => (
            <li key={t.id}>
              <span>{fechaCorta(new Date(t.inicio))} · {hora(t.inicio)}</span>
              <span>{estado.servicios.find((s) => s.id === t.servicioId)?.nombre}</span>
              <span className={`bar-estado est-${t.estado}`}>{NOMBRE_ESTADO[t.estado]}</span>
            </li>
          ))}
          {!hist.length && <li>Sin turnos todavía.</li>}
        </ul>
      </div>
    </div>
  );
}

// ---------------- Bloqueos (BAR-10) ----------------

function Bloqueos({ estado, actualizar }: { estado: EstadoAgenda; actualizar: ActualizarAgenda }) {
  const ahora = useAhora();
  const hoy = claveDia(ahora);
  const [pid, setPid] = useState<string>('');
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [completo, setCompleto] = useState(true);
  const [h1, setH1] = useState('13:00');
  const [h2, setH2] = useState('14:00');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState('');
  const futuros = estado.bloqueos.filter((b) => +new Date(b.hasta) > ahora && !(b.motivo === 'Almuerzo' && b.id.startsWith('b-alm'))).sort((a, b) => a.desde.localeCompare(b.desde));
  const almuerzos = estado.bloqueos.filter((b) => b.id.startsWith('b-alm') && +new Date(b.hasta) > ahora).length;
  const nombre = (id: string | null) => (id ? estado.profesionales.find((p) => p.id === id)?.nombre ?? '' : 'Todo el local');
  const choques = (desdeMs: number, hastaMs: number, prof: string | null) =>
    estado.turnos.filter((t) => t.estado !== 'cancelado' && (prof === null || t.profId === prof) && +new Date(t.inicio) < hastaMs && +new Date(t.fin) > desdeMs).length;
  return (
    <section className="d-card" aria-labelledby="t-bl">
      <h2 id="t-bl">Bloqueos y vacaciones</h2>
      <p className="sub">Lo que bloquees deja de aparecer en las reservas online. Los turnos ya tomados no se borran: te avisamos para reprogramarlos.</p>
      <form
        className="bl-form"
        onSubmit={(e) => {
          e.preventDefault();
          const d1 = deClave(desde);
          const d2 = deClave(hasta < desde ? desde : hasta);
          const prof = pid || null;
          const nuevos: EstadoAgenda['bloqueos'] = [];
          if (completo) nuevos.push({ id: `u-${Math.random().toString(36).slice(2, 8)}`, profId: prof, desde: inicioDia(d1).toISOString(), hasta: sumarDias(inicioDia(d2), 1).toISOString(), motivo: motivo.trim() || 'Vacaciones' });
          else {
            const [a, b] = [h1, h2].map((x) => { const [hh, mm] = x.split(':').map(Number); return hh * 60 + mm; });
            if (b <= a) return setMsg('La hora de fin tiene que ser después de la de inicio.');
            for (let d = d1; d <= d2; d = sumarDias(d, 1)) nuevos.push({ id: `u-${Math.random().toString(36).slice(2, 8)}`, profId: prof, desde: conMinutos(d, a).toISOString(), hasta: conMinutos(d, b).toISOString(), motivo: motivo.trim() || 'Bloqueado' });
          }
          const n = nuevos.reduce((s, b) => s + choques(+new Date(b.desde), +new Date(b.hasta), prof), 0);
          const err = actualizar((x) => ({ ...x, bloqueos: [...x.bloqueos, ...nuevos] }));
          setMsg(err ?? (n ? `Bloqueo guardado. Hay ${n} turnos tomados en ese horario: avisales para reprogramar.` : 'Bloqueo guardado.'));
          setMotivo('');
        }}
      >
        <label>Quién<select className="c-inp" value={pid} onChange={(e) => setPid(e.target.value)}><option value="">Todo el local</option>{estado.profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
        <label>Desde<input className="c-inp" type="date" value={desde} min={hoy} onChange={(e) => setDesde(e.target.value)} /></label>
        <label>Hasta<input className="c-inp" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} /></label>
        <label className="bl-check"><input type="checkbox" checked={completo} onChange={(e) => setCompleto(e.target.checked)} /> Días completos</label>
        {!completo && (
          <>
            <label>De<input className="c-inp" type="time" step={900} value={h1} onChange={(e) => setH1(e.target.value)} /></label>
            <label>A<input className="c-inp" type="time" step={900} value={h2} onChange={(e) => setH2(e.target.value)} /></label>
          </>
        )}
        <label>Motivo<input className="c-inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={completo ? 'Vacaciones' : 'Trámite, médico…'} /></label>
        <button type="submit" className="d-btn prim">Bloquear</button>
      </form>
      {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
      <h3 style={{ fontSize: 16, margin: '18px 0 8px' }}>Próximos bloqueos</h3>
      <ul className="alertas">
        {futuros.map((b) => {
          const dias = Math.round((+new Date(b.hasta) - +new Date(b.desde)) / 86_400_000);
          const completoB = minutosDe(b.desde) === 0 && minutosDe(b.hasta) === 0;
          return (
            <li key={b.id} className="bloq">
              <Icono nombre="candado" size={18} />
              <div style={{ flex: 1 }}>
                <strong>{nombre(b.profId)} · {b.motivo}</strong>
                <span>{completoB ? (dias > 1 ? `Del ${fechaCorta(new Date(b.desde))} al ${fechaCorta(sumarDias(new Date(b.hasta), -1))}` : `${nombreDia(b.desde)}, todo el día`) : `${nombreDia(b.desde)} de ${hora(b.desde)} a ${hora(b.hasta)} h`}</span>
              </div>
              <button type="button" className="x" aria-label={`Quitar bloqueo ${b.motivo}`} onClick={() => actualizar((x) => ({ ...x, bloqueos: x.bloqueos.filter((y) => y.id !== b.id) }))}><Icono nombre="basura" size={16} /></button>
            </li>
          );
        })}
        {!futuros.length && <li>No hay bloqueos próximos.</li>}
      </ul>
      {almuerzos > 0 && estado.rubro === 'barberia' && <p className="sub" style={{ marginTop: 10 }}>Además, Joaquín tiene su horario de almuerzo de 13:30 a 14:30 bloqueado ({almuerzos} días).</p>}
    </section>
  );
}

// ---------------- Métricas (BAR-13) ----------------

function Metricas({ estado, moneda }: { estado: EstadoAgenda; moneda: string }) {
  const ahora = useAhora();
  const m = useMemo(() => metricas(estado, ahora), [estado, ahora]);
  const pc = (v: number) => `${Math.round(v * 100)}%`;
  const max = Math.max(1, ...m.porServicio.map((x) => x.n));
  return (
    <>
      <section className="d-card" aria-labelledby="t-met">
        <h2 id="t-met">Cómo viene el negocio</h2>
        <p className="sub">Ocupación de esta semana y resultados de las últimas 4 semanas.</p>
        <div className="met-grid">
          <div className="met"><strong>{pc(m.ocupacionSemana)}</strong><span>Ocupación de la agenda esta semana</span></div>
          <div className="met"><strong>{pc(m.ausencias)}</strong><span>Ausencias ({m.ausentes} de {m.turnos28} turnos)</span></div>
          <div className="met"><strong>{m.nuevos} / {m.recurrentes}</strong><span>{estado.rubro === 'consultorio' ? 'Pacientes nuevos / recurrentes' : 'Clientes nuevos / que volvieron'}</span></div>
          <div className="met"><strong>{pc(m.online)}</strong><span>Turnos reservados online, sin llamar</span></div>
          {estado.rubro === 'barberia' && <div className="met"><strong>{formatoPrecio(m.ingresos, moneda)}</strong><span>Facturado en servicios (estimado)</span></div>}
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-occ">
        <h2 id="t-occ">Ocupación por profesional (esta semana)</h2>
        <ul className="met-barras">
          {m.porProf.map(({ p, ocupacion }) => (
            <li key={p.id}><span>{p.nombre}</span><span className="ag-barra grande"><span style={{ width: pc(ocupacion) }} /></span><strong>{pc(ocupacion)}</strong></li>
          ))}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-top">
        <h2 id="t-top">Servicios más pedidos (4 semanas)</h2>
        <ul className="met-barras">
          {m.porServicio.map(({ s, n }) => (
            <li key={s.id}><span>{s.nombre}</span><span className="ag-barra grande"><span style={{ width: `${(n / max) * 100}%` }} /></span><strong>{n}</strong></li>
          ))}
        </ul>
      </section>
    </>
  );
}

// ---------------- Ajustes ----------------

function Ajustes({ slug, config, estado, actualizar }: { slug: string; config: DemoConfig; estado: EstadoAgenda; actualizar: ActualizarAgenda }) {
  const [msg, setMsg] = useState('');
  const abiertos = [2, 3, 4, 5, 6, 0, 1].filter((d) => estado.horario[d]);
  const h = estado.horario[abiertos[0] ?? 2] ?? [600, 1200];
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">{estado.rubro === 'consultorio' ? 'Ajustes del consultorio' : 'Ajustes de la barbería'}</h2>
      <form
        style={{ display: 'grid', gap: 12, maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
          if (wa.length < 8) return setMsg('Revisá el WhatsApp: incluí código de país y de área.');
          const aMin = (x: FormDataEntryValue | null) => { const [hh, mm] = String(x ?? '').split(':').map(Number); return (hh || 0) * 60 + (mm || 0); };
          const ap = aMin(f.get('apertura'));
          const ci = aMin(f.get('cierre'));
          if (ci <= ap) return setMsg('El cierre tiene que ser después de la apertura.');
          const horario: EstadoAgenda['horario'] = {};
          for (let d = 0; d < 7; d++) horario[d] = f.get(`dia-${d}`) ? [ap, ci] : null;
          try {
            actualizarDemo(slug, { whatsapp: wa, direccion: String(f.get('direccion') ?? '').trim() });
            const err = actualizar((x) => ({
              ...x,
              horario,
              ...(x.rubro === 'barberia'
                ? {
                    metaSellos: Math.min(20, Math.max(3, Math.floor(Number(f.get('meta')) || 10))),
                    beneficio: String(f.get('beneficio') ?? '').trim() || x.beneficio,
                    servicios: x.servicios.map((s) => (s.id === 's-color' ? { ...s, sena: Math.min(100, Math.max(0, Number(f.get('sena')) || 0)) || undefined } : s)),
                  }
                : { pausa: f.get('pausa1') && f.get('pausa2') && aMin(f.get('pausa2')) > aMin(f.get('pausa1')) ? [aMin(f.get('pausa1')), aMin(f.get('pausa2'))] as [number, number] : undefined }),
            }));
            setMsg(err ?? 'Ajustes guardados.');
          } catch (er) {
            setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.');
          }
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp del local<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Dirección<input name="direccion" className="c-inp" defaultValue={config.direccion} /></label>
        <fieldset className="aj-dias">
          <legend>Días que abre</legend>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <label key={d}><input type="checkbox" name={`dia-${d}`} defaultChecked={!!estado.horario[d]} /> {nombreDiaSemana(d)}</label>
          ))}
        </fieldset>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Abre<input name="apertura" type="time" step={900} className="c-inp" defaultValue={hhmm(h[0])} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Cierra<input name="cierre" type="time" step={900} className="c-inp" defaultValue={hhmm(h[1])} /></label>
        </div>
        {estado.rubro === 'consultorio' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Pausa desde<input name="pausa1" type="time" step={900} className="c-inp" defaultValue={estado.pausa ? hhmm(estado.pausa[0]) : ''} /></label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Pausa hasta<input name="pausa2" type="time" step={900} className="c-inp" defaultValue={estado.pausa ? hhmm(estado.pausa[1]) : ''} /></label>
          </div>
        ) : (<>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Sellos para el beneficio<input name="meta" type="number" min={3} max={20} className="c-inp" defaultValue={estado.metaSellos} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Beneficio<input name="beneficio" className="c-inp" defaultValue={estado.beneficio} /></label>
        </div>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Seña para color y mechas (%)<input name="sena" type="number" min={0} max={100} className="c-inp" defaultValue={estado.servicios.find((s) => s.id === 's-color')?.sena ?? 0} />
          <span style={{ fontWeight: 400, fontSize: 13, color: '#55555f' }}>Se muestra al reservar. El cobro real de la seña es un módulo próximamente.</span>
        </label>
        </>)}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, estado.rubro); setMsg('La agenda volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
      {estado.rubro === 'consultorio' && <RegistroAccesos estado={estado} />}
    </section>
  );
}

function RegistroAccesos({ estado }: { estado: EstadoAgenda }) {
  const ev = [...(estado.eventos ?? [])].reverse().slice(0, 15);
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Registro de accesos a fichas</h3>
      <p className="sub">Cada vez que alguien abre la ficha de un paciente queda registrado (quién y cuándo).</p>
      {ev.length ? (
        <ul className="fc-hist">
          {ev.map((x, i) => <li key={i}><span>{fechaCorta(new Date(x.fecha))} · {hora(x.fecha)}</span><span>{x.accion}</span><span className="chip-rep">{x.quien}</span></li>)}
        </ul>
      ) : <p className="sub">Todavía nadie abrió una ficha.</p>}
    </div>
  );
}

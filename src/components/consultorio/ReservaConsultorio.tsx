'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { Horarios, ListaEspera, Listo } from '@/components/barberia/Reserva';
import { useAhora, useDemoBarberia, type ActualizarAgenda } from '@/components/barberia/useBarberia';
import { formatoPrecio, soloDigitos } from '@/lib/utiles';
import { FOTO_PORTADA_CONS, PARTICULAR } from '@/lib/rubros/consultorio/datos-ejemplo';
import { abierto, claveDia, deClave, diaCorto, fechaCorta, hora, huecos, inicioDia, nombreDia, proximoConLugar, sumarDias, type Hueco } from '@/lib/rubros/barberia/agenda';
import { reservar } from '@/lib/rubros/barberia/logica';
import type { EstadoAgenda, Profesional, Servicio, Turno } from '@/lib/rubros/barberia/tipos';
import type { DemoConfig } from '@/lib/tipos';

const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
export const nombreProf = (p: Profesional) => `${p.titulo ? `${p.titulo} ` : ''}${p.nombre}`;

/** Reserva del paciente (CON-01 a CON-03): profesional → consulta y horario → datos y cobertura. */
export function ReservaConsultorio({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoBarberia(slug);
  const ahora = useAhora();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [cobertura, setCobertura] = useState<string | null>(null);
  const [profId, setProfId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hueco, setHueco] = useState<Hueco | null>(null);
  const [hecho, setHecho] = useState<Turno | null>(null);
  const [espera, setEspera] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const arriba = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const prof = estado?.profesionales.find((p) => p.id === profId) ?? null;
  const servicio = estado?.servicios.find((s) => s.id === servicioId) ?? null;
  const dias = useMemo(() => Array.from({ length: 14 }, (_, i) => sumarDias(inicioDia(ahora), i)), [ahora]);
  const diaElegido = useMemo(() => {
    if (!estado || !servicio || !profId) return null;
    if (dia) return deClave(dia);
    return proximoConLugar(estado, servicio, profId, new Date(ahora), ahora) ?? dias.find((d) => abierto(estado.horario, d)) ?? dias[0];
  }, [estado, servicio, profId, dia, ahora, dias]);
  const libres = useMemo(() => (estado && servicio && profId && diaElegido ? huecos(estado, servicio, profId, diaElegido, ahora) : []), [estado, servicio, profId, diaElegido, ahora]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const ir = (n: 1 | 2 | 3) => {
    setPaso(n);
    requestAnimationFrame(() => arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  if (hecho) return <Listo config={config} estado={estado} turno={hecho} slug={slug} estilo={estilo} otra={() => { setHecho(null); setHueco(null); setDia(null); setServicioId(null); setProfId(null); ir(1); }} />;

  const coberturas = estado.coberturas ?? [];
  const profs = estado.profesionales.filter((x) => !cobertura || x.coberturas?.includes(cobertura));
  const desde = (x: Profesional) => Math.min(...estado.servicios.filter((s) => x.servicios.includes(s.id)).map((s) => s.precio));
  const manana = libres.filter((h) => new Date(h.inicio).getHours() < 13);
  const tarde = libres.filter((h) => new Date(h.inicio).getHours() >= 13);
  const proximo = servicio && profId && diaElegido && !libres.length ? proximoConLugar(estado, servicio, profId, sumarDias(diaElegido, 1), ahora) : null;

  return (
    <div className="bar con" style={estilo}>
      <AvisoDemo texto="Demo con datos ficticios" />
      <header className="bar-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bar-hero-foto" src={FOTO_PORTADA_CONS} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="bar-hero-in">
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" className="bar-logo" />
          ) : (
            <span className="bar-logo bar-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          )}
          <h1>{config.negocio}</h1>
          <p>Pedí tu turno online en tres pasos, sin crear cuenta.</p>
          <Horarios estado={estado} />
          <a className="bar-tel" href={`tel:+${soloDigitos(config.whatsapp)}`}><Icono nombre="telefono" size={16} /> ¿Preferís llamar? +{soloDigitos(config.whatsapp)}</a>
        </div>
      </header>

      <div ref={arriba} className="bar-pasos" aria-label="Pasos de la reserva">
        {['Profesional', 'Consulta y horario', 'Tus datos'].map((t, i) => (
          <button key={t} type="button" className="bar-paso" aria-current={paso === i + 1 ? 'step' : undefined} data-hecho={paso > i + 1 ? '1' : undefined} disabled={i + 1 > paso} onClick={() => ir((i + 1) as 1 | 2 | 3)}>
            <span className="bar-paso-n">{paso > i + 1 ? <Icono nombre="check" size={14} /> : i + 1}</span>
            {t}
          </button>
        ))}
      </div>

      <main className="bar-main">
        {paso === 1 && (
          <section aria-labelledby="t-prof" className="bar-anim">
            <h2 id="t-prof" className="bar-h2">¿Con quién te querés atender?</h2>
            <div className="bar-coberturas" role="group" aria-label="Filtrar por cobertura">
              <span>Tu cobertura:</span>
              <button type="button" aria-pressed={!cobertura} onClick={() => setCobertura(null)}>Todas</button>
              {coberturas.map((c) => <button key={c} type="button" aria-pressed={cobertura === c} onClick={() => setCobertura((x) => (x === c ? null : c))}>{c}</button>)}
            </div>
            <ul className="con-profs">
              {profs.map((x, i) => (
                <li key={x.id} style={{ '--i': i } as React.CSSProperties}>
                  <button type="button" className="con-prof" aria-label={`${nombreProf(x)}, ${x.especialidad}`} onClick={() => { setProfId(x.id); setServicioId(null); setDia(null); setHueco(null); ir(2); }}>
                    <span className="bar-avatar grande" aria-hidden="true">{iniciales(x.nombre)}</span>
                    <span className="con-prof-txt">
                      <strong>{nombreProf(x)}</strong>
                      <span>{x.especialidad} · {x.matricula}</span>
                      <span className="con-cobs">{x.coberturas?.map((c) => <span key={c} data-sel={c === cobertura ? '1' : undefined}>{c}</span>)}</span>
                      {x.teleconsulta && <span className="con-video"><Icono nombre="ojo" size={14} /> También por videollamada</span>}
                    </span>
                    <span className="con-desde"><small>Particular desde</small>{p(desde(x))}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!profs.length && <p className="bar-sinlugar">Ningún profesional de este consultorio trabaja con esa cobertura. Podés atenderte como particular.</p>}
          </section>
        )}

        {paso === 2 && prof && (
          <section aria-labelledby="t-cons" className="bar-anim">
            <h2 id="t-cons" className="bar-h2">{nombreProf(prof)} <span>{prof.especialidad}</span></h2>
            <h3 className="bar-h3">Tipo de consulta</h3>
            <ul className="bar-servicios">
              {estado.servicios.filter((s) => prof.servicios.includes(s.id)).map((s, i) => (
                <li key={s.id} style={{ '--i': i } as React.CSSProperties}>
                  <button type="button" className="bar-serv" aria-pressed={s.id === servicioId} aria-label={`${s.nombre}, ${s.duracion} minutos`} onClick={() => { setServicioId(s.id); setDia(null); setHueco(null); }}>
                    <span className="bar-serv-dur"><strong>{s.duracion}</strong>min</span>
                    <span className="bar-serv-txt">
                      <span className="bar-serv-nom">{s.nombre}</span>
                      <span className="bar-serv-desc">{s.descripcion}</span>
                    </span>
                    <span className="bar-serv-precio"><small>Particular</small>{p(s.precio)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {servicio && diaElegido && (
              <>
                <h3 className="bar-h3">¿Qué día?</h3>
                <div className="bar-dias" role="group" aria-label="Día">
                  {dias.map((d) => {
                    const cerrado = !abierto(estado.horario, d);
                    const n = cerrado ? 0 : huecos(estado, servicio, prof.id, d, ahora).length;
                    return (
                      <button key={claveDia(d)} type="button" className="bar-dia" aria-pressed={claveDia(d) === claveDia(diaElegido)} disabled={cerrado} onClick={() => { setDia(claveDia(d)); setHueco(null); }} aria-label={`${nombreDia(d, new Date(ahora))}${cerrado ? ', cerrado' : n ? `, ${n} horarios` : ', sin lugar'}`}>
                        <span className="bar-dia-s">{claveDia(d) === claveDia(ahora) ? 'Hoy' : diaCorto(d)}</span>
                        <strong>{d.getDate()}</strong>
                        <span className={`bar-dia-lugar${cerrado ? ' cerrado' : n === 0 ? ' lleno' : n < 5 ? ' pocos' : ''}`}>{cerrado ? 'Cerrado' : n === 0 ? 'Lleno' : n < 5 ? 'Pocos' : 'Libre'}</span>
                      </button>
                    );
                  })}
                </div>
                <h3 className="bar-h3">Horarios para {nombreDia(diaElegido, new Date(ahora))}</h3>
                {libres.length === 0 ? (
                  <div className="bar-sinlugar">
                    <p><strong>No quedan turnos este día.</strong> Anotate y te avisamos por WhatsApp si se libera uno.</p>
                    <div className="bar-acciones">
                      <button type="button" className="bar-btn prim" onClick={() => setEspera(true)}>Anotarme en la lista de espera</button>
                      {proximo && <button type="button" className="bar-btn" onClick={() => setDia(claveDia(proximo))}>Ver el {nombreDia(proximo, new Date(ahora))}</button>}
                    </div>
                  </div>
                ) : (
                  <>
                    {([['Mañana', manana], ['Tarde', tarde]] as const).map(([t, l]) =>
                      l.length ? (
                        <div key={t} className="bar-franja">
                          <span className="bar-franja-t">{t}</span>
                          <div className="bar-horas" role="group" aria-label={`Horarios de la ${t.toLowerCase()}`}>
                            {l.map((h) => <button key={h.inicio} type="button" className="bar-hora" onClick={() => { setHueco(h); ir(3); }}>{hora(new Date(h.inicio))}</button>)}
                          </div>
                        </div>
                      ) : null,
                    )}
                    <button type="button" className="bar-link" onClick={() => setEspera(true)}>¿No te sirve ningún horario? Anotate en la lista de espera</button>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {paso === 3 && prof && servicio && hueco && (
          <Datos config={config} estado={estado} prof={prof} servicio={servicio} hueco={hueco} coberturaInicial={cobertura} actualizar={actualizar} onListo={setHecho} onOcupado={(m) => { setToast(m); setHueco(null); ir(2); }} />
        )}
        <p className="c-pie">{config.direccion ? `${config.direccion}. ` : ''}Hecho con ACMIAS. Esta página no da consejos médicos.</p>
      </main>

      {espera && servicio && prof && diaElegido && (
        <ListaEspera estado={estado} servicio={servicio} profId={prof.id} dia={diaElegido} actualizar={actualizar} onCerrar={() => setEspera(false)} onListo={() => { setEspera(false); setToast('Listo, te avisamos por WhatsApp si se libera un turno.'); }} />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Icono nombre="check" size={16} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Datos({ config, estado, prof, servicio, hueco, coberturaInicial, actualizar, onListo, onOcupado }: {
  config: DemoConfig;
  estado: EstadoAgenda;
  prof: Profesional;
  servicio: Servicio;
  hueco: Hueco;
  coberturaInicial: string | null;
  actualizar: ActualizarAgenda;
  onListo: (t: Turno) => void;
  onOcupado: (msg: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [cob, setCob] = useState(coberturaInicial && prof.coberturas?.includes(coberturaInicial) ? coberturaInicial : '');
  const [afiliado, setAfiliado] = useState('');
  const [modalidad, setModalidad] = useState<'presencial' | 'video'>('presencial');
  const [err, setErr] = useState<Record<string, string>>({});
  const conocido = soloDigitos(wa).length >= 8 ? estado.clientes.find((c) => c.whatsapp === soloDigitos(wa)) : undefined;

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (nombre.trim().length < 2) e.nombre = 'Escribí tu nombre y apellido.';
    if (soloDigitos(wa).length < 8) e.wa = 'Escribí tu WhatsApp con código de área (ej.: 11 5555 1234).';
    if (!cob) e.cob = 'Elegí tu cobertura o "Particular".';
    else if (cob !== PARTICULAR && afiliado.trim().length < 3) e.afiliado = 'Escribí tu número de afiliado.';
    setErr(e);
    if (Object.keys(e).length) return;
    let turno: Turno | null = null;
    let ocupado = '';
    const error = actualizar((x) => {
      const r = reservar(x, { servicioId: servicio.id, profId: prof.id, inicio: hueco.inicio, nombre, whatsapp: wa, origen: 'online', cobertura: cob, afiliado: cob === PARTICULAR ? undefined : afiliado, modalidad: servicio.video ? modalidad : undefined });
      if ('error' in r) {
        ocupado = r.error;
        return x;
      }
      turno = r.turno;
      return r.estado;
    });
    if (ocupado) return onOcupado(ocupado);
    if (error) return setErr({ general: error });
    if (turno) onListo(turno);
  }

  return (
    <section aria-labelledby="t-datos" className="bar-anim">
      <h2 id="t-datos" className="bar-h2">Confirmá tu turno</h2>
      <div className="bar-resumen">
        <div className="bar-resumen-fecha">
          <span>{diaCorto(new Date(hueco.inicio))}</span>
          <strong>{new Date(hueco.inicio).getDate()}</strong>
          <span>{fechaCorta(new Date(hueco.inicio)).split(' ')[1]}</span>
        </div>
        <div>
          <strong>{servicio.nombre}</strong>
          <span>{hora(new Date(hueco.inicio))} h · {servicio.duracion} min · {nombreProf(prof)}</span>
          <span>Particular: {formatoPrecio(servicio.precio, config.moneda)}</span>
        </div>
      </div>
      <form onSubmit={enviar} noValidate className="bar-form">
        <label>Nombre y apellido
          <input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={!!err.nombre} />
          {err.nombre && <span className="bar-err">{err.nombre}</span>}
        </label>
        <label>WhatsApp
          <input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" autoComplete="tel" aria-invalid={!!err.wa} />
          {err.wa ? <span className="bar-err">{err.wa}</span> : <span className="bar-ayuda">Te llega la confirmación y un recordatorio que no dice con quién ni para qué es el turno.</span>}
        </label>
        <fieldset className="con-cob">
          <legend>Cobertura</legend>
          <div className="bar-coberturas">
            {prof.coberturas?.map((c) => <button key={c} type="button" aria-pressed={cob === c} onClick={() => setCob(c)}>{c}</button>)}
          </div>
          {err.cob && <span className="bar-err">{err.cob}</span>}
        </fieldset>
        {cob && cob !== PARTICULAR && (
          <label>Número de afiliado
            <input className="c-inp" value={afiliado} onChange={(e) => setAfiliado(e.target.value)} aria-invalid={!!err.afiliado} />
            {err.afiliado && <span className="bar-err">{err.afiliado}</span>}
          </label>
        )}
        {servicio.video && (
          <fieldset className="con-cob">
            <legend>Modalidad</legend>
            <div className="bar-coberturas">
              <button type="button" aria-pressed={modalidad === 'presencial'} onClick={() => setModalidad('presencial')}>En el consultorio</button>
              <button type="button" aria-pressed={modalidad === 'video'} onClick={() => setModalidad('video')}>Por videollamada</button>
            </div>
            {modalidad === 'video' && <span className="bar-ayuda">La videollamada usa un servicio externo; el enlace te llega antes del turno.</span>}
          </fieldset>
        )}
        {conocido && <p className="bar-hola">¡Hola de nuevo, {conocido.nombre.split(' ')[0]}! Ya tenemos tus datos.</p>}
        <p className="bar-ayuda">No pedimos ni guardamos el motivo de la consulta.</p>
        {err.general && <p className="bar-err" role="alert">{err.general}</p>}
        <button type="submit" className="bar-btn prim grande">Reservar turno</button>
      </form>
    </section>
  );
}

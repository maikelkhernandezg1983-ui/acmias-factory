'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio, soloDigitos } from '@/lib/utiles';
import { FOTO_PORTADA_BARB } from '@/lib/rubros/barberia/datos-ejemplo';
import {
  abierto,
  claveDia,
  deClave,
  diaCorto,
  fechaCorta,
  hora,
  huecos,
  inicioDia,
  nombreDia,
  profesionalesPara,
  proximoConLugar,
  sumarDias,
  type Hueco,
} from '@/lib/rubros/barberia/agenda';
import { mensajeAlLocal, mensajeConfirmacion, montoSena, reservar } from '@/lib/rubros/barberia/logica';
import type { EstadoAgenda, Servicio, Turno } from '@/lib/rubros/barberia/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { useAhora, useDemoBarberia, type ActualizarAgenda } from './useBarberia';

const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

export function Reserva({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoBarberia(slug);
  const ahora = useAhora();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [profId, setProfId] = useState<string | null>(null);
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

  const servicio = estado?.servicios.find((s) => s.id === servicioId) ?? null;
  const dias = useMemo(() => Array.from({ length: 14 }, (_, i) => sumarDias(inicioDia(ahora), i)), [ahora]);
  const diaElegido = useMemo(() => {
    if (!estado || !servicio) return null;
    if (dia) return deClave(dia);
    return proximoConLugar(estado, servicio, profId, new Date(ahora), ahora) ?? dias.find((d) => abierto(estado.horario, d)) ?? dias[0];
  }, [estado, servicio, dia, profId, ahora, dias]);
  const libres = useMemo(() => (estado && servicio && diaElegido ? huecos(estado, servicio, profId, diaElegido, ahora) : []), [estado, servicio, profId, diaElegido, ahora]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const p = (v: number) => formatoPrecio(v, config.moneda);

  function ir(n: 1 | 2 | 3) {
    setPaso(n);
    requestAnimationFrame(() => arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  if (hecho) return <Listo config={config} estado={estado} turno={hecho} slug={slug} estilo={estilo} otra={() => { setHecho(null); setHueco(null); setDia(null); setServicioId(null); setProfId(null); ir(1); }} />;

  const profs = servicio ? profesionalesPara(estado, servicio.id) : [];
  const manana = libres.filter((h) => new Date(h.inicio).getHours() < 13);
  const tarde = libres.filter((h) => new Date(h.inicio).getHours() >= 13);
  const proximo = servicio && diaElegido && !libres.length ? proximoConLugar(estado, servicio, profId, sumarDias(diaElegido, 1), ahora) : null;

  return (
    <div className="bar" style={estilo}>
      <AvisoDemo texto="Servicios, profesionales y turnos de ejemplo" />
      <header className="bar-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bar-hero-foto" src={FOTO_PORTADA_BARB} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="bar-hero-in">
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" className="bar-logo" />
          ) : (
            <span className="bar-logo bar-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          )}
          <h1>{config.negocio}</h1>
          <p>Reservá tu turno en tres pasos, sin crear cuenta.</p>
          <Horarios estado={estado} />
        </div>
      </header>

      <div ref={arriba} className="bar-pasos" aria-label="Pasos de la reserva">
        {['Servicio', 'Día y hora', 'Tus datos'].map((t, i) => (
          <button key={t} type="button" className="bar-paso" aria-current={paso === i + 1 ? 'step' : undefined} data-hecho={paso > i + 1 ? '1' : undefined} disabled={i + 1 > paso} onClick={() => ir((i + 1) as 1 | 2 | 3)}>
            <span className="bar-paso-n">{paso > i + 1 ? <Icono nombre="check" size={14} /> : i + 1}</span>
            {t}
          </button>
        ))}
      </div>

      <main className="bar-main">
        {paso === 1 && (
          <section aria-labelledby="t-serv" className="bar-anim">
            <h2 id="t-serv" className="bar-h2">¿Qué te hacés?</h2>
            <ul className="bar-servicios">
              {estado.servicios.map((s, i) => (
                <li key={s.id} style={{ '--i': i } as React.CSSProperties}>
                  <button type="button" className="bar-serv" aria-pressed={s.id === servicioId} aria-label={`${s.nombre}, ${s.duracion} minutos, ${p(s.precio)}${s.sena ? `, con seña del ${s.sena}%` : ''}`} onClick={() => { setServicioId(s.id); setProfId(null); setDia(null); setHueco(null); ir(2); }}>
                    <span className="bar-serv-dur"><strong>{s.duracion}</strong>min</span>
                    <span className="bar-serv-txt">
                      <span className="bar-serv-nom">{s.nombre}</span>
                      <span className="bar-serv-desc">{s.descripcion}</span>
                      {s.sena ? <span className="bar-sena">Seña {s.sena}% · {p(montoSena(s))}</span> : null}
                    </span>
                    <span className="bar-serv-precio">{p(s.precio)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {paso === 2 && servicio && diaElegido && (
          <section aria-labelledby="t-hora" className="bar-anim">
            <h2 id="t-hora" className="bar-h2">{servicio.nombre} <span>{servicio.duracion} min · {p(servicio.precio)}</span></h2>
            <h3 className="bar-h3">¿Con quién?</h3>
            <div className="bar-profs" role="group" aria-label="Profesional">
              <button type="button" className="bar-prof" aria-pressed={profId === null} onClick={() => { setProfId(null); setHueco(null); }}>
                <span className="bar-avatar cual" aria-hidden="true"><Icono nombre="chispa" size={18} /></span>
                <span><strong>El primero libre</strong><small>Más horarios</small></span>
              </button>
              {profs.map((pr) => (
                <button key={pr.id} type="button" className="bar-prof" aria-pressed={profId === pr.id} onClick={() => { setProfId(pr.id); setHueco(null); }}>
                  <span className="bar-avatar" aria-hidden="true">{iniciales(pr.nombre)}</span>
                  <span><strong>{pr.nombre.split(' ')[0]}</strong><small>{pr.especialidad}</small></span>
                </button>
              ))}
            </div>

            <h3 className="bar-h3">¿Qué día?</h3>
            <div className="bar-dias" role="group" aria-label="Día">
              {dias.map((d) => {
                const cerrado = !abierto(estado.horario, d);
                const n = cerrado ? 0 : huecos(estado, servicio, profId, d, ahora).length;
                const sel = claveDia(d) === claveDia(diaElegido);
                return (
                  <button key={claveDia(d)} type="button" className="bar-dia" aria-pressed={sel} disabled={cerrado} onClick={() => { setDia(claveDia(d)); setHueco(null); }} aria-label={`${nombreDia(d, new Date(ahora))}${cerrado ? ', cerrado' : n ? `, ${n} horarios` : ', sin lugar'}`}>
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
                <p><strong>No quedan horarios este día{profId ? ` con ${estado.profesionales.find((x) => x.id === profId)?.nombre.split(' ')[0]}` : ''}.</strong> Anotate y te avisamos por WhatsApp si alguien cancela.</p>
                <div className="bar-acciones">
                  <button type="button" className="bar-btn prim" onClick={() => setEspera(true)}>Anotarme en la lista de espera</button>
                  {proximo && <button type="button" className="bar-btn" onClick={() => setDia(claveDia(proximo))}>Ver el {nombreDia(proximo, new Date(ahora))}</button>}
                </div>
              </div>
            ) : (
              <>
                {[['Mañana', manana], ['Tarde', tarde]].map(([t, l]) =>
                  (l as Hueco[]).length ? (
                    <div key={t as string} className="bar-franja">
                      <span className="bar-franja-t">{t as string}</span>
                      <div className="bar-horas" role="group" aria-label={`Horarios de la ${(t as string).toLowerCase()}`}>
                        {(l as Hueco[]).map((h) => (
                          <button key={h.inicio} type="button" className="bar-hora" aria-pressed={hueco?.inicio === h.inicio} onClick={() => { setHueco(h); ir(3); }}>{hora(new Date(h.inicio))}</button>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
                <button type="button" className="bar-link" onClick={() => setEspera(true)}>¿No te sirve ningún horario? Anotate en la lista de espera</button>
              </>
            )}
          </section>
        )}

        {paso === 3 && servicio && hueco && (
          <Datos
            config={config}
            estado={estado}
            servicio={servicio}
            hueco={hueco}
            actualizar={actualizar}
            onListo={(t) => setHecho(t)}
            onOcupado={(msg) => { setToast(msg); setHueco(null); ir(2); }}
          />
        )}
        <p className="c-pie">{config.direccion ? `${config.direccion}. ` : ''}Hecho con ACMIAS.</p>
      </main>

      {espera && servicio && diaElegido && (
        <ListaEspera
          estado={estado}
          servicio={servicio}
          profId={profId}
          dia={diaElegido}
          actualizar={actualizar}
          onCerrar={() => setEspera(false)}
          onListo={() => { setEspera(false); setToast('Listo, te avisamos por WhatsApp si se libera un turno.'); }}
        />
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

export function Horarios({ estado }: { estado: EstadoAgenda }) {
  const dias = [1, 2, 3, 4, 5, 6, 0].filter((d) => estado.horario[d]);
  if (!dias.length) return null;
  const h = estado.horario[dias[0]]!;
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const fmt = (m: number) => `${Math.floor(m / 60)}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''}`;
  return (
    <p className="bar-horario">
      <Icono nombre="reloj" size={16} /> {DIAS[dias[0]]} a {DIAS[dias[dias.length - 1]]} · {fmt(h[0])} a {fmt(h[1])} h{estado.pausa ? ` (cerrado de ${fmt(estado.pausa[0])} a ${fmt(estado.pausa[1])})` : ''}
    </p>
  );
}

function Datos({ config, estado, servicio, hueco, actualizar, onListo, onOcupado }: {
  config: DemoConfig;
  estado: EstadoAgenda;
  servicio: Servicio;
  hueco: Hueco;
  actualizar: ActualizarAgenda;
  onListo: (t: Turno) => void;
  onOcupado: (msg: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const prof = estado.profesionales.find((x) => x.id === hueco.profId)!;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const conocido = soloDigitos(wa).length >= 8 ? estado.clientes.find((c) => c.whatsapp === soloDigitos(wa)) : undefined;

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (nombre.trim().length < 2) e.nombre = 'Escribí tu nombre.';
    if (soloDigitos(wa).length < 8) e.wa = 'Escribí tu WhatsApp con código de área (ej.: 11 5555 1234).';
    setErr(e);
    if (Object.keys(e).length) return;
    let turno: Turno | null = null;
    let ocupado = '';
    const error = actualizar((x) => {
      const r = reservar(x, { servicioId: servicio.id, profId: hueco.profId, inicio: hueco.inicio, nombre, whatsapp: wa, origen: 'online' });
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
          <span>{hora(new Date(hueco.inicio))} h · {servicio.duracion} min · con {prof.nombre}</span>
          <span>{p(servicio.precio)}</span>
        </div>
      </div>
      {servicio.sena ? (
        <p className="bar-nota-sena"><Icono nombre="info" size={18} /> Este servicio lleva una seña del {servicio.sena}% ({p(montoSena(servicio))}) para reservar el lugar. En la demo no se cobra nada.</p>
      ) : null}
      <form onSubmit={enviar} noValidate className="bar-form">
        <label>Tu nombre
          <input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={!!err.nombre} aria-describedby={err.nombre ? 'e-nom' : undefined} />
          {err.nombre && <span id="e-nom" className="bar-err">{err.nombre}</span>}
        </label>
        <label>Tu WhatsApp
          <input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" autoComplete="tel" aria-invalid={!!err.wa} aria-describedby={err.wa ? 'e-wa' : 'a-wa'} />
          {err.wa ? <span id="e-wa" className="bar-err">{err.wa}</span> : <span id="a-wa" className="bar-ayuda">Ahí te llega la confirmación y el recordatorio. Sin cuenta ni contraseña.</span>}
        </label>
        {conocido && <p className="bar-hola">¡Hola de nuevo, {conocido.nombre.split(' ')[0]}! Llevás {conocido.sellos} de {estado.metaSellos} sellos.</p>}
        {err.general && <p className="bar-err" role="alert">{err.general}</p>}
        <button type="submit" className="bar-btn prim grande">Reservar turno</button>
      </form>
    </section>
  );
}

export function Listo({ config, estado, turno, slug, estilo, otra }: { config: DemoConfig; estado: EstadoAgenda; turno: Turno; slug: string; estilo?: React.CSSProperties; otra: () => void }) {
  const c = estado.clientes.find((x) => x.id === turno.clienteId)!;
  const s = estado.servicios.find((x) => x.id === turno.servicioId)!;
  const pr = estado.profesionales.find((x) => x.id === turno.profId)!;
  const enlace = typeof window !== 'undefined' ? `${window.location.origin}/d/${slug}/turno/${turno.token}` : '';
  const ctx = { negocio: config.negocio, moneda: config.moneda, direccion: config.direccion, enlaceTurno: enlace };
  return (
    <div className="bar" style={estilo}>
      <AvisoDemo texto={estado.rubro === 'consultorio' ? 'Demo con datos ficticios' : 'Servicios, profesionales y turnos de ejemplo'} />
      <main className="bar-main bar-listo">
        <div className="bar-sello" aria-hidden="true"><Icono nombre="check" size={40} /></div>
        <h1>¡Turno reservado!</h1>
        <p className="bar-listo-sub">{s.nombre} con {pr.titulo ? `${pr.titulo} ` : ''}{pr.nombre}, {nombreDia(turno.inicio)} a las {hora(turno.inicio)} h{turno.modalidad === 'video' ? ', por videollamada' : ''}.</p>
        <figure className="bar-wa">
          <figcaption>Te llega este WhatsApp <small>(en la demo lo mostramos acá)</small></figcaption>
          <div className="bar-burbuja">{mensajeConfirmacion(estado, turno, c, ctx)}</div>
          {estado.rubro === 'consultorio' && <p className="bar-discreto"><Icono nombre="candado" size={14} /> El mensaje no dice con quién ni para qué es el turno.</p>}
        </figure>
        <div className="bar-acciones col">
          <Link className="bar-btn prim grande" href={`/d/${slug}/turno/${turno.token}`}><Icono nombre="calendario" size={18} /> Ver, cambiar o cancelar</Link>
          <a className="bar-btn" href={enlaceWhatsApp(config.whatsapp, mensajeAlLocal(estado, turno, c, ctx))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Avisar al local</a>
          <button type="button" className="bar-link" onClick={otra}>Reservar otro turno</button>
        </div>
      </main>
    </div>
  );
}

export function ListaEspera({ estado, servicio, profId, dia, actualizar, onCerrar, onListo }: {
  estado: EstadoAgenda;
  servicio: Servicio;
  profId: string | null;
  dia: Date;
  actualizar: ActualizarAgenda;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [err, setErr] = useState('');
  const prof = profId ? estado.profesionales.find((x) => x.id === profId) : null;
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-esp" ref={ref}>
        <div className="hoja-cab">
          <h3 id="t-esp">Lista de espera</h3>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <p style={{ marginTop: 0, color: '#55555f' }}>{servicio.nombre}{prof ? ` con ${prof.nombre.split(' ')[0]}` : ''}, {nombreDia(dia)}. Si alguien cancela, te avisamos por WhatsApp.</p>
        <form
          className="bar-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim().length < 2 || soloDigitos(wa).length < 8) return setErr('Completá tu nombre y tu WhatsApp con código de área.');
            const error = actualizar((x) => ({
              ...x,
              espera: [...x.espera, { id: `e-${Math.random().toString(36).slice(2, 8)}`, nombre: nombre.trim(), whatsapp: soloDigitos(wa), servicioId: servicio.id, profId, dia: claveDia(dia), creado: new Date().toISOString() }],
            }));
            if (error) return setErr(error);
            onListo();
          }}
        >
          <label>Tu nombre<input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" /></label>
          <label>Tu WhatsApp<input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
          {err && <p className="bar-err" role="alert">{err}</p>}
          <button type="submit" className="bar-btn prim grande">Anotarme</button>
        </form>
      </div>
    </div>
  );
}

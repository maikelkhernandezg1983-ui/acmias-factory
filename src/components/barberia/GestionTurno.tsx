'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { formatoPrecio } from '@/lib/utiles';
import { NOMBRE_ESTADO, abierto, claveDia, deClave, diaCorto, hora, huecos, inicioDia, nombreDia, sumarDias } from '@/lib/rubros/barberia/agenda';
import { cambiarEstado, reprogramar } from '@/lib/rubros/barberia/logica';
import type { EnEspera } from '@/lib/rubros/barberia/tipos';
import { useAhora, useDemoBarberia } from './useBarberia';

/** Enlace del WhatsApp de confirmación: confirmar, reprogramar o cancelar sin llamar (BAR-05, BAR-06, BAR-07). */
export function GestionTurno({ slug, token }: { slug: string; token: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoBarberia(slug);
  const ahora = useAhora();
  const [modo, setModo] = useState<'ver' | 'mover' | 'cancelar'>('ver');
  const [dia, setDia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; avisados?: EnEspera[] } | null>(null);
  const turno = estado?.turnos.find((t) => t.token === token);
  const servicio = turno && estado?.servicios.find((s) => s.id === turno.servicioId);
  const dias = useMemo(() => Array.from({ length: 14 }, (_, i) => sumarDias(inicioDia(ahora), i)), [ahora]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  if (!turno || !servicio) {
    return (
      <div className="bar" style={estilo}>
        <AvisoDemo texto="Turnos de ejemplo" />
        <main className="bar-main bar-listo">
          <h1>No encontramos este turno</h1>
          <p className="bar-listo-sub">Puede que el enlace esté incompleto. Podés reservar uno nuevo.</p>
          <Link className="bar-btn prim grande" href={`/d/${slug}`}>Reservar un turno</Link>
        </main>
      </div>
    );
  }
  const prof = estado.profesionales.find((p) => p.id === turno.profId)!;
  const cliente = estado.clientes.find((c) => c.id === turno.clienteId);
  const pasado = +new Date(turno.inicio) <= ahora;
  const cerrado = turno.estado === 'cancelado' || turno.estado === 'atendido' || turno.estado === 'ausente' || pasado;
  const diaMover = dia ? deClave(dia) : dias.find((d) => huecos(estado, servicio, turno.profId, d, ahora, turno.id).length) ?? dias[0];
  const libres = huecos(estado, servicio, turno.profId, diaMover, ahora, turno.id);

  return (
    <div className="bar" style={estilo}>
      <AvisoDemo texto="Turnos de ejemplo" />
      <header className="bar-mini">
        {config.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.logo} alt="" className="bar-logo chico" />
        ) : (
          <span className="bar-logo bar-inicial chico" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
        )}
        <strong>{config.negocio}</strong>
      </header>
      <main className="bar-main">
        <h1 className="bar-h2">{cliente ? `${cliente.nombre.split(' ')[0]}, este es tu turno` : 'Tu turno'}</h1>
        <div className={`bar-resumen est-${turno.estado}`}>
          <div className="bar-resumen-fecha">
            <span>{diaCorto(new Date(turno.inicio))}</span>
            <strong>{new Date(turno.inicio).getDate()}</strong>
            <span>{hora(turno.inicio)}</span>
          </div>
          <div>
            <strong>{servicio.nombre}</strong>
            <span>{nombreDia(turno.inicio, new Date(ahora))} a las {hora(turno.inicio)} h · con {prof.nombre}</span>
            <span>{formatoPrecio(servicio.precio, config.moneda)}</span>
            <span className={`bar-estado est-${turno.estado}`}>{NOMBRE_ESTADO[turno.estado]}</span>
          </div>
        </div>

        {aviso && (
          <div className="bar-ok" role="status">
            <Icono nombre="check" size={18} />
            <div>
              <strong>{aviso.texto}</strong>
              {aviso.avisados?.length ? <span>Avisamos a {aviso.avisados.length === 1 ? `${aviso.avisados[0].nombre.split(' ')[0]}, que estaba` : `${aviso.avisados.length} personas que estaban`} en la lista de espera.</span> : null}
            </div>
          </div>
        )}

        {!cerrado && modo === 'ver' && (
          <div className="bar-acciones col">
            {turno.estado === 'reservado' && (
              <button type="button" className="bar-btn prim grande" onClick={() => {
                const err = actualizar((e) => cambiarEstado(e, turno.id, 'confirmado').estado);
                setAviso({ texto: err ?? '¡Gracias! Confirmaste tu turno.' });
              }}><Icono nombre="check" size={18} /> Confirmo que voy</button>
            )}
            <button type="button" className="bar-btn" onClick={() => { setModo('mover'); setAviso(null); }}><Icono nombre="calendario" size={18} /> Cambiar día u hora</button>
            <button type="button" className="bar-btn peligro" onClick={() => { setModo('cancelar'); setAviso(null); }}>Cancelar turno</button>
          </div>
        )}

        {!cerrado && modo === 'cancelar' && (
          <div className="bar-confirmar">
            <p><strong>¿Cancelás tu turno?</strong> El horario queda libre para otra persona.</p>
            <div className="bar-acciones">
              <button type="button" className="bar-btn peligro" onClick={() => {
                let avisados: EnEspera[] = [];
                const err = actualizar((e) => {
                  const r = cambiarEstado(e, turno.id, 'cancelado');
                  avisados = r.avisados;
                  return r.estado;
                });
                setModo('ver');
                setAviso({ texto: err ?? 'Cancelaste tu turno. El horario quedó libre.', avisados });
              }}>Sí, cancelar</button>
              <button type="button" className="bar-btn" onClick={() => setModo('ver')}>No, lo mantengo</button>
            </div>
          </div>
        )}

        {!cerrado && modo === 'mover' && (
          <section aria-labelledby="t-mov">
            <h2 id="t-mov" className="bar-h3">Elegí otro horario con {prof.nombre.split(' ')[0]}</h2>
            <div className="bar-dias" role="group" aria-label="Día">
              {dias.map((d) => {
                const sin = !abierto(estado.horario, d);
                return (
                  <button key={claveDia(d)} type="button" className="bar-dia" disabled={sin} aria-pressed={claveDia(d) === claveDia(diaMover)} onClick={() => setDia(claveDia(d))}>
                    <span className="bar-dia-s">{diaCorto(d)}</span>
                    <strong>{d.getDate()}</strong>
                  </button>
                );
              })}
            </div>
            {libres.length ? (
              <div className="bar-horas" role="group" aria-label="Horarios">
                {libres.map((h) => (
                  <button key={h.inicio} type="button" className="bar-hora" onClick={() => {
                    let avisados: EnEspera[] = [];
                    let fallo = '';
                    const err = actualizar((e) => {
                      const r = reprogramar(e, turno.id, h.inicio, turno.profId);
                      if ('error' in r) {
                        fallo = r.error;
                        return e;
                      }
                      avisados = r.avisados;
                      return r.estado;
                    });
                    setModo('ver');
                    setAviso({ texto: fallo || err || `Listo, tu turno pasó al ${nombreDia(new Date(h.inicio), new Date(ahora))} a las ${hora(new Date(h.inicio))} h.`, avisados });
                  }}>{hora(new Date(h.inicio))}</button>
                ))}
              </div>
            ) : (
              <p className="bar-sinlugar">Ese día no hay lugar. Probá con otro.</p>
            )}
            <button type="button" className="bar-link" onClick={() => setModo('ver')}>Volver</button>
          </section>
        )}

        {cerrado && (
          <div className="bar-acciones col">
            <Link className="bar-btn prim grande" href={`/d/${slug}`}>Reservar otro turno</Link>
          </div>
        )}
        <p className="c-pie">{config.direccion ? `${config.direccion}. ` : ''}Hecho con ACMIAS.</p>
      </main>
    </div>
  );
}

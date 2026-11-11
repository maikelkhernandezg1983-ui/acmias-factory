'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { nombreMes } from '@/lib/rubros/contador/periodos';
import { comunicadosDe, cuentaFamilia, cursoDe, diaLargo, diaLocal, dinero, faltasDe, hijosDe, justificar, marcarLeido, primerNombre, responder } from '@/lib/rubros/colegio/logica';
import type { EstadoColegio, Familia } from '@/lib/rubros/colegio/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { EstadoPagoChip } from './PanelColegio';
import { useDemoColegio, type ActualizarColegio } from './useColegio';

/** Portal de familias: hijos, comunicados con lectura, autorizaciones, faltas y cuotas. */
export function PortalFamilias({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo, ahora } = useDemoColegio(slug);
  const [codigo, setCodigo] = useState('');
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState('');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const f = id ? estado.familias.find((x) => x.id === id) : undefined;

  if (!f) {
    const conDosHijos = estado.familias.filter((x) => x.ejemplo && hijosDe(estado, x.id).length > 1);
    const conSalida = conDosHijos.find((x) => hijosDe(estado, x.id).some((a) => ['cur-7', 'cur-8'].includes(a.cursoId)));
    const ejemplos = [conSalida, ...conDosHijos.filter((x) => x !== conSalida).slice(0, 2)].filter((x): x is Familia => !!x);
    return (
      <div className="ct-portal" style={estilo}>
        <AvisoDemo texto="Familias ficticias" />
        <div className="ct-portal-in">
          <header className="ct-portal-cab">
            <span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
            <div><strong>{config.negocio}</strong><span>Portal de familias</span></div>
          </header>
          <form className="d-card" onSubmit={(e) => {
            e.preventDefault();
            const t = codigo.trim().toUpperCase();
            const dig = soloDigitos(codigo);
            const x = estado.familias.find((y) => y.codigo === t || (dig.length >= 8 && y.whatsapp.endsWith(dig.slice(-8))));
            if (!x || !hijosDe(estado, x.id).length) return setError('No encontramos ese código. Lo tenés en el mensaje de bienvenida del colegio.');
            setError('');
            setId(x.id);
          }}>
            <h1 className="ct-portal-tit">Todo lo del colegio, en un lugar</h1>
            <p className="sub">Comunicados, autorizaciones, faltas y cuotas de tus hijos.</p>
            <label htmlFor="co-codigo" style={{ fontWeight: 700 }}>Código de familia o WhatsApp</label>
            <input id="co-codigo" className="c-inp" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="F1234" autoComplete="off" />
            {error && <p className="bar-err" role="alert">{error}</p>}
            <button type="submit" className="d-btn prim" style={{ marginTop: 10 }}>Entrar</button>
            <p className="sub" style={{ marginTop: 10 }}>En la versión real entrás con un código que te llega por WhatsApp.</p>
          </form>
          <div className="d-card">
            <h2 style={{ fontSize: 16 }}>Probar con una familia de ejemplo</h2>
            <div className="ag-profs" role="group" aria-label="Familias de ejemplo" style={{ flexWrap: 'wrap' }}>
              {ejemplos.map((x) => <button key={x.id} type="button" onClick={() => setId(x.id)}>{x.responsable}</button>)}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <VistaFamilia config={config} estado={estado} actualizar={actualizar} f={f} ahora={ahora} estilo={estilo} slug={slug} onSalir={() => setId(null)} />;
}

function VistaFamilia({ config, estado, actualizar, f, ahora, estilo, slug, onSalir }: { config: DemoConfig; estado: EstadoColegio; actualizar: ActualizarColegio; f: Familia; ahora: number; estilo?: React.CSSProperties; slug: string; onSalir: () => void }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [justif, setJustif] = useState<{ alumnoId: string; dia: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [aviso, setAviso] = useState('');
  const hijos = hijosDe(estado, f.id);
  const hoy = diaLocal(ahora);
  const comunicados = comunicadosDe(estado, f.id);
  const sinLeer = comunicados.filter((c) => !c.leidos[f.id]).length;
  const autorizaciones = estado.autorizaciones.filter((a) => a.dia >= hoy && hijos.some((h) => a.cursoIds.includes(h.cursoId)));
  const pendientesAut = autorizaciones.reduce((t, a) => t + hijos.filter((h) => a.cursoIds.includes(h.cursoId) && !a.respuestas[h.id]).length, 0);
  const cuenta = cuentaFamilia(estado, f.id, ahora);
  const textoPago = `Hola ${config.negocio}, soy ${f.responsable} (familia de ${hijos.map((h) => h.nombre).join(' y ')}). Ya pagué ${cuenta.pendientes.map((q) => nombreMes(q.periodo)).join(', ')}: ${dinero(cuenta.total, config.moneda)}. Te paso el comprobante.`;
  return (
    <div className="ct-portal" style={estilo}>
      <AvisoDemo texto="Familias ficticias" />
      <div className="ct-portal-in">
        <header className="ct-portal-cab">
          <span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          <div><strong>{config.negocio}</strong><span>Hola, {primerNombre(f.responsable)}</span></div>
          <button type="button" className="d-btn" onClick={onSalir}>Salir</button>
        </header>
        <div className="co-hijos">
          {hijos.map((h) => <div key={h.id}><strong>{h.nombre}</strong><span>{cursoDe(estado, h.cursoId)?.nombre} · {cursoDe(estado, h.cursoId)?.docente}</span></div>)}
        </div>
        {(sinLeer > 0 || pendientesAut > 0) && <p className="co-pendiente" role="status">Tenés {[sinLeer ? `${sinLeer} ${sinLeer === 1 ? 'comunicado sin leer' : 'comunicados sin leer'}` : '', pendientesAut ? `${pendientesAut} ${pendientesAut === 1 ? 'autorización' : 'autorizaciones'} para responder` : ''].filter(Boolean).join(' y ')}.</p>}
        {aviso && <p className="ct-listo" role="status">{aviso}</p>}

        {autorizaciones.length > 0 && (
          <section className="d-card" aria-labelledby="co-t-aut">
            <h2 id="co-t-aut" className="ho-h2">Autorizaciones</h2>
            <ul className="co-aut">
              {autorizaciones.flatMap((a) => hijos.filter((h) => a.cursoIds.includes(h.cursoId)).map((h) => {
                const r = a.respuestas[h.id];
                return (
                  <li key={`${a.id}-${h.id}`}>
                    <strong>{a.titulo} · {h.nombre}</strong>
                    <span>{diaLargo(a.dia)}. {a.detalle}</span>
                    <div className="co-sino" role="group" aria-label={`${a.titulo} de ${h.nombre}`}>
                      <button type="button" aria-pressed={r?.valor === 'si'} onClick={() => { actualizar((e) => responder(e, a.id, h.id, 'si')); setAviso(`Listo: autorizaste a ${h.nombre}.`); }}>Autorizo</button>
                      <button type="button" aria-pressed={r?.valor === 'no'} onClick={() => { actualizar((e) => responder(e, a.id, h.id, 'no')); setAviso(`Listo: avisaste que ${h.nombre} no va.`); }}>No autorizo</button>
                    </div>
                  </li>
                );
              }))}
            </ul>
          </section>
        )}

        <section className="d-card" aria-labelledby="co-t-com">
          <h2 id="co-t-com" className="ho-h2">Comunicados</h2>
          <ul className="co-coms">
            {comunicados.map((c) => {
              const leido = !!c.leidos[f.id];
              return (
                <li key={c.id} className={leido ? undefined : 'nuevo'}>
                  <button type="button" aria-expanded={abierto === c.id} onClick={() => { setAbierto(abierto === c.id ? null : c.id); if (!leido) actualizar((e) => marcarLeido(e, c.id, f.id)); }}>
                    <span><strong>{c.titulo}</strong><small>{new Date(c.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}{leido ? ' · Leído' : ' · Sin leer'}</small></span>
                    <Icono nombre={abierto === c.id ? 'menos' : 'mas'} size={18} />
                  </button>
                  {abierto === c.id && <p>{c.texto}</p>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="d-card" aria-labelledby="co-t-fal">
          <h2 id="co-t-fal" className="ho-h2">Faltas</h2>
          {hijos.map((h) => {
            const faltas = faltasDe(estado, h.id);
            return (
              <div key={h.id} className="co-faltas">
                <strong>{h.nombre}: {faltas.length === 0 ? 'sin faltas en las últimas semanas' : faltas.length === 1 ? '1 falta' : `${faltas.length} faltas`}</strong>
                <ul>
                  {faltas.slice(0, 5).map((x) => (
                    <li key={x.dia}>
                      <span>{diaLargo(x.dia)}{x.justificada ? ` · justificada: ${x.justificada.motivo}` : ''}</span>
                      {!x.justificada && <button type="button" className="d-btn" onClick={() => { setJustif({ alumnoId: h.id, dia: x.dia }); setMotivo(''); }}>Justificar</button>}
                      {justif?.alumnoId === h.id && justif.dia === x.dia && (
                        <form className="co-justif" onSubmit={(e) => {
                          e.preventDefault();
                          let fallo = '';
                          actualizar((s) => { const r = justificar(s, h.id, x.dia, motivo); if ('error' in r) { fallo = r.error; return s; } return r; });
                          if (fallo) return setAviso(fallo);
                          setJustif(null);
                          setAviso(`Listo: justificaste la falta de ${h.nombre}.`);
                        }}>
                          <label className="sr-only" htmlFor="co-motivo">Motivo</label>
                          <input id="co-motivo" className="c-inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: turno médico" />
                          <button type="submit" className="d-btn prim">Enviar</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="d-card ct-saldo" aria-labelledby="co-t-cuota">
          <h2 id="co-t-cuota" className="ct-portal-tit">{cuenta.total ? 'Cuotas a pagar' : 'Cuotas al día'}</h2>
          <strong className="ct-monto">{dinero(cuenta.total, config.moneda)}</strong>
          <EstadoPagoChip estado={cuenta.estado} />
          {cuenta.total > 0 && (cuenta.informada
            ? <p className="ct-listo">Avisaste que pagaste. El colegio lo confirma cuando ve la transferencia.</p>
            : <>
              <p className="sub" style={{ margin: '10px 0 6px' }}>{cuenta.pendientes.map((q) => nombreMes(q.periodo, false)).join(', ')} · alias <strong>{estado.ajustes.alias}</strong></p>
              <a className="d-btn prim" href={enlaceWhatsApp(config.whatsapp, textoPago)} target="_blank" rel="noopener noreferrer" onClick={() => {
                const fecha = new Date().toISOString();
                actualizar((e) => ({ ...e, cuotas: e.cuotas.map((q) => (q.familiaId === f.id && q.estado === 'pendiente' ? { ...q, informada: fecha } : q)) }));
              }}><Icono nombre="whatsapp" size={18} /> Ya pagué: avisar al colegio</a>
            </>)}
        </section>
        <p className="sub" style={{ textAlign: 'center' }}><Link href={`/d/${slug}/sitio`}>Conocé el colegio</Link></p>
      </div>
    </div>
  );
}

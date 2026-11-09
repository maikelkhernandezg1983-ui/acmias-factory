'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { abierto, claveDia, deClave, diaCorto, hora, inicioDia, nombreDia, sumarDias } from '@/lib/rubros/barberia/agenda';
import { NOMBRE_OPERACION, NOMBRE_TIPO, agendarVisita, costoIngreso, dinero, filtrar, horariosVisita, mensajeInmobiliaria, nuevoId, precioProp, registrarConsulta, resumen, sufijo, type Filtros } from '@/lib/rubros/inmobiliaria/logica';
import type { Captacion, Consulta, EstadoInmo, Operacion, Propiedad, TipoPropiedad } from '@/lib/rubros/inmobiliaria/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { PropiedadArte } from './PropiedadArte';
import { useAhoraInmo, useDemoInmo, type ActualizarInmo } from './useInmo';

const OPERACIONES: { id: Operacion; nombre: string }[] = [
  { id: 'alquiler', nombre: 'Alquilar' },
  { id: 'venta', nombre: 'Comprar' },
  { id: 'temporario', nombre: 'Temporario' },
];
const TIPOS: TipoPropiedad[] = ['departamento', 'casa', 'ph', 'local', 'oficina', 'terreno', 'galpon', 'cochera'];
const PLURAL: Record<TipoPropiedad, string> = { departamento: 'Departamentos', casa: 'Casas', ph: 'PH', local: 'Locales', oficina: 'Oficinas', terreno: 'Terrenos', galpon: 'Galpones', cochera: 'Cocheras' };

/** Catálogo de propiedades para el cliente final, con visita, costos y consulta por WhatsApp. */
export function CatalogoInmo({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoInmo(slug);
  const [f, setF] = useState<Filtros>({ q: '', operacion: 'alquiler', tipo: null, ambientes: null, zona: null });
  const q = useDeferredValue(f.q);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [captar, setCaptar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const lista = useMemo(() => (estado ? filtrar(estado.propiedades, { ...f, q }) : []), [estado, f, q]);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const activas = estado.propiedades.filter((p) => p.estado !== 'cerrada');
  const hayTipo = (t: TipoPropiedad) => activas.some((p) => p.operacion === f.operacion && p.tipo === t);
  const prop = abierta ? estado.propiedades.find((p) => p.id === abierta) ?? null : null;

  return (
    <div className="in" style={estilo}>
      <AvisoDemo texto="Propiedades, zonas y precios de ejemplo" />
      <header className="in-hero">
        <div className="in-hero-in">
          <div className="au-marca">
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt="" className="au-logo" />
            ) : (
              <span className="au-logo au-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
            )}
            <div>
              <strong>{config.negocio}</strong>
              <span>{activas.length} propiedades en venta, alquiler y temporario</span>
            </div>
          </div>
          <div className="in-hero-grid">
            <div className="in-hero-txt">
              <h1>Encontrá dónde vivir, trabajar o invertir.</h1>
              <div className="in-ops" role="group" aria-label="Operación">
                {OPERACIONES.map((o) => (
                  <button key={o.id} type="button" aria-pressed={f.operacion === o.id} onClick={() => setF((x) => ({ ...x, operacion: o.id, tipo: null }))}>{o.nombre}</button>
                ))}
              </div>
              <label className="au-buscar">
                <Icono nombre="buscar" size={20} />
                <input type="search" aria-label="Buscar propiedades" placeholder="Probá: 2 ambientes con balcón, acepta mascotas, P-1014" value={f.q} onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))} />
                {f.q && <button type="button" className="au-limpiar" aria-label="Borrar búsqueda" onClick={() => setF((x) => ({ ...x, q: '' }))}><Icono nombre="cerrar" size={18} /></button>}
              </label>
            </div>
            <div className="in-ciudad" aria-hidden="true">
              <span className="in-sol" />
              <PropiedadArte tipo="casa" color="#F2E6B8" className="in-c1" />
              <PropiedadArte tipo="departamento" color="#C9DBE8" className="in-c2 in-luces" />
              <PropiedadArte tipo="local" color="#EFD3CC" className="in-c3 in-luces" />
            </div>
          </div>
        </div>
      </header>

      <div className="in-filtros">
        <div className="au-chips" role="group" aria-label="Tipo de propiedad">
          <button type="button" aria-pressed={!f.tipo} onClick={() => setF((x) => ({ ...x, tipo: null }))}>Todas</button>
          {TIPOS.filter(hayTipo).map((t) => (
            <button key={t} type="button" aria-pressed={f.tipo === t} onClick={() => setF((x) => ({ ...x, tipo: x.tipo === t ? null : t }))}>{PLURAL[t]}</button>
          ))}
        </div>
        <div className="in-selects">
          <label>Ambientes
            <select className="c-inp" value={f.ambientes ?? ''} onChange={(e) => setF((x) => ({ ...x, ambientes: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">Cualquiera</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? '1 o más' : `${n} o más`}</option>)}
            </select>
          </label>
          <label>Zona
            <select className="c-inp" value={f.zona ?? ''} onChange={(e) => setF((x) => ({ ...x, zona: e.target.value || null }))}>
              <option value="">Todas</option>
              {estado.zonas.map((z) => <option key={z}>{z}</option>)}
            </select>
          </label>
        </div>
      </div>

      <main className="au-main">
        <p className="au-cuantos" role="status">{lista.length === 1 ? '1 propiedad' : `${lista.length} propiedades`} en {NOMBRE_OPERACION[f.operacion].toLowerCase()}{f.q ? ` para "${f.q}"` : ''}</p>
        {lista.length === 0 ? (
          <div className="au-vacio">
            <p><strong>No tenemos eso publicado ahora.</strong> Contanos qué buscás y te avisamos cuando entre.</p>
            <a className="au-btn prim" href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, busco ${NOMBRE_OPERACION[f.operacion].toLowerCase()}: ${f.q || 'una propiedad'}. ¿Me avisan si entra algo así?`)} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Avisarme cuando entre</a>
          </div>
        ) : (
          <ul className="au-grilla">
            {lista.map((p, i) => (
              <li key={p.id} style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                <button type="button" className="au-card in-card" onClick={() => setAbierta(p.id)} aria-label={`${p.titulo} en ${p.zona}, ${precioProp(p, config.moneda)} ${sufijo(p)}, código ${p.codigo}${p.estado === 'reservada' ? ', reservada' : ''}`}>
                  <span className="au-card-escena in-escena" style={{ '--tinte': p.color } as React.CSSProperties}>
                    <span className="au-badges">
                      {p.estado === 'reservada' && <span className="au-badge res">Reservada</span>}
                      {p.antiguedad === 0 && <span className="au-badge cero">A estrenar</span>}
                      {p.aptoCredito && <span className="au-badge">Apto crédito</span>}
                      {p.mascotas && <span className="au-badge">Acepta mascotas</span>}
                    </span>
                    <PropiedadArte tipo={p.tipo} color={p.color} />
                    <span className="in-codigo">{p.codigo}</span>
                  </span>
                  <span className="au-card-txt">
                    <span className="au-card-nom">{p.titulo}</span>
                    <span className="au-card-sub">{p.zona} · {resumen(p)}</span>
                    <span className="au-card-pie">
                      <strong>{precioProp(p, config.moneda)} <small>{sufijo(p)}</small></strong>
                      {p.expensas ? <span>+ {dinero(p.expensas, config.moneda)} expensas</span> : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <section className="in-captar" aria-labelledby="in-t-captar">
          <PropiedadArte tipo="casa" color="#E9D8C4" />
          <div>
            <h2 id="in-t-captar">¿Querés vender o alquilar tu propiedad?</h2>
            <p>Te visitamos, la tasamos sin cargo y la publicamos con fotos y ficha completa.</p>
            <button type="button" className="au-btn prim" onClick={() => setCaptar(true)}>Quiero que la tasen</button>
          </div>
        </section>
        <p className="c-pie">{config.direccion ? `${config.direccion}. ` : ''}Imágenes ilustrativas. Precios sujetos a confirmación. Hecho con ACMIAS.</p>
      </main>

      {prop && <Ficha config={config} estado={estado} p={prop} slug={slug} actualizar={actualizar} onCerrar={() => setAbierta(null)} onListo={(t) => { setAbierta(null); setToast(t); }} />}
      {captar && <Captar config={config} estado={estado} actualizar={actualizar} onCerrar={() => setCaptar(false)} onListo={(t) => { setCaptar(false); setToast(t); }} />}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Icono nombre="check" size={16} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Ficha({ config, estado, p, slug, actualizar, onCerrar, onListo }: {
  config: DemoConfig;
  estado: EstadoInmo;
  p: Propiedad;
  slug: string;
  actualizar: ActualizarInmo;
  onCerrar: () => void;
  onListo: (t: string) => void;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const ahora = useAhoraInmo();
  const [quiereVisita, setQuiereVisita] = useState(false);
  const [requisitos, setRequisitos] = useState(false);
  const dias = useMemo(() => Array.from({ length: 10 }, (_, i) => sumarDias(inicioDia(ahora), i)), [ahora]);
  const [dia, setDia] = useState<string | null>(null);
  const [horaElegida, setHora] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [err, setErr] = useState('');
  const disponible = p.estado === 'disponible';
  const diaVer = dia ? deClave(dia) : dias.find((d) => horariosVisita(estado, p.id, d, ahora).length) ?? dias[0];
  const libres = quiereVisita ? horariosVisita(estado, p.id, diaVer, ahora) : [];
  const d = (v: number) => dinero(v, config.moneda);
  const costo = p.operacion === 'alquiler' ? costoIngreso(estado, p) : null;

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    if (nombre.trim().length < 2 || soloDigitos(wa).length < 8) return setErr('Completá tu nombre y tu WhatsApp con código de área.');
    if (quiereVisita && !horaElegida) return setErr('Elegí un horario para la visita.');
    let consulta: Consulta | null = null;
    let nuevo: EstadoInmo | null = null;
    let fallo = '';
    const error = actualizar((e) => {
      if (quiereVisita && horaElegida) {
        const r = agendarVisita(e, p.id, horaElegida, { nombre, whatsapp: wa, mensaje: mensaje.trim() || undefined });
        if ('error' in r) {
          fallo = r.error;
          return e;
        }
        consulta = r.consulta;
        nuevo = r.estado;
        return r.estado;
      }
      const r = registrarConsulta(e, { nombre: nombre.trim(), whatsapp: wa, propiedadId: p.id, tipo: requisitos ? 'requisitos' : 'consulta', mensaje: mensaje.trim() || undefined });
      consulta = r.consulta;
      nuevo = r.estado;
      return r.estado;
    });
    if (fallo || error) return setErr(fallo || error || '');
    if (consulta && nuevo) {
      window.open(enlaceWhatsApp(config.whatsapp, mensajeInmobiliaria(p, consulta, nuevo, { negocio: config.negocio, moneda: config.moneda, enlace: `${window.location.origin}/d/${slug}` })), '_blank', 'noopener');
      onListo(quiereVisita ? 'Listo: tu visita quedó agendada y la inmobiliaria recibió tu consulta.' : 'Listo: la inmobiliaria recibió tu consulta con el código de la propiedad.');
    }
  }

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja au-hoja" role="dialog" aria-modal="true" aria-labelledby="in-t-ficha" ref={ref}>
        <div className="au-ficha-escena in-escena" style={{ '--tinte': p.color } as React.CSSProperties}>
          <button type="button" className="x au-cerrar" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
          <span className="au-badges">
            <span className="au-badge">{NOMBRE_OPERACION[p.operacion]}</span>
            {p.estado === 'reservada' && <span className="au-badge res">Reservada</span>}
            {p.antiguedad === 0 && <span className="au-badge cero">A estrenar</span>}
          </span>
          <PropiedadArte tipo={p.tipo} color={p.color} titulo={`Ilustración: ${NOMBRE_TIPO[p.tipo].toLowerCase()}`} className="in-luces" />
        </div>
        <div className="au-ficha-cuerpo">
          <div className="au-ficha-cab">
            <div>
              <h3 id="in-t-ficha">{p.titulo}</h3>
              <p>{p.zona} · {p.direccion} (aproximada) · Código {p.codigo}</p>
            </div>
            <div className="in-precio">
              <strong className="au-precio">{precioProp(p, config.moneda)}</strong>
              <span>{sufijo(p)}{p.expensas ? ` + ${d(p.expensas)} expensas` : ''}</span>
            </div>
          </div>
          <dl className="au-datos in-datos">
            {p.tipo !== 'terreno' && <div><dt>Cubiertos</dt><dd>{p.m2Cubiertos} m²</dd></div>}
            <div><dt>Totales</dt><dd>{p.m2Totales} m²</dd></div>
            {p.ambientes > 0 && <div><dt>Ambientes</dt><dd>{p.ambientes}</dd></div>}
            {p.dormitorios > 0 && <div><dt>Dormitorios</dt><dd>{p.dormitorios}</dd></div>}
            {p.banos > 0 && <div><dt>Baños</dt><dd>{p.banos}</dd></div>}
            {p.tipo !== 'terreno' && <div><dt>Antigüedad</dt><dd>{p.antiguedad === 0 ? 'A estrenar' : `${p.antiguedad} años`}</dd></div>}
            {p.tipo !== 'cochera' && p.tipo !== 'terreno' && <div><dt>Cochera</dt><dd>{p.cocheras ? 'Sí' : 'No'}</dd></div>}
            {p.mascotas !== undefined && <div><dt>Mascotas</dt><dd>{p.mascotas ? 'Acepta' : 'No acepta'}</dd></div>}
          </dl>
          <ul className="au-equipo">
            {p.amenities.map((x) => <li key={x}><Icono nombre="check" size={14} /> {x}</li>)}
            {p.aptoCredito && <li><Icono nombre="check" size={14} /> Apto crédito</li>}
          </ul>

          <div className="in-mapa" aria-label={`Ubicación aproximada en ${p.zona}`} role="img">
            <span className="in-pin"><Icono nombre="ubicacion" size={20} /></span>
            <span className="in-mapa-txt">{p.zona} · ubicación aproximada</span>
          </div>

          {costo && (
            <section className="au-bloque au-oscuro" aria-labelledby="in-t-costo">
              <h4 id="in-t-costo">Para entrar necesitás (estimado)</h4>
              <ul className="in-costos">
                <li><span>Primer mes{p.expensas ? ' con expensas' : ''}</span><strong>{d(costo.mes)}</strong></li>
                <li><span>Depósito ({estado.ajustes.mesesDeposito} {estado.ajustes.mesesDeposito === 1 ? 'mes' : 'meses'})</span><strong>{d(costo.deposito)}</strong></li>
                <li><span>Honorarios ({estado.ajustes.honorariosMeses} {estado.ajustes.honorariosMeses === 1 ? 'mes' : 'meses'})</span><strong>{d(costo.honorarios)}</strong></li>
                <li className="total"><span>Total estimado</span><strong>{d(costo.total)}</strong></li>
              </ul>
              <p className="au-letra">Según contrato y normativa local. La inmobiliaria confirma los montos y la garantía que acepta.</p>
            </section>
          )}
          {p.operacion === 'venta' && (
            <p className="in-nota">Honorarios para el comprador: {estado.ajustes.honorariosVenta} % (según normativa local).{p.aptoCredito ? ' Apta para crédito hipotecario.' : ''}</p>
          )}

          {disponible && (
            <section className="au-bloque" aria-labelledby="in-t-visita">
              <label className="au-switch">
                <input type="checkbox" checked={quiereVisita} onChange={(e) => { setQuiereVisita(e.target.checked); setHora(null); }} />
                <span id="in-t-visita"><strong>Quiero visitarla</strong> 30 minutos con un asesor. Elegí día y hora.</span>
              </label>
              {quiereVisita && (
                <>
                  <div className="bar-dias" role="group" aria-label="Día de la visita">
                    {dias.map((x) => {
                      const cerrado = !abierto(estado.horario, x);
                      return (
                        <button key={claveDia(x)} type="button" className="bar-dia" disabled={cerrado} aria-pressed={claveDia(x) === claveDia(diaVer)} onClick={() => { setDia(claveDia(x)); setHora(null); }} aria-label={nombreDia(x, new Date(ahora))}>
                          <span className="bar-dia-s">{claveDia(x) === claveDia(ahora) ? 'Hoy' : diaCorto(x)}</span>
                          <strong>{x.getDate()}</strong>
                        </button>
                      );
                    })}
                  </div>
                  {libres.length ? (
                    <div className="bar-horas" role="group" aria-label="Horario de la visita">
                      {libres.map((h) => <button key={h.inicio} type="button" className="bar-hora" aria-pressed={horaElegida === h.inicio} onClick={() => setHora(h.inicio)}>{hora(new Date(h.inicio))}</button>)}
                    </div>
                  ) : <p className="au-letra">Ese día no quedan horarios. Probá con otro.</p>}
                </>
              )}
            </section>
          )}
          {p.operacion === 'alquiler' && !quiereVisita && (
            <label className="au-switch in-req">
              <input type="checkbox" checked={requisitos} onChange={(e) => setRequisitos(e.target.checked)} />
              <span><strong>Quiero conocer los requisitos</strong> Garantías que aceptan y documentación.</span>
            </label>
          )}

          <form className="au-contacto" onSubmit={enviar} noValidate>
            <div className="au-dos">
              <label>Tu nombre<input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" /></label>
              <label>Tu WhatsApp<input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
            </div>
            <label className="in-msg">Mensaje (opcional)<input className="c-inp" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej.: ¿se puede entrar en marzo?" /></label>
            {err && <p className="bar-err" role="alert">{err}</p>}
            <button type="submit" className="au-btn prim grande">
              <Icono nombre="whatsapp" size={20} /> {quiereVisita ? 'Agendar visita y consultar' : 'Consultar por esta propiedad'}
            </button>
            <p className="au-letra">Le llega a la inmobiliaria con el código {p.codigo}{quiereVisita ? ' y la visita agendada' : ''}.</p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Captar({ config, estado, actualizar, onCerrar, onListo }: { config: DemoConfig; estado: EstadoInmo; actualizar: ActualizarInmo; onCerrar: () => void; onListo: (t: string) => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [f, setF] = useState({ nombre: '', wa: '', operacion: 'venta' as Captacion['operacion'], tipo: 'departamento' as TipoPropiedad, zona: estado.zonas[0], ambientes: '2', comentario: '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="in-t-cap" ref={ref}>
        <div className="hoja-cab">
          <h3 id="in-t-cap">Tasamos tu propiedad sin cargo</h3>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <form
          className="bar-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (f.nombre.trim().length < 2 || soloDigitos(f.wa).length < 8) return setErr('Completá tu nombre y tu WhatsApp con código de área.');
            const k: Captacion = { id: nuevoId('k'), fecha: new Date().toISOString(), nombre: f.nombre.trim(), whatsapp: soloDigitos(f.wa), operacion: f.operacion, tipo: f.tipo, zona: f.zona, ambientes: Number(f.ambientes) || 0, comentario: f.comentario.trim(), estado: 'nueva' };
            const error = actualizar((x) => ({ ...x, captaciones: [k, ...x.captaciones] }));
            if (error) return setErr(error);
            window.open(enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, soy ${k.nombre}. Quiero ${k.operacion === 'venta' ? 'vender' : 'alquilar'} mi ${NOMBRE_TIPO[k.tipo].toLowerCase()} de ${k.ambientes} ambientes en ${k.zona}.${k.comentario ? ` ${k.comentario}` : ''} ¿Cuándo pueden tasarla?`), '_blank', 'noopener');
            onListo('Listo: la inmobiliaria te va a escribir para coordinar la tasación.');
          }}
        >
          <div className="in-ops in-ops-claro" role="group" aria-label="Qué querés hacer">
            <button type="button" aria-pressed={f.operacion === 'venta'} onClick={() => setF((x) => ({ ...x, operacion: 'venta' }))}>Vender</button>
            <button type="button" aria-pressed={f.operacion === 'alquiler'} onClick={() => setF((x) => ({ ...x, operacion: 'alquiler' }))}>Alquilar</button>
          </div>
          <div className="au-dos">
            <label>Tipo<select className="c-inp" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}</select></label>
            <label>Zona<select className="c-inp" value={f.zona} onChange={set('zona')}>{estado.zonas.map((z) => <option key={z}>{z}</option>)}</select></label>
          </div>
          <label>Ambientes<input className="c-inp" inputMode="numeric" value={f.ambientes} onChange={set('ambientes')} /></label>
          <label>Contanos algo más (opcional)<input className="c-inp" value={f.comentario} onChange={set('comentario')} /></label>
          <div className="au-dos">
            <label>Tu nombre<input className="c-inp" value={f.nombre} onChange={set('nombre')} autoComplete="name" /></label>
            <label>Tu WhatsApp<input className="c-inp" value={f.wa} onChange={set('wa')} inputMode="tel" autoComplete="tel" /></label>
          </div>
          {err && <p className="bar-err" role="alert">{err}</p>}
          <button type="submit" className="au-btn prim grande">Pedir tasación</button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { abierto, claveDia, deClave, diaCorto, hora, inicioDia, nombreDia, sumarDias } from '@/lib/rubros/barberia/agenda';
import { agendarPrueba, cuota, filtrar, horariosPrueba, mensajeAgencia, nombreVehiculo, precioAuto, registrarConsulta, resumenVehiculo, type Filtros } from '@/lib/rubros/autos/logica';
import type { Consulta, EstadoAutos, Vehiculo } from '@/lib/rubros/autos/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { VehiculoArte } from './VehiculoArte';
import { useAhoraAutos, useDemoAutos, type ActualizarAutos } from './useAutos';

const FILTROS_INICIALES: Filtros = { q: '', tipo: null, cerokm: false, precioMax: null, caja: null };

/** Catálogo del cliente: stock con ilustraciones, cuota, usado, prueba de manejo y consulta por WhatsApp. */
export function Concesionaria({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoAutos(slug);
  const [f, setF] = useState<Filtros>(FILTROS_INICIALES);
  const q = useDeferredValue(f.q);
  const [abierto_, setAbierto] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const lista = useMemo(() => (estado ? filtrar(estado.vehiculos, { ...f, q }) : []), [estado, f, q]);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const p = (v: number) => precioAuto(v, config.moneda);
  const enStock = estado.vehiculos.filter((v) => v.estado !== 'vendido');
  const vivo = (v: Vehiculo) => !['Negro', 'Gris oscuro'].includes(v.color);
  const destacado = enStock.find((v) => v.destacado && v.tipo === 'auto' && vivo(v)) ?? enStock.find((v) => v.tipo === 'auto' && vivo(v)) ?? enStock[0];
  const topes = [...new Set(enStock.map((v) => v.precio))].sort((a, b) => a - b);
  const tope = (frac: number) => topes[Math.floor(topes.length * frac)] ?? 0;
  const vehiculo = abierto_ ? estado.vehiculos.find((v) => v.id === abierto_) ?? null : null;
  const chips: { id: string; nombre: string; activo: boolean; tocar: () => void }[] = [
    { id: 'todos', nombre: 'Todos', activo: !f.tipo && !f.cerokm && !f.caja && !f.precioMax, tocar: () => setF((x) => ({ ...FILTROS_INICIALES, q: x.q })) },
    { id: 'autos', nombre: 'Autos', activo: f.tipo === 'auto', tocar: () => setF((x) => ({ ...x, tipo: x.tipo === 'auto' ? null : 'auto' })) },
    { id: 'motos', nombre: 'Motos', activo: f.tipo === 'moto', tocar: () => setF((x) => ({ ...x, tipo: x.tipo === 'moto' ? null : 'moto' })) },
    { id: '0km', nombre: '0 km', activo: f.cerokm, tocar: () => setF((x) => ({ ...x, cerokm: !x.cerokm })) },
    { id: 'auto', nombre: 'Automáticos', activo: f.caja === 'Automática', tocar: () => setF((x) => ({ ...x, caja: x.caja ? null : 'Automática' })) },
    { id: 'precio', nombre: `Hasta ${p(tope(0.5))}`, activo: f.precioMax === tope(0.5), tocar: () => setF((x) => ({ ...x, precioMax: x.precioMax ? null : tope(0.5) })) },
  ];

  return (
    <div className="au" style={estilo}>
      <AvisoDemo texto="Autos, motos y precios de ejemplo" />
      <header className="au-hero">
        <div className="au-hero-in">
          <div className="au-marca">
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt="" className="au-logo" />
            ) : (
              <span className="au-logo au-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
            )}
            <div>
              <strong>{config.negocio}</strong>
              <span>{enStock.filter((v) => v.tipo === 'auto').length} autos y {enStock.filter((v) => v.tipo === 'moto').length} motos en stock</span>
            </div>
          </div>
          <div className="au-hero-grid">
          <h1>Tu próximo auto o moto, con cuota y permuta en un toque.</h1>
          <div className="au-escena" aria-hidden="true">
            <span className="au-velocidad" />
            <span className="au-velocidad dos" />
            <span className="au-velocidad tres" />
            {destacado && <VehiculoArte carroceria={destacado.carroceria} color={destacado.colorHex} className="au-entra au-mover" />}
            <span className="au-ruta" />
          </div>
          <label className="au-buscar">
            <Icono nombre="buscar" size={20} />
            <input type="search" aria-label="Buscar en el stock" placeholder="Probá: camioneta automática, moto 150, 0 km" value={f.q} onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))} />
            {f.q && <button type="button" className="au-limpiar" aria-label="Borrar búsqueda" onClick={() => setF((x) => ({ ...x, q: '' }))}><Icono nombre="cerrar" size={18} /></button>}
          </label>
          </div>
        </div>
      </header>

      <div className="au-chips" role="group" aria-label="Filtros">
        {chips.map((c) => (
          <button key={c.id} type="button" aria-pressed={c.activo} onClick={c.tocar}>{c.nombre}</button>
        ))}
      </div>

      <main className="au-main">
        <p className="au-cuantos" role="status">{lista.length === 1 ? '1 vehículo' : `${lista.length} vehículos`}{f.q ? ` para "${f.q}"` : ''}</p>
        {lista.length === 0 ? (
          <div className="au-vacio">
            <p><strong>No tenemos eso en stock ahora.</strong> Dejanos tu WhatsApp y te avisamos cuando entre.</p>
            <a className="au-btn prim" href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, busco: ${f.q || 'un vehículo'}. ¿Me avisan si entra algo así?`)} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Avisarme cuando entre</a>
          </div>
        ) : (
          <ul className="au-grilla">
            {lista.map((v, i) => (
              <li key={v.id} style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                <button type="button" className="au-card au-mover-hover" onClick={() => setAbierto(v.id)} aria-label={`${nombreVehiculo(v)}, ${resumenVehiculo(v)}, ${p(v.precio)}${v.estado === 'reservado' ? ', reservado' : ''}`}>
                  <span className="au-card-escena" style={{ '--tinte': v.colorHex } as React.CSSProperties}>
                    <span className="au-badges">
                      {v.cerokm && <span className="au-badge cero">0 km</span>}
                      {v.destacado && <span className="au-badge">Destacado</span>}
                      {v.estado === 'reservado' && <span className="au-badge res">Reservado</span>}
                    </span>
                    <VehiculoArte carroceria={v.carroceria} color={v.colorHex} />
                  </span>
                  <span className="au-card-txt">
                    <span className="au-card-nom">{v.modelo}</span>
                    <span className="au-card-sub">{v.marca} · {resumenVehiculo(v)}</span>
                    <span className="au-card-pie">
                      <strong>{p(v.precio)}</strong>
                      {v.financiable && <span>Cuotas desde {p(cuota(estado, v, Math.round(v.precio * 0.5), Math.max(...estado.ajustes.plazos)))}*</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="c-pie">*Cuota estimada con anticipo del 50 % y tasa de referencia; la define la financiera. {config.direccion ? `${config.direccion}. ` : ''}Hecho con ACMIAS.</p>
      </main>

      {vehiculo && (
        <Ficha
          config={config}
          estado={estado}
          v={vehiculo}
          slug={slug}
          actualizar={actualizar}
          onCerrar={() => setAbierto(null)}
          onListo={(t) => { setAbierto(null); setToast(t); }}
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

function Ficha({ config, estado, v, slug, actualizar, onCerrar, onListo }: {
  config: DemoConfig;
  estado: EstadoAutos;
  v: Vehiculo;
  slug: string;
  actualizar: ActualizarAutos;
  onCerrar: () => void;
  onListo: (texto: string) => void;
}) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const ahora = useAhoraAutos();
  const p = (x: number) => precioAuto(x, config.moneda);
  const minAnt = Math.round((v.precio * estado.ajustes.anticipoMin) / 100);
  const [anticipo, setAnticipo] = useState(Math.round(v.precio * 0.4));
  const [meses, setMeses] = useState(estado.ajustes.plazos[1] ?? estado.ajustes.plazos[0]);
  const [simulo, setSimulo] = useState(false);
  const [conUsado, setConUsado] = useState(false);
  const [usado, setUsado] = useState({ descripcion: '', anio: '', km: '' });
  const [quierePrueba, setQuierePrueba] = useState(false);
  const dias = useMemo(() => Array.from({ length: 10 }, (_, i) => sumarDias(inicioDia(ahora), i)), [ahora]);
  const [dia, setDia] = useState<string | null>(null);
  const [horaElegida, setHora] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [err, setErr] = useState('');
  const disponible = v.estado === 'disponible';
  const diaVer = dia ? deClave(dia) : dias.find((d) => horariosPrueba(estado, v.id, d, ahora).length) ?? dias[0];
  const libres = quierePrueba ? horariosPrueba(estado, v.id, diaVer, ahora) : [];
  const valorCuota = cuota(estado, v, anticipo, meses);

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    if (nombre.trim().length < 2 || soloDigitos(wa).length < 8) return setErr('Completá tu nombre y tu WhatsApp con código de área.');
    if (conUsado && (usado.descripcion.trim().length < 3 || !Number(usado.anio))) return setErr('Contanos qué usado entregás y de qué año.');
    if (quierePrueba && !horaElegida) return setErr('Elegí un horario para la prueba de manejo.');
    let consulta: Consulta | null = null;
    let fallo = '';
    const extra: Partial<Consulta> = {
      ...(simulo && v.financiable ? { cuota: { anticipo, meses, cuota: valorCuota } } : {}),
      ...(conUsado ? { usado: { descripcion: usado.descripcion.trim(), anio: Number(usado.anio), km: Number(soloDigitos(usado.km)) || 0 } } : {}),
    };
    let nuevo: EstadoAutos | null = null;
    const error = actualizar((e) => {
      if (quierePrueba && horaElegida) {
        const r = agendarPrueba(e, v.id, horaElegida, { nombre, whatsapp: wa });
        if ('error' in r) {
          fallo = r.error;
          return e;
        }
        consulta = { ...r.consulta, ...extra };
        nuevo = { ...r.estado, consultas: r.estado.consultas.map((c) => (c.id === r.consulta.id ? consulta! : c)) };
        return nuevo;
      }
      const tipo: Consulta['tipo'] = conUsado ? 'tasacion' : extra.cuota ? 'financiacion' : 'consulta';
      const r = registrarConsulta(e, { nombre: nombre.trim(), whatsapp: wa, vehiculoId: v.id, tipo, ...extra });
      consulta = r.consulta;
      nuevo = r.estado;
      return r.estado;
    });
    if (fallo || error) return setErr(fallo || error || '');
    if (consulta && nuevo) {
      const msg = mensajeAgencia(v, consulta, nuevo, { negocio: config.negocio, moneda: config.moneda, enlace: `${window.location.origin}/d/${slug}` });
      window.open(enlaceWhatsApp(config.whatsapp, msg), '_blank', 'noopener');
      onListo(quierePrueba ? 'Listo: tu prueba de manejo quedó reservada y la agencia recibió tu consulta.' : 'Listo: la agencia recibió tu consulta con todos los datos.');
    }
  }

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja au-hoja" role="dialog" aria-modal="true" aria-labelledby="au-t-ficha" ref={ref}>
        <div className="au-ficha-escena" style={{ '--tinte': v.colorHex } as React.CSSProperties}>
          <button type="button" className="x au-cerrar" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
          <span className="au-badges">
            {v.cerokm && <span className="au-badge cero">0 km</span>}
            {v.estado === 'reservado' && <span className="au-badge res">Reservado</span>}
          </span>
          <VehiculoArte carroceria={v.carroceria} color={v.colorHex} titulo={`Ilustración del ${v.modelo} color ${v.color.toLowerCase()}`} className="au-entra au-mover" />
        </div>
        <div className="au-ficha-cuerpo">
          <div className="au-ficha-cab">
            <div>
              <h3 id="au-t-ficha">{v.modelo}</h3>
              <p>{v.marca} · {v.color} · Ficha de ejemplo</p>
            </div>
            <strong className="au-precio">{p(v.precio)}</strong>
          </div>
          <dl className="au-datos">
            <div><dt>Año</dt><dd>{v.cerokm ? '0 km' : v.anio}</dd></div>
            <div><dt>Kilómetros</dt><dd>{v.km.toLocaleString('es')}</dd></div>
            <div><dt>Combustible</dt><dd>{v.combustible}</dd></div>
            <div><dt>Caja</dt><dd>{v.caja}</dd></div>
          </dl>
          <ul className="au-equipo">
            {v.equipamiento.map((x) => <li key={x}><Icono nombre="check" size={14} /> {x}</li>)}
          </ul>

          {v.financiable && (
            <section className="au-bloque au-oscuro" aria-labelledby="au-t-cuota">
              <h4 id="au-t-cuota">Simulá tu cuota</h4>
              <label className="au-rango">
                <span>Anticipo <strong>{p(anticipo)}</strong></span>
                <input type="range" min={minAnt} max={Math.round(v.precio * 0.9)} step={Math.max(1, Math.round(v.precio / 100))} value={anticipo} onChange={(e) => { setAnticipo(Number(e.target.value)); setSimulo(true); }} aria-label="Anticipo" />
              </label>
              <div className="au-plazos" role="group" aria-label="Cantidad de cuotas">
                {estado.ajustes.plazos.map((m) => (
                  <button key={m} type="button" aria-pressed={m === meses} onClick={() => { setMeses(m); setSimulo(true); }}>{m} cuotas</button>
                ))}
              </div>
              <p className="au-cuota" aria-live="polite"><span>Cuota estimada</span><strong>{p(valorCuota)}</strong></p>
              <p className="au-letra">Estimación con tasa de referencia del {estado.ajustes.tasaMensual} % mensual. No es una oferta: la tasa y la aprobación las define la financiera.</p>
            </section>
          )}

          {v.aceptaPermuta && (
            <section className="au-bloque" aria-labelledby="au-t-usado">
              <label className="au-switch">
                <input type="checkbox" checked={conUsado} onChange={(e) => setConUsado(e.target.checked)} />
                <span id="au-t-usado"><strong>Entrego mi usado</strong> La agencia te pasa la tasación por WhatsApp.</span>
              </label>
              {conUsado && (
                <div className="au-usado">
                  <label>Qué vehículo es<input className="c-inp" value={usado.descripcion} onChange={(e) => setUsado((u) => ({ ...u, descripcion: e.target.value }))} placeholder="Ej.: hatch 1.4 nafta" /></label>
                  <label>Año<input className="c-inp" inputMode="numeric" value={usado.anio} onChange={(e) => setUsado((u) => ({ ...u, anio: soloDigitos(e.target.value).slice(0, 4) }))} /></label>
                  <label>Kilómetros<input className="c-inp" inputMode="numeric" value={usado.km} onChange={(e) => setUsado((u) => ({ ...u, km: e.target.value }))} /></label>
                </div>
              )}
            </section>
          )}

          {disponible && (
            <section className="au-bloque" aria-labelledby="au-t-prueba">
              <label className="au-switch">
                <input type="checkbox" checked={quierePrueba} onChange={(e) => { setQuierePrueba(e.target.checked); setHora(null); }} />
                <span id="au-t-prueba"><strong>Quiero una prueba de manejo</strong> 30 minutos, con un asesor.</span>
              </label>
              {quierePrueba && (
                <>
                  <div className="bar-dias" role="group" aria-label="Día de la prueba">
                    {dias.map((d) => {
                      const cerrado = !abierto(estado.horario, d);
                      return (
                        <button key={claveDia(d)} type="button" className="bar-dia" disabled={cerrado} aria-pressed={claveDia(d) === claveDia(diaVer)} onClick={() => { setDia(claveDia(d)); setHora(null); }} aria-label={nombreDia(d, new Date(ahora))}>
                          <span className="bar-dia-s">{claveDia(d) === claveDia(ahora) ? 'Hoy' : diaCorto(d)}</span>
                          <strong>{d.getDate()}</strong>
                        </button>
                      );
                    })}
                  </div>
                  {libres.length ? (
                    <div className="bar-horas" role="group" aria-label="Horario de la prueba">
                      {libres.map((h) => <button key={h.inicio} type="button" className="bar-hora" aria-pressed={horaElegida === h.inicio} onClick={() => setHora(h.inicio)}>{hora(new Date(h.inicio))}</button>)}
                    </div>
                  ) : <p className="au-letra">Ese día no quedan horarios. Probá con otro.</p>}
                </>
              )}
            </section>
          )}

          <form className="au-contacto" onSubmit={enviar} noValidate>
            <div className="au-dos">
              <label>Tu nombre<input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" /></label>
              <label>Tu WhatsApp<input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
            </div>
            {err && <p className="bar-err" role="alert">{err}</p>}
            <button type="submit" className="au-btn prim grande">
              <Icono nombre="whatsapp" size={20} /> {quierePrueba ? 'Reservar prueba y consultar' : 'Consultar por este vehículo'}
            </button>
            <p className="au-letra">Le llega a la agencia con el vehículo{v.financiable ? ', la cuota' : ''}{v.aceptaPermuta ? ' y tu usado' : ''} ya cargados.</p>
          </form>
        </div>
      </div>
    </div>
  );
}

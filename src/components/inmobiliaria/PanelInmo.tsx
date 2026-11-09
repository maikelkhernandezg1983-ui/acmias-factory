'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { NOMBRE_ESTADO, claveDia, hora, nombreDia } from '@/lib/rubros/barberia/agenda';
import { FACHADAS } from '@/lib/rubros/inmobiliaria/datos-ejemplo';
import { NOMBRE_CAPTACION, NOMBRE_CONSULTA, NOMBRE_ESTADO_CONSULTA, NOMBRE_OPERACION, NOMBRE_TIPO, diasPublicada, mensajeCaptacion, mensajeRespuesta, metricas, nuevoId, precioProp, resumen, sufijo } from '@/lib/rubros/inmobiliaria/logica';
import type { Captacion, Consulta, EstadoInmo, Operacion, Propiedad, TipoPropiedad, Visita } from '@/lib/rubros/inmobiliaria/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { PropiedadArte } from './PropiedadArte';
import { useAhoraInmo, useDemoInmo, type ActualizarInmo } from './useInmo';

type Pestana = 'consultas' | 'propiedades' | 'visitas' | 'propietarios' | 'metricas' | 'ajustes';
const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

function hace(iso: string, ahora: number) {
  const min = Math.max(1, Math.round((ahora - +new Date(iso)) / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function PanelInmo({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoInmo(slug);
  const ahora = useAhoraInmo();
  const [pestana, setPestana] = useState<Pestana>('consultas');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const m = metricas(estado, ahora);
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'consultas', nombre: `Consultas${m.nuevas ? ` (${m.nuevas})` : ''}` },
    { id: 'propiedades', nombre: `Propiedades (${m.activas})` },
    { id: 'visitas', nombre: `Visitas${m.visitasProximas ? ` (${m.visitasProximas})` : ''}` },
    { id: 'propietarios', nombre: `Propietarios${m.captacionesNuevas ? ` (${m.captacionesNuevas})` : ''}` },
    { id: 'metricas', nombre: 'Métricas' },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];
  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Propiedades, consultas y precios de ejemplo" />
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
              <div style={{ fontSize: 13, opacity: 0.9 }}>Panel de la inmobiliaria · {m.venta} en venta, {m.alquiler} en alquiler, {m.temporario} temporarios</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="ojo" size={18} /> Ver propiedades</Link>
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
        {pestana === 'consultas' && <Consultas config={config} estado={estado} actualizar={actualizar} ahora={ahora} />}
        {pestana === 'propiedades' && <Propiedades config={config} estado={estado} actualizar={actualizar} ahora={ahora} />}
        {pestana === 'visitas' && <Visitas estado={estado} actualizar={actualizar} ahora={ahora} />}
        {pestana === 'propietarios' && <Propietarios config={config} estado={estado} actualizar={actualizar} ahora={ahora} />}
        {pestana === 'metricas' && <Metricas config={config} estado={estado} ahora={ahora} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} config={config} estado={estado} actualizar={actualizar} />}
      </main>
    </div>
  );
}

function Consultas({ config, estado, actualizar, ahora }: { config: DemoConfig; estado: EstadoInmo; actualizar: ActualizarInmo; ahora: number }) {
  const [filtro, setFiltro] = useState<Consulta['estado'] | 'todas'>('todas');
  const lista = [...estado.consultas].filter((c) => filtro === 'todas' || c.estado === filtro).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const marcar = (id: string, est: Consulta['estado']) => actualizar((x) => ({ ...x, consultas: x.consultas.map((y) => (y.id === id ? { ...y, estado: est } : y)) }));
  return (
    <section className="d-card" aria-labelledby="t-cons">
      <h2 id="t-cons">Consultas</h2>
      <p className="sub">Cada consulta llega con el código de la propiedad, el mensaje del interesado y la visita si la agendó.</p>
      <div className="ag-profs" role="group" aria-label="Filtrar consultas" style={{ marginBottom: 12 }}>
        {(['todas', 'nueva', 'contactada', 'cerrada', 'perdida'] as const).map((x) => (
          <button key={x} type="button" aria-pressed={filtro === x} onClick={() => setFiltro(x)}>{x === 'todas' ? 'Todas' : NOMBRE_ESTADO_CONSULTA[x]}</button>
        ))}
      </div>
      <ul className="au-leads">
        {lista.map((c) => {
          const p = estado.propiedades.find((x) => x.id === c.propiedadId);
          const v = c.visitaId ? estado.visitas.find((x) => x.id === c.visitaId) : undefined;
          return (
            <li key={c.id} className={c.estado === 'nueva' ? 'nueva' : undefined}>
              <span className="bar-avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
              <div className="au-lead-txt">
                <strong>{c.nombre} <span className={`au-tipo t-${c.tipo === 'visita' ? 'prueba' : c.tipo === 'requisitos' ? 'financiacion' : 'consulta'}`}>{NOMBRE_CONSULTA[c.tipo]}</span></strong>
                <span>{p ? `${p.codigo} · ${p.titulo} · ${p.zona} · ${precioProp(p, config.moneda)} ${sufijo(p)}` : 'Sin propiedad'}</span>
                {c.mensaje && <span>“{c.mensaje}”</span>}
                {v && <span>Visita: {nombreDia(v.inicio, new Date(ahora))} {hora(v.inicio)} h</span>}
                <small>{hace(c.fecha, ahora)}</small>
              </div>
              <div className="au-lead-acc">
                <label className="sr-only" htmlFor={`est-${c.id}`}>Estado de la consulta de {c.nombre}</label>
                <select id={`est-${c.id}`} className="c-inp" value={c.estado} onChange={(e) => marcar(c.id, e.target.value as Consulta['estado'])}>
                  {(['nueva', 'contactada', 'cerrada', 'perdida'] as const).map((s) => <option key={s} value={s}>{NOMBRE_ESTADO_CONSULTA[s]}</option>)}
                </select>
                <a className="d-btn prim" href={enlaceWhatsApp(c.whatsapp, mensajeRespuesta(c, p, { negocio: config.negocio, moneda: config.moneda }))} target="_blank" rel="noopener noreferrer" onClick={() => c.estado === 'nueva' && marcar(c.id, 'contactada')}>
                  <Icono nombre="whatsapp" size={16} /> Responder
                </a>
              </div>
            </li>
          );
        })}
        {!lista.length && <li>No hay consultas con ese estado.</li>}
      </ul>
    </section>
  );
}

const TIPOS: TipoPropiedad[] = ['departamento', 'casa', 'ph', 'local', 'oficina', 'terreno', 'galpon', 'cochera'];

function Propiedades({ config, estado, actualizar, ahora }: { config: DemoConfig; estado: EstadoInmo; actualizar: ActualizarInmo; ahora: number }) {
  const [ver, setVer] = useState<Operacion | 'cerradas'>('alquiler');
  const [alta, setAlta] = useState(false);
  const [msg, setMsg] = useState('');
  const consultasPor = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of estado.consultas) if (c.propiedadId) m.set(c.propiedadId, (m.get(c.propiedadId) ?? 0) + 1);
    return m;
  }, [estado.consultas]);
  const lista = estado.propiedades.filter((p) => (ver === 'cerradas' ? p.estado === 'cerrada' : p.estado !== 'cerrada' && p.operacion === ver)).sort((a, b) => diasPublicada(b, ahora) - diasPublicada(a, ahora));
  const cambiar = (id: string, cambios: Partial<Propiedad>) => actualizar((e) => ({ ...e, propiedades: e.propiedades.map((p) => (p.id === id ? { ...p, ...cambios } : p)) }));
  return (
    <section className="d-card" aria-labelledby="t-props">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h2 id="t-props">Propiedades</h2>
          <p className="sub">Ordenadas por días publicadas. Las que pasan 60 días se marcan para revisar el precio.</p>
        </div>
        <button type="button" className="d-btn prim" onClick={() => setAlta((x) => !x)}><Icono nombre="mas" size={18} /> Cargar propiedad</button>
      </div>
      {alta && <Alta estado={estado} actualizar={actualizar} onListo={(t) => { setAlta(false); setMsg(t); }} />}
      {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
      <div className="ag-profs" role="group" aria-label="Ver" style={{ margin: '4px 0 12px' }}>
        {(['alquiler', 'venta', 'temporario'] as const).map((o) => <button key={o} type="button" aria-pressed={ver === o} onClick={() => setVer(o)}>{NOMBRE_OPERACION[o]}</button>)}
        <button type="button" aria-pressed={ver === 'cerradas'} onClick={() => setVer('cerradas')}>Alquiladas o vendidas</button>
      </div>
      <ul className="au-stock">
        {lista.map((p) => {
          const dias = diasPublicada(p, ahora);
          const n = consultasPor.get(p.id) ?? 0;
          return (
            <li key={p.id} className={dias >= 60 && p.estado !== 'cerrada' ? 'lento' : undefined}>
              <span className="au-mini" style={{ '--tinte': p.color } as React.CSSProperties}><PropiedadArte tipo={p.tipo} color={p.color} /></span>
              <div className="au-stock-txt">
                <strong>{p.codigo} · {p.titulo}</strong>
                <span>{p.zona} · {resumen(p)} · {precioProp(p, config.moneda)} {sufijo(p)}</span>
                <span>{dias} días publicada · {p.vistas} vistas · {n === 1 ? '1 consulta' : `${n} consultas`}{dias >= 60 && p.estado !== 'cerrada' ? ' · sin movimiento' : ''}</span>
              </div>
              <div className="au-stock-acc">
                <label className="au-precio-ed">
                  <span className="sr-only">Precio de {p.codigo}</span>
                  <input className="c-inp" inputMode="numeric" defaultValue={p.precio} aria-label={`Precio de ${p.codigo}`} onBlur={(e) => { const v = Number(soloDigitos(e.target.value)); if (v > 0 && v !== p.precio) cambiar(p.id, { precio: v }); }} />
                </label>
                <select className="c-inp" aria-label={`Estado de ${p.codigo}`} value={p.estado} onChange={(e) => {
                  const est = e.target.value as Propiedad['estado'];
                  cambiar(p.id, { estado: est, cerrada: est === 'cerrada' ? new Date().toISOString() : undefined });
                }}>
                  <option value="disponible">Disponible</option>
                  <option value="reservada">Reservada</option>
                  <option value="cerrada">{p.operacion === 'venta' ? 'Vendida' : 'Alquilada'}</option>
                </select>
                <button type="button" className="d-btn" aria-pressed={!!p.destacada} onClick={() => cambiar(p.id, { destacada: !p.destacada })}><Icono nombre="estrella" size={16} /> {p.destacada ? 'Destacada' : 'Destacar'}</button>
              </div>
            </li>
          );
        })}
        {!lista.length && <li>No hay propiedades acá.</li>}
      </ul>
    </section>
  );
}

function Alta({ estado, actualizar, onListo }: { estado: EstadoInmo; actualizar: ActualizarInmo; onListo: (t: string) => void }) {
  const [f, setF] = useState({ operacion: 'alquiler' as Operacion, tipo: 'departamento' as TipoPropiedad, titulo: '', zona: estado.zonas[0], direccion: '', precio: '', expensas: '', m2: '', ambientes: '2', mascotas: false });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const color = FACHADAS[estado.propiedades.length % FACHADAS.length];
  return (
    <form
      className="au-alta"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.titulo.trim().length < 3 || !Number(soloDigitos(f.precio))) return setErr('Completá al menos el título y el precio.');
        const amb = Number(f.ambientes) || 0;
        const m2 = Number(soloDigitos(f.m2)) || 0;
        const numero = 1000 + (estado.propiedades.length + 1) * 7;
        const p: Propiedad = {
          id: nuevoId('pr'),
          codigo: `P-${numero}`,
          operacion: f.operacion,
          tipo: f.tipo,
          titulo: f.titulo.trim(),
          zona: f.zona,
          direccion: f.direccion.trim() || 'A confirmar',
          precio: Number(soloDigitos(f.precio)),
          moneda: f.operacion === 'venta' ? 'USD' : 'local',
          expensas: Number(soloDigitos(f.expensas)) || undefined,
          m2Cubiertos: f.tipo === 'terreno' ? 0 : m2,
          m2Totales: m2,
          ambientes: amb,
          dormitorios: Math.max(0, amb - 1),
          banos: amb >= 4 ? 2 : amb ? 1 : 0,
          cocheras: f.tipo === 'cochera' ? 1 : 0,
          antiguedad: 0,
          amenities: [],
          mascotas: f.operacion !== 'venta' ? f.mascotas : undefined,
          color,
          estado: 'disponible',
          ingreso: new Date().toISOString(),
          vistas: 0,
        };
        const error = actualizar((x) => ({ ...x, propiedades: [p, ...x.propiedades] }));
        if (error) return setErr(error);
        onListo(`${p.codigo} quedó publicada en el catálogo.`);
      }}
    >
      <span className="au-alta-vista" style={{ '--tinte': color } as React.CSSProperties}><PropiedadArte tipo={f.tipo} color={color} /></span>
      <div className="au-alta-campos">
        <label>Operación<select className="c-inp" value={f.operacion} onChange={set('operacion')}>{(['alquiler', 'venta', 'temporario'] as const).map((o) => <option key={o} value={o}>{NOMBRE_OPERACION[o]}</option>)}</select></label>
        <label>Tipo<select className="c-inp" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}</select></label>
        <label>Título<input className="c-inp" value={f.titulo} onChange={set('titulo')} placeholder="Ej.: 2 ambientes con balcón" /></label>
        <label>Zona<select className="c-inp" value={f.zona} onChange={set('zona')}>{estado.zonas.map((z) => <option key={z}>{z}</option>)}</select></label>
        <label>Dirección aproximada<input className="c-inp" value={f.direccion} onChange={set('direccion')} placeholder="Calle y altura aproximada" /></label>
        <label>{f.operacion === 'venta' ? 'Precio (USD)' : f.operacion === 'temporario' ? 'Precio por noche' : 'Alquiler por mes'}<input className="c-inp" inputMode="numeric" value={f.precio} onChange={set('precio')} /></label>
        <label>Expensas<input className="c-inp" inputMode="numeric" value={f.expensas} onChange={set('expensas')} /></label>
        <label>Metros cuadrados<input className="c-inp" inputMode="numeric" value={f.m2} onChange={set('m2')} /></label>
        <label>Ambientes<input className="c-inp" inputMode="numeric" value={f.ambientes} onChange={set('ambientes')} /></label>
      </div>
      {f.operacion !== 'venta' && (
        <label className="au-switch"><input type="checkbox" checked={f.mascotas} onChange={(e) => setF((x) => ({ ...x, mascotas: e.target.checked }))} /><span><strong>Acepta mascotas</strong></span></label>
      )}
      {err && <p className="bar-err" role="alert">{err}</p>}
      <div><button type="submit" className="d-btn prim">Publicar en el catálogo</button></div>
      <p className="sub" style={{ margin: 0 }}>Las fotos reales y el recorrido virtual se suman en la puesta en marcha (próximamente); en la demo se muestra la ilustración.</p>
    </form>
  );
}

function Visitas({ estado, actualizar, ahora }: { estado: EstadoInmo; actualizar: ActualizarInmo; ahora: number }) {
  const proximas = estado.visitas.filter((v) => +new Date(v.fin) >= ahora - 3_600_000 && v.estado !== 'cancelado').sort((a, b) => a.inicio.localeCompare(b.inicio));
  const dias = [...new Set(proximas.map((v) => claveDia(v.inicio)))];
  const cambiar = (id: string, est: Visita['estado']) => actualizar((e) => ({ ...e, visitas: e.visitas.map((v) => (v.id === id ? { ...v, estado: est } : v)) }));
  return (
    <section className="d-card" aria-labelledby="t-vis">
      <h2 id="t-vis">Visitas</h2>
      <p className="sub">Las agenda el interesado desde la ficha. Una propiedad no se puede visitar dos veces en el mismo horario.</p>
      {!proximas.length && <p className="tie-vacio">No hay visitas próximas.</p>}
      {dias.map((d) => (
        <div key={d} style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, margin: '6px 0 8px', textTransform: 'capitalize' }}>{nombreDia(d + 'T12:00:00', new Date(ahora))}</h3>
          <ul className="au-leads">
            {proximas.filter((v) => claveDia(v.inicio) === d).map((v) => {
              const p = estado.propiedades.find((x) => x.id === v.profId);
              const c = estado.consultas.find((x) => x.id === v.clienteId);
              const recordatorio = c && p ? `Hola ${c.nombre.split(' ')[0]}, te esperamos ${nombreDia(v.inicio)} a las ${hora(v.inicio)} h para ver la propiedad ${p.codigo} en ${p.direccion}, ${p.zona}. ¿Confirmás?` : '';
              return (
                <li key={v.id}>
                  <strong className="au-hora">{hora(v.inicio)}</strong>
                  {p && <span className="au-mini chica" style={{ '--tinte': p.color } as React.CSSProperties}><PropiedadArte tipo={p.tipo} color={p.color} /></span>}
                  <div className="au-lead-txt">
                    <strong>{c?.nombre ?? 'Interesado'} <span className={`bar-estado est-${v.estado}`}>{NOMBRE_ESTADO[v.estado]}</span></strong>
                    <span>{p ? `${p.codigo} · ${p.titulo} · ${p.direccion}` : ''}</span>
                  </div>
                  <div className="au-lead-acc">
                    {v.estado === 'reservado' && <button type="button" className="d-btn" onClick={() => cambiar(v.id, 'confirmado')}>Confirmar</button>}
                    {(v.estado === 'reservado' || v.estado === 'confirmado') && <button type="button" className="d-btn" onClick={() => cambiar(v.id, 'atendido')}>Realizada</button>}
                    {(v.estado === 'reservado' || v.estado === 'confirmado') && <button type="button" className="d-btn peligro" onClick={() => cambiar(v.id, 'cancelado')}>Cancelar</button>}
                    {c && recordatorio && <a className="d-btn prim" href={enlaceWhatsApp(c.whatsapp, recordatorio)} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={16} /> Recordar</a>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Propietarios({ config, estado, actualizar, ahora }: { config: DemoConfig; estado: EstadoInmo; actualizar: ActualizarInmo; ahora: number }) {
  const lista = [...estado.captaciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const marcar = (id: string, est: Captacion['estado']) => actualizar((x) => ({ ...x, captaciones: x.captaciones.map((k) => (k.id === id ? { ...k, estado: est } : k)) }));
  return (
    <section className="d-card" aria-labelledby="t-prop">
      <h2 id="t-prop">Propietarios que quieren vender o alquilar</h2>
      <p className="sub">Llegan desde &quot;¿Querés vender o alquilar tu propiedad?&quot; del catálogo y del sitio. Coordiná la tasación por WhatsApp.</p>
      <ul className="au-leads">
        {lista.map((k) => (
          <li key={k.id} className={k.estado === 'nueva' ? 'nueva' : undefined}>
            <span className="bar-avatar" aria-hidden="true">{iniciales(k.nombre)}</span>
            <div className="au-lead-txt">
              <strong>{k.nombre} <span className={`au-tipo t-${k.operacion === 'venta' ? 'tasacion' : 'financiacion'}`}>Quiere {k.operacion === 'venta' ? 'vender' : 'alquilar'}</span></strong>
              <span>{NOMBRE_TIPO[k.tipo]}{k.ambientes ? ` de ${k.ambientes} ambientes` : ''} en {k.zona}</span>
              {k.comentario && <span>“{k.comentario}”</span>}
              <small>{hace(k.fecha, ahora)}</small>
            </div>
            <div className="au-lead-acc">
              <label className="sr-only" htmlFor={`cap-${k.id}`}>Estado de {k.nombre}</label>
              <select id={`cap-${k.id}`} className="c-inp" value={k.estado} onChange={(e) => marcar(k.id, e.target.value as Captacion['estado'])}>
                {(['nueva', 'tasacion', 'captada', 'descartada'] as const).map((s) => <option key={s} value={s}>{NOMBRE_CAPTACION[s]}</option>)}
              </select>
              <a className="d-btn prim" href={enlaceWhatsApp(k.whatsapp, mensajeCaptacion(k, { negocio: config.negocio, moneda: config.moneda }))} target="_blank" rel="noopener noreferrer" onClick={() => k.estado === 'nueva' && marcar(k.id, 'tasacion')}>
                <Icono nombre="whatsapp" size={16} /> Coordinar tasación
              </a>
            </div>
          </li>
        ))}
        {!lista.length && <li>Todavía no hay propietarios.</li>}
      </ul>
    </section>
  );
}

function Metricas({ config, estado, ahora }: { config: DemoConfig; estado: EstadoInmo; ahora: number }) {
  const m = metricas(estado, ahora);
  const max = Math.max(1, ...m.porProp.map((x) => x.consultas));
  return (
    <>
      <section className="d-card" aria-labelledby="t-met">
        <h2 id="t-met">Cómo viene la inmobiliaria</h2>
        <p className="sub">Datos de ejemplo de las últimas semanas.</p>
        <div className="met-grid">
          <div className="met"><strong>{m.consultas7}</strong><span>Consultas en 7 días</span></div>
          <div className="met"><strong>{m.visitasProximas}</strong><span>Visitas próximas</span></div>
          <div className="met"><strong>{m.cerradas30}</strong><span>Alquiladas o vendidas en 30 días</span></div>
          <div className="met"><strong>{m.promedioDias} días</strong><span>Promedio publicada</span></div>
          <div className="met"><strong>{estado.captaciones.length}</strong><span>Propietarios que pidieron tasación</span></div>
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-mas">
        <h2 id="t-mas">Las más consultadas</h2>
        <ul className="met-barras">
          {m.porProp.slice(0, 6).map(({ p, consultas }) => (
            <li key={p.id}><span>{p.codigo} · {p.titulo}</span><span className="ag-barra grande"><span style={{ width: `${(consultas / max) * 100}%` }} /></span><strong>{consultas}</strong></li>
          ))}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-sin">
        <h2 id="t-sin">Sin movimiento (más de 60 días)</h2>
        {m.sinMovimiento.length ? (
          <ul className="met-barras">
            {m.sinMovimiento.map(({ p, dias }) => <li key={p.id}><span>{p.codigo} · {p.titulo}</span><span>{precioProp(p, config.moneda)} {sufijo(p)}</span><strong>{dias} d</strong></li>)}
          </ul>
        ) : <p className="sub">Ninguna propiedad pasó los 60 días.</p>}
      </section>
    </>
  );
}

function Ajustes({ slug, config, estado, actualizar }: { slug: string; config: DemoConfig; estado: EstadoInmo; actualizar: ActualizarInmo }) {
  const [msg, setMsg] = useState('');
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">Ajustes de la inmobiliaria</h2>
      <form
        style={{ display: 'grid', gap: 12, maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
          if (wa.length < 8) return setMsg('Revisá el WhatsApp: incluí código de país y de área.');
          const num = (k: string, max: number) => Math.min(max, Math.max(0, Number(String(f.get(k)).replace(',', '.')) || 0));
          try {
            actualizarDemo(slug, { whatsapp: wa, direccion: String(f.get('direccion') ?? '').trim() });
            const err = actualizar((x) => ({ ...x, ajustes: { mesesDeposito: num('deposito', 6), honorariosMeses: num('honorarios', 6), honorariosVenta: num('venta', 10) } }));
            setMsg(err ?? 'Ajustes guardados.');
          } catch (er) {
            setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.');
          }
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp de la inmobiliaria<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Dirección<input name="direccion" className="c-inp" defaultValue={config.direccion} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Depósito (meses)<input name="deposito" inputMode="decimal" className="c-inp" defaultValue={estado.ajustes.mesesDeposito} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Honorarios alquiler (meses)<input name="honorarios" inputMode="decimal" className="c-inp" defaultValue={estado.ajustes.honorariosMeses} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Honorarios venta (%)<input name="venta" inputMode="decimal" className="c-inp" defaultValue={estado.ajustes.honorariosVenta} /></label>
        </div>
        <span style={{ fontSize: 13, color: '#55555f' }}>Se usan para el costo de ingreso estimado que ve el interesado. Cargalos según la normativa de tu zona.</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, 'inmobiliaria'); setMsg('La inmobiliaria volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}

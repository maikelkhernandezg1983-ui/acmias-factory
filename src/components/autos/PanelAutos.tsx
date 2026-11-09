'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { actualizarDemo, reiniciarDatos } from '@/lib/almacen';
import { enlaceWhatsApp, soloDigitos } from '@/lib/utiles';
import { NOMBRE_ESTADO, claveDia, hora, nombreDia } from '@/lib/rubros/barberia/agenda';
import { COLORES } from '@/lib/rubros/autos/datos-ejemplo';
import { NOMBRE_ESTADO_CONSULTA, NOMBRE_TIPO, diasEnStock, metricas, mensajeRespuesta, nombreVehiculo, nuevoId, precioAuto, resumenVehiculo } from '@/lib/rubros/autos/logica';
import type { Carroceria, Consulta, EstadoAutos, Prueba, Vehiculo } from '@/lib/rubros/autos/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { VehiculoArte } from './VehiculoArte';
import { useAhoraAutos, useDemoAutos, type ActualizarAutos } from './useAutos';

type Pestana = 'consultas' | 'stock' | 'pruebas' | 'usados' | 'metricas' | 'ajustes';
const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

function hace(iso: string, ahora: number) {
  const min = Math.max(1, Math.round((ahora - +new Date(iso)) / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function PanelAutos({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoAutos(slug);
  const ahora = useAhoraAutos();
  const [pestana, setPestana] = useState<Pestana>('consultas');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const m = metricas(estado, ahora);
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'consultas', nombre: `Consultas${m.nuevas ? ` (${m.nuevas})` : ''}` },
    { id: 'stock', nombre: `Stock (${m.enStock})` },
    { id: 'pruebas', nombre: `Pruebas de manejo${m.pruebasProximas ? ` (${m.pruebasProximas})` : ''}` },
    { id: 'usados', nombre: `Usados para tasar${m.tasaciones ? ` (${m.tasaciones})` : ''}` },
    { id: 'metricas', nombre: 'Métricas' },
    { id: 'ajustes', nombre: 'Ajustes' },
  ];
  return (
    <div className="duenio" style={estilo}>
      <AvisoDemo texto="Vehículos, consultas y precios de ejemplo" />
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
              <div style={{ fontSize: 13, opacity: 0.9 }}>Panel de la agencia · {m.autos} autos y {m.motos} motos</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="ojo" size={18} /> Ver catálogo</Link>
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
        {pestana === 'stock' && <Stock config={config} estado={estado} actualizar={actualizar} ahora={ahora} />}
        {pestana === 'pruebas' && <Pruebas config={config} estado={estado} actualizar={actualizar} ahora={ahora} />}
        {pestana === 'usados' && <Usados config={config} estado={estado} actualizar={actualizar} />}
        {pestana === 'metricas' && <Metricas config={config} estado={estado} ahora={ahora} />}
        {pestana === 'ajustes' && <Ajustes slug={slug} config={config} estado={estado} actualizar={actualizar} />}
      </main>
    </div>
  );
}

// ---------------- Consultas ----------------

function Consultas({ config, estado, actualizar, ahora }: { config: DemoConfig; estado: EstadoAutos; actualizar: ActualizarAutos; ahora: number }) {
  const [filtro, setFiltro] = useState<Consulta['estado'] | 'todas'>('todas');
  const lista = [...estado.consultas].filter((c) => filtro === 'todas' || c.estado === filtro).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const p = (v: number) => precioAuto(v, config.moneda);
  return (
    <section className="d-card" aria-labelledby="t-cons">
      <h2 id="t-cons">Consultas</h2>
      <p className="sub">Cada consulta llega con el vehículo que miró el cliente, la cuota que simuló, su usado y la prueba de manejo.</p>
      <div className="ag-profs" role="group" aria-label="Filtrar consultas" style={{ marginBottom: 12 }}>
        {(['todas', 'nueva', 'contactada', 'cerrada', 'perdida'] as const).map((x) => (
          <button key={x} type="button" aria-pressed={filtro === x} onClick={() => setFiltro(x)}>{x === 'todas' ? 'Todas' : NOMBRE_ESTADO_CONSULTA[x]}</button>
        ))}
      </div>
      <ul className="au-leads">
        {lista.map((c) => {
          const v = estado.vehiculos.find((x) => x.id === c.vehiculoId);
          const pr = c.pruebaId ? estado.pruebas.find((x) => x.id === c.pruebaId) : undefined;
          return (
            <li key={c.id} className={c.estado === 'nueva' ? 'nueva' : undefined}>
              <span className="bar-avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
              <div className="au-lead-txt">
                <strong>{c.nombre} <span className={`au-tipo t-${c.tipo}`}>{NOMBRE_TIPO[c.tipo]}</span></strong>
                <span>{v ? `${nombreVehiculo(v)} · ${p(v.precio)}` : 'Sin vehículo'}</span>
                {c.cuota && <span>Simuló {c.cuota.meses} cuotas de {p(c.cuota.cuota)} con {p(c.cuota.anticipo)} de anticipo</span>}
                {c.usado && <span>Entrega {c.usado.descripcion} {c.usado.anio}, {c.usado.km.toLocaleString('es')} km</span>}
                {pr && <span>Prueba de manejo: {nombreDia(pr.inicio, new Date(ahora))} {hora(pr.inicio)} h</span>}
                <small>{hace(c.fecha, ahora)}</small>
              </div>
              <div className="au-lead-acc">
                <label className="sr-only" htmlFor={`est-${c.id}`}>Estado de la consulta de {c.nombre}</label>
                <select id={`est-${c.id}`} className="c-inp" value={c.estado} onChange={(e) => actualizar((x) => ({ ...x, consultas: x.consultas.map((y) => (y.id === c.id ? { ...y, estado: e.target.value as Consulta['estado'] } : y)) }))}>
                  {(['nueva', 'contactada', 'cerrada', 'perdida'] as const).map((s) => <option key={s} value={s}>{NOMBRE_ESTADO_CONSULTA[s]}</option>)}
                </select>
                <a className="d-btn prim" href={enlaceWhatsApp(c.whatsapp, mensajeRespuesta(c, v, { negocio: config.negocio, moneda: config.moneda }))} target="_blank" rel="noopener noreferrer" onClick={() => c.estado === 'nueva' && actualizar((x) => ({ ...x, consultas: x.consultas.map((y) => (y.id === c.id ? { ...y, estado: 'contactada' } : y)) }))}>
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

// ---------------- Stock ----------------

const CARROCERIAS: { id: Carroceria; nombre: string; tipo: Vehiculo['tipo'] }[] = [
  { id: 'sedan', nombre: 'Sedán', tipo: 'auto' },
  { id: 'hatch', nombre: 'Hatchback', tipo: 'auto' },
  { id: 'suv', nombre: 'SUV', tipo: 'auto' },
  { id: 'pickup', nombre: 'Pick-up', tipo: 'auto' },
  { id: 'naked', nombre: 'Moto calle', tipo: 'moto' },
  { id: 'scooter', nombre: 'Scooter', tipo: 'moto' },
  { id: 'enduro', nombre: 'Moto enduro', tipo: 'moto' },
];

function Stock({ config, estado, actualizar, ahora }: { config: DemoConfig; estado: EstadoAutos; actualizar: ActualizarAutos; ahora: number }) {
  const [ver, setVer] = useState<'activos' | 'vendidos'>('activos');
  const [alta, setAlta] = useState(false);
  const [msg, setMsg] = useState('');
  const consultasPor = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of estado.consultas) if (c.vehiculoId) m.set(c.vehiculoId, (m.get(c.vehiculoId) ?? 0) + 1);
    return m;
  }, [estado.consultas]);
  const lista = estado.vehiculos.filter((v) => (ver === 'vendidos' ? v.estado === 'vendido' : v.estado !== 'vendido')).sort((a, b) => diasEnStock(b, ahora) - diasEnStock(a, ahora));
  const cambiar = (id: string, cambios: Partial<Vehiculo>) => actualizar((e) => ({ ...e, vehiculos: e.vehiculos.map((v) => (v.id === id ? { ...v, ...cambios } : v)) }));
  return (
    <section className="d-card" aria-labelledby="t-stock">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h2 id="t-stock">Stock</h2>
          <p className="sub">Ordenado por días publicados. Los que pasan 60 días se marcan para revisar precio o destacarlos.</p>
        </div>
        <button type="button" className="d-btn prim" onClick={() => setAlta((x) => !x)}><Icono nombre="mas" size={18} /> Cargar vehículo</button>
      </div>
      {alta && <AltaVehiculo actualizar={actualizar} onListo={(t) => { setAlta(false); setMsg(t); }} />}
      {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
      <div className="ag-profs" role="group" aria-label="Ver" style={{ margin: '4px 0 12px' }}>
        <button type="button" aria-pressed={ver === 'activos'} onClick={() => setVer('activos')}>En venta</button>
        <button type="button" aria-pressed={ver === 'vendidos'} onClick={() => setVer('vendidos')}>Vendidos</button>
      </div>
      <ul className="au-stock">
        {lista.map((v) => {
          const dias = diasEnStock(v, ahora);
          return (
            <li key={v.id} className={dias >= 60 && v.estado !== 'vendido' ? 'lento' : undefined}>
              <span className="au-mini" style={{ '--tinte': v.colorHex } as React.CSSProperties}><VehiculoArte carroceria={v.carroceria} color={v.colorHex} /></span>
              <div className="au-stock-txt">
                <strong>{v.modelo}{v.cerokm && <span className="au-badge cero">0 km</span>}</strong>
                <span>{v.marca} · {resumenVehiculo(v)} · {v.color}</span>
                <span>{dias} días publicado · {v.vistas} vistas · {(consultasPor.get(v.id) ?? 0) === 1 ? '1 consulta' : `${consultasPor.get(v.id) ?? 0} consultas`}{dias >= 60 && v.estado !== 'vendido' ? ' · no rota' : ''}</span>
              </div>
              <div className="au-stock-acc">
                <label className="au-precio-ed">
                  <span className="sr-only">Precio de {v.modelo}</span>
                  <input className="c-inp" inputMode="numeric" defaultValue={v.precio} onBlur={(e) => { const n = Number(soloDigitos(e.target.value)); if (n > 0 && n !== v.precio) cambiar(v.id, { precio: n }); }} aria-label={`Precio de ${v.modelo}`} />
                </label>
                <select className="c-inp" aria-label={`Estado de ${v.modelo}`} value={v.estado} onChange={(e) => {
                  const est = e.target.value as Vehiculo['estado'];
                  cambiar(v.id, { estado: est, vendido: est === 'vendido' ? new Date().toISOString() : undefined });
                }}>
                  <option value="disponible">Disponible</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                </select>
                <button type="button" className="d-btn" aria-pressed={!!v.destacado} onClick={() => cambiar(v.id, { destacado: !v.destacado })}><Icono nombre="estrella" size={16} /> {v.destacado ? 'Destacado' : 'Destacar'}</button>
              </div>
            </li>
          );
        })}
        {!lista.length && <li>No hay vehículos acá.</li>}
      </ul>
      <p className="sub" style={{ marginTop: 12 }}>Precios en {config.moneda}. Cambiá el precio y salí del campo para guardarlo.</p>
    </section>
  );
}

function AltaVehiculo({ actualizar, onListo }: { actualizar: ActualizarAutos; onListo: (t: string) => void }) {
  const anio = new Date().getFullYear();
  const [f, setF] = useState({ carroceria: 'sedan' as Carroceria, marca: '', modelo: '', anio: String(anio - 3), km: '', precio: '', color: COLORES[1].nombre, combustible: 'Nafta' as Vehiculo['combustible'], caja: 'Manual' as Vehiculo['caja'] });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const color = COLORES.find((c) => c.nombre === f.color) ?? COLORES[0];
  return (
    <form
      className="au-alta"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.modelo.trim().length < 3 || !Number(soloDigitos(f.precio))) return setErr('Completá al menos el modelo y el precio.');
        const tipo = CARROCERIAS.find((c) => c.id === f.carroceria)!.tipo;
        const km = Number(soloDigitos(f.km)) || 0;
        const v: Vehiculo = {
          id: nuevoId('v'),
          tipo,
          carroceria: f.carroceria,
          marca: f.marca.trim() || 'Sin marca',
          modelo: f.modelo.trim(),
          anio: Number(f.anio) || anio,
          km,
          combustible: f.combustible,
          caja: f.caja,
          color: color.nombre,
          colorHex: color.hex,
          precio: Number(soloDigitos(f.precio)),
          cerokm: km === 0 || undefined,
          estado: 'disponible',
          ingreso: new Date().toISOString(),
          aceptaPermuta: true,
          financiable: true,
          equipamiento: [],
          vistas: 0,
        };
        const error = actualizar((x) => ({ ...x, vehiculos: [v, ...x.vehiculos] }));
        if (error) return setErr(error);
        onListo(`${v.modelo} quedó publicado en el catálogo.`);
      }}
    >
      <span className="au-alta-vista" style={{ '--tinte': color.hex } as React.CSSProperties}><VehiculoArte carroceria={f.carroceria} color={color.hex} /></span>
      <div className="au-alta-campos">
        <label>Tipo<select className="c-inp" value={f.carroceria} onChange={set('carroceria')}>{CARROCERIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
        <label>Marca<input className="c-inp" value={f.marca} onChange={set('marca')} placeholder="Como figura en tu stock" /></label>
        <label>Modelo y versión<input className="c-inp" value={f.modelo} onChange={set('modelo')} placeholder="Ej.: SUV 1.6 manual" /></label>
        <label>Año<input className="c-inp" inputMode="numeric" value={f.anio} onChange={set('anio')} /></label>
        <label>Kilómetros<input className="c-inp" inputMode="numeric" value={f.km} onChange={set('km')} placeholder="0 si es 0 km" /></label>
        <label>Precio<input className="c-inp" inputMode="numeric" value={f.precio} onChange={set('precio')} /></label>
        <label>Color<select className="c-inp" value={f.color} onChange={set('color')}>{COLORES.map((c) => <option key={c.nombre}>{c.nombre}</option>)}</select></label>
        <label>Combustible<select className="c-inp" value={f.combustible} onChange={set('combustible')}>{['Nafta', 'Diésel', 'Híbrido', 'Eléctrico'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Caja<select className="c-inp" value={f.caja} onChange={set('caja')}>{['Manual', 'Automática'].map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      {err && <p className="bar-err" role="alert">{err}</p>}
      <div><button type="submit" className="d-btn prim">Publicar en el catálogo</button></div>
      <p className="sub" style={{ margin: 0 }}>Las fotos reales del vehículo se suman en el módulo de fotos (próximamente); en la demo se muestra la ilustración.</p>
    </form>
  );
}

// ---------------- Pruebas de manejo ----------------

function Pruebas({ config, estado, actualizar, ahora }: { config: DemoConfig; estado: EstadoAutos; actualizar: ActualizarAutos; ahora: number }) {
  const proximas = estado.pruebas.filter((p) => +new Date(p.fin) >= ahora - 3_600_000 && p.estado !== 'cancelado').sort((a, b) => a.inicio.localeCompare(b.inicio));
  const dias = [...new Set(proximas.map((p) => claveDia(p.inicio)))];
  const cambiar = (id: string, est: Prueba['estado']) => actualizar((e) => ({ ...e, pruebas: e.pruebas.map((p) => (p.id === id ? { ...p, estado: est } : p)) }));
  return (
    <section className="d-card" aria-labelledby="t-pru">
      <h2 id="t-pru">Pruebas de manejo</h2>
      <p className="sub">Las reserva el cliente desde la ficha del vehículo. Un vehículo no se puede reservar dos veces en el mismo horario.</p>
      {!proximas.length && <p className="tie-vacio">No hay pruebas próximas.</p>}
      {dias.map((d) => (
        <div key={d} style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, margin: '6px 0 8px', textTransform: 'capitalize' }}>{nombreDia(d + 'T12:00:00', new Date(ahora))}</h3>
          <ul className="au-leads">
            {proximas.filter((p) => claveDia(p.inicio) === d).map((p) => {
              const v = estado.vehiculos.find((x) => x.id === p.profId);
              const c = estado.consultas.find((x) => x.id === p.clienteId);
              const recordatorio = c && v ? `Hola ${c.nombre.split(' ')[0]}, te esperamos en ${config.negocio} ${nombreDia(p.inicio)} a las ${hora(p.inicio)} h para probar el ${nombreVehiculo(v)}. Traé tu registro de conducir. ¿Confirmás?` : '';
              return (
                <li key={p.id}>
                  <strong className="au-hora">{hora(p.inicio)}</strong>
                  {v && <span className="au-mini chica" style={{ '--tinte': v.colorHex } as React.CSSProperties}><VehiculoArte carroceria={v.carroceria} color={v.colorHex} /></span>}
                  <div className="au-lead-txt">
                    <strong>{c?.nombre ?? 'Cliente'} <span className={`bar-estado est-${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</span></strong>
                    <span>{v ? nombreVehiculo(v) : ''}</span>
                  </div>
                  <div className="au-lead-acc">
                    {p.estado === 'reservado' && <button type="button" className="d-btn" onClick={() => cambiar(p.id, 'confirmado')}>Confirmar</button>}
                    {(p.estado === 'reservado' || p.estado === 'confirmado') && <button type="button" className="d-btn" onClick={() => cambiar(p.id, 'atendido')}>Realizada</button>}
                    {(p.estado === 'reservado' || p.estado === 'confirmado') && <button type="button" className="d-btn peligro" onClick={() => cambiar(p.id, 'cancelado')}>Cancelar</button>}
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

// ---------------- Usados para tasar ----------------

function Usados({ config, estado, actualizar }: { config: DemoConfig; estado: EstadoAutos; actualizar: ActualizarAutos }) {
  const lista = estado.consultas.filter((c) => c.usado).sort((a, b) => Number(!!a.usado?.ofrecido) - Number(!!b.usado?.ofrecido) || b.fecha.localeCompare(a.fecha));
  return (
    <section className="d-card" aria-labelledby="t-usa">
      <h2 id="t-usa">Usados para tasar</h2>
      <p className="sub">El cliente cuenta qué entrega. Vos cargás el valor que ofrecés y se lo mandás por WhatsApp. La demo nunca inventa una tasación.</p>
      <ul className="au-leads">
        {lista.map((c) => {
          const v = estado.vehiculos.find((x) => x.id === c.vehiculoId);
          return (
            <li key={c.id}>
              <span className="bar-avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
              <div className="au-lead-txt">
                <strong>{c.usado!.descripcion} {c.usado!.anio}</strong>
                <span>{c.usado!.km.toLocaleString('es')} km · de {c.nombre}{v ? ` · quiere el ${v.modelo}` : ''}</span>
                {c.usado!.ofrecido ? <span>Ofrecido: {precioAuto(c.usado!.ofrecido, config.moneda)}</span> : <span>Sin tasar</span>}
              </div>
              <form className="au-lead-acc" onSubmit={(e) => {
                e.preventDefault();
                const n = Number(soloDigitos(String(new FormData(e.currentTarget).get('valor') ?? '')));
                if (!n) return;
                const nueva = { ...c, usado: { ...c.usado!, ofrecido: n }, estado: 'contactada' as const };
                actualizar((x) => ({ ...x, consultas: x.consultas.map((y) => (y.id === c.id ? nueva : y)) }));
                window.open(enlaceWhatsApp(c.whatsapp, mensajeRespuesta(nueva, v, { negocio: config.negocio, moneda: config.moneda })), '_blank', 'noopener');
              }}>
                <input name="valor" className="c-inp" inputMode="numeric" defaultValue={c.usado!.ofrecido ?? ''} placeholder="Valor que ofrecés" aria-label={`Valor que ofrecés por el usado de ${c.nombre}`} style={{ width: 170 }} />
                <button type="submit" className="d-btn prim"><Icono nombre="whatsapp" size={16} /> Enviar oferta</button>
              </form>
            </li>
          );
        })}
        {!lista.length && <li>Todavía no hay usados para tasar.</li>}
      </ul>
    </section>
  );
}

// ---------------- Métricas ----------------

function Metricas({ config, estado, ahora }: { config: DemoConfig; estado: EstadoAutos; ahora: number }) {
  const m = metricas(estado, ahora);
  const max = Math.max(1, ...m.porVehiculo.map((x) => x.consultas));
  return (
    <>
      <section className="d-card" aria-labelledby="t-met">
        <h2 id="t-met">Cómo viene la agencia</h2>
        <p className="sub">Datos de ejemplo de las últimas semanas.</p>
        <div className="met-grid">
          <div className="met"><strong>{m.consultas7}</strong><span>Consultas en 7 días</span></div>
          <div className="met"><strong>{m.pruebasProximas}</strong><span>Pruebas de manejo próximas</span></div>
          <div className="met"><strong>{m.vendidos30}</strong><span>Vendidos en 30 días</span></div>
          <div className="met"><strong>{m.promedioDias} días</strong><span>Promedio publicado en stock</span></div>
          <div className="met"><strong>{Math.round(m.conversion * 100)}%</strong><span>Consultas que terminaron en venta (30 días)</span></div>
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-mas">
        <h2 id="t-mas">Los más consultados</h2>
        <ul className="met-barras">
          {m.porVehiculo.slice(0, 6).map(({ v, consultas }) => (
            <li key={v.id}><span>{v.modelo} {v.cerokm ? '0 km' : v.anio}</span><span className="ag-barra grande"><span style={{ width: `${(consultas / max) * 100}%` }} /></span><strong>{consultas}</strong></li>
          ))}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-lentos">
        <h2 id="t-lentos">Stock que no rota (más de 60 días)</h2>
        {m.noRotan.length ? (
          <ul className="met-barras">
            {m.noRotan.map(({ v, dias }) => (
              <li key={v.id}><span>{v.modelo} {v.anio}</span><span>{precioAuto(v.precio, config.moneda)}</span><strong>{dias} d</strong></li>
            ))}
          </ul>
        ) : <p className="sub">Ningún vehículo pasó los 60 días.</p>}
      </section>
    </>
  );
}

// ---------------- Ajustes ----------------

function Ajustes({ slug, config, estado, actualizar }: { slug: string; config: DemoConfig; estado: EstadoAutos; actualizar: ActualizarAutos }) {
  const [msg, setMsg] = useState('');
  return (
    <section className="d-card" aria-labelledby="t-aj">
      <h2 id="t-aj">Ajustes de la agencia</h2>
      <form
        style={{ display: 'grid', gap: 12, maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const wa = soloDigitos(String(f.get('whatsapp') ?? ''));
          if (wa.length < 8) return setMsg('Revisá el WhatsApp: incluí código de país y de área.');
          const plazos = String(f.get('plazos') ?? '').split(/[^0-9]+/).map(Number).filter((n) => n >= 3 && n <= 120).sort((a, b) => a - b);
          if (!plazos.length) return setMsg('Escribí al menos un plazo, por ejemplo 12, 24, 36.');
          try {
            actualizarDemo(slug, { whatsapp: wa, direccion: String(f.get('direccion') ?? '').trim() });
            const err = actualizar((x) => ({
              ...x,
              ajustes: {
                anticipoMin: Math.min(90, Math.max(0, Number(f.get('anticipo')) || 0)),
                tasaMensual: Math.min(15, Math.max(0, Number(String(f.get('tasa')).replace(',', '.')) || 0)),
                plazos: [...new Set(plazos)].slice(0, 6),
              },
            }));
            setMsg(err ?? 'Ajustes guardados.');
          } catch (er) {
            setMsg(er instanceof Error ? er.message : 'No se pudieron guardar los ajustes.');
          }
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>WhatsApp de la agencia<input name="whatsapp" className="c-inp" defaultValue={config.whatsapp} inputMode="tel" /></label>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Dirección<input name="direccion" className="c-inp" defaultValue={config.direccion} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Anticipo mínimo (%)<input name="anticipo" type="number" min={0} max={90} className="c-inp" defaultValue={estado.ajustes.anticipoMin} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Tasa mensual de referencia (%)<input name="tasa" inputMode="decimal" className="c-inp" defaultValue={estado.ajustes.tasaMensual} /></label>
        </div>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>Plazos que ofrecés (cuotas)<input name="plazos" className="c-inp" defaultValue={estado.ajustes.plazos.join(', ')} />
          <span style={{ fontWeight: 400, fontSize: 13, color: '#55555f' }}>La cuota que ve el cliente es una estimación; la tasa real la define la financiera.</span>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="d-btn prim">Guardar ajustes</button>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Volver a los datos de ejemplo? Se pierden los cambios.')) { reiniciarDatos(slug, config.moneda, 'autos'); setMsg('La agencia volvió a los datos de ejemplo.'); } }}>Volver a los datos de ejemplo</button>
        </div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}

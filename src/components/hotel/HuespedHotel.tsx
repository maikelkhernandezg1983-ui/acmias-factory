'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icono } from '@/components/Icono';
import { FotoPlato } from '@/components/demo/FotoPlato';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { NOMBRE_AREA, NOMBRE_CATEGORIA_RS, NOMBRE_TIPO_HAB, PEDIDOS_RAPIDOS, cuenta, dinero, estadiaActiva, hace, pedirRoomService, pedirServicio, porCodigo } from '@/lib/rubros/hotel/logica';
import type { Area, CategoriaRS, EstadoHotel, Habitacion, LineaRS, Solicitud } from '@/lib/rubros/hotel/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { useAhoraHotel, useCodigoHab, useDemoHotel, type ActualizarHotel } from './useHotel';

type Vista = 'inicio' | 'room' | Exclude<Area, 'cocina'> | 'cuenta';

const MOSAICOS: { id: Vista; titulo: string; texto: string; icono: Parameters<typeof Icono>[0]['nombre'] }[] = [
  { id: 'room', titulo: 'Room service', texto: 'Desayuno, platos y bebidas a la habitación', icono: 'carrito' },
  { id: 'limpieza', titulo: 'Limpieza', texto: 'Toallas, limpieza, almohadas', icono: 'casa' },
  { id: 'mantenimiento', titulo: 'Algo no funciona', texto: 'Aire, ducha, TV, luz, wifi', icono: 'llave' },
  { id: 'recepcion', titulo: 'Recepción', texto: 'Despertador, taxi, late checkout', icono: 'telefono' },
];

/** Lo que ve el huésped al escanear el QR de su habitación. */
export function HuespedHotel({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoHotel(slug);
  const codigo = useCodigoHab();
  const [elegida, setElegida] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('inicio');
  const [toast, setToast] = useState('');
  const ahora = useAhoraHotel();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const hab = porCodigo(estado, elegida ?? codigo);
  const est = hab && estadiaActiva(estado, hab.id);

  if (!hab || !est) return <ElegirHabitacion config={config} estado={estado} estilo={estilo} codigoInvalido={!!codigo && !hab} sinEstadia={!!hab && !est} onElegir={setElegida} />;

  const listo2 = (t: string) => { setVista('inicio'); setToast(t); window.scrollTo({ top: 0 }); };
  return (
    <div className="ho" style={estilo}>
      <AvisoDemo texto="Huéspedes y pedidos ficticios" />
      <header className="ho-cab">
        <div className="ho-cab-in">
          <div className="ho-marca">
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt="" />
            ) : (
              <span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
            )}
            <span>{config.negocio}</span>
          </div>
          <p className="ho-hab">Habitación <strong>{hab.numero}</strong></p>
          <h1>Hola, {est.huesped.split(' ')[0]}</h1>
          <p className="ho-sub">¿Qué necesitás? Pedilo desde acá, sin llamar.</p>
        </div>
        <svg className="ho-ola" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 C 80 2, 160 40, 240 20 S 360 6, 400 18 L400 40 L0 40 Z" /></svg>
      </header>
      <main className="ho-main">
        {vista === 'inicio' && <Inicio config={config} estado={estado} hab={hab} ahora={ahora} onVista={setVista} />}
        {vista === 'room' && <RoomService config={config} estado={estado} hab={hab} actualizar={actualizar} onVolver={() => setVista('inicio')} onListo={listo2} />}
        {(vista === 'limpieza' || vista === 'mantenimiento' || vista === 'recepcion') && <Servicio area={vista} hab={hab} actualizar={actualizar} onVolver={() => setVista('inicio')} onListo={listo2} />}
        {vista === 'cuenta' && <MiCuenta config={config} estado={estado} estadiaId={est.id} onVolver={() => setVista('inicio')} />}
      </main>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Icono nombre="check" size={16} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

function ElegirHabitacion({ config, estado, estilo, codigoInvalido, sinEstadia, onElegir }: { config: DemoConfig; estado: EstadoHotel; estilo?: React.CSSProperties; codigoInvalido: boolean; sinEstadia: boolean; onElegir: (c: string) => void }) {
  const ocupadas = estado.habitaciones.filter((h) => h.estado === 'ocupada' && estadiaActiva(estado, h.id));
  return (
    <div className="ho" style={estilo}>
      <AvisoDemo texto="Huéspedes y pedidos ficticios" />
      <header className="ho-cab">
        <div className="ho-cab-in">
          <div className="ho-marca"><span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span><span>{config.negocio}</span></div>
          <h1>Tu habitación, a un toque</h1>
          <p className="ho-sub">En el hotel, cada habitación tiene su QR. Para probar la demo, elegí una habitación ocupada.</p>
        </div>
        <svg className="ho-ola" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 C 80 2, 160 40, 240 20 S 360 6, 400 18 L400 40 L0 40 Z" /></svg>
      </header>
      <main className="ho-main">
        {(codigoInvalido || sinEstadia) && <p className="bar-err" role="alert">{codigoInvalido ? 'Este QR no corresponde a una habitación del hotel.' : 'Esta habitación no tiene huéspedes ahora. Consultá en recepción.'}</p>}
        <section className="d-card">
          <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>Probar como huésped</h2>
          <div className="ho-elegir" role="group" aria-label="Habitaciones ocupadas">
            {ocupadas.map((h) => {
              const e = estadiaActiva(estado, h.id)!;
              return (
                <button key={h.id} type="button" onClick={() => onElegir(h.codigo)}>
                  <strong>{h.numero}</strong>
                  <span>{e.huesped.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function Inicio({ config, estado, hab, ahora, onVista }: { config: DemoConfig; estado: EstadoHotel; hab: Habitacion; ahora: number; onVista: (v: Vista) => void }) {
  const [copiado, setCopiado] = useState(false);
  const est = estadiaActiva(estado, hab.id)!;
  const mios = estado.solicitudes
    .filter((s) => s.estadiaId === est.id && s.estado !== 'cancelada' && (s.estado !== 'lista' || ahora - +new Date(s.lista ?? s.fecha) < 3 * 3_600_000))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const c = cuenta(estado, est.id);
  return (
    <>
      <div className="ho-mosaicos">
        {MOSAICOS.map((m) => (
          <button key={m.id} type="button" className={`ho-mosaico m-${m.id}`} onClick={() => onVista(m.id)}>
            <span className="ho-icono" aria-hidden="true"><Icono nombre={m.icono} size={26} /></span>
            <strong>{m.titulo}</strong>
            <span>{m.texto}</span>
          </button>
        ))}
      </div>

      {mios.length > 0 && (
        <section className="d-card" aria-labelledby="ho-t-ped">
          <h2 id="ho-t-ped" className="ho-h2">Tus pedidos</h2>
          <ul className="ho-pedidos">
            {mios.map((s) => <PedidoHuesped key={s.id} s={s} ahora={ahora} moneda={config.moneda} />)}
          </ul>
        </section>
      )}

      <section className="d-card ho-wifi" aria-labelledby="ho-t-wifi">
        <span className="ho-icono chico" aria-hidden="true"><Icono nombre="enlace" size={20} /></span>
        <div>
          <h2 id="ho-t-wifi" className="ho-h2">Wifi</h2>
          <p>Red <strong>{estado.ajustes.wifiRed}</strong> · Clave <strong>{estado.ajustes.wifiClave}</strong></p>
        </div>
        <button type="button" className="d-btn" onClick={() => { navigator.clipboard?.writeText(estado.ajustes.wifiClave).catch(() => {}); setCopiado(true); }}>{copiado ? 'Copiada' : 'Copiar clave'}</button>
      </section>

      <section className="d-card ho-info">
        <div><span>Desayuno</span><strong>{estado.ajustes.desayuno}</strong></div>
        <div><span>Room service</span><strong>{estado.ajustes.roomService}</strong></div>
        <div><span>Check-out</span><strong>{estado.ajustes.checkout} h</strong></div>
      </section>

      <button type="button" className="d-card ho-cuenta-btn" onClick={() => onVista('cuenta')}>
        <span><strong>Mi cuenta</strong><span>{NOMBRE_TIPO_HAB[hab.tipo]} · {c.noches} {c.noches === 1 ? 'noche' : 'noches'}{c.cargos.length ? ` · ${c.cargos.length === 1 ? '1 consumo' : `${c.cargos.length} consumos`}` : ''}</span></span>
        <strong>{dinero(c.total, config.moneda)}</strong>
      </button>
    </>
  );
}

const PASOS: Solicitud['estado'][] = ['nueva', 'en-curso', 'lista'];
const TEXTO_PASO: Record<Area, [string, string, string]> = {
  cocina: ['Recibido', 'En preparación', 'Entregado'],
  limpieza: ['Recibido', 'En camino', 'Listo'],
  mantenimiento: ['Recibido', 'Revisando', 'Resuelto'],
  recepcion: ['Recibido', 'En gestión', 'Listo'],
};

function PedidoHuesped({ s, ahora, moneda }: { s: Solicitud; ahora: number; moneda: string }) {
  const paso = PASOS.indexOf(s.estado);
  return (
    <li>
      <div className="ho-ped-cab">
        <strong>{s.area === 'cocina' ? s.items?.map((l) => `${l.cantidad} ${l.nombre}`).join(', ') : s.tipo}</strong>
        <span>{NOMBRE_AREA[s.area]} · {hace(s.fecha, ahora)}{s.para ? ` · para las ${s.para}` : ''}{s.total ? ` · ${dinero(s.total, moneda)}` : ''}</span>
      </div>
      <ol className="ho-pasos" aria-label={`Estado: ${TEXTO_PASO[s.area][paso]}`}>
        {TEXTO_PASO[s.area].map((t, i) => <li key={t} className={i <= paso ? 'hecho' : undefined} aria-current={i === paso ? 'step' : undefined}>{t}</li>)}
      </ol>
    </li>
  );
}

function Volver({ onVolver, titulo }: { onVolver: () => void; titulo: string }) {
  return (
    <div className="ho-volver">
      <button type="button" className="ho-atras" onClick={onVolver} aria-label="Volver"><Icono nombre="atras" size={20} /></button>
      <h2>{titulo}</h2>
    </div>
  );
}

/** Horarios de entrega: lo antes posible o cada 30 minutos durante las próximas horas. */
function horarios(ahora: Date) {
  const xs: string[] = [];
  const d = new Date(ahora);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  d.setMinutes(d.getMinutes() + 30);
  for (let i = 0; i < 10; i++) {
    xs.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    d.setMinutes(d.getMinutes() + 30);
  }
  return xs;
}

function RoomService({ config, estado, hab, actualizar, onVolver, onListo }: { config: DemoConfig; estado: EstadoHotel; hab: Habitacion; actualizar: ActualizarHotel; onVolver: () => void; onListo: (t: string) => void }) {
  const [cat, setCat] = useState<CategoriaRS | 'todo'>('todo');
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [hoja, setHoja] = useState(false);
  const cats = useMemo(() => [...new Set(estado.carta.map((c) => c.categoria))], [estado.carta]);
  const items = estado.carta.filter((c) => cat === 'todo' || c.categoria === cat);
  const lineas: LineaRS[] = Object.entries(carrito).filter(([, n]) => n > 0).map(([id, cantidad]) => { const it = estado.carta.find((c) => c.id === id)!; return { itemId: id, nombre: it.nombre, precio: it.precio, cantidad }; });
  const total = lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);
  const cantidad = lineas.reduce((t, l) => t + l.cantidad, 0);
  const sumar = (id: string, d: number) => setCarrito((c) => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] ?? 0) + d)) }));
  return (
    <>
      <Volver onVolver={onVolver} titulo="Room service" />
      <p className="sub">Se carga a la habitación {hab.numero}. Horario: {estado.ajustes.roomService}.</p>
      <div className="ag-profs ho-cats" role="group" aria-label="Categorías">
        <button type="button" aria-pressed={cat === 'todo'} onClick={() => setCat('todo')}>Todo</button>
        {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{NOMBRE_CATEGORIA_RS[c]}</button>)}
      </div>
      <ul className="ho-carta">
        {items.map((it) => (
          <li key={it.id} className={it.disponible ? undefined : 'agotado'}>
            <FotoPlato src={it.foto} tipo={it.ilustracion} className="ho-foto" />
            <div className="ho-item-txt">
              <strong>{it.nombre}</strong>
              <span>{it.descripcion}</span>
              <b>{it.disponible ? dinero(it.precio, config.moneda) : 'No disponible ahora'}</b>
            </div>
            {it.disponible && (
              <div className="ho-cant">
                {carrito[it.id] ? (
                  <>
                    <button type="button" aria-label={`Quitar ${it.nombre}`} onClick={() => sumar(it.id, -1)}><Icono nombre="menos" size={18} /></button>
                    <span aria-live="polite">{carrito[it.id]}</span>
                  </>
                ) : null}
                <button type="button" aria-label={`Agregar ${it.nombre}`} onClick={() => sumar(it.id, 1)}><Icono nombre="mas" size={18} /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {cantidad > 0 && (
        <button type="button" className="ho-barra" onClick={() => setHoja(true)}>
          <span>Ver pedido ({cantidad})</span>
          <strong>{dinero(total, config.moneda)}</strong>
        </button>
      )}
      {hoja && (
        <HojaPedido
          config={config}
          hab={hab}
          lineas={lineas}
          total={total}
          onCerrar={() => setHoja(false)}
          onEnviar={(nota, para) => {
            let error = '';
            const err = actualizar((e) => {
              const r = pedirRoomService(e, hab.id, lineas, { nota, para });
              if ('error' in r) { error = r.error; return e; }
              return r.estado;
            });
            if (err || error) return err || error;
            onListo(`Listo: la cocina recibió tu pedido${para ? ` para las ${para}` : ''}. Se carga a la habitación ${hab.numero}.`);
            return null;
          }}
        />
      )}
    </>
  );
}

function HojaPedido({ config, hab, lineas, total, onCerrar, onEnviar }: { config: DemoConfig; hab: Habitacion; lineas: LineaRS[]; total: number; onCerrar: () => void; onEnviar: (nota: string, para?: string) => string | null }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [nota, setNota] = useState('');
  const [para, setPara] = useState('');
  const [error, setError] = useState('');
  const [opciones] = useState(() => horarios(new Date()));
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="ho-t-hoja" ref={ref}>
        <div className="hoja-cab">
          <h2 id="ho-t-hoja">Tu pedido · Habitación {hab.numero}</h2>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={20} /></button>
        </div>
        <ul className="ho-resumen">
          {lineas.map((l) => <li key={l.itemId}><span>{l.cantidad} × {l.nombre}</span><span>{dinero(l.precio * l.cantidad, config.moneda)}</span></li>)}
          <li className="total"><span>Total a cargar en la habitación</span><span>{dinero(total, config.moneda)}</span></li>
        </ul>
        <label className="ho-campo">¿Cuándo lo querés?
          <select className="c-inp" value={para} onChange={(e) => setPara(e.target.value)}>
            <option value="">Lo antes posible (30 a 40 min)</option>
            {opciones.map((h) => <option key={h} value={h}>A las {h}</option>)}
          </select>
        </label>
        <label className="ho-campo">Aclaraciones (opcional)
          <textarea className="c-inp" rows={2} maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: sin sal, con hielo, golpear despacio" />
        </label>
        {error && <p className="bar-err" role="alert">{error}</p>}
        <button type="button" className="d-btn prim ho-enviar" onClick={() => { const r = onEnviar(nota, para || undefined); if (r) setError(r); }}>Pedir a la habitación</button>
      </div>
    </div>
  );
}

const TITULO_AREA: Record<Exclude<Area, 'cocina'>, string> = { limpieza: 'Limpieza', mantenimiento: 'Algo no funciona', recepcion: 'Recepción' };

function Servicio({ area, hab, actualizar, onVolver, onListo }: { area: Exclude<Area, 'cocina'>; hab: Habitacion; actualizar: ActualizarHotel; onVolver: () => void; onListo: (t: string) => void }) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [detalle, setDetalle] = useState('');
  const [para, setPara] = useState('');
  const [error, setError] = useState('');
  const op = PEDIDOS_RAPIDOS[area].find((o) => o.tipo === tipo);
  return (
    <>
      <Volver onVolver={onVolver} titulo={TITULO_AREA[area]} />
      <p className="sub">{area === 'mantenimiento' ? 'Contanos qué pasa y mandamos a alguien.' : area === 'limpieza' ? 'Elegí lo que necesitás y lo llevamos a la habitación.' : 'Elegí qué necesitás de recepción.'}</p>
      <div className="ho-rapidos" role="group" aria-label={`Pedidos a ${NOMBRE_AREA[area]}`}>
        {PEDIDOS_RAPIDOS[area].map((o) => (
          <button key={o.tipo} type="button" aria-pressed={tipo === o.tipo} onClick={() => { setTipo(o.tipo); setError(''); }}>{o.tipo}</button>
        ))}
      </div>
      {op && (
        <form
          className="d-card ho-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (op.hora && !para) return setError('Elegí la hora.');
            let fallo = '';
            const err = actualizar((x) => {
              const r = pedirServicio(x, hab.id, area, op.tipo, { detalle, para: para || undefined });
              if ('error' in r) { fallo = r.error; return x; }
              return r.estado;
            });
            if (err || fallo) return setError(err || fallo);
            onListo(`Listo: ${NOMBRE_AREA[area]} recibió tu pedido.`);
          }}
        >
          <strong>{op.tipo}</strong>
          {op.hora && (
            <label className="ho-campo">{op.tipo === 'Late checkout' ? 'Hasta qué hora' : op.tipo === 'Despertador' ? 'A qué hora' : 'Para qué hora'}
              <input className="c-inp" type="time" value={para} onChange={(e) => setPara(e.target.value)} />
            </label>
          )}
          {op.detalle && (
            <label className="ho-campo">{area === 'mantenimiento' ? 'Qué pasa' : 'Detalle (opcional)'}
              <textarea className="c-inp" rows={2} maxLength={200} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder={area === 'mantenimiento' ? 'Ej.: el aire no enfría' : 'Ej.: al aeropuerto'} />
            </label>
          )}
          {error && <p className="bar-err" role="alert">{error}</p>}
          <button type="submit" className="d-btn prim">Pedir</button>
        </form>
      )}
    </>
  );
}

function MiCuenta({ config, estado, estadiaId, onVolver }: { config: DemoConfig; estado: EstadoHotel; estadiaId: string; onVolver: () => void }) {
  const c = cuenta(estado, estadiaId);
  return (
    <>
      <Volver onVolver={onVolver} titulo="Mi cuenta" />
      <section className="d-card">
        <ul className="ho-resumen">
          <li><span>Alojamiento: {c.noches} {c.noches === 1 ? 'noche' : 'noches'} × {dinero(c.tarifa, config.moneda)}</span><span>{dinero(c.alojamiento, config.moneda)}</span></li>
          {c.cargos.map((x) => <li key={x.id}><span>{x.concepto}</span><span>{dinero(x.monto, config.moneda)}</span></li>)}
          <li className="total"><span>Total</span><span>{dinero(c.total, config.moneda)}</span></li>
        </ul>
        <p className="sub" style={{ marginBottom: 0 }}>La pagás al hacer el check-out en recepción. Hora de salida: {estado.ajustes.checkout} h.</p>
      </section>
    </>
  );
}

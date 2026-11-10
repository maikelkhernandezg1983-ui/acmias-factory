'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { claveUsuario, cuentaDe, dinero, nombreCompleto, primerNombre } from '@/lib/rubros/contador/logica';
import { nombreMes, sumarMeses } from '@/lib/rubros/contador/periodos';
import { EstadoPagoChip } from './PanelContador';
import { useDemoContador } from './useContador';

/** Vista del cliente del estudio: su estado de cuenta, la tarea del mes y "Ya pagué". La clave nunca se muestra acá. */
export function PortalCliente({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo, periodo, ahora } = useDemoContador(slug);
  const [usuario, setUsuario] = useState('');
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const ejemplos = estado.clientes.filter((c) => c.activo && c.ejemplo).filter((_, i) => [0, 3, 5].includes(i));
  const c = id ? estado.clientes.find((x) => x.id === id) : undefined;

  if (!c) {
    return (
      <div className="ct-portal" style={estilo}>
        <AvisoDemo texto="Clientes ficticios" />
        <div className="ct-portal-in">
          <header className="ct-portal-cab">
            <span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
            <div><strong>{config.negocio}</strong><span>Portal de clientes</span></div>
          </header>
          <form
            className="d-card"
            onSubmit={(e) => {
              e.preventDefault();
              const k = claveUsuario(usuario);
              const encontrado = k && estado.clientes.find((x) => x.activo && claveUsuario(x.usuario) === k);
              if (!encontrado) return setError('No encontramos ese usuario. Escribilo como figura en tus datos (por ejemplo, tu CUIT).');
              setError('');
              setId(encontrado.id);
            }}
          >
            <h1 className="ct-portal-tit">Tu cuenta con el estudio</h1>
            <p className="sub">Mirá qué meses están pagos, cuánto debés y en qué está tu trámite del mes.</p>
            <label htmlFor="ct-usuario" style={{ fontWeight: 700 }}>Tu usuario o CUIT</label>
            <input id="ct-usuario" className="c-inp" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="20-12345678-9" autoComplete="username" />
            {error && <p className="bar-err" role="alert">{error}</p>}
            <button type="submit" className="d-btn prim" style={{ marginTop: 10 }}>Ver mi cuenta</button>
            <p className="sub" style={{ marginTop: 10 }}>En la versión real entrás con un código que te llega por WhatsApp.</p>
          </form>
          <div className="d-card">
            <h2 style={{ fontSize: 16 }}>Probar con un cliente de ejemplo</h2>
            <div className="ag-profs" role="group" aria-label="Clientes de ejemplo" style={{ flexWrap: 'wrap' }}>
              {ejemplos.map((x) => <button key={x.id} type="button" onClick={() => setId(x.id)}>{nombreCompleto(x)}</button>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cuenta = cuentaDe(estado, c.id, ahora);
  const tarea = estado.tareas.find((t) => t.clienteId === c.id && t.periodo === periodo);
  const meses = Array.from({ length: 6 }, (_, i) => sumarMeses(periodo, -i)).filter((p) => p >= c.alta.slice(0, 7));
  const textoPago = `Hola ${config.negocio}, soy ${nombreCompleto(c)} (${c.usuario}). Ya pagué ${cuenta.pendientes.map((q) => nombreMes(q.periodo)).join(', ')}: ${dinero(cuenta.total, config.moneda)}. Te paso el comprobante.`;
  return (
    <div className="ct-portal" style={estilo}>
      <AvisoDemo texto="Clientes ficticios" />
      <div className="ct-portal-in">
        <header className="ct-portal-cab">
          <span className="c-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          <div><strong>{config.negocio}</strong><span>Hola, {primerNombre(c)}</span></div>
          <button type="button" className="d-btn" onClick={() => { setId(null); setAviso(''); }}>Salir</button>
        </header>
        <section className="d-card ct-saldo" aria-labelledby="ct-t-saldo">
          <h1 id="ct-t-saldo" className="ct-portal-tit">{cuenta.total ? 'Tenés para pagar' : 'Estás al día'}</h1>
          <strong className="ct-monto">{dinero(cuenta.total, config.moneda)}</strong>
          <EstadoPagoChip estado={cuenta.estado} />
          {cuenta.total > 0 && (
            <>
              <p className="sub" style={{ margin: '12px 0 6px' }}>Transferí al alias <strong>{estado.ajustes.alias}</strong> y avisá al estudio.</p>
              {cuenta.informada ? (
                <p className="ct-listo" role="status">Avisaste que pagaste. El estudio lo confirma cuando ve la transferencia.</p>
              ) : (
                <a
                  className="d-btn prim"
                  href={enlaceWhatsApp(config.whatsapp, textoPago)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const fecha = new Date().toISOString();
                    actualizar((e) => ({ ...e, cuotas: e.cuotas.map((q) => (q.clienteId === c.id && q.estado === 'pendiente' ? { ...q, informada: fecha } : q)) }));
                    setAviso('Listo: le avisaste al estudio. Cuando confirme el pago, lo vas a ver acá.');
                  }}
                >
                  <Icono nombre="whatsapp" size={18} /> Ya pagué: avisar al estudio
                </a>
              )}
            </>
          )}
          {aviso && <p role="status" className="sub">{aviso}</p>}
        </section>
        {tarea && (
          <section className="d-card" aria-labelledby="ct-t-tarea">
            <h2 id="ct-t-tarea" style={{ fontSize: 17 }}>{tarea.nombre} de {nombreMes(periodo)}</h2>
            <p style={{ margin: 0 }}>{tarea.estado === 'terminada' ? `Terminada el ${new Date(tarea.terminada!).toLocaleDateString('es')}.` : 'En preparación. Te avisamos por WhatsApp cuando esté lista.'}</p>
          </section>
        )}
        <section className="d-card" aria-labelledby="ct-t-hist">
          <h2 id="ct-t-hist" style={{ fontSize: 17 }}>Tus últimos meses</h2>
          <ul className="ct-meses">
            {meses.map((p) => {
              const q = cuenta.cuotas.find((x) => x.periodo === p);
              const venc = q ? cuenta.vencidas.includes(q) : false;
              return (
                <li key={p} className={q ? (q.estado === 'pagada' ? 'pagada' : venc ? 'vencida' : 'pendiente') : 'sin'}>
                  <div className="ct-mes-txt">
                    <strong style={{ textTransform: 'capitalize' }}>{nombreMes(p)}</strong>
                    <span>{q ? `${dinero(q.monto, config.moneda)} · ${q.estado === 'pagada' ? 'Pagado' : q.informada ? 'Avisaste que pagaste' : venc ? 'Vencido' : 'Por pagar'}` : '—'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <p className="sub" style={{ textAlign: 'center' }}><Link href={`/d/${slug}/sitio`}>Conocé el estudio</Link></p>
      </div>
    </div>
  );
}

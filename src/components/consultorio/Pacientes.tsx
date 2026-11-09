'use client';

import { useMemo, useState } from 'react';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { useAhora, type ActualizarAgenda } from '@/components/barberia/useBarberia';
import { soloDigitos } from '@/lib/utiles';
import { NOMBRE_ESTADO, fechaCorta, hora, nombreDia } from '@/lib/rubros/barberia/agenda';
import { historialCliente } from '@/lib/rubros/barberia/logica';
import { PARTICULAR } from '@/lib/rubros/consultorio/datos-ejemplo';
import type { Cliente, EstadoAgenda } from '@/lib/rubros/barberia/tipos';

const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const QUIEN = 'Secretaría (demo)';

/** Pacientes (CON-08): ficha administrativa. La historia clínica es solo una vista previa ficticia que no se guarda. */
export function Pacientes({ estado, actualizar }: { estado: EstadoAgenda; actualizar: ActualizarAgenda }) {
  const ahora = useAhora();
  const [q, setQ] = useState('');
  const [cob, setCob] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const proximo = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of estado.turnos)
      if ((t.estado === 'reservado' || t.estado === 'confirmado') && +new Date(t.inicio) > ahora && (!m.has(t.clienteId) || t.inicio < m.get(t.clienteId)!)) m.set(t.clienteId, t.inicio);
    return m;
  }, [estado.turnos, ahora]);
  const qd = soloDigitos(q);
  const lista = estado.clientes
    .filter((c) => (!q.trim() || c.nombre.toLowerCase().includes(q.trim().toLowerCase()) || (qd.length > 2 && (c.whatsapp.includes(qd) || (c.afiliado ?? '').includes(qd)))) && (!cob || c.cobertura === cob))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const c = abierto ? estado.clientes.find((x) => x.id === abierto) : null;

  function abrir(x: Cliente) {
    setAbierto(x.id);
    // CON-12: cada acceso a una ficha queda registrado.
    actualizar((e) => ({ ...e, eventos: [...(e.eventos ?? []), { fecha: new Date().toISOString(), quien: QUIEN, accion: `Abrió la ficha de ${x.nombre}` }].slice(-200) }));
  }

  return (
    <section className="d-card" aria-labelledby="t-pac">
      <h2 id="t-pac">Pacientes</h2>
      <p className="sub">Ficha administrativa: contacto, cobertura e historial de turnos. Sin datos clínicos.</p>
      <div className="tie-buscar" role="search">
        <Icono nombre="buscar" size={18} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, WhatsApp o afiliado" aria-label="Buscar pacientes" />
      </div>
      <div className="ag-profs" role="group" aria-label="Filtrar por cobertura" style={{ marginBottom: 10 }}>
        <button type="button" aria-pressed={!cob} onClick={() => setCob(null)}>Todas</button>
        {estado.coberturas?.map((x) => <button key={x} type="button" aria-pressed={cob === x} onClick={() => setCob((y) => (y === x ? null : x))}>{x}</button>)}
      </div>
      <ul className="cli-lista">
        {lista.map((x) => {
          const pr = proximo.get(x.id);
          const nuevo = +new Date(x.creado) > ahora - 30 * 86_400_000;
          return (
            <li key={x.id}>
              <button type="button" onClick={() => abrir(x)}>
                <span className="bar-avatar" aria-hidden="true">{iniciales(x.nombre)}</span>
                <span className="cli-txt">
                  <strong>{x.nombre}{nuevo && <span className="chip-rep nuevo">Nuevo</span>}{x.ausencias > 1 && <span className="chip-rep ausencias">{x.ausencias} ausencias</span>}</strong>
                  <span>{pr ? `Próximo turno: ${nombreDia(pr, new Date(ahora))} ${hora(pr)} h` : 'Sin turnos próximos'}</span>
                </span>
                <span className="chip-rep">{x.cobertura ?? PARTICULAR}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {!lista.length && <p className="tie-vacio">No encontramos pacientes con esa búsqueda.</p>}
      {c && <FichaPaciente estado={estado} paciente={c} actualizar={actualizar} onCerrar={() => setAbierto(null)} />}
    </section>
  );
}

function FichaPaciente({ estado, paciente, actualizar, onCerrar }: { estado: EstadoAgenda; paciente: Cliente; actualizar: ActualizarAgenda; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [tab, setTab] = useState<'admin' | 'hc'>('admin');
  const [wa, setWa] = useState(paciente.whatsapp);
  const [cob, setCob] = useState(paciente.cobertura ?? PARTICULAR);
  const [afiliado, setAfiliado] = useState(paciente.afiliado ?? '');
  const [notas, setNotas] = useState(paciente.notas);
  const [msg, setMsg] = useState('');
  const hist = historialCliente(estado, paciente.id);
  const serv = (id: string) => estado.servicios.find((s) => s.id === id)?.nombre ?? '';
  const prof = (id: string) => {
    const p = estado.profesionales.find((x) => x.id === id);
    return p ? `${p.titulo ?? ''} ${p.nombre}`.trim() : '';
  };
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja hoja-ancha" role="dialog" aria-modal="true" aria-labelledby="t-fp" ref={ref}>
        <div className="hoja-cab">
          <div>
            <h3 id="t-fp">{paciente.nombre}</h3>
            <p style={{ margin: '4px 0 0', color: '#55555f' }}>{paciente.cobertura ?? PARTICULAR}{paciente.afiliado ? ` · Afiliado ${paciente.afiliado}` : ''} · {hist.length} turnos</p>
          </div>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <div className="seg" role="group" aria-label="Secciones de la ficha" style={{ marginBottom: 14 }}>
          <button type="button" aria-pressed={tab === 'admin'} onClick={() => setTab('admin')}>Datos y turnos</button>
          <button type="button" aria-pressed={tab === 'hc'} onClick={() => setTab('hc')}>Historia clínica · Próximamente</button>
        </div>

        {tab === 'admin' ? (
          <>
            <form
              className="bar-form"
              style={{ marginTop: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (soloDigitos(wa).length < 8) return setMsg('Revisá el WhatsApp: incluí código de país y de área.');
                if (cob !== PARTICULAR && afiliado.trim().length < 3) return setMsg('Escribí el número de afiliado.');
                const err = actualizar((x) => ({
                  ...x,
                  clientes: x.clientes.map((y) => (y.id === paciente.id ? { ...y, whatsapp: soloDigitos(wa), cobertura: cob, afiliado: cob === PARTICULAR ? undefined : afiliado.trim(), notas: notas.trim() } : y)),
                  eventos: [...(x.eventos ?? []), { fecha: new Date().toISOString(), quien: QUIEN, accion: `Editó los datos de ${paciente.nombre}` }].slice(-200),
                }));
                setMsg(err ?? 'Datos guardados.');
              }}
            >
              <div className="fila-2">
                <label>WhatsApp<input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" /></label>
                <label>Cobertura
                  <select className="c-inp" value={cob} onChange={(e) => setCob(e.target.value)}>
                    {estado.coberturas?.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
              </div>
              {cob !== PARTICULAR && <label>Número de afiliado<input className="c-inp" value={afiliado} onChange={(e) => setAfiliado(e.target.value)} /></label>}
              <label>Notas administrativas
                <textarea className="c-inp" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
                <span className="bar-ayuda">Solo preferencias de contacto u horario. No escribas síntomas, diagnósticos ni tratamientos.</span>
              </label>
              <div><button type="submit" className="d-btn prim">Guardar datos</button></div>
              {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
            </form>
            {paciente.ausencias > 0 && <p className="bar-notas" style={{ marginTop: 14 }}><Icono nombre="info" size={16} /> Faltó {paciente.ausencias} {paciente.ausencias === 1 ? 'vez' : 'veces'} sin avisar. El recordatorio por WhatsApp ayuda.</p>}
            <h4 style={{ margin: '18px 0 8px' }}>Historial de turnos</h4>
            <ul className="fc-hist">
              {hist.slice(0, 12).map((t) => (
                <li key={t.id}>
                  <span>{fechaCorta(new Date(t.inicio))} · {hora(t.inicio)}</span>
                  <span>{serv(t.servicioId)} · {prof(t.profId)}{t.sobreturno ? ' · Sobreturno' : ''}</span>
                  <span className={`bar-estado est-${t.estado}`}>{NOMBRE_ESTADO[t.estado]}</span>
                </li>
              ))}
              {!hist.length && <li>Sin turnos todavía.</li>}
            </ul>
          </>
        ) : (
          <VistaPreviaHC estado={estado} paciente={paciente} />
        )}
      </div>
    </div>
  );
}

/**
 * Vista previa de la historia clínica (módulo próximamente). Todo es texto ficticio y genérico
 * armado en pantalla: no se guarda en ningún lado y no se puede editar.
 */
function VistaPreviaHC({ estado, paciente }: { estado: EstadoAgenda; paciente: Cliente }) {
  const atendidos = historialCliente(estado, paciente.id).filter((t) => t.estado === 'atendido').slice(0, 4);
  const texto = (servicioId: string, i: number) => {
    const clinica = ['Consulta de control. Se conversan hábitos y se pide laboratorio de rutina.', 'Lectura de resultados dentro de valores esperados. Control en 6 meses.', 'Apto físico para actividad deportiva recreativa.'];
    const nutri = ['Entrevista inicial. Se acuerda un plan de alimentación con objetivos semanales.', 'Seguimiento: buena adherencia al plan. Se ajustan colaciones.'];
    const l = servicioId.startsWith('q-nutri') || servicioId.startsWith('q-seguim') ? nutri : clinica;
    return l[i % l.length];
  };
  return (
    <div className="hc-previa" aria-label="Vista previa de historia clínica con datos ficticios">
      <div className="hc-aviso">
        <Icono nombre="candado" size={18} />
        <div>
          <strong>Vista previa con datos ficticios · Módulo próximamente</strong>
          <span>No se guarda ni se puede editar. La historia clínica real necesita firma digital del profesional, consentimiento del paciente y conservación por los años que pide la ley de cada país.</span>
        </div>
      </div>
      <div className="hc-grid">
        <div><small>Antecedentes</small><p>Sin antecedentes relevantes (ejemplo).</p></div>
        <div><small>Alergias</small><p>No refiere (ejemplo).</p></div>
        <div><small>Medicación habitual</small><p>Ninguna (ejemplo).</p></div>
      </div>
      <h4 style={{ margin: '16px 0 8px' }}>Evoluciones</h4>
      <ol className="hc-evol">
        {atendidos.map((t, i) => {
          const p = estado.profesionales.find((x) => x.id === t.profId);
          return (
            <li key={t.id}>
              <div className="hc-evol-cab"><strong>{fechaCorta(new Date(t.inicio))}</strong><span>{p ? `${p.titulo ?? ''} ${p.nombre}`.trim() : ''}</span><span className="chip-rep">Firma digital: próximamente</span></div>
              <p>{texto(t.servicioId, i)}</p>
            </li>
          );
        })}
        {!atendidos.length && <li><p>Todavía no hay consultas atendidas.</p></li>}
      </ol>
      <div className="hc-proximo">
        <span><Icono nombre="planilla" size={16} /> Estudios y archivos adjuntos</span>
        <span><Icono nombre="texto" size={16} /> Receta electrónica</span>
        <span><Icono nombre="imprimir" size={16} /> Exportar historia en PDF</span>
        <em>Próximamente</em>
      </div>
    </div>
  );
}

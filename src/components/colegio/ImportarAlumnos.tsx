'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { leerArchivo } from '@/components/repuestos/ImportadorPlanilla';
import { planillaAlumnos } from '@/lib/rubros/colegio/datos-ejemplo';
import { NOMBRE_CAMPO_AL, aplicarAlumnos, cursoDe, leerPlanillaAlumnos, type CampoAl, type FilaAlumno } from '@/lib/rubros/colegio/logica';
import type { EstadoColegio } from '@/lib/rubros/colegio/tipos';
import type { ActualizarColegio } from './useColegio';

type Lectura = Exclude<ReturnType<typeof leerPlanillaAlumnos>, { error: string }>;

/** Importación de alumnos desde Excel o CSV: agrupa hermanos por el WhatsApp del responsable. */
export function ImportarAlumnos({ estado, actualizar, moneda, periodo, onListo }: { estado: EstadoColegio; actualizar: ActualizarColegio; moneda: string; periodo: string; onListo: () => void }) {
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [error, setError] = useState('');
  const [listo, setListo] = useState('');

  async function cargar(f?: File) {
    if (!f) return;
    setError(''); setListo(''); setLectura(null);
    if (f.size > 3 * 1024 * 1024) return setError('La planilla pesa más de 3 MB.');
    try {
      const filas = (await leerArchivo(f)).slice(0, 3000).map((r) => r.slice(0, 15).map((c) => String(c).trim().slice(0, 120)));
      const r = leerPlanillaAlumnos(filas, estado);
      if ('error' in r) setError(r.error);
      else if (!r.filas.length) setError('No encontramos alumnos en la planilla.');
      else setLectura(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la planilla.');
    }
  }

  function descargar() {
    const url = URL.createObjectURL(new Blob([planillaAlumnos(moneda)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alumnos-ejemplo.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const nuevos = (xs: FilaAlumno[]) => xs.filter((f) => !f.existente);
  return (
    <div className="co-importar">
      <p className="sub" style={{ marginTop: 0 }}>Subí tu planilla .xlsx o .csv con una fila por alumno: Alumno, Apellido, Curso (por ejemplo, 3ro o Sala 5), Responsable y WhatsApp. Los hermanos se agrupan por el WhatsApp del responsable.</p>
      <p className="ct-alerta" role="note"><Icono nombre="candado" size={18} /> Son datos de menores: en la demo usá la planilla de ejemplo. Quedan guardados solo en este dispositivo.</p>
      <div className="bar-acciones">
        <label className="d-btn prim" style={{ cursor: 'pointer' }}><Icono nombre="subir" size={18} /> Elegir planilla<input type="file" accept=".xlsx,.csv,.txt" className="sr-only" aria-label="Elegir planilla de alumnos" onChange={(e) => { cargar(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <button type="button" className="d-btn" onClick={descargar}><Icono nombre="planilla" size={18} /> Descargar planilla de ejemplo</button>
      </div>
      {error && <p className="bar-err" role="alert">{error}</p>}
      {listo && <div className="ct-listo" role="status"><span>{listo}</span><button type="button" className="d-btn" onClick={onListo}>Cerrar</button></div>}
      {lectura && (
        <div className="ct-vista">
          <div className="ct-cols" aria-label="Columnas reconocidas">{(Object.keys(lectura.columnas) as CampoAl[]).map((k) => <span key={k} className="chip-rep">{NOMBRE_CAMPO_AL[k]}</span>)}</div>
          <div className="met-grid">
            <div className="met"><strong>{lectura.filas.length}</strong><span>Alumnos leídos</span></div>
            <div className="met"><strong>{nuevos(lectura.filas).length}</strong><span>Nuevos</span></div>
            <div className="met"><strong>{lectura.filas.length - nuevos(lectura.filas).length}</strong><span>Ya estaban</span></div>
            <div className="met"><strong>{lectura.filas.filter((f) => f.avisos.length).length}</strong><span>Con algo para revisar</span></div>
          </div>
          {lectura.descartadas.length > 0 && <p className="bar-err" role="alert">{lectura.descartadas.length === 1 ? 'Se descarta 1 fila' : `Se descartan ${lectura.descartadas.length} filas`}: {lectura.descartadas.slice(0, 3).map((d) => `fila ${d.fila} (${d.motivo})`).join(', ')}</p>}
          <div className="d-scroll" style={{ maxHeight: 320 }}>
            <table className="d-tabla ct-tabla">
              <thead><tr><th>Fila</th><th>Alumno</th><th>Curso</th><th>Responsable</th><th>WhatsApp</th><th>Revisar</th></tr></thead>
              <tbody>{lectura.filas.slice(0, 25).map((f) => <tr key={f.fila}><td className="ct-n">{f.fila}</td><td>{f.nombre} {f.apellido}</td><td>{cursoDe(estado, f.cursoId)?.nombre}</td><td>{f.responsable || '—'}</td><td>{f.whatsapp ? `+${f.whatsapp}` : '—'}</td><td>{[f.existente ? 'Ya estaba' : '', ...f.avisos].filter(Boolean).join(', ')}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="bar-acciones" style={{ marginTop: 12 }}>
            <button type="button" className="d-btn prim" onClick={() => {
              const n = nuevos(lectura.filas).length;
              const err = actualizar((e) => aplicarAlumnos(e, lectura.filas, periodo));
              if (err) return setError(err);
              setLectura(null);
              setListo(`Listo: se sumaron ${n} alumnos. Las familias nuevas ya tienen su código para el portal.`);
            }}><Icono nombre="check" size={18} /> Importar {lectura.filas.length} alumnos</button>
            <button type="button" className="d-btn" onClick={() => setLectura(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

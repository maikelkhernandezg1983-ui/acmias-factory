'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { leerArchivo } from '@/components/repuestos/ImportadorPlanilla';
import { HONORARIO_BASE, planillaEjemplo } from '@/lib/rubros/contador/datos-ejemplo';
import { NOMBRE_CAMPO, NOMBRE_CATEGORIA, aplicarImportacion, dinero, leerPlanilla, type Campo, type Lectura } from '@/lib/rubros/contador/logica';
import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import type { EstadoContador } from '@/lib/rubros/contador/tipos';
import type { ActualizarContador } from './useContador';

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_FILAS = 2000;

/** Importación masiva de la cartera desde Excel o CSV, con vista previa antes de guardar. */
export function ImportarClientes({ estado, actualizar, moneda, periodo, onListo }: { estado: EstadoContador; actualizar: ActualizarContador; moneda: string; periodo: string; onListo: () => void }) {
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [archivo, setArchivo] = useState('');
  const [error, setError] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [listo, setListo] = useState('');

  async function cargar(f?: File) {
    if (!f) return;
    setError('');
    setListo('');
    setLectura(null);
    if (f.size > MAX_BYTES) return setError('La planilla pesa más de 3 MB. Subila por partes.');
    setLeyendo(true);
    try {
      const filas = (await leerArchivo(f)).slice(0, MAX_FILAS + 6).map((r) => r.slice(0, 20).map((c) => String(c).trim().slice(0, 200)));
      const r = leerPlanilla(filas, estado, precioEjemplo(HONORARIO_BASE.monotributo, moneda));
      if ('error' in r) setError(r.error);
      else if (!r.filas.length) setError('No encontramos clientes en la planilla.');
      else {
        setLectura(r);
        setArchivo(f.name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la planilla.');
    } finally {
      setLeyendo(false);
    }
  }

  function descargarEjemplo() {
    const blob = new Blob([planillaEjemplo(moneda)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes-ejemplo-280.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importar() {
    if (!lectura) return;
    const err = actualizar((e) => aplicarImportacion(e, lectura.filas, periodo));
    if (err) return setError(err);
    const nuevos = lectura.filas.filter((f) => !f.existente).length;
    const act = lectura.filas.length - nuevos;
    setListo(`Listo: ${nuevos === 1 ? 'se sumó 1 cliente' : `se sumaron ${nuevos} clientes`}${act ? ` y ${act === 1 ? 'se actualizó 1' : `se actualizaron ${act}`}` : ''}. Cada uno ya tiene su cuota y su tarea de este mes.`);
    setLectura(null);
  }

  const nuevos = lectura?.filas.filter((f) => !f.existente).length ?? 0;
  const conAviso = lectura?.filas.filter((f) => f.avisos.length).length ?? 0;
  const conClave = lectura?.filas.filter((f) => f.clave).length ?? 0;
  return (
    <section className="d-card" aria-labelledby="t-imp">
      <h2 id="t-imp">Importar clientes desde Excel</h2>
      <p className="sub">Subí tu planilla .xlsx o .csv con una fila por cliente. Reconocemos columnas como Nombre, Apellido, Usuario (o CUIT), Clave, WhatsApp, Honorario y Categoría. Si un usuario ya existe, se actualiza sin perder su historial ni su número de orden.</p>
      <p className="ct-alerta" role="note"><Icono nombre="candado" size={18} /> En esta demo los datos quedan guardados en este dispositivo, incluidas las claves. Usá la planilla de ejemplo; en la versión real las claves se guardan cifradas.</p>
      <div className="bar-acciones">
        <label className="d-btn prim" style={{ cursor: 'pointer' }}>
          <Icono nombre="subir" size={18} /> Elegir planilla
          <input type="file" accept=".xlsx,.csv,.txt" className="sr-only" aria-label="Elegir planilla de clientes" onChange={(e) => { cargar(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <button type="button" className="d-btn" onClick={descargarEjemplo}><Icono nombre="planilla" size={18} /> Descargar planilla de ejemplo (280 clientes)</button>
      </div>
      {leyendo && <p role="status" className="sub">Leyendo la planilla…</p>}
      {error && <p className="bar-err" role="alert">{error}</p>}
      {listo && (
        <div className="ct-listo" role="status">
          <span>{listo}</span>
          <button type="button" className="d-btn" onClick={onListo}>Ver clientes</button>
        </div>
      )}
      {lectura && (
        <div className="ct-vista">
          <h3 className="ct-h3">Revisá antes de importar · {archivo}</h3>
          <div className="ct-cols" aria-label="Columnas reconocidas">
            {(Object.keys(lectura.columnas) as Campo[]).map((k) => <span key={k} className="chip-rep">{NOMBRE_CAMPO[k]}</span>)}
          </div>
          <div className="met-grid">
            <div className="met"><strong>{lectura.filas.length}</strong><span>Clientes leídos</span></div>
            <div className="met"><strong>{nuevos}</strong><span>Nuevos</span></div>
            <div className="met"><strong>{lectura.filas.length - nuevos}</strong><span>Ya estaban (se actualizan)</span></div>
            <div className="met"><strong>{conClave}</strong><span>Con clave</span></div>
            <div className="met"><strong>{conAviso}</strong><span>Con algo para revisar</span></div>
          </div>
          {lectura.descartadas.length > 0 && (
            <p className="bar-err" role="alert">{lectura.descartadas.length === 1 ? 'Se descarta 1 fila' : `Se descartan ${lectura.descartadas.length} filas`}: {lectura.descartadas.slice(0, 4).map((d) => `fila ${d.fila} (${d.motivo})`).join(', ')}{lectura.descartadas.length > 4 ? '…' : ''}</p>
          )}
          <div className="d-scroll" style={{ maxHeight: 360 }}>
            <table className="d-tabla ct-tabla">
              <thead><tr><th>Fila</th><th>Nombre</th><th>Apellido</th><th>Usuario</th><th>Clave</th><th>WhatsApp</th><th>Honorario</th><th>Categoría</th><th>Revisar</th></tr></thead>
              <tbody>
                {lectura.filas.slice(0, 30).map((f) => (
                  <tr key={f.fila}>
                    <td className="ct-n">{f.fila}</td>
                    <td>{f.nombre}</td>
                    <td>{f.apellido || '—'}</td>
                    <td className="ct-mono">{f.usuario || '—'}</td>
                    <td>{f.clave ? '••••••••' : '—'}</td>
                    <td>{f.whatsapp ? `+${f.whatsapp}` : '—'}</td>
                    <td className="ct-num-col">{dinero(f.honorario, moneda)}</td>
                    <td>{NOMBRE_CATEGORIA[f.categoria]}</td>
                    <td>{f.existente ? 'Actualiza' : ''}{f.avisos.length ? `${f.existente ? ' · ' : ''}${f.avisos.join(', ')}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lectura.filas.length > 30 && <p className="sub" style={{ marginTop: 8 }}>Y {lectura.filas.length - 30} filas más.</p>}
          <div className="bar-acciones" style={{ marginTop: 12 }}>
            <button type="button" className="d-btn prim" onClick={importar}><Icono nombre="check" size={18} /> Importar {lectura.filas.length} clientes</button>
            <button type="button" className="d-btn" onClick={() => setLectura(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
}

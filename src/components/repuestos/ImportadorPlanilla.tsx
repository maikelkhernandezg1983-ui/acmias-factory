'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { formatoPrecio, idCorto } from '@/lib/utiles';
import { CATEGORIAS_REP } from '@/lib/rubros/repuestos/datos-ejemplo';
import type { TCompatSugerida, TPiezaImportada } from '@/lib/rubros/repuestos/planilla-importada';
import type { CategoriaRep, EstadoRepuestos, Pieza, Vehiculo } from '@/lib/rubros/repuestos/tipos';
import type { ActualizarRep } from './PanelRepuestos';

const MAX_FILAS = 300;
const MAX_BYTES = 2 * 1024 * 1024;

/** Lee CSV (con ; o ,) respetando comillas. */
function leerCsv(texto: string): string[][] {
  const primera = texto.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
      else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(celda); celda = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda); filas.push(fila); fila = []; celda = '';
    } else celda += ch;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

async function leerArchivo(f: File): Promise<string[][]> {
  const nombre = f.name.toLowerCase();
  if (nombre.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    const filas = await readSheet(f);
    return filas.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c))));
  }
  if (nombre.endsWith('.csv') || nombre.endsWith('.txt') || f.type === 'text/csv') return leerCsv(await f.text());
  throw new Error('Formato no válido: usá una planilla .xlsx o .csv.');
}

const clave = (marca: string, modelo: string) => `${marca} ${modelo}`.toLowerCase().replace(/\s+/g, ' ').trim();

/** Busca el vehículo del catálogo que corresponde a la compatibilidad sugerida. */
function buscarVehiculo(vs: Vehiculo[], c: TCompatSugerida) {
  return vs.find((v) => clave(v.marca, v.modelo) === clave(c.marca, c.modelo) && (!c.motor || v.motor.toLowerCase().startsWith(c.motor.toLowerCase().split(' ')[0])));
}

export function ImportadorPlanilla({ estado, actualizar, moneda }: { estado: EstadoRepuestos; actualizar: ActualizarRep; moneda: string }) {
  const [estadoCarga, setEstadoCarga] = useState<'nada' | 'leyendo' | 'ia' | 'revisar'>('nada');
  const [error, setError] = useState('');
  const [piezas, setPiezas] = useState<(TPiezaImportada & { incluir: boolean })[]>([]);
  const [info, setInfo] = useState('');

  async function cargar(f?: File) {
    if (!f) return;
    setError('');
    setInfo('');
    if (f.size > MAX_BYTES) return setError('La planilla pesa más de 2 MB. Subila por partes.');
    setEstadoCarga('leyendo');
    let filas: string[][];
    try {
      filas = (await leerArchivo(f)).map((r) => r.slice(0, 15).map((c) => c.trim().slice(0, 300))).filter((r) => r.some(Boolean));
    } catch (e) {
      setEstadoCarga('nada');
      return setError(e instanceof Error ? e.message : 'No se pudo leer la planilla.');
    }
    if (!filas.length) { setEstadoCarga('nada'); return setError('La planilla está vacía.'); }
    const recortada = filas.length > MAX_FILAS;
    setEstadoCarga('ia');
    try {
      const r = await fetch('/api/importar-planilla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filas: filas.slice(0, MAX_FILAS) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setEstadoCarga('nada'); return setError(j.error ?? 'No se pudo leer la planilla.'); }
      setPiezas((j.piezas as TPiezaImportada[]).map((p) => ({ ...p, incluir: p.confianza >= 0.4 })));
      setInfo(`${j.piezas.length} piezas leídas${j.descartadas ? `, ${j.descartadas} filas descartadas` : ''}${recortada ? `. Se leyeron las primeras ${MAX_FILAS} filas` : ''}.`);
      setEstadoCarga('revisar');
    } catch {
      setEstadoCarga('nada');
      setError('Sin conexión. Revisá internet y probá de nuevo.');
    }
  }

  function aprobar() {
    const elegidas = piezas.filter((p) => p.incluir);
    const err = actualizar((e) => {
      const vehiculos = [...e.vehiculos];
      const nuevas: Pieza[] = elegidas.map((p) => {
        const compat: string[] = [];
        for (const c of p.compat) {
          let v = buscarVehiculo(vehiculos, c);
          if (!v) {
            const desde = c.desde ?? c.hasta ?? new Date().getFullYear();
            v = { id: `vi-${idCorto()}`, marca: c.marca, modelo: c.modelo, motor: c.motor || 'sin dato', desde, hasta: Math.max(desde, c.hasta ?? desde) };
            vehiculos.push(v);
          }
          if (!compat.includes(v.id)) compat.push(v.id);
        }
        return {
          id: `ri-${idCorto()}`,
          codigo: p.codigo,
          oem: [],
          equivalentes: [],
          nombre: p.nombre,
          categoria: p.categoria as CategoriaRep,
          marca: p.marca || 'Sin marca',
          origen: p.origen,
          procedencia: 'nacional',
          garantiaMeses: 6,
          stock: p.stock ?? 0,
          aPedido: p.stock === null || p.stock === 0,
          precio: p.precio ?? 0,
          compat,
          importado: true,
        };
      });
      const codigos = new Set(nuevas.map((n) => n.codigo.toUpperCase()));
      return { ...e, vehiculos, piezas: [...e.piezas.filter((x) => !codigos.has(x.codigo.toUpperCase())), ...nuevas] };
    });
    if (err) return setError(err);
    setInfo(`Sumaste ${elegidas.length} piezas al catálogo. Ya se ven en el buscador por vehículo.`);
    setPiezas([]);
    setEstadoCarga('nada');
  }

  const conf = (c: number) => (c >= 0.75 ? 'alta' : c >= 0.5 ? 'media' : 'baja');

  return (
    <section className="d-card" aria-labelledby="t-imp">
      <h2 id="t-imp">Cargar el catálogo desde la planilla del local</h2>
      <p className="sub">Subí la planilla tal como la usan (Excel o CSV). La IA separa código, pieza, marca y precio, y propone para qué autos sirve cada una según la descripción. Nada se publica sin que lo apruebes.</p>
      {estadoCarga !== 'revisar' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="d-btn prim" style={{ cursor: 'pointer' }} aria-disabled={estadoCarga !== 'nada'}>
            <Icono nombre="planilla" size={18} /> Elegir planilla (.xlsx o .csv)
            <input type="file" className="sr-only" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={estadoCarga !== 'nada'} onChange={(e) => { cargar(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <a className="d-btn" href="/ejemplos/planilla-repuestos.csv" download>Descargar planilla de ejemplo</a>
        </div>
      )}
      {estadoCarga === 'leyendo' && <p role="status" className="sub" style={{ marginTop: 12 }}>Leyendo la planilla…</p>}
      {estadoCarga === 'ia' && <p role="status" className="sub" style={{ marginTop: 12 }}>La IA está ordenando las piezas y buscando los autos en cada descripción. Tarda unos segundos.</p>}
      {error && <p role="alert" style={{ color: '#b42318', fontSize: 14, marginTop: 12 }}>{error}</p>}
      {info && <p role="status" style={{ fontSize: 14, marginTop: 12 }}>{info}</p>}

      {estadoCarga === 'revisar' && (
        <>
          <p className="sub" style={{ marginTop: 12 }}>Revisá cada fila. Las de confianza baja vienen sin marcar: chequealas antes de sumarlas. Los autos que no existen en tu catálogo se crean al aprobar.</p>
          <div className="d-scroll">
            <table className="d-tabla">
              <thead><tr><th>Sumar</th><th>Pieza</th><th>Familia</th><th>Precio</th><th>Sirve para (sugerido)</th><th>Confianza</th></tr></thead>
              <tbody>
                {piezas.map((p, i) => (
                  <tr key={`${p.codigo}-${i}`} className={conf(p.confianza) === 'baja' ? 'fila-baja' : ''}>
                    <td><input type="checkbox" checked={p.incluir} aria-label={`Sumar ${p.codigo}`} onChange={(e) => setPiezas((xs) => xs.map((x, j) => (j === i ? { ...x, incluir: e.target.checked } : x)))} style={{ width: 20, height: 20 }} /></td>
                    <td><code className="cod">{p.codigo}</code> {p.nombre}<div style={{ fontSize: 12, color: '#55555f' }}>{p.marca || 'Sin marca'} · {p.origen === 'original' ? 'Original' : 'Alternativo'}{p.stock !== null ? ` · stock ${p.stock}` : ''}</div></td>
                    <td>
                      <select className="d-precio" value={p.categoria} aria-label={`Familia de ${p.codigo}`} onChange={(e) => setPiezas((xs) => xs.map((x, j) => (j === i ? { ...x, categoria: e.target.value as CategoriaRep } : x)))}>
                        {CATEGORIAS_REP.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </td>
                    <td>{p.precio === null ? <span className="tag">Sin precio</span> : formatoPrecio(p.precio, moneda)}</td>
                    <td style={{ minWidth: 220 }}>
                      {p.compat.length === 0 && <span className="sub">Sin auto en la descripción</span>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {p.compat.map((c, k) => (
                          <span key={k} className={`tag conf-${conf(c.confianza)}`} title={`Confianza ${Math.round(c.confianza * 100)} %`}>
                            {c.marca} {c.modelo} {c.motor} {c.desde ? `${c.desde}${c.hasta && c.hasta !== c.desde ? `–${c.hasta}` : ''}` : ''}
                            {buscarVehiculo(estado.vehiculos, c) ? '' : ' · nuevo'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td><span className={`tag conf-${conf(p.confianza)}`}>{Math.round(p.confianza * 100)} %</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" className="d-btn prim" onClick={aprobar} disabled={!piezas.some((p) => p.incluir)}>Aprobar y sumar {piezas.filter((p) => p.incluir).length} piezas</button>
            <button type="button" className="d-btn" onClick={() => { setPiezas([]); setEstadoCarga('nada'); setInfo(''); }}>Descartar</button>
          </div>
        </>
      )}
    </section>
  );
}

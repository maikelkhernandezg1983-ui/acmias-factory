'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { leerArchivo } from '@/components/repuestos/ImportadorPlanilla';
import { formatoPrecio, idCorto } from '@/lib/utiles';
import type { TProductoImportado } from '@/lib/rubros/tienda/planilla-importada';
import type { EstadoTienda, Producto } from '@/lib/rubros/tienda/tipos';
import type { ActualizarTienda } from './useTienda';

const MAX_FILAS = 300;
const PALETA: Record<string, string> = { negro: '#1d1d1f', blanco: '#f4f4f2', gris: '#9a9ca0', rojo: '#b3261e', azul: '#2f4a73', celeste: '#8cc4e8', rosa: '#e9a6b8', verde: '#4f7a4a', beige: '#d8c7a5', crudo: '#e9e1cf', amarillo: '#f2c94c', violeta: '#8b6bb8', marron: '#7a5232' };
const hex = (color: string) => PALETA[color.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0]];

/** Carga del catálogo desde la planilla del dueño (TIE-12): la IA agrupa variantes por talle y color. */
export function ImportadorTienda({ estado, actualizar, moneda }: { estado: EstadoTienda; actualizar: ActualizarTienda; moneda: string }) {
  const [etapa, setEtapa] = useState<'nada' | 'ia' | 'revisar'>('nada');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [productos, setProductos] = useState<(TProductoImportado & { incluir: boolean })[]>([]);

  async function cargar(f?: File) {
    if (!f) return;
    setError('');
    setInfo('');
    if (f.size > 2 * 1024 * 1024) return setError('La planilla pesa más de 2 MB. Subila por partes.');
    let filas: string[][];
    try {
      filas = (await leerArchivo(f)).map((r) => r.slice(0, 15).map((c) => c.trim().slice(0, 300))).filter((r) => r.some(Boolean));
    } catch (e) {
      return setError(e instanceof Error ? e.message : 'No se pudo leer la planilla.');
    }
    if (!filas.length) return setError('La planilla está vacía.');
    setEtapa('ia');
    try {
      const r = await fetch('/api/importar-planilla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rubro: 'tienda', filas: filas.slice(0, MAX_FILAS) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setEtapa('nada');
        return setError(j.error ?? 'No se pudo leer la planilla.');
      }
      setProductos((j.productos as TProductoImportado[]).map((p) => ({ ...p, incluir: p.confianza >= 0.4 })));
      setInfo(`${j.productos.length} productos leídos${j.descartadas ? `, ${j.descartadas} filas descartadas` : ''}.`);
      setEtapa('revisar');
    } catch {
      setEtapa('nada');
      setError('Sin conexión. Revisá internet y probá de nuevo.');
    }
  }

  function aprobar() {
    const elegidos = productos.filter((p) => p.incluir);
    const err = actualizar((e) => {
      const nuevos: Producto[] = elegidos.map((p) => {
        const id = `ti-${idCorto()}`;
        const vs = p.variantes.length ? p.variantes : [{ talle: '', color: '', stock: 0, codigoBarras: '' }];
        return {
          id,
          nombre: p.nombre,
          categoria: p.categoria || 'General',
          precio: p.precio ?? 0,
          icono: 'bolso',
          importado: true,
          variantes: vs.map((v, k) => ({
            id: `${id}-${k + 1}`,
            talle: v.talle || undefined,
            color: v.color || undefined,
            colorHex: v.color ? hex(v.color) ?? '#c9c9cf' : undefined,
            stock: v.stock ?? 0,
            minimo: 2,
            codigoBarras: v.codigoBarras || `200${String(Date.now() + k).slice(-10)}`,
          })),
        };
      });
      const categorias = [...new Set([...e.categorias, ...nuevos.map((n) => n.categoria)])];
      return { ...e, categorias, productos: [...e.productos, ...nuevos] };
    });
    if (err) return setError(err);
    setInfo(`Sumaste ${elegidos.length} productos. Ya se ven en la tienda y en el mostrador.`);
    setProductos([]);
    setEtapa('nada');
  }

  const conf = (c: number) => (c >= 0.75 ? 'alta' : c >= 0.5 ? 'media' : 'baja');

  return (
    <section className="d-card" aria-labelledby="t-imp">
      <h2 id="t-imp">Cargar el catálogo desde la planilla del local</h2>
      <p className="sub">Subí la planilla como la usan (Excel o CSV), aunque repita el producto en una fila por talle o color. La IA agrupa las variantes con su stock. Nada se publica sin que lo apruebes.</p>
      {etapa !== 'revisar' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label className="d-btn prim" style={{ cursor: 'pointer' }}>
            <Icono nombre="planilla" size={18} /> Elegir planilla (.xlsx o .csv)
            <input type="file" className="sr-only" accept=".xlsx,.csv,text/csv" disabled={etapa !== 'nada'} onChange={(e) => { cargar(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <a className="d-btn" href="/ejemplos/planilla-tienda.csv" download>Descargar planilla de ejemplo</a>
        </div>
      )}
      {etapa === 'ia' && <p role="status" className="sub" style={{ marginTop: 12 }}>La IA está agrupando productos y variantes. Tarda unos segundos.</p>}
      {error && <p role="alert" style={{ color: '#b42318', fontSize: 14, marginTop: 12 }}>{error}</p>}
      {info && <p role="status" style={{ fontSize: 14, marginTop: 12 }}>{info}</p>}
      {etapa === 'revisar' && (
        <>
          <div className="d-scroll" style={{ marginTop: 12 }}>
            <table className="d-tabla">
              <thead><tr><th>Sumar</th><th>Producto</th><th>Precio</th><th>Variantes y stock</th><th>Confianza</th></tr></thead>
              <tbody>
                {productos.map((p, i) => (
                  <tr key={`${p.nombre}-${i}`} className={conf(p.confianza) === 'baja' ? 'fila-baja' : ''}>
                    <td><input type="checkbox" checked={p.incluir} aria-label={`Sumar ${p.nombre}`} style={{ width: 20, height: 20 }} onChange={(e) => setProductos((xs) => xs.map((x, j) => (j === i ? { ...x, incluir: e.target.checked } : x)))} /></td>
                    <td>{p.nombre}<div style={{ fontSize: 12, color: '#55555f' }}>{p.categoria}</div></td>
                    <td>{p.precio === null ? <span className="tag">Sin precio</span> : formatoPrecio(p.precio, moneda)}</td>
                    <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{p.variantes.map((v, k) => <span key={k} className="tag">{[v.talle, v.color].filter(Boolean).join(' ') || 'Único'} · {v.stock ?? '?'}</span>)}</div></td>
                    <td><span className={`tag conf-${conf(p.confianza)}`}>{Math.round(p.confianza * 100)} %</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" className="d-btn prim" onClick={aprobar} disabled={!productos.some((p) => p.incluir)}>Aprobar y sumar {productos.filter((p) => p.incluir).length} productos</button>
            <button type="button" className="d-btn" onClick={() => { setProductos([]); setEtapa('nada'); setInfo(''); }}>Descartar</button>
          </div>
        </>
      )}
      <p className="sub" style={{ marginTop: 14 }}>Hoy hay {estado.productos.length} productos en el catálogo.</p>
    </section>
  );
}

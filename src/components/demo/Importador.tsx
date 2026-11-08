'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { reducirImagen } from '@/lib/imagen';
import { formatoPrecio, idCorto } from '@/lib/utiles';
import type { TMenuImportado } from '@/lib/rubros/restaurante/menu-importado';
import type { Categoria, DemoEstado, Ilustracion, Plato } from '@/lib/tipos';

type Fila = { clave: string; categoria: string; nombre: string; descripcion: string; precio: number | null; etiquetas: Plato['etiquetas']; confianza: number; incluir: boolean };

const PISTAS: [RegExp, Ilustracion][] = [
  [/caf|t[eé]\b|infusi/i, 'cafe'],
  [/desayun|merienda|medialun|panader/i, 'medialuna'],
  [/burger|hambur|s[aá]ndw|wrap|lomit/i, 'burger'],
  [/pasta|fideo|ravio|ñoqui|nnoqui/i, 'pasta'],
  [/ensalad|bowl|veggie/i, 'ensalada'],
  [/postre|dulce|helad|torta/i, 'postre'],
  [/bebid|jugo|cerve|vino|trago|gaseosa/i, 'bebida'],
  [/combo|promo|men[uú] del/i, 'combo'],
  [/wok|arroz|sushi|asi[aá]t/i, 'wok'],
  [/tostad|tostado/i, 'tostado'],
];

function ilustracionPara(texto: string): Ilustracion {
  return PISTAS.find(([re]) => re.test(texto))?.[1] ?? 'plato';
}

export function Importador({ estado, actualizar, moneda }: { estado: DemoEstado; actualizar: (fn: (e: DemoEstado) => DemoEstado) => string | null; moneda: string }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [filas, setFilas] = useState<Fila[]>([]);
  const [modo, setModo] = useState<'reemplazar' | 'agregar'>('reemplazar');
  const [listo, setListo] = useState('');
  const [descartados, setDescartados] = useState(0);

  async function leer(file?: File) {
    if (!file) return;
    setError('');
    setListo('');
    setFilas([]);
    const esPdf = file.type === 'application/pdf';
    if (!esPdf && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Usá una foto (JPG, PNG, WEBP) o un PDF.');
    if (file.size > 15 * 1024 * 1024) return setError('El archivo pesa más de 15 MB.');
    setCargando(true);
    try {
      let envio: Blob = file;
      if (!esPdf) {
        const data = await reducirImagen(file, 1800, 'image/jpeg', 0.85);
        envio = await (await fetch(data)).blob();
      }
      if (envio.size > 4 * 1024 * 1024) throw new Error('El archivo pesa más de 4 MB. Probá con una foto o un PDF más liviano.');
      const fd = new FormData();
      fd.append('archivo', envio, esPdf ? 'carta.pdf' : 'carta.jpg');
      const r = await fetch('/api/importar-menu', { method: 'POST', body: fd });
      if (r.status === 413) throw new Error('El archivo pesa más de 4 MB. Probá con una foto o un PDF más liviano.');
      const json = await r.json().catch(() => ({ error: `El servidor respondió con un error (${r.status}). Intentá de nuevo.` }));
      if (!r.ok) throw new Error(json.error || 'No se pudo leer la carta.');
      const menu = json as TMenuImportado;
      setDescartados(menu.descartados ?? 0);
      const nuevas: Fila[] = menu.categorias.flatMap((c) =>
        c.platos.map((p) => ({ clave: idCorto(), categoria: c.nombre, nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, etiquetas: p.etiquetas, confianza: p.confianza, incluir: p.precio !== null })),
      );
      if (!nuevas.length) throw new Error('No encontramos platos en la imagen. Probá con una foto más cerca y con buena luz.');
      setFilas(nuevas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la carta.');
    } finally {
      setCargando(false);
    }
  }

  function editar(clave: string, cambios: Partial<Fila>) {
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
  }

  function aprobar() {
    const elegidas = filas.filter((f) => f.incluir && f.precio !== null && f.nombre.trim());
    const idDe = new Map<string, string>();
    const nuevasCats: Categoria[] = [];
    for (const f of elegidas) {
      const base = f.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const clave = base || f.categoria.trim();
      if (!idDe.has(clave)) {
        const id = `imp-${base || idCorto()}`;
        idDe.set(clave, id);
        nuevasCats.push({ id, nombre: f.categoria.trim(), ilustracion: ilustracionPara(f.categoria) });
      }
      idDe.set(`nombre:${f.categoria}`, idDe.get(clave)!);
    }
    const idCat = (n: string) => idDe.get(`nombre:${n}`)!;
    const platos: Plato[] = elegidas.map((f) => ({
      id: `imp-${idCorto()}`,
      categoria: idCat(f.categoria),
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim(),
      precio: f.precio!,
      etiquetas: f.etiquetas,
      alergenos: [],
      ilustracion: ilustracionPara(`${f.categoria} ${f.nombre}`),
      importado: true,
    }));
    const err = actualizar((e) => {
      if (modo === 'reemplazar') return { ...e, categorias: nuevasCats, platos, vistas: {}, deshacerPrecios: undefined };
      const existentes = new Set(e.categorias.map((c) => c.id));
      return { ...e, categorias: [...e.categorias, ...nuevasCats.filter((c) => !existentes.has(c.id))], platos: [...e.platos, ...platos] };
    });
    if (err) {
      setError(err);
      return;
    }
    setFilas([]);
    setListo(`Publicaste ${platos.length} platos en la carta.`);
  }

  const dudosas = filas.filter((f) => f.confianza < 0.7 || f.precio === null).length;

  return (
    <section className="d-card" aria-labelledby="t-imp">
      <h2 id="t-imp">Importar el menú desde una foto</h2>
      <p className="sub">Sacale una foto a la carta del local o subí su PDF. La IA arma los platos y vos revisás antes de publicar. Nada se publica sin tu aprobación.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label className="d-btn prim" style={{ cursor: cargando ? 'wait' : 'pointer' }} aria-disabled={cargando}>
          <Icono nombre="chispa" size={18} /> {cargando ? 'Leyendo la carta…' : 'Sacar foto a la carta'}
          <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="sr-only" disabled={cargando} onChange={(e) => { leer(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <label className="d-btn" style={{ cursor: cargando ? 'wait' : 'pointer' }} aria-disabled={cargando}>
          <Icono nombre="subir" size={18} /> Elegir foto o PDF
          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" disabled={cargando} onChange={(e) => { leer(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      {cargando && <p role="status" style={{ fontSize: 14 }}>Esto tarda entre 10 y 40 segundos según el tamaño de la carta.</p>}
      {error && <p role="alert" style={{ color: '#b3261e', fontSize: 14 }}>{error}</p>}
      {listo && <p role="status" style={{ fontSize: 14 }}><Icono nombre="check" size={16} /> {listo} Miralo en la pestaña Carta.</p>}

      {filas.length > 0 && (
        <>
          <p style={{ fontSize: 14, margin: '16px 0 8px' }}>
            Encontramos <strong>{filas.length} platos</strong>.{descartados > 0 && <> {descartados} renglones no se pudieron leer y quedaron afuera.</>}{dudosas > 0 && <> Revisá los <strong>{dudosas}</strong> marcados en amarillo: la IA no está segura.</>}
          </p>
          <div className="d-scroll">
            <table className="d-tabla">
              <thead><tr><th>Incluir</th><th>Categoría</th><th>Plato</th><th>Precio</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.clave} className={f.confianza < 0.7 || f.precio === null ? 'conf-baja' : undefined}>
                    <td><input type="checkbox" checked={f.incluir} onChange={(e) => editar(f.clave, { incluir: e.target.checked })} aria-label={`Incluir ${f.nombre}`} style={{ width: 20, height: 20 }} /></td>
                    <td style={{ fontSize: 13 }}>{f.categoria}</td>
                    <td><input className="d-precio" style={{ width: '100%', minWidth: 180 }} value={f.nombre} onChange={(e) => editar(f.clave, { nombre: e.target.value })} aria-label="Nombre del plato" /></td>
                    <td>
                      <input className="d-precio" type="number" min={0} step="any" value={f.precio ?? ''} placeholder="Sin precio" onChange={(e) => editar(f.clave, { precio: e.target.value === '' ? null : Number(e.target.value), incluir: e.target.value !== '' })} aria-label={`Precio de ${f.nombre}`} />
                      {f.precio !== null && <div style={{ fontSize: 12, color: '#55555f' }}>{formatoPrecio(f.precio, moneda)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: '16px 0 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <legend className="sr-only">Cómo publicar</legend>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}><input type="radio" name="modo" checked={modo === 'reemplazar'} onChange={() => setModo('reemplazar')} /> Reemplazar la carta de ejemplo</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}><input type="radio" name="modo" checked={modo === 'agregar'} onChange={() => setModo('agregar')} /> Agregar a la carta actual</label>
          </fieldset>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" className="d-btn prim" onClick={aprobar} disabled={!filas.some((f) => f.incluir && f.precio !== null)}>
              <Icono nombre="check" size={18} /> Aprobar y publicar {filas.filter((f) => f.incluir && f.precio !== null).length} platos
            </button>
            <button type="button" className="d-btn" onClick={() => setFilas([])}>Descartar</button>
          </div>
        </>
      )}
      {estado.platos.some((p) => p.importado) && !filas.length && <p className="sub" style={{ marginTop: 16 }}>La carta tiene platos importados con IA. Podés editarlos en la pestaña Carta.</p>}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { LUCES, NOMBRE_LUZ, SENTIDO_LUZ, luz, rangoLuz, validarSemaforo, type Luz, type Semaforo } from '@/lib/semaforo';

/** Punto de color con el nombre de la luz: el color nunca va solo. */
export function LuzStock({ stock, semaforo }: { stock: number; semaforo: Semaforo }) {
  const l = luz(stock, semaforo);
  return (
    <span className={`sem-luz ${l}`}>
      <span className="sem-punto" aria-hidden="true" />
      {NOMBRE_LUZ[l]}
    </span>
  );
}

/** Resumen del semáforo: tres luces con su cantidad, que además filtran la lista. */
export function ResumenSemaforo({ conteo, filtro, onFiltro, unidad = 'productos' }: { conteo: Record<Luz, number>; filtro: Luz | null; onFiltro: (l: Luz | null) => void; unidad?: string }) {
  return (
    <div className="sem-resumen" role="group" aria-label="Semáforo de stock">
      {LUCES.map((l) => (
        <button key={l} type="button" className={`sem-chip ${l}`} aria-pressed={filtro === l} onClick={() => onFiltro(filtro === l ? null : l)}>
          <span className="sem-foco" aria-hidden="true" />
          <span className="sem-txt">
            <strong>{conteo[l].toLocaleString('es')}</strong>
            <span>{NOMBRE_LUZ[l]} · {SENTIDO_LUZ[l]}</span>
          </span>
          <span className="sr-only"> {unidad}</span>
        </button>
      ))}
    </div>
  );
}

/** Tarjeta de Ajustes: el dueño define hasta cuántas unidades es rojo y hasta cuántas amarillo. */
export function AjustesSemaforo({ semaforo, onGuardar, ayuda }: { semaforo: Semaforo; onGuardar: (s: Semaforo) => string | null; ayuda?: string }) {
  const [rojo, setRojo] = useState(String(semaforo.rojo));
  const [amarillo, setAmarillo] = useState(String(semaforo.amarillo));
  const [msg, setMsg] = useState('');
  const vista: Semaforo = { rojo: Number(rojo), amarillo: Number(amarillo) };
  const ok = !validarSemaforo(vista);
  return (
    <section className="d-card" aria-labelledby="t-sem" style={{ marginTop: 16 }}>
      <h2 id="t-sem">Semáforo de stock</h2>
      <p className="sub">{ayuda ?? 'Definí en unidades cuándo un producto se pinta de rojo, amarillo o verde en el panel.'}</p>
      <form
        className="sem-form"
        onSubmit={(e) => {
          e.preventDefault();
          const s: Semaforo = { rojo: Math.floor(Number(rojo)), amarillo: Math.floor(Number(amarillo)) };
          const err = rojo.trim() === '' || amarillo.trim() === '' ? 'Completá los dos límites.' : validarSemaforo(s);
          if (err) return setMsg(err);
          setMsg(onGuardar(s) ?? 'Semáforo guardado.');
        }}
      >
        <div className="sem-fila rojo">
          <span className="sem-foco" aria-hidden="true" />
          <label htmlFor="sem-rojo"><strong>Rojo</strong> · reponer ya, hasta</label>
          <span className="sem-num"><input id="sem-rojo" className="c-inp" type="number" min={0} step={1} inputMode="numeric" value={rojo} onChange={(e) => setRojo(e.target.value)} /> u.</span>
        </div>
        <div className="sem-fila amarillo">
          <span className="sem-foco" aria-hidden="true" />
          <label htmlFor="sem-amarillo"><strong>Amarillo</strong> · pedir pronto, hasta</label>
          <span className="sem-num"><input id="sem-amarillo" className="c-inp" type="number" min={1} step={1} inputMode="numeric" value={amarillo} onChange={(e) => setAmarillo(e.target.value)} /> u.</span>
        </div>
        <div className="sem-fila verde">
          <span className="sem-foco" aria-hidden="true" />
          <span><strong>Verde</strong> · bien</span>
          <span className="sem-num" id="sem-verde">{ok ? rangoLuz('verde', vista) : '—'}</span>
        </div>
        {ok && <p className="sub" style={{ margin: 0 }}>Rojo: {rangoLuz('rojo', vista)} · Amarillo: {rangoLuz('amarillo', vista)} · Verde: {rangoLuz('verde', vista)}</p>}
        <div><button type="submit" className="d-btn prim">Guardar semáforo</button></div>
        {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
      </form>
    </section>
  );
}

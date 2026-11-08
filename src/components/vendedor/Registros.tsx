'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearSlug, guardarDemo, useDemos } from '@/lib/almacen';
import { crearTema } from '@/lib/marca';
import type { DemoConfig } from '@/lib/tipos';
import type { Registro } from '@/lib/registros';

const NOMBRE_RUBRO: Record<Registro['rubro'], string> = {
  restaurante: 'Restaurante',
  repuestos: 'Repuestos',
  tienda: 'Tienda',
  barberia: 'Barbería',
  consultorio: 'Consultorio',
  ferreteria: 'Ferretería',
};
const RUBROS_LISTOS: Registro['rubro'][] = ['restaurante'];

type Vista = { tipo: 'cargando' } | { tipo: 'clave' } | { tipo: 'error'; texto: string } | { tipo: 'lista'; registros: Registro[] };

/** Clientes que se registraron en la landing, con su marca cargada. Un toque abre la demo. */
export function Registros() {
  const router = useRouter();
  const demos = useDemos();
  const [vista, setVista] = useState<Vista>({ tipo: 'cargando' });
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/registros', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) return setVista({ tipo: 'clave' });
      if (!r.ok) return setVista({ tipo: 'error', texto: j.error ?? 'No se pudieron cargar los clientes.' });
      setVista({ tipo: 'lista', registros: j.registros });
    } catch {
      setVista({ tipo: 'error', texto: 'Sin conexión. Revisá internet y recargá la página.' });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la API
    void cargar();
  }, [cargar]);

  function verDemo(r: Registro) {
    setError('');
    const existente = demos.find((d) => d.registroId === r.id);
    if (existente) return router.push(`/d/${existente.slug}`);
    const config: DemoConfig = {
      slug: `${crearSlug(r.negocio)}-${r.id.slice(-5)}`,
      rubro: 'restaurante',
      registroId: r.id,
      negocio: r.negocio,
      logo: r.logo,
      colorPrincipal: r.colorPrincipal,
      colorSecundario: r.colorSecundario,
      whatsapp: r.whatsapp,
      mesas: 10,
      moneda: 'ARS',
      apertura: '08:00',
      cierre: '23:00',
      delivery: true,
      costoEnvio: 0,
      direccion: '',
      creada: new Date().toISOString(),
    };
    try {
      guardarDemo(config);
      router.push(`/d/${config.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la demo.');
    }
  }

  return (
    <section className="acm-card registros" aria-labelledby="t-registros">
      <h3 id="t-registros">
        Clientes registrados {vista.tipo === 'lista' && vista.registros.length > 0 && <span className="chip">{vista.registros.length}</span>}
      </h3>
      <p className="acm-ayuda">Se registraron en la web con su logo y sus colores. Tocá Ver demo y se abre con su marca.</p>

      {vista.tipo === 'cargando' && <div className="vacio" aria-busy="true">Cargando clientes…</div>}
      {vista.tipo === 'error' && <p className="err" role="alert">{vista.texto}</p>}
      {vista.tipo === 'clave' && (
        <p className="err" role="alert">Tu sesión venció. <a href="/ingresar" style={{ color: 'inherit' }}>Ingresá de nuevo</a>.</p>
      )}
      {vista.tipo === 'lista' && vista.registros.length === 0 && (
        <div className="vacio">Todavía no hay clientes registrados. Cuando alguien complete el formulario de la web, aparece acá.</div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      {vista.tipo === 'lista' && vista.registros.length > 0 && (
        <div className="reg-grid">
          {vista.registros.map((r) => {
            const tema = crearTema(r.colorPrincipal, r.colorSecundario);
            const listo = RUBROS_LISTOS.includes(r.rubro);
            const abierta = demos.some((d) => d.registroId === r.id);
            return (
              <article key={r.id} className="reg" style={{ '--m': tema.marca, '--sm': tema.sobreMarca, '--a': tema.acento } as React.CSSProperties}>
                <div className="reg-marca">
                  {r.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logo} alt="" className="reg-logo" />
                  ) : (
                    <span className="reg-logo reg-inicial" aria-hidden="true">{r.negocio[0]?.toUpperCase()}</span>
                  )}
                  <span className="reg-colores" aria-label={`Colores ${r.colorPrincipal} y ${r.colorSecundario}`}>
                    <span style={{ background: r.colorPrincipal }} />
                    <span style={{ background: r.colorSecundario }} />
                  </span>
                </div>
                <div className="reg-cuerpo">
                  <strong className="reg-nombre">{r.negocio}</strong>
                  <span className="reg-meta">
                    <span className="chip">{NOMBRE_RUBRO[r.rubro]}</span>
                    <span className="chip">{new Date(r.creado).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                    {r.ejemplo && <span className="chip">Ejemplo</span>}
                  </span>
                  {r.caso && <p className="reg-caso">{r.caso}</p>}
                  <button type="button" className="btn btn-teal" disabled={!listo} onClick={() => verDemo(r)} aria-label={`Ver demo de ${r.negocio}`}>
                    {listo ? (abierta ? 'Abrir su demo' : 'Ver demo') : 'Rubro próximamente'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { preinscribir, vacantes } from '@/lib/rubros/colegio/logica';
import { useDemoColegio } from './useColegio';

/** Sitio del colegio con preinscripción para el próximo ciclo. */
export function SitioColegio({ slug }: { slug: string }) {
  const { config, estado, actualizar, listo, estilo } = useDemoColegio(slug);
  const [f, setF] = useState({ alumno: '', cursoId: '', responsable: '', whatsapp: '', hermano: false, comentario: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const cursoId = f.cursoId || estado.cursos[0].id;
  const v = vacantes(estado, cursoId);
  return (
    <div className="sitio" style={estilo}>
      <AvisoDemo texto="Colegio de ejemplo" />
      <section className="s-hero">
        <div className="s-in">
          <nav className="s-nav" aria-label="Principal">
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {config.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logo} alt="" style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', objectFit: 'contain', padding: 5 }} />
              ) : <span className="c-inicial" style={{ width: 48, height: 48, fontSize: 22, borderRadius: 12 }} aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>}
              <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 20 }}>{config.negocio}</strong>
            </span>
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Portal de familias</Link>
          </nav>
          <div className="ct-s-hero">
            <h1>Una escuela cerca, que te cuenta todo lo que pasa</h1>
            <p>Nivel inicial y primaria. Comunicados, autorizaciones y cuotas desde el celular, sin papelitos en la mochila.</p>
            <div className="s-acciones">
              <a href="#preinscripcion" className="s-btn uno"><Icono nombre="lista" size={18} /> Preinscripción</a>
              <a href={enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`)} className="s-btn dos" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Escribinos</a>
            </div>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in s-info">
          <div><h3>Nivel inicial</h3><p>Salas de 4 y 5, con jornada simple y talleres.</p></div>
          <div><h3>Primaria</h3><p>De 1.° a 6.° grado, con inglés, educación física y huerta.</p></div>
          <div><h3>Familias conectadas</h3><p>Todo lo del colegio en el portal: avisos, autorizaciones, faltas y cuotas.</p></div>
        </div>
      </section>
      <section className="s-sec" id="preinscripcion" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in">
          <h2>Preinscripción para el próximo ciclo</h2>
          <form className="co-form co-pre" onSubmit={(e) => {
            e.preventDefault();
            let fallo = '';
            const err = actualizar((x) => { const r = preinscribir(x, { ...f, cursoId, hermanoEnElColegio: f.hermano }); if ('error' in r) { fallo = r.error; return x; } return r; });
            if (err || fallo) return setError(err || fallo);
            setError('');
            setToast(`Listo: recibimos la preinscripción de ${f.alumno.trim()}. Te escribimos por WhatsApp para coordinar una entrevista.`);
            setF({ alumno: '', cursoId: '', responsable: '', whatsapp: '', hermano: false, comentario: '' });
          }}>
            <label>Nombre del alumno<input className="c-inp" value={f.alumno} onChange={(e) => setF((x) => ({ ...x, alumno: e.target.value }))} /></label>
            <label>Curso que va a hacer<select className="c-inp" value={cursoId} onChange={(e) => setF((x) => ({ ...x, cursoId: e.target.value }))}>{estado.cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
            <label>Adulto responsable<input className="c-inp" value={f.responsable} onChange={(e) => setF((x) => ({ ...x, responsable: e.target.value }))} /></label>
            <label>WhatsApp<input className="c-inp" inputMode="tel" value={f.whatsapp} onChange={(e) => setF((x) => ({ ...x, whatsapp: e.target.value }))} /></label>
            <label className="ancho co-check"><input type="checkbox" checked={f.hermano} onChange={(e) => setF((x) => ({ ...x, hermano: e.target.checked }))} /> Tiene un hermano en el colegio</label>
            <label className="ancho">Comentario (opcional)<textarea className="c-inp" rows={2} value={f.comentario} onChange={(e) => setF((x) => ({ ...x, comentario: e.target.value }))} /></label>
            <p className="sub ancho" style={{ margin: 0 }}>{v === 0 ? 'Este curso no tiene vacantes: la preinscripción queda en lista de espera.' : v <= 3 ? `Quedan pocas vacantes (${v}).` : 'Hay vacantes.'}</p>
            {error && <p className="bar-err ancho" role="alert">{error}</p>}
            <div className="ancho"><button type="submit" className="d-btn prim">Enviar preinscripción</button></div>
          </form>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13, color: '#6a6a74' }}><div className="s-in">{config.negocio} · {config.direccion || '[Dirección del colegio]'} · Sitio de demostración hecho con ACMIAS</div></footer>
      {toast && <div className="toast" role="status"><span className="toast-check"><Icono nombre="check" size={16} /></span>{toast}</div>}
    </div>
  );
}

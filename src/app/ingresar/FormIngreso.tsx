'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function FormIngreso({ falta }: { falta: string[] }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const r = await fetch('/api/sesion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, clave }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? 'No se pudo ingresar. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Sin conexión. Revisá internet y probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div className="acm ingreso">
      <main className="ingreso-caja">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logotipo-oscuro.png" alt="ACMIAS" style={{ height: 26, width: 'auto' }} />
        <h1>Portal del vendedor</h1>
        <p className="acm-ayuda" style={{ margin: '0 0 22px' }}>Ingresá con tu usuario para ver los clientes y abrir sus demos.</p>
        {falta.length > 0 ? (
          <div className="ingreso-aviso" role="alert">
            <strong>El acceso todavía no está configurado.</strong>
            <p>Falta cargar {falta.join(' y ')} en Vercel → Settings → Environment Variables. Los valores se arman en <Link href="/ingresar/generar">Crear un usuario</Link>.</p>
          </div>
        ) : (
          <form onSubmit={ingresar} noValidate>
            <div className="campo">
              <label htmlFor="usuario">Usuario</label>
              <input id="usuario" className="inp" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
            </div>
            <div className="campo">
              <label htmlFor="clave">Contraseña</label>
              <input id="clave" type="password" className="inp" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && <p className="err" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="btn btn-teal" style={{ width: '100%' }} disabled={enviando || !usuario || !clave}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        )}
        <p className="ingreso-pie">¿Sos cliente? Las demos se abren con el enlace o el QR que te compartió tu vendedor.</p>
      </main>
    </div>
  );
}

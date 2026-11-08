'use client';

import { useState } from 'react';
import Link from 'next/link';

const ITER = 210_000;
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Arma, en este navegador, la línea de VENDEDORES para Vercel.
 * La contraseña no sale del dispositivo: solo se muestra su hash con sal.
 */
export function Generador() {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [linea, setLinea] = useState('');
  const [secreto, setSecreto] = useState('');
  const [copiado, setCopiado] = useState('');

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLinea('');
    const u = usuario.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) return setError('El usuario va en minúsculas, de 3 a 30 letras o números, sin espacios.');
    if (clave.length < 10) return setError('La contraseña necesita al menos 10 caracteres.');
    if (clave !== repetir) return setError('Las contraseñas no coinciden.');
    const sal = crypto.getRandomValues(new Uint8Array(16));
    const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITER }, llave, 256);
    setLinea(`${u}=pbkdf2$${ITER}$${b64url(sal)}$${b64url(bits)}`);
    setSecreto(b64url(crypto.getRandomValues(new Uint8Array(48))));
    setClave('');
    setRepetir('');
  }

  async function copiar(texto: string, cual: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
    } catch {
      setCopiado('');
    }
  }

  return (
    <div className="acm ingreso">
      <main className="ingreso-caja" style={{ maxWidth: 560 }}>
        <h1>Crear un usuario de vendedor</h1>
        <p className="acm-ayuda" style={{ margin: '0 0 22px' }}>La contraseña no se envía a ningún lado: este navegador calcula un código que la reemplaza. Ese código es lo que se guarda en Vercel.</p>
        <form onSubmit={generar} noValidate>
          <div className="campo">
            <label htmlFor="g-usuario">Usuario</label>
            <input id="g-usuario" className="inp" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" spellCheck={false} />
          </div>
          <div className="campo">
            <label htmlFor="g-clave">Contraseña (mínimo 10 caracteres)</label>
            <input id="g-clave" type="password" className="inp" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="campo">
            <label htmlFor="g-repetir">Repetí la contraseña</label>
            <input id="g-repetir" type="password" className="inp" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" />
          </div>
          {error && <p className="err" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn btn-teal" style={{ width: '100%' }}>Generar</button>
        </form>

        {linea && (
          <div className="generado">
            <p>En Vercel, proyecto <strong>acmias-factory</strong> → Settings → Environment Variables, cargá estas dos variables y volvé a publicar:</p>
            <label className="lbl">VENDEDORES</label>
            <code>{linea}</code>
            <button type="button" className="btn btn-linea btn-chico" onClick={() => copiar(linea, 'v')}>{copiado === 'v' ? 'Copiado' : 'Copiar'}</button>
            <p className="acm-ayuda">Para más vendedores, generá uno por persona y unilos con punto y coma (;).</p>
            <label className="lbl">SESION_SECRETO <span className="acm-ayuda">(solo la primera vez)</span></label>
            <code>{secreto}</code>
            <button type="button" className="btn btn-linea btn-chico" onClick={() => copiar(secreto, 's')}>{copiado === 's' ? 'Copiado' : 'Copiar'}</button>
          </div>
        )}
        <p className="ingreso-pie"><Link href="/ingresar">Volver a ingresar</Link></p>
      </main>
    </div>
  );
}

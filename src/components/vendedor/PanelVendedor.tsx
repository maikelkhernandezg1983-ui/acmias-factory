'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { borrarDemo, crearSlug, guardarDemo, useDemos } from '@/lib/almacen';
import { coloresDeImagen, reducirImagen, validarImagen } from '@/lib/imagen';
import { MONEDAS } from '@/lib/rubros/restaurante/datos-ejemplo';
import { codificarConfig, soloDigitos } from '@/lib/utiles';
import { crearTema } from '@/lib/marca';
import type { DemoConfig } from '@/lib/tipos';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { Registros } from './Registros';

const RUBROS = [
  { id: 'restaurante', nombre: 'Restaurante', listo: true },
  { id: 'tienda', nombre: 'Tienda', listo: false },
  { id: 'repuestos', nombre: 'Repuestos', listo: false },
  { id: 'barberia', nombre: 'Barbería', listo: false },
  { id: 'consultorio', nombre: 'Consultorio', listo: false },
  { id: 'ferreteria', nombre: 'Ferretería', listo: false },
];

export function PanelVendedor() {
  const demos = useDemos();
  const router = useRouter();
  const [negocio, setNegocio] = useState('');
  const [logo, setLogo] = useState<string | undefined>();
  const [c1, setC1] = useState('#B3261E');
  const [c2, setC2] = useState('#F2C14E');
  const [deLogo, setDeLogo] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [mesas, setMesas] = useState(10);
  const [moneda, setMoneda] = useState('ARS');
  const [apertura, setApertura] = useState('08:00');
  const [cierre, setCierre] = useState('23:00');
  const [delivery, setDelivery] = useState(true);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [direccion, setDireccion] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [arrastrando, setArrastrando] = useState(false);
  const [compartir, setCompartir] = useState<DemoConfig | null>(null);
  const inputLogo = useRef<HTMLInputElement>(null);

  async function tomarLogo(file?: File) {
    if (!file) return;
    const e = validarImagen(file);
    if (e) {
      setErrores((x) => ({ ...x, logo: e }));
      return;
    }
    try {
      const data = await reducirImagen(file, 320);
      setLogo(data);
      setErrores((x) => ({ ...x, logo: '' }));
      const cols = await coloresDeImagen(data);
      if (cols) {
        setC1(cols[0]);
        setC2(cols[1]);
        setDeLogo(true);
      }
    } catch {
      setErrores((x) => ({ ...x, logo: 'No se pudo leer la imagen. Probá con otro archivo.' }));
    }
  }

  function crear(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (negocio.trim().length < 2) e.negocio = 'Escribí el nombre del negocio.';
    if (soloDigitos(whatsapp).length < 8) e.whatsapp = 'Escribí el WhatsApp con código de país y de área (ej.: 54 9 11 5555 1234).';
    if (mesas < 1 || mesas > 60) e.mesas = 'Entre 1 y 60 mesas.';
    setErrores(e);
    if (Object.keys(e).length) return;
    const config: DemoConfig = {
      slug: crearSlug(negocio),
      rubro: 'restaurante',
      negocio: negocio.trim(),
      logo,
      colorPrincipal: c1.toUpperCase(),
      colorSecundario: c2.toUpperCase(),
      whatsapp: soloDigitos(whatsapp),
      mesas,
      moneda,
      apertura,
      cierre,
      delivery,
      costoEnvio: Math.max(0, costoEnvio),
      direccion: direccion.trim(),
      creada: new Date().toISOString(),
    };
    try {
      guardarDemo(config);
      router.push(`/d/${config.slug}`);
    } catch (err) {
      setErrores({ general: err instanceof Error ? err.message : 'No se pudo guardar la demo.' });
    }
  }

  const tema = crearTema(c1, c2);

  return (
    <div className="acm">
      <header className="acm-top">
        <div className="acm-wrap">
          <Link href="/" aria-label="ACMIAS Factory, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/logotipo-oscuro.png" alt="ACMIAS" height={22} style={{ height: 22, width: 'auto' }} />
          </Link>
          <span className="chip">Panel del vendedor</span>
        </div>
      </header>

      <main className="acm-wrap">
        <div className="acm-titulo"><h1>Demos</h1></div>
        <p className="acm-sub">Elegí un cliente registrado y abrí su demo con su marca. Si todavía no se registró, cargalo a mano.</p>

        <Registros />

        <div className="acm-grid">
          <form className="acm-card" onSubmit={crear} noValidate aria-labelledby="nueva-demo">
            <h3 id="nueva-demo">Cargar a mano</h3>

            <div className="campo">
              <span className="lbl" id="lbl-rubro">Rubro</span>
              <div className="rubros" role="group" aria-labelledby="lbl-rubro">
                {RUBROS.map((r) => (
                  <button key={r.id} type="button" className="rubro" aria-pressed={r.id === 'restaurante'} disabled={!r.listo} title={r.listo ? undefined : 'Próximamente'}>
                    {r.nombre}{!r.listo && ' · próximamente'}
                  </button>
                ))}
              </div>
            </div>

            <div className="campo">
              <label htmlFor="negocio">Nombre del negocio</label>
              <input id="negocio" className="inp" value={negocio} onChange={(e) => setNegocio(e.target.value)} placeholder="Ej.: Café La Esquina Azul" maxLength={60} autoComplete="organization" />
              {errores.negocio && <p className="err" role="alert">{errores.negocio}</p>}
            </div>

            <div className="campo">
              <span className="lbl">Logo <span style={{ fontWeight: 400, color: 'var(--acm-muted)' }}>(opcional)</span></span>
              <label
                htmlFor="logo"
                className={`logo-drop${arrastrando ? ' activo' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastrando(false); tomarLogo(e.dataTransfer.files?.[0]); }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Vista previa del logo" className="logo-mini" />
                ) : (
                  <span className="logo-mini" style={{ display: 'grid', placeItems: 'center', background: 'var(--acm-raised)', color: 'var(--acm-teal)' }}><Icono nombre="subir" /></span>
                )}
                <span style={{ fontSize: 14, lineHeight: '21px', color: 'var(--acm-muted)' }}>
                  <strong style={{ color: 'var(--acm-mist)' }}>{logo ? 'Cambiar logo' : 'Tocá o arrastrá el logo'}</strong>
                  <br />PNG, JPG, WEBP o SVG hasta 5 MB. Tomamos sus colores.
                </span>
              </label>
              <input ref={inputLogo} id="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => { tomarLogo(e.target.files?.[0]); e.target.value = ''; }} />
              {logo && <button type="button" className="btn btn-linea btn-chico" style={{ alignSelf: 'flex-start' }} onClick={() => { setLogo(undefined); setDeLogo(false); }}>Quitar logo</button>}
              {errores.logo && <p className="err" role="alert">{errores.logo}</p>}
            </div>

            <fieldset className="campo" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
              <legend className="lbl" style={{ marginBottom: 6 }}>Colores {deLogo && <span style={{ fontWeight: 400, color: 'var(--acm-teal)' }}>· tomados del logo</span>}</legend>
              <div className="fila">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                  <input type="color" className="swatch" value={c1} onChange={(e) => { setC1(e.target.value); setDeLogo(false); }} aria-label="Color principal" />
                  <span>Principal<br /><strong>{c1.toUpperCase()}</strong></span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                  <input type="color" className="swatch" value={c2} onChange={(e) => { setC2(e.target.value); setDeLogo(false); }} aria-label="Color secundario" />
                  <span>Secundario<br /><strong>{c2.toUpperCase()}</strong></span>
                </label>
              </div>
              {tema.ajustado && <p className="ayuda" style={{ marginTop: 8 }}>El principal es muy claro para texto: en títulos usamos {tema.marcaTexto} para que se lea bien.</p>}
            </fieldset>

            <div className="campo">
              <label htmlFor="wa">WhatsApp del negocio</label>
              <input id="wa" className="inp" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="54 9 11 5555 1234" autoComplete="tel" />
              <span className="ayuda">Con código de país. Acá llegan los pedidos de la demo.</span>
              {errores.whatsapp && <p className="err" role="alert">{errores.whatsapp}</p>}
            </div>

            <div className="fila">
              <div className="campo">
                <label htmlFor="mesas">Mesas</label>
                <input id="mesas" type="number" min={1} max={60} className="inp" value={mesas} onChange={(e) => setMesas(Number(e.target.value))} />
                {errores.mesas && <p className="err" role="alert">{errores.mesas}</p>}
              </div>
              <div className="campo">
                <label htmlFor="moneda">Moneda</label>
                <select id="moneda" className="inp" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                  {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="fila">
              <div className="campo">
                <label htmlFor="ap">Abre</label>
                <input id="ap" type="time" className="inp" value={apertura} onChange={(e) => setApertura(e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="ci">Cierra</label>
                <input id="ci" type="time" className="inp" value={cierre} onChange={(e) => setCierre(e.target.value)} />
              </div>
            </div>

            <div className="campo">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, minHeight: 44 }}>
                <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--acm-teal)' }} />
                Hace delivery
              </label>
              {delivery && (
                <div className="fila">
                  <div className="campo" style={{ margin: 0 }}>
                    <label htmlFor="envio">Costo de envío</label>
                    <input id="envio" type="number" min={0} className="inp" value={costoEnvio} onChange={(e) => setCostoEnvio(Number(e.target.value))} />
                  </div>
                  <div className="campo" style={{ margin: 0 }}>
                    <label htmlFor="dir">Dirección del local</label>
                    <input id="dir" className="inp" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Opcional" />
                  </div>
                </div>
              )}
            </div>

            {errores.general && <p className="err" role="alert">{errores.general}</p>}
            <button type="submit" className="btn btn-teal" style={{ width: '100%', marginTop: 8 }}>Abrir demo</button>
            <p className="ayuda" style={{ fontSize: 13, color: 'var(--acm-muted)', marginTop: 10 }}>La carta trae platos de ejemplo. En la visita podés cargar el menú real desde una foto.</p>
          </form>

          <section className="acm-card" aria-labelledby="tus-demos">
            <h3 id="tus-demos">Tus demos {demos.length > 0 && <span className="chip">{demos.length}</span>}</h3>
            {demos.length === 0 && <div className="vacio">Todavía no abriste ninguna demo. Completá el formulario y tocá Abrir demo.</div>}
            {demos.map((d) => (
              <article key={d.slug} className="demo-item">
                {d.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.logo} alt="" className="logo-mini" />
                ) : (
                  <span className="logo-mini" style={{ display: 'grid', placeItems: 'center', background: d.colorPrincipal, color: crearTema(d.colorPrincipal, d.colorSecundario).sobreMarca, fontWeight: 800, fontSize: 22 }}>{d.negocio[0]?.toUpperCase()}</span>
                )}
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 17, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.negocio}</strong>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    <span className="chip">Restaurante</span>
                    <span className="chip"><span style={{ width: 10, height: 10, borderRadius: 3, background: d.colorPrincipal, display: 'inline-block' }} /><span style={{ width: 10, height: 10, borderRadius: 3, background: d.colorSecundario, display: 'inline-block' }} /> {d.moneda}</span>
                    <span className="chip">{new Date(d.creada).toLocaleDateString('es')}</span>
                  </span>
                </div>
                <div className="demo-acciones">
                  <Link className="btn btn-teal btn-chico" href={`/d/${d.slug}`}>Abrir demo</Link>
                  <Link className="btn btn-linea btn-chico" href={`/d/${d.slug}/panel`}>Panel del dueño</Link>
                  <Link className="btn btn-linea btn-chico" href={`/d/${d.slug}/sitio`}>Sitio</Link>
                  <button type="button" className="btn btn-linea btn-chico" onClick={() => setCompartir(d)}><Icono nombre="qr" size={16} /> Compartir</button>
                  <button
                    type="button"
                    className="btn btn-linea btn-chico"
                    aria-label={`Borrar la demo de ${d.negocio}`}
                    onClick={() => { if (window.confirm(`¿Borrar la demo de ${d.negocio}? Se pierden sus cambios.`)) borrarDemo(d.slug); }}
                  >
                    <Icono nombre="basura" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
      {compartir && <ModalCompartir demo={compartir} onCerrar={() => setCompartir(null)} />}
    </div>
  );
}

function ModalCompartir({ demo, onCerrar }: { demo: DemoConfig; onCerrar: () => void }) {
  const [qr, setQr] = useState('');
  const [copiado, setCopiado] = useState<'no' | 'si' | 'error'>('no');
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/d/${demo.slug}#c=${codificarConfig(demo)}` : '';

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 280, errorCorrectionLevel: 'L' }).then(setQr).catch(() => setQr(''));
  }, [url]);

  function copiar() {
    if (!navigator.clipboard) return setCopiado('error');
    navigator.clipboard.writeText(url).then(() => setCopiado('si'), () => setCopiado('error'));
  }

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="t-compartir" ref={ref} style={{ background: 'var(--acm-surface)', color: 'var(--acm-mist)', border: '1px solid var(--acm-line)' }}>
        <div className="hoja-cab">
          <h3 id="t-compartir" style={{ fontFamily: 'var(--fuente)' }}>Que el dueño la abra en su celular</h3>
          <button className="x" onClick={onCerrar} aria-label="Cerrar" style={{ background: 'transparent', borderColor: 'var(--acm-line)', color: 'var(--acm-mist)' }}><Icono nombre="cerrar" /></button>
        </div>
        <p style={{ color: 'var(--acm-muted)', marginTop: 0 }}>Que escanee este código. Ve la carta con sus colores y los platos de ejemplo. Por ahora, el logo y los cambios de la carta (menú importado, precios) se ven solo en este celular; viajan cuando conectemos la base de datos.</p>
        {!qr && <p className="err" role="alert">No se pudo generar el QR. Usá Copiar enlace.</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt={`Código QR de la demo de ${demo.negocio}`} style={{ width: 240, height: 240, margin: '8px auto', borderRadius: 12, background: '#fff', padding: 8 }} />}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn btn-teal" onClick={copiar}><Icono nombre="enlace" size={18} /> {copiado === 'si' ? 'Enlace copiado' : 'Copiar enlace'}</button>
          <a className="btn btn-linea" href={`https://wa.me/${demo.whatsapp}?text=${encodeURIComponent(`Hola, esta es la demo de tu carta digital: ${url}`)}`} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Enviar por WhatsApp</a>
        </div>
        {copiado === 'error' && (
          <div className="campo" style={{ marginTop: 12 }}>
            <label htmlFor="enlace-manual">No se pudo copiar solo. Copialo a mano:</label>
            <input id="enlace-manual" className="inp" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
      </div>
    </div>
  );
}

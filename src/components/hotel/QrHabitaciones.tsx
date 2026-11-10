'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Barra } from '@/components/demo/Impresiones';
import { DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { codificarConfig } from '@/lib/utiles';
import { useDemoHotel } from './useHotel';

/** Hoja imprimible con el QR de cada habitación (para pegar en la mesa de luz o detrás de la puerta). */
export function QrHabitaciones({ slug }: { slug: string }) {
  const { config, estado, estilo, listo } = useDemoHotel(slug);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const habitaciones = estado?.habitaciones;
  useEffect(() => {
    if (!config || !habitaciones) return;
    const base = `${window.location.origin}/d/${config.slug}`;
    const hash = `#c=${codificarConfig(config)}`;
    Promise.all(habitaciones.map(async (h) => [h.id, await QRCode.toDataURL(`${base}?hab=${h.codigo}${hash}`, { margin: 1, width: 340, errorCorrectionLevel: 'L' })] as const)).then((xs) => setQrs(Object.fromEntries(xs)), () => setError(true));
  }, [config, habitaciones]);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  return (
    <div className="impr" style={estilo}>
      <Barra slug={slug} titulo={`QR de ${estado.habitaciones.length} habitaciones`} />
      {error && <p role="alert" style={{ padding: 20 }}>No se pudieron generar los códigos QR. Recargá la página para intentar de nuevo.</p>}
      <div className="qr-grid">
        {estado.habitaciones.map((h) => (
          <div key={h.id} className="qr-card">
            <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 18 }}>{config.negocio}</strong>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qrs[h.id] ? <img src={qrs[h.id]} alt={`QR de la habitación ${h.numero}`} /> : <div style={{ aspectRatio: '1', width: '100%' }} />}
            <div style={{ fontFamily: 'var(--fuente-carta)', fontWeight: 800, fontSize: 26, color: 'var(--c-marca-texto)' }}>Habitación {h.numero}</div>
            <div style={{ fontSize: 13, color: '#55555f' }}>Escaneá para pedir room service, toallas o ayuda, sin llamar</div>
            <Link className="no-imprimir qr-probar" href={`/d/${config.slug}?hab=${h.codigo}`}>Probar como la {h.numero}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

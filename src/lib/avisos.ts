import 'server-only';
import type { Registro } from './registros';

/**
 * Avisos al equipo cuando llega una solicitud de "Agenda tu demo".
 *
 * - Mail con Resend: RESEND_API_KEY (y opcional AVISO_EMAIL, AVISO_EMAIL_DESDE).
 *   Mientras no haya dominio propio verificado, el remitente es onboarding@resend.dev y Resend
 *   solo entrega al mail de la cuenta: por eso la cuenta se crea con el mail de avisos.
 * - WhatsApp con CallMeBot: AVISO_WHATSAPP="5491100000000:clave;5491100000001:clave".
 *   Cada celular se activa una vez desde su propio WhatsApp y recibe su clave.
 *
 * Sin claves no se envía nada y la solicitud se guarda igual. Un aviso que falla nunca rompe el envío del formulario.
 */

export const NOMBRE_RUBRO_AVISO: Record<Registro['rubro'], string> = {
  restaurante: 'Restaurante o cafetería',
  repuestos: 'Repuestos',
  tienda: 'Tienda o almacén',
  barberia: 'Barbería o salón',
  consultorio: 'Consultorio',
  ferreteria: 'Ferretería',
  autos: 'Autos y motos',
  inmobiliaria: 'Inmobiliaria',
};

export function textoAviso(r: Registro, rubroIndicado?: string) {
  const rubro = rubroIndicado && rubroIndicado !== NOMBRE_RUBRO_AVISO[r.rubro] ? `${rubroIndicado} (demo de ${NOMBRE_RUBRO_AVISO[r.rubro]})` : NOMBRE_RUBRO_AVISO[r.rubro];
  return [
    'Nueva solicitud de demo en ACMIAS',
    '',
    `Negocio: ${r.negocio}`,
    `Rubro: ${rubro}`,
    `WhatsApp: +${r.whatsapp}`,
    `Mail: ${r.email}`,
    `Colores: ${r.colorPrincipal} y ${r.colorSecundario}${r.logo ? ' · subió logo' : ''}`,
    r.caso ? `Qué quiere resolver: ${r.caso}` : '',
    '',
    `Escribile: https://wa.me/${r.whatsapp}`,
    'Abrí la demo desde el panel de vendedores: https://acmias-factory.vercel.app',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
}

/** "549...:clave;549...:clave" → [{ telefono, clave }]. */
export function destinosWhatsApp(valor = process.env.AVISO_WHATSAPP ?? '') {
  return valor
    .split(/[;,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [tel, clave] = x.split(':').map((y) => y.trim());
      return { telefono: (tel ?? '').replace(/\D/g, ''), clave: clave ?? '' };
    })
    .filter((d) => d.telefono.length >= 8 && d.clave);
}

async function conLimite(url: string, init: RequestInit, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

async function mail(r: Registro, texto: string) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return 'sin-clave';
  const res = await conLimite('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.AVISO_EMAIL_DESDE ?? 'ACMIAS <onboarding@resend.dev>',
      to: [process.env.AVISO_EMAIL ?? 'acmias2026@gmail.com'],
      reply_to: r.email,
      subject: `Nueva demo: ${r.negocio} (${NOMBRE_RUBRO_AVISO[r.rubro]})`,
      text: texto,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return 'ok';
}

async function whatsapp(texto: string) {
  const destinos = destinosWhatsApp();
  if (!destinos.length) return 'sin-clave';
  const res = await Promise.allSettled(
    destinos.map(async (d) => {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${d.telefono}&apikey=${encodeURIComponent(d.clave)}&text=${encodeURIComponent(texto)}`;
      const r = await conLimite(url, { method: 'GET' });
      if (!r.ok) throw new Error(`CallMeBot ${r.status}`);
    }),
  );
  return res.every((x) => x.status === 'fulfilled') ? 'ok' : 'parcial';
}

export async function avisarSolicitud(r: Registro, rubroIndicado?: string) {
  const texto = textoAviso(r, rubroIndicado);
  const [m, w] = await Promise.allSettled([mail(r, texto), whatsapp(texto)]);
  const estado = { mail: m.status === 'fulfilled' ? m.value : 'error', whatsapp: w.status === 'fulfilled' ? w.value : 'error' };
  // Sin datos personales en el registro del servidor.
  console.info('[avisos] solicitud', r.id, estado);
  return estado;
}

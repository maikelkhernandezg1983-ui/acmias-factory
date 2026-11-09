type Nombre =
  | 'mas' | 'menos' | 'cerrar' | 'whatsapp' | 'carrito' | 'reloj' | 'subir' | 'qr' | 'imprimir'
  | 'editar' | 'basura' | 'ojo' | 'chispa' | 'atras' | 'texto' | 'check' | 'deshacer' | 'enlace' | 'tienda' | 'grafico' | 'llave' | 'buscar' | 'lista' | 'info' | 'planilla' | 'calendario' | 'tijera' | 'usuario' | 'candado' | 'estrella';

const P: Record<Nombre, React.ReactNode> = {
  mas: <path d="M12 5v14M5 12h14" />,
  llave: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  lista: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  planilla: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M4 15h16M10 3v18" />
    </>
  ),
  calendario: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  tijera: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  candado: (
    <>
      <rect x="4.5" y="11" width="15" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  estrella: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  menos: <path d="M5 12h14" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  whatsapp: <path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" />,
  carrito: (
    <>
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  subir: <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />,
  qr: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />,
  imprimir: <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />,
  editar: <path d="M4 20h4L20 8l-4-4L4 16zM14 6l4 4" />,
  basura: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  ojo: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  chispa: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  atras: <path d="M15 18l-6-6 6-6" />,
  texto: <path d="M4 7V5h10v2M9 5v14M7 19h4M14 13v-1h6v1M17 12v7M16 19h2" />,
  check: <path d="M20 6 9 17l-5-5" />,
  deshacer: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />,
  enlace: <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />,
  tienda: <path d="M3 9l2-5h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v7h14v-7" />,
  grafico: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
};

export function Icono({ nombre, size = 20, className }: { nombre: Nombre; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[nombre]}
    </svg>
  );
}

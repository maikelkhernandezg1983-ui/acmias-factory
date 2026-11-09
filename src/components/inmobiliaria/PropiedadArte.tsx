import type { TipoPropiedad } from '@/lib/rubros/inmobiliaria/tipos';

/**
 * Ilustraciones propias de propiedades genéricas (sin fachadas reales).
 * Las ventanas con clase pa-luz se encienden en la escena del inicio.
 */

const VIDRIO = '#9FC3DA';
const MARCO = '#2B3440';
const TECHO = '#9A4B3A';
const VERDE = '#5E8F55';

function Arbol({ x, y = 232, r = 30 }: { x: number; y?: number; r?: number }) {
  return (
    <g>
      <rect x={x - 4} y={y - r - 6} width="8" height={r + 6} rx="3" fill="#7A5A3E" />
      <circle cx={x} cy={y - r - 18} r={r} fill={VERDE} />
      <circle cx={x - r * 0.5} cy={y - r - 4} r={r * 0.6} fill="#6FA064" />
    </g>
  );
}

function Ventana({ x, y, w, h, luz }: { x: number; y: number; w: number; h: number; luz?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={VIDRIO} stroke={MARCO} strokeWidth="3" />
      {luz !== undefined && <rect className="pa-luz" style={{ '--d': `${luz * 0.35}s` } as React.CSSProperties} x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} rx="2" fill="#FFE29A" />}
      <path d={`M${x + w / 2} ${y} V${y + h}`} stroke={MARCO} strokeWidth="2" />
    </g>
  );
}

function Casa({ color }: { color: string }) {
  return (
    <>
      <Arbol x={350} r={32} />
      <rect x="250" y="70" width="24" height="46" fill="#7d4033" />
      <rect x="104" y="128" width="210" height="104" fill={color} stroke="#00000022" />
      <polygon points="88,134 209,60 330,134" fill={TECHO} />
      <polygon points="88,134 209,60 216,64 100,134" fill="#000" opacity="0.12" />
      <Ventana x={126} y={150} w={46} h={36} luz={0} />
      <Ventana x={248} y={150} w={46} h={36} luz={2} />
      <rect x="187" y="168" width="44" height="64" rx="3" fill="#6B4A3A" />
      <circle cx="223" cy="202" r="3" fill="#E3B23C" />
      <rect x="60" y="214" width="40" height="18" rx="9" fill={VERDE} />
    </>
  );
}

function Departamento({ color }: { color: string }) {
  const filas = [56, 88, 120, 152];
  return (
    <>
      <rect x="40" y="96" width="90" height="136" fill={color} opacity="0.55" />
      <rect x="290" y="70" width="86" height="162" fill={color} opacity="0.45" />
      <rect x="130" y="34" width="160" height="198" fill={color} stroke="#00000022" />
      <rect x="124" y="28" width="172" height="10" fill="#00000030" />
      {filas.map((y, i) =>
        [148, 192, 236].map((x, j) => <Ventana key={`${x}-${y}`} x={x} y={y} w={34} h={24} luz={i === 2 && j === 1 ? 1 : (i + j) % 3 === 0 ? i + j : undefined} />),
      )}
      {filas.map((y) => <rect key={y} x="142" y={y + 27} width="136" height="4" fill="#00000026" />)}
      <rect x="188" y="190" width="44" height="42" rx="3" fill={MARCO} />
      <rect x="192" y="194" width="36" height="38" fill={VIDRIO} opacity="0.7" />
      <Arbol x={368} r={22} />
    </>
  );
}

function PH({ color }: { color: string }) {
  return (
    <>
      <rect x="70" y="100" width="280" height="132" fill={color} stroke="#00000022" />
      <rect x="64" y="94" width="292" height="10" fill="#00000030" />
      <path d="M86 94 V70 M126 94 V70 M166 94 V70 M206 94 V70 M246 94 V70 M286 94 V70 M326 94 V70 M80 70 H332" stroke={MARCO} strokeWidth="3" />
      <circle cx="110" cy="80" r="12" fill={VERDE} />
      <circle cx="300" cy="78" r="14" fill="#6FA064" />
      <Ventana x={96} y={122} w={52} h={40} luz={0} />
      <Ventana x={272} y={122} w={52} h={40} luz={2} />
      <rect x="186" y="150" width="48" height="82" rx="3" fill="#6B4A3A" />
      <rect x="180" y="146" width="60" height="6" fill={TECHO} />
      <Arbol x={386} r={20} />
    </>
  );
}

function Local({ color }: { color: string }) {
  return (
    <>
      <rect x="80" y="60" width="260" height="172" fill={color} stroke="#00000022" />
      <rect x="110" y="72" width="200" height="30" rx="4" fill="#ffffff" opacity="0.85" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${92 + i * 30} 112 h30 l-4 26 h-30 z`} fill={i % 2 ? '#ffffff' : TECHO} />
      ))}
      <rect x="100" y="146" width="150" height="86" fill={VIDRIO} stroke={MARCO} strokeWidth="4" />
      <rect className="pa-luz" style={{ '--d': '0.4s' } as React.CSSProperties} x="104" y="150" width="142" height="78" fill="#FFE29A" />
      <rect x="264" y="146" width="56" height="86" fill={MARCO} />
      <rect x="270" y="152" width="44" height="80" fill={VIDRIO} opacity="0.75" />
    </>
  );
}

function Oficina({ color }: { color: string }) {
  return (
    <>
      <rect x="60" y="110" width="80" height="122" fill={color} opacity="0.5" />
      <rect x="150" y="20" width="130" height="212" fill={color} stroke="#00000022" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="160" y={32 + i * 26} width="110" height="18" fill={VIDRIO} opacity="0.9" />
      ))}
      <rect className="pa-luz" style={{ '--d': '0.2s' } as React.CSSProperties} x="160" y="110" width="110" height="18" fill="#FFE29A" />
      <rect className="pa-luz" style={{ '--d': '0.9s' } as React.CSSProperties} x="160" y="58" width="110" height="18" fill="#FFE29A" />
      <rect x="196" y="204" width="38" height="28" fill={MARCO} />
      <rect x="290" y="90" width="76" height="142" fill={color} opacity="0.6" />
    </>
  );
}

function Terreno() {
  return (
    <>
      <polygon points="40,232 380,232 340,176 80,176" fill="#8DBB6C" />
      <polygon points="80,176 340,176 330,168 92,168" fill="#7AA85C" />
      {[60, 110, 160, 210, 260, 310, 360].map((x) => <rect key={x} x={x} y="200" width="6" height="32" fill="#8A6A4A" />)}
      <path d="M50 210 H372 M50 222 H372" stroke="#8A6A4A" strokeWidth="3" />
      <rect x="236" y="104" width="6" height="74" fill="#5A4636" />
      <rect x="208" y="96" width="62" height="40" rx="4" fill="#ffffff" stroke={MARCO} strokeWidth="3" />
      <path d="M218 110 H260 M218 122 H248" stroke={TECHO} strokeWidth="5" strokeLinecap="round" />
      <Arbol x={110} y={180} r={26} />
    </>
  );
}

function Galpon({ color }: { color: string }) {
  return (
    <>
      <path d="M50 232 V120 Q210 56 370 120 V232 Z" fill={color} stroke="#00000022" />
      <path d="M50 120 Q210 56 370 120" stroke="#00000033" strokeWidth="8" fill="none" />
      <rect x="150" y="128" width="120" height="104" fill="#5B6573" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M150 ${140 + i * 13} H270`} stroke="#ffffff30" strokeWidth="3" />)}
      <Ventana x={72} y={150} w={50} h={30} luz={1} />
      <Ventana x={298} y={150} w={50} h={30} />
    </>
  );
}

function Cochera({ color }: { color: string }) {
  return (
    <>
      <rect x="100" y="90" width="220" height="142" fill={color} stroke="#00000022" />
      <rect x="92" y="82" width="236" height="12" fill="#00000030" />
      <rect x="128" y="120" width="164" height="112" fill="#6E7784" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M128 ${130 + i * 13} H292`} stroke="#ffffff40" strokeWidth="3" />)}
      <rect className="pa-luz" style={{ '--d': '0.6s' } as React.CSSProperties} x="196" y="100" width="28" height="10" rx="4" fill="#FFE29A" />
    </>
  );
}

export function PropiedadArte({ tipo, color, titulo, className }: { tipo: TipoPropiedad; color: string; titulo?: string; className?: string }) {
  return (
    <svg viewBox="0 0 420 250" className={`pa-arte ${className ?? ''}`} role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <ellipse cx="210" cy="236" rx="190" ry="8" fill="#000" opacity="0.12" />
      {tipo === 'casa' && <Casa color={color} />}
      {tipo === 'departamento' && <Departamento color={color} />}
      {tipo === 'ph' && <PH color={color} />}
      {tipo === 'local' && <Local color={color} />}
      {tipo === 'oficina' && <Oficina color={color} />}
      {tipo === 'terreno' && <Terreno />}
      {tipo === 'galpon' && <Galpon color={color} />}
      {tipo === 'cochera' && <Cochera color={color} />}
      <rect x="0" y="232" width="420" height="4" fill="#00000024" />
    </svg>
  );
}

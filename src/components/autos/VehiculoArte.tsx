import type { Carroceria } from '@/lib/rubros/autos/tipos';

/**
 * Ilustraciones propias de autos y motos genéricos (sin marcas ni diseños reconocibles).
 * Las ruedas giran cuando el contenedor tiene la clase .au-mover (hover o entrada).
 */

const CUERPO: Record<Exclude<Carroceria, 'naked' | 'scooter' | 'enduro'>, { cuerpo: string; vidrios: string[]; ruedas: [number, number, number]; luz: [number, number]; cola: [number, number] }> = {
  sedan: {
    cuerpo: 'M58 192 Q56 162 92 152 L200 138 Q250 90 318 82 L410 82 Q464 86 508 138 L572 148 Q604 154 606 180 L608 196 Q608 210 594 210 L70 210 Q56 210 56 198 Z',
    vidrios: ['M226 138 Q266 100 318 94 L360 94 L360 138 Z', 'M372 94 L408 94 Q450 98 484 138 L372 138 Z'],
    ruedas: [168, 500, 40],
    luz: [586, 160],
    cola: [62, 160],
  },
  hatch: {
    cuerpo: 'M58 198 L60 126 Q62 98 90 92 L300 80 Q364 78 404 86 L474 138 L566 148 Q602 156 604 182 L606 198 Q606 210 592 210 L70 210 Q58 210 58 198 Z',
    vidrios: ['M90 134 L98 108 Q104 100 124 100 L250 96 L250 134 Z', 'M262 96 L330 94 Q372 94 396 100 L446 134 L262 134 Z'],
    ruedas: [160, 500, 40],
    luz: [584, 164],
    cola: [64, 140],
  },
  suv: {
    cuerpo: 'M84 202 L86 112 Q88 80 122 76 L378 70 Q414 70 438 90 L486 128 L570 138 Q604 146 604 178 L604 202 Q604 216 590 216 L98 216 Q84 216 84 202 Z',
    vidrios: ['M116 122 L122 96 Q128 88 148 88 L262 84 L262 122 Z', 'M274 84 L374 82 Q404 82 424 100 L452 122 L274 122 Z'],
    ruedas: [192, 500, 48],
    luz: [586, 158],
    cola: [90, 134],
  },
  pickup: {
    cuerpo: 'M48 198 L48 140 L250 140 L254 98 Q258 84 282 82 L402 80 Q432 80 452 96 L498 136 L574 144 Q606 150 608 178 L608 198 Q608 212 594 212 L62 212 Q48 212 48 198 Z',
    vidrios: ['M268 130 L272 104 Q274 94 292 94 L352 92 L352 130 Z', 'M364 92 L402 92 Q428 94 442 106 L468 130 L364 130 Z'],
    ruedas: [154, 506, 46],
    luz: [590, 160],
    cola: [52, 150],
  },
};

function Rueda({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 5} fill="#15171c" opacity="0.18" />
      <circle cx={cx} cy={cy} r={r} fill="#1b1e24" />
      <g className="au-rueda">
        <circle cx={cx} cy={cy} r={r * 0.62} fill="#c9ced6" />
        {[0, 72, 144, 216, 288].map((a) => (
          <rect key={a} x={cx - 3} y={cy - r * 0.58} width="6" height={r * 0.58} rx="3" fill="#8b929e" transform={`rotate(${a} ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.2} fill="#5b616d" />
      </g>
    </g>
  );
}

function Auto({ c, color }: { c: keyof typeof CUERPO; color: string }) {
  const d = CUERPO[c];
  const claro = esClaro(color);
  return (
    <>
      <path d={d.cuerpo} fill={color} stroke={claro ? '#c4c9d1' : 'none'} strokeWidth="2" />
      {/* Volumen: sombra inferior y brillo superior sin degradés. */}
      <path d={d.cuerpo} fill="#000" opacity="0.14" clipPath={`url(#au-bajo-${c})`} />
      <clipPath id={`au-bajo-${c}`}>
        <rect x="0" y="178" width="640" height="60" />
      </clipPath>
      {d.vidrios.map((v) => (
        <path key={v} d={v} fill="#222833" />
      ))}
      {d.vidrios.map((v) => (
        <path key={`b${v}`} d={v} fill="#fff" opacity="0.12" clipPath={`url(#au-brillo-${c})`} />
      ))}
      <clipPath id={`au-brillo-${c}`}>
        <polygon points="250,60 330,60 270,160 190,160" />
      </clipPath>
      <path d={`M${d.cola[0] + 6} ${d.luz[1] + 12} L${d.luz[0] - 4} ${d.luz[1] + 16}`} stroke={claro ? '#9aa1ab' : '#fff'} strokeOpacity={claro ? 0.6 : 0.28} strokeWidth="3" fill="none" />
      <rect x={d.luz[0] - 14} y={d.luz[1] - 6} width="22" height="11" rx="5.5" fill="#fff6d6" />
      <rect x={d.cola[0] - 4} y={d.cola[1] - 6} width="12" height="14" rx="4" fill="#d6332a" />
      <rect x="350" y={d.luz[1] - 10} width="22" height="5" rx="2.5" fill="#000" opacity="0.28" />
      <Rueda cx={d.ruedas[0]} cy={210} r={d.ruedas[2]} />
      <Rueda cx={d.ruedas[1]} cy={210} r={d.ruedas[2]} />
    </>
  );
}

function Moto({ c, color }: { c: 'naked' | 'scooter' | 'enduro'; color: string }) {
  if (c === 'scooter') {
    const claro = esClaro(color);
    return (
      <>
        <path d="M150 196 Q128 194 128 168 Q130 124 196 116 L304 114 Q330 118 334 146 L336 176 L402 176 Q418 176 424 162 L446 104 Q452 88 470 86 L486 88 L470 168 Q458 204 420 204 L176 204 Z" fill={color} stroke={claro ? '#c4c9d1' : 'none'} strokeWidth="2" />
        <path d="M336 186 L402 186" stroke="#000" strokeOpacity="0.18" strokeWidth="6" strokeLinecap="round" />
        <path d="M166 116 Q220 94 310 104 L306 124 Q228 126 172 130 Z" fill="#1b1e24" />
        <path d="M478 90 L492 50" stroke="#5b616d" strokeWidth="8" strokeLinecap="round" />
        <path d="M470 50 L516 46" stroke="#1b1e24" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="488" cy="112" rx="9" ry="15" fill="#fff6d6" />
        <rect x="122" y="150" width="14" height="10" rx="4" fill="#d6332a" />
        <Rueda cx={186} cy={206} r={40} />
        <Rueda cx={470} cy={206} r={40} />
      </>
    );
  }
  const alta = c === 'enduro';
  const y = alta ? 182 : 192;
  const r = alta ? 58 : 54;
  return (
    <>
      <path d={`M168 ${y} L300 ${y - 22}`} stroke="#3b4049" strokeWidth="11" strokeLinecap="round" />
      <path d={`M300 ${y - 18} L250 ${y + 18} L222 ${y + 22}`} stroke="#8b929e" strokeWidth="9" strokeLinecap="round" fill="none" />
      <rect x="262" y={y - 46} width="92" height="56" rx="12" fill="#30343c" />
      <rect x="276" y={y - 38} width="30" height="38" rx="6" fill="#4a505b" />
      <path d={alta ? 'M290 108 Q336 82 404 90 L428 118 Q376 130 300 132 Z' : 'M290 120 Q332 92 402 100 L424 130 Q372 140 300 142 Z'} fill={color} stroke={esClaro(color) ? '#c4c9d1' : 'none'} strokeWidth="2" />
      <path d={alta ? 'M190 104 Q240 92 300 98 L298 114 Q246 118 196 118 Z' : 'M198 128 Q242 116 300 122 L296 138 Q250 142 204 140 Z'} fill="#1b1e24" />
      <path d={alta ? 'M150 100 L196 100 L192 114 Z' : 'M176 124 L208 120 L204 136 Z'} fill={color} />
      {alta && <path d="M120 150 Q150 118 196 116" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />}
      {alta && <path d="M450 118 Q486 112 512 138" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />}
      <path d={`M436 ${alta ? 92 : 104} L470 ${y}`} stroke="#9aa1ab" strokeWidth="10" strokeLinecap="round" />
      <path d={`M418 ${alta ? 84 : 96} L456 ${alta ? 72 : 84}`} stroke="#1b1e24" strokeWidth="7" strokeLinecap="round" />
      <circle cx={alta ? 458 : 462} cy={alta ? 104 : 116} r="14" fill="#fff6d6" stroke="#30343c" strokeWidth="4" />
      <path d={`M306 ${y + 10} L232 ${y + 20} Q214 ${y + 22} 212 ${y + 10} Z`} fill="#9aa1ab" />
      <Rueda cx={168} cy={y} r={r} />
      <Rueda cx={470} cy={y} r={r} />
    </>
  );
}

export function esClaro(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
}

export function VehiculoArte({ carroceria, color, titulo, className }: { carroceria: Carroceria; color: string; titulo?: string; className?: string }) {
  const moto = carroceria === 'naked' || carroceria === 'scooter' || carroceria === 'enduro';
  return (
    <svg viewBox="0 0 660 260" className={`au-arte ${className ?? ''}`} role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <ellipse cx="330" cy="248" rx={moto ? 230 : 290} ry="10" fill="#000" opacity="0.16" />
      {moto ? <Moto c={carroceria} color={color} /> : <Auto c={carroceria} color={color} />}
    </svg>
  );
}

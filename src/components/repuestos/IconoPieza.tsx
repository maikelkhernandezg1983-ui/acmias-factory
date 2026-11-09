import type { CategoriaRep } from '@/lib/rubros/repuestos/tipos';

/** Ilustraciones de línea de cada familia de piezas. Toman el color del texto (currentColor). */
export function IconoPieza({ categoria, size = 48 }: { categoria: CategoriaRep; size?: number }) {
  const comun = { width: size, height: size, viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (categoria) {
    case 'filtros':
      return (
        <svg {...comun}>
          <ellipse cx="32" cy="14" rx="16" ry="5" />
          <path d="M16 14v34c0 2.8 7.2 5 16 5s16-2.2 16-5V14" />
          <path d="M22 20v28M27 21v29M32 21v29M37 21v29M42 20v28" opacity=".55" />
          <ellipse cx="32" cy="14" rx="5" ry="1.6" />
        </svg>
      );
    case 'frenos':
      return (
        <svg {...comun}>
          <circle cx="30" cy="34" r="20" />
          <circle cx="30" cy="34" r="7" />
          <path d="M30 20v2M30 46v2M16 34h2M42 34h2M20 24l1.4 1.4M38.6 42.6 40 44M20 44l1.4-1.4M38.6 25.4 40 24" opacity=".55" />
          <path d="M40 12c8 3 13 10 13 18v4c0 2-1.6 3.6-3.6 3.6H47c-1.7 0-3-1.3-3-3V28c0-5-2.8-9-6.6-11" />
        </svg>
      );
    case 'encendido':
      return (
        <svg {...comun}>
          <path d="M28 6h8v8h-8z" />
          <path d="M26 14h12l-1.5 6h-9z" />
          <path d="M24 20h16v8H24z" />
          <path d="M27 28h10v12H27zM27 32h10M27 36h10" />
          <path d="M30 40h4v8h-4zM32 48v5M32 53h5" />
          <path d="M44 16l4-3M46 22h5M44 28l4 3" opacity=".55" />
        </svg>
      );
    case 'suspension':
      return (
        <svg {...comun}>
          <path d="M27 4h10v8H27z" />
          <path d="M29 12v40h6V12" />
          <path d="M18 18l28 5M18 24l28 5M18 30l28 5M18 36l28 5M18 42l28 5" />
          <circle cx="32" cy="56" r="4" />
        </svg>
      );
    case 'distribucion':
      return (
        <svg {...comun}>
          <circle cx="20" cy="40" r="11" />
          <circle cx="20" cy="40" r="3.5" />
          <circle cx="45" cy="20" r="8" />
          <circle cx="45" cy="20" r="2.5" />
          <path d="M11 34 38 13M29 46 52 26" />
          <path d="M45 46a5 5 0 1 0 0-.1" opacity=".55" />
        </svg>
      );
    case 'lubricantes':
      return (
        <svg {...comun}>
          <path d="M20 16h18l6 6v32a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z" />
          <path d="M24 10h8v6h-8z" />
          <path d="M17 30h27M17 44h27" opacity=".55" />
          <path d="M30.5 33.5c-2 3-3 4.5-3 6a3 3 0 0 0 6 0c0-1.5-1-3-3-6z" />
        </svg>
      );
  }
}

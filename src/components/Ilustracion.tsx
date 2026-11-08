import type { Ilustracion as Tipo } from '@/lib/tipos';

/** Ilustraciones lineales propias para la demo. Nunca fotos de otro local. */
const TRAZOS: Record<Tipo, React.ReactNode> = {
  cafe: (
    <>
      <path d="M14 26h28v10a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z" />
      <path d="M42 30h3a5 5 0 0 1 0 10h-4" />
      <path d="M22 18c0-3 3-3 3-6M30 18c0-3 3-3 3-6" />
      <path d="M10 52h40" />
    </>
  ),
  medialuna: (
    <>
      <path d="M8 40c6-16 18-24 24-24s18 8 24 24c-6-4-12-5-16-3-3-6-5-9-8-9s-5 3-8 9c-4-2-10-1-16 3z" />
      <path d="M26 30l2 7M38 30l-2 7" />
    </>
  ),
  tostado: (
    <>
      <path d="M12 26c0-6 4-10 10-10h20c6 0 10 4 10 10 0 3-2 5-4 5v17H16V31c-2 0-4-2-4-5z" />
      <path d="M16 38h32M22 44h20" />
    </>
  ),
  plato: (
    <>
      <circle cx="32" cy="34" r="18" />
      <circle cx="32" cy="34" r="10" />
      <path d="M6 18v12a4 4 0 0 0 4 4v18M10 18v10M58 18c-4 2-5 8-5 14h5v20" />
    </>
  ),
  pasta: (
    <>
      <path d="M10 34h44a22 18 0 0 1-44 0z" />
      <path d="M20 34c0-8 6-10 6-16M30 34c0-6 6-10 4-18M40 34c0-6 4-8 8-14" />
      <path d="M24 52h16" />
    </>
  ),
  burger: (
    <>
      <path d="M12 28c0-9 9-14 20-14s20 5 20 14z" />
      <path d="M10 34h44M12 40c4 2 8-2 12 0s8 2 12 0 8-2 12 0 4 0 4 0" />
      <path d="M12 46h40v2a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" />
      <path d="M24 20h.01M32 18h.01M40 20h.01" />
    </>
  ),
  sandwich: (
    <>
      <path d="M8 38 32 16l24 22z" />
      <path d="M8 38v6h48v-6M14 44c4 3 8 3 12 0s8-3 12 0 8 3 12 0" />
    </>
  ),
  postre: (
    <>
      <path d="M14 30h36l-4 22H18z" />
      <path d="M14 30c0-8 8-14 18-14s18 6 18 14" />
      <circle cx="32" cy="12" r="3" />
      <path d="M22 38h20" />
    </>
  ),
  bebida: (
    <>
      <path d="M18 18h28l-4 34H22z" />
      <path d="M20 28h24M36 18l6-10h6" />
      <circle cx="28" cy="38" r="2" />
      <circle cx="35" cy="44" r="2" />
    </>
  ),
  combo: (
    <>
      <path d="M8 30h26l-3 20H11z" />
      <path d="M38 22h16l-2 28H40z" />
      <path d="M44 22l3-10h5M12 30c0-6 5-10 10-10s10 4 10 10" />
    </>
  ),
  ensalada: (
    <>
      <path d="M8 32h48a24 18 0 0 1-48 0z" />
      <path d="M18 32c-2-6 2-12 8-10 2-6 10-6 12 0 6-2 10 4 8 10" />
      <path d="M26 52h12" />
    </>
  ),
  wok: (
    <>
      <path d="M6 30h44a22 18 0 0 1-44 0z" />
      <path d="M50 34h10" />
      <path d="M18 24c2-4 6-4 8 0M30 22c2-4 6-4 8 0" />
      <path d="M40 8 28 28M46 10 34 28" />
    </>
  ),
};

export function Ilustracion({ tipo, className }: { tipo: Tipo; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {TRAZOS[tipo] ?? TRAZOS.plato}
    </svg>
  );
}

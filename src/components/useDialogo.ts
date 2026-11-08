'use client';

import { useEffect, useRef } from 'react';

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ventana modal accesible: Escape cierra, Tab queda dentro, el foco entra al abrir
 * y vuelve al elemento que la abrió al cerrar. También bloquea el scroll de fondo.
 */
export function useDialogo<T extends HTMLElement>(onCerrar: () => void) {
  const ref = useRef<T>(null);
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const nodo = ref.current;
    const primero = nodo?.querySelector<HTMLElement>('[autofocus], ' + ENFOCABLES);
    primero?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrar.current();
        return;
      }
      if (e.key !== 'Tab' || !nodo) return;
      const lista = Array.from(nodo.querySelectorAll<HTMLElement>(ENFOCABLES)).filter((el) => el.offsetParent !== null);
      if (!lista.length) return;
      const a = lista[0];
      const z = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
      previo?.focus?.();
    };
  }, []);

  return ref;
}

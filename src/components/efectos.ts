'use client';

/** Animación "vuela al carrito": una copia de la foto viaja en arco hasta la barra del pedido. */
export function volarAlCarrito(origen: HTMLElement | null, destino: () => HTMLElement | null, alLlegar: () => void) {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!origen || reducido || typeof origen.animate !== 'function') {
    alLlegar();
    return;
  }
  // La copia se toma ya: el origen puede desaparecer (la hoja del plato se cierra al agregar).
  const r = origen.getBoundingClientRect();
  const copia = origen.cloneNode(true) as HTMLElement;
  copia.classList.add('volando');
  Object.assign(copia.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.appendChild(copia);
  // El destino se mide en el cuadro siguiente: con el primer plato la barra recién aparece.
  requestAnimationFrame(() => {
    const d = destino()?.getBoundingClientRect();
    const fx = d ? d.left + 38 : window.innerWidth / 2;
    const fy = d ? d.top + d.height / 2 : window.innerHeight - 40;
    const dx = fx - (r.left + r.width / 2);
    const dy = fy - (r.top + r.height / 2);
    const anim = copia.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, borderRadius: '16px' },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(0.55) rotate(-8deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(6deg)`, opacity: 0.4, borderRadius: '50%' },
      ],
      { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.75, 0.4)' },
    );
    anim.onfinish = () => {
      copia.remove();
      alLlegar();
    };
    anim.oncancel = () => copia.remove();
  });
}


# CLAUDE.md · Rubro Ferretería

Leé antes el `CLAUDE.md` raíz y `BRD-06-ferreteria.md`.

## Dónde está cada cosa
- Catálogo generado: `src/lib/rubros/ferreteria/catalogo.ts` (familias × medidas × variantes × líneas ≈ 3.100 productos, unidades convertibles, sinónimos de fábrica, complementos y problemas). No se guarda: se genera igual en cada dispositivo.
- Lógica: `src/lib/rubros/ferreteria/logica.ts` (búsqueda con sinónimos y tolerancia, lectura de listas con contexto, aprendizaje, presupuestos, venta, reposición).
- Estado guardado (`tipos.ts`): solo cambios de precio y stock, sinónimos, aprendidos, clientes y presupuestos (pocos KB).
- IA: `/api/leer-lista` solo transcribe la foto. Nunca ve el catálogo ni los precios.
- Pantallas: `src/components/ferreteria/` (CatalogoFer, Cotizador, PanelFerreteria, PresupuestoFer, SitioFer). Presupuesto imprimible en `/d/[slug]/presupuesto/[id]`.
- Pruebas: `tests/ferreteria-listas.spec.ts` (15 listas de muestra y rendimiento) y `tests/ferreteria.spec.ts`. Guion: `docs/demos/ferreteria.md`.

## Reglas
1. La IA nunca inventa un precio ni un producto: los precios salen del catálogo.
2. Línea dudosa = amarillo con 2 o 3 opciones; no se envía hasta elegir. Elegir guarda el sinónimo.
3. Todo presupuesto lleva validez y "sujeto a disponibilidad".
4. Para sumar un caso al lector de listas, agregá la lista a `MUESTRAS` con el resultado esperado.
5. Fuera de la demo: audios, cuenta corriente real, sucursales, venta por peso, facturación electrónica.

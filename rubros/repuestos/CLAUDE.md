# CLAUDE.md · Rubro Repuestos de mecánica

Leé antes el `CLAUDE.md` raíz y `BRD-02-repuestos.md` del Proyecto ACMIAS.

## Dónde está cada cosa
- Datos de ejemplo: `src/lib/rubros/repuestos/datos-ejemplo.ts` (Repuestos El Pistón, 4 vehículos genéricos, 30 piezas, taller "Taller Hermanos Ruiz").
- Lógica: `src/lib/rubros/repuestos/logica.ts` (búsqueda tolerante por código/OEM/equivalente, stock por rangos, mensaje de WhatsApp).
- Importador de planillas: `src/lib/rubros/repuestos/planilla-importada.ts` + `src/app/api/importar-planilla/route.ts`.
- Pantallas: `src/components/repuestos/` (Catalogo, PanelRepuestos, ImportadorPlanilla, SitioRepuestos, CotizacionImprimible).
- Pruebas: `tests/repuestos.spec.ts` (390 y 1440 px).
- Guion: `docs/demos/repuestos.md`.

## Reglas del rubro
1. Toda ficha muestra "Confirmá la compatibilidad con el vendedor".
2. Original y alternativo siempre etiquetados.
3. En la demo, marcas de autos genéricas ("Marca A Sedán"); nunca marcas reales.
4. Lo importado por IA se revisa y aprueba a mano antes de publicarse.
5. La cotización no es un comprobante fiscal: el texto lo dice.

## Fuera de esta demo (próximamente)
Búsqueda por patente o VIN, TecDoc, Mercado Libre, cuenta corriente, facturación, búsqueda por foto de la pieza.

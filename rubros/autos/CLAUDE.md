# CLAUDE.md · Rubro Autos y motos

Leé antes el `CLAUDE.md` raíz y `BRD-07-autos-y-motos.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Datos de ejemplo: `src/lib/rubros/autos/datos-ejemplo.ts` (Motores del Sur: ~23 vehículos en venta de 15 fichas con marcas genéricas "Marca A…H", consultas de 3 semanas, pruebas de manejo próximas; cuota con sistema francés).
- Lógica: `src/lib/rubros/autos/logica.ts` (búsqueda con palabras del cliente, cuota, consultas, pruebas de manejo con el motor de agenda de barbería: cada vehículo es un "profesional", mensajes de WhatsApp, métricas).
- Ilustraciones propias: `src/components/autos/VehiculoArte.tsx` (sedán, hatch, SUV, pick-up, moto calle, scooter, enduro; ruedas que giran; respeta reduced-motion).
- Pantallas: `src/components/autos/` (Concesionaria, PanelAutos, SitioAutos).
- Pruebas: `tests/autos.spec.ts`. Guion: `docs/demos/autos.md`.

## Reglas
1. Nunca marcas, logos ni modelos reales; nunca fotos de vehículos con marca visible.
2. La cuota es una estimación con tasa de referencia y lo dice en pantalla; la aprobación la define la financiera.
3. La demo nunca inventa una tasación: el dueño carga el valor ofrecido.
4. Un vehículo no se reserva dos veces en el mismo horario de prueba.
5. Fuera de la demo (próximamente): fotos reales por vehículo, precalificación de crédito real, documentación y transferencia, publicación en portales de clasificados.

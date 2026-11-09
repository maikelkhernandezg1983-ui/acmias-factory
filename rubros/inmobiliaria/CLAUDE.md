# CLAUDE.md · Rubro Inmobiliaria

Leé antes el `CLAUDE.md` raíz y `BRD-08-inmobiliaria.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Datos de ejemplo: `src/lib/rubros/inmobiliaria/datos-ejemplo.ts` (Propiedades del Parque: unas 20 propiedades en venta, alquiler y temporario de 8 tipos, 7 zonas ficticias, consultas, visitas próximas y propietarios que piden tasación).
- Lógica: `src/lib/rubros/inmobiliaria/logica.ts` (búsqueda con palabras del interesado y por código, costo de ingreso estimado, visitas con el motor de agenda de barbería: cada propiedad es un "profesional", mensajes de WhatsApp, métricas).
- Ilustraciones propias: `src/components/inmobiliaria/PropiedadArte.tsx` (casa, departamento, PH, local, oficina, terreno, galpón, cochera; ventanas que se encienden; respeta reduced-motion).
- Pantallas: `src/components/inmobiliaria/` (CatalogoInmo, PanelInmo, SitioInmo).
- Pruebas: `tests/inmobiliaria.spec.ts`. Guion: `docs/demos/inmobiliaria.md`.

## Reglas
1. Direcciones siempre aproximadas (calle y altura redondeada); nunca la dirección exacta ni datos del propietario en la ficha pública.
2. El costo de ingreso es una estimación con los meses que carga la inmobiliaria y lo dice en pantalla; honorarios y depósito dependen de la normativa local.
3. La demo nunca inventa una tasación: solo registra el pedido y lo deriva por WhatsApp.
4. Una propiedad no se visita dos veces en el mismo horario.
5. Fuera de la demo (próximamente): fotos reales y recorrido virtual, mapa real, contratos y garantías, publicación en portales, calendario de ocupación para temporarios.

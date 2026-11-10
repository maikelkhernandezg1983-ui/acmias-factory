# CLAUDE.md · Rubro Hotelería

Leé antes el `CLAUDE.md` raíz y `BRD-10-hotel.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Datos de ejemplo: `src/lib/rubros/hotel/datos-ejemplo.ts` (Hotel con 22 habitaciones en 3 pisos, 17 ocupadas, llegadas y salidas de hoy, carta de room service con fotos de la carta del restaurante y pedidos del día). `codigoHab()` define el código fijo del QR de cada habitación.
- Lógica: `src/lib/rubros/hotel/logica.ts` (pedidos por área, estados Nueva → En curso → Lista, cuenta de la estadía, check-in, check-out, reservas sin superposición, mensajes de WhatsApp, métricas).
- Pantallas: `src/components/hotel/` (HuespedHotel: lo que abre el QR; PanelHotel; SitioHotel; QrHabitaciones, que usa `/d/[slug]/qr`).
- Pruebas: `tests/hotel.spec.ts`. Guion: `docs/demos/hotel.md`.

## Reglas
1. La habitación sale solo del QR (`?hab=código`): el huésped no elige el número a mano y un código inválido no abre nada.
2. Solo pide quien tiene una estadía activa en esa habitación; después del check-out el QR deja de funcionar.
3. El room service se carga a la cuenta de la estadía; si se cancela, sale de la cuenta.
4. No se puede hacer check-in en una habitación que no está libre, ni reservar fechas superpuestas.
5. Fuera de la demo (próximamente): avisos sonoros y por WhatsApp al personal, cobro en línea y facturación, integración con motores de reserva y OTAs, cerradura digital, varios idiomas para el huésped.

# CLAUDE.md · Rubro Barbería / salón

Leé antes el `CLAUDE.md` raíz y `BRD-04-barberia.md` del Proyecto ACMIAS.

## Dónde está cada cosa
- Agenda genérica (la reutiliza el consultorio): `src/lib/rubros/barberia/agenda.ts` (huecos cada 15 min según horario, duración, turnos y bloqueos; 30 min de anticipación; ocupación; candidatos de la lista de espera).
- Datos de ejemplo: `src/lib/rubros/barberia/datos-ejemplo.ts` (Barbería El Faro: 3 profesionales, 7 servicios, 4 semanas de historia y 2 por delante, con semilla fija). `correrSemanas` mueve la agenda de ejemplo a la semana actual si la demo se abre semanas después.
- Lógica: `src/lib/rubros/barberia/logica.ts` (reservar, cambiar estado con sellos y ausencias, reprogramar, mensajes de WhatsApp, métricas).
- Pantallas: `src/components/barberia/` (Reserva, GestionTurno en `/d/[slug]/turno/[token]`, PanelBarberia, SitioBarberia).
- Pruebas: `tests/barberia.spec.ts`. Guion: `docs/demos/barberia.md`.

## Reglas
1. Reservar no pide cuenta: nombre y WhatsApp. El cliente se reconoce por su WhatsApp.
2. Cancelar o reprogramar libera el horario y marca como avisados a los de la lista de espera de ese día (el dueño les escribe con un toque).
3. Cada turno atendido suma un sello; "No vino" suma una ausencia. Deshacer los resta.
4. La seña se muestra como regla; el cobro real es un módulo próximamente.
5. Avatares con iniciales: nunca fotos de personas reales como profesionales.
6. Fuera de la demo (próximamente): envío automático de confirmaciones y recordatorios, cobro de señas, varias sucursales.

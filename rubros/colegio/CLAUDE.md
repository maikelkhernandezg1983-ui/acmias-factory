# CLAUDE.md · Rubro Colegio

Leé antes el `CLAUDE.md` raíz y `BRD-11-colegio.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Datos de ejemplo: `src/lib/rubros/colegio/datos-ejemplo.ts` (Colegio con 8 cursos de inicial y primaria, 120 alumnos y 92 familias ficticias, cuotas de marzo a la fecha, 10 días de asistencia, comunicados con lecturas parciales, dos autorizaciones abiertas y preinscripciones). `planillaAlumnos()` arma la planilla de ejemplo de 184 alumnos.
- Lógica: `src/lib/rubros/colegio/logica.ts` (cuota por familia con descuento por hermano y beca, comunicados y lectura, autorizaciones, asistencia y justificaciones, vacantes, importación de alumnos, mensajes de WhatsApp). Usa los periodos del estudio contable.
- Pantallas: `src/components/colegio/` (PanelColegio, PortalFamilias, SitioColegio con preinscripción, ImportarAlumnos).
- Pruebas: `tests/colegio.spec.ts`. Guion: `docs/demos/colegio.md`.

## Reglas
1. Son datos de menores: la demo no guarda fotos, datos de salud, notas ni boletines. 🔒 Revisión legal antes del primer colegio real.
2. El pago queda confirmado solo cuando lo confirma el colegio; el aviso de la familia queda como "avisó que pagó".
3. Los hermanos comparten familia: una cuota, un acceso y un solo aviso.
4. La lectura de un comunicado se registra cuando la familia lo abre en el portal.
5. Fuera de la demo (próximamente): envío masivo automático, cobro en línea, boletines y notas, secundaria con materias, varios responsables por familia con permisos.

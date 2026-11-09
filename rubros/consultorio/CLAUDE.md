# CLAUDE.md · Rubro Consultorio médico

Leé antes el `CLAUDE.md` raíz, `BRD-05-consultorio.md` y `rubros/barberia/CLAUDE.md` (el consultorio usa el mismo motor de agenda).

## Dónde está cada cosa
- Motor de agenda compartido: `src/lib/rubros/barberia/` (agenda, lógica, tipos). Los campos de consultorio son opcionales: coberturas, pausa diaria, sobreturno, modalidad, afiliado, registro de accesos.
- Datos de ejemplo: `src/lib/rubros/consultorio/datos-ejemplo.ts` (Consultorio Integral Sur: Dra. Laura Méndez y Lic. Andrés Castillo, 5 tipos de consulta, coberturas ficticias Salud Plus y MediRed, ausentismo cercano al 18 %).
- Pantallas: `src/components/consultorio/` (ReservaConsultorio, Pacientes, SitioConsultorio). El panel es `PanelBarberia` (se adapta por `estado.rubro`) y el enlace del turno es `GestionTurno`.
- Pruebas: `tests/consultorio.spec.ts`. Guion: `docs/demos/consultorio.md`.

## Reglas
1. **Nada clínico se guarda.** La ficha del paciente es administrativa: contacto, cobertura, afiliado, notas de contacto e historial de turnos. Una prueba revisa que lo guardado no tenga campos clínicos.
2. **Historia clínica = vista previa ficticia** ("Próximamente"), armada en pantalla, no editable y sin guardarse. Pasa a producto solo con firma digital, consentimiento, conservación legal y la puerta 🔒 legal del BRD.
3. **Mensajes neutros:** confirmación, recordatorio y lista de espera solo dicen día, hora y lugar. Nunca profesional, especialidad, tipo de consulta ni motivo.
4. Abrir o editar una ficha queda en el registro de accesos (Ajustes).
5. Teléfono visible (canal humano) y "Esta página no da consejos médicos". Ninguna IA interpreta síntomas.
6. Fuera de la demo: receta electrónica, facturación a obras sociales, videollamada propia, envío automático de WhatsApp.

# CLAUDE.md · Rubro Estudio contable

Leé antes el `CLAUDE.md` raíz y `BRD-09-contador.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Datos de ejemplo: `src/lib/rubros/contador/datos-ejemplo.ts` (Estudio con 48 clientes ficticios, CUIT con formato válido pero inventados, 12 meses de cuotas, tarea del mes a mitad de camino). `planillaEjemplo()` genera la planilla de 280 clientes para mostrar la importación.
- Lógica: `src/lib/rubros/contador/logica.ts` (estado de cuenta, deudas, tareas del mes, mensajes de WhatsApp, ingresos mensuales, lectura e importación de planillas). Periodos en `periodos.ts`.
- Pantallas: `src/components/contador/` (PanelContador con tablero, tareas, clientes, deudas, importar y ajustes; ImportarClientes; PortalCliente; SitioContador).
- Pruebas: `tests/contador.spec.ts`. Guion: `docs/demos/contador.md`.

## Reglas
1. Claves: en la demo se guardan en el dispositivo y se muestran con el ojito solo 15 segundos; cada vista queda en el registro de accesos. Nunca importar claves reales en una demo. En la versión real: cifradas, visibles solo para el dueño y con registro de quién las miró.
2. El portal del cliente nunca muestra la clave.
3. Un pago solo queda pagado cuando el estudio lo confirma a mano; el aviso del cliente es "informado".
4. Las tareas se trabajan en el orden fijo de la cartera (N°); importar no cambia el orden de los clientes existentes.
5. La cuota y la tarea de cada mes se crean solas para los clientes activos.
6. Fuera de la demo (próximamente): envío automático de WhatsApp, conexión con el sistema fiscal, facturación electrónica de honorarios, cobro en línea.

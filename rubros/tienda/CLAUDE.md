# CLAUDE.md · Rubro Tienda con inventario

Leé antes el `CLAUDE.md` raíz y `BRD-03-tienda.md` del Proyecto ACMIAS.

## Dónde está cada cosa
- Datos de ejemplo: `src/lib/rubros/tienda/datos-ejemplo.ts` (Lupe Moda & Regalos y Almacén Don Tito, con 4 semanas de ventas generadas con semilla fija).
- Lógica: `src/lib/rubros/tienda/logica.ts` (stock por variante, descuento con lotes por vencimiento, alertas, pedido sugerido = venta diaria × cobertura − stock, reportes).
- Pantallas: `src/components/tienda/` (Tienda, Mostrador con lector por cámara, PanelTienda, ImportadorTienda, SitioTienda).
- Importador: `src/lib/rubros/tienda/planilla-importada.ts` + `/api/importar-planilla` con `rubro: 'tienda'`.
- Pruebas: `tests/tienda.spec.ts`. Guion: `docs/demos/tienda.md`.

## Reglas
1. El stock baja en la venta de mostrador y al **confirmar** un pedido de WhatsApp (no al recibirlo).
2. Cada movimiento guarda su origen (mostrador, whatsapp, entrada).
3. La venta de mostrador no es comprobante fiscal: la factura electrónica se integra con un proveedor habilitado.
4. Fuera de la demo (próximamente): pagos en línea, facturación, sucursales, cupones, aviso de reposición al cliente.

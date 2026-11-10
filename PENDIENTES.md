# Pendientes de ACMIAS Factory

Actualizado: 10 nov 2026. Marcá con [x] lo que se cierre.

## Lo que tiene que hacer el fundador (necesita su cuenta o sus claves)
- [ ] **Clave de IA**: cargar `ANTHROPIC_API_KEY` en Vercel (proyecto `acmias-factory` → Settings → Environment Variables) y hacer Redeploy. Activa: importar menú desde foto (restaurante), cargar planilla (repuestos y tienda) y leer fotos de listas (ferretería).
- [ ] **Base de datos**: en Vercel → Storage → Neon → Create (acepta condiciones y facturación). Después avisar para conectar.
- [ ] **Dominio**: comprar `acmias.com` (≈ USD 12/año) y apuntarlo a Vercel (nameservers de Vercel para los subdominios `*.demo.acmias.com`).
- [ ] **Avisos de "Agenda tu demo" por WhatsApp**: Maikel y su esposa activan CallMeBot, cada uno desde su celular, y cargan en Vercel `AVISO_WHATSAPP=5491135726247:CLAVE1;5491122541737:CLAVE2` + Redeploy.
- [ ] **Avisos por mail**: crear cuenta en resend.com con acmias2026@gmail.com, crear una API key y cargarla en Vercel como `RESEND_API_KEY` + Redeploy.
- [ ] **Usuarios de vendedores**: sumar uno por vendedor en `/ingresar/generar` y unirlos en `VENDEDORES` con `;`.

## Lo que hace Claude cuando esté lo anterior
- [ ] Conectar Neon: guardar registros, demos y estado (catálogo, pedidos, stock, agenda) en la base para que los cambios se vean en todos los dispositivos.
- [x] Conectar el formulario "Agenda tu demo" de la landing a `/api/registros`, con aviso por mail y WhatsApp y respaldo por WhatsApp si falla el envío.
- [ ] Verificación real del mail del cliente por código (se quitó el código de muestra de la landing).
- [ ] QR de mesa con código único por mesa (hoy el número va en la dirección y se puede cambiar a mano).
- [ ] Subdominio por demo (`{slug}.demo.acmias.com`) cuando esté el dominio.
- [ ] Probar la importación con IA real (menú, planillas) con archivos de clientes reales.
- [ ] Barbería: el enlace del turno (confirmar, cambiar, cancelar) y la lista de espera viven en el dispositivo de la demo; con la base de datos funcionan desde el celular del cliente. Envío automático de WhatsApp y cobro de señas: módulos próximamente.
- [ ] Ferretería: con la clave de IA, probar la lectura de fotos con 20 listas reales del primer cliente antes de activarla (puerta del rubro).
- [ ] Autos y motos: módulo de fotos reales por vehículo (hoy ilustraciones) y BRD-07 a validar con una agencia real.
- [ ] Inmobiliaria: fotos reales y recorrido virtual, mapa real; BRD-08 a validar con la inmobiliaria del vendedor (garantías, honorarios y normativa de alquiler de su zona).
- [ ] Estudio contable: validar BRD-09 con el contador (columnas de su Excel, tareas por mes, vencimientos). 🔒 Antes del primer estudio real: claves fiscales cifradas, permisos y registro de quién las ve, revisión legal de la custodia.
- [ ] Semáforo de stock: hoy los límites son en unidades y valen para todo el negocio. Si un cliente lo pide, sumar límites por categoría (en la ferretería no es lo mismo 3 térmicas que 3 tornillos).
- [ ] Fotos: restaurante y tienda usan fotos libres de Unsplash; repuestos usa ilustraciones (las fotos libres mostraban marcas reales).

## Rubros
- [x] Restaurante
- [x] Repuestos
- [x] Tienda con inventario (ropa y almacén)
- [x] Barbería / salón (reservas en 3 pasos, agenda por profesional, lista de espera, sellos, métricas)
- [x] Consultorio médico (coberturas, mensajes neutros, sobreturnos, ficha administrativa; historia clínica solo como vista previa ficticia)
- [x] Ferretería (3.100 productos, sinónimos, cotizador desde texto o foto, listas de precios, presupuestos y reposición)
- [x] Autos y motos (rubro nuevo: stock con ilustraciones, cuota estimada, usado para tasar, prueba de manejo, consultas completas por WhatsApp)
- [x] Inmobiliaria (rubro nuevo: alquiler, venta y temporario de 8 tipos de propiedad, costo de ingreso estimado, visitas agendadas, captación de propietarios)
- [x] Estudio contable (rubro nuevo: importación de 280 clientes desde Excel, claves con ojito y registro, historial de pagos con confirmación manual, tareas del mes en orden con aviso por WhatsApp, deudas y tablero de ingresos)
- [x] Semáforo de stock (Tienda, Ferretería y Repuestos): rojo, amarillo y verde en unidades, configurable en Ajustes, con filtro por color en el panel.

## Antes del Demo Day (4 dic 2026)
- [ ] Historia clínica real (si se decide hacerla): firma digital, consentimiento, conservación legal por país y contrato de encargado de tratamiento. 🔒 Puerta legal antes del primer consultorio real.
- [ ] Revisión de código y seguridad completa (agentes de QA) sobre los 6 rubros.
- [ ] Prueba en celulares reales (Android y iPhone), incluido el lector de códigos por cámara.
- [ ] Guiones de 5 minutos ensayados (están en `docs/demos/`).

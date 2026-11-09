# Pendientes de ACMIAS Factory

Actualizado: 9 nov 2026. Marcá con [x] lo que se cierre.

## Lo que tiene que hacer el fundador (necesita su cuenta o sus claves)
- [ ] **Clave de IA**: cargar `ANTHROPIC_API_KEY` en Vercel (proyecto `acmias-factory` → Settings → Environment Variables) y hacer Redeploy. Activa: importar menú desde foto (restaurante) y cargar planilla (repuestos y tienda).
- [ ] **Base de datos**: en Vercel → Storage → Neon → Create (acepta condiciones y facturación). Después avisar para conectar.
- [ ] **Dominio**: comprar `acmias.com` (≈ USD 12/año) y apuntarlo a Vercel (nameservers de Vercel para los subdominios `*.demo.acmias.com`).
- [ ] **Usuarios de vendedores**: sumar uno por vendedor en `/ingresar/generar` y unirlos en `VENDEDORES` con `;`.

## Lo que hace Claude cuando esté lo anterior
- [ ] Conectar Neon: guardar registros, demos y estado (catálogo, pedidos, stock, agenda) en la base para que los cambios se vean en todos los dispositivos.
- [ ] Conectar el formulario "Agenda tu demo" de la landing a `/api/registros` (CORS ya listo).
- [ ] QR de mesa con código único por mesa (hoy el número va en la dirección y se puede cambiar a mano).
- [ ] Subdominio por demo (`{slug}.demo.acmias.com`) cuando esté el dominio.
- [ ] Probar la importación con IA real (menú, planillas) con archivos de clientes reales.
- [ ] Fotos: restaurante y tienda usan fotos libres de Unsplash; repuestos usa ilustraciones (las fotos libres mostraban marcas reales).

## Rubros
- [x] Restaurante
- [x] Repuestos
- [x] Tienda con inventario (ropa y almacén)
- [ ] Barbería / salón (en curso)
- [ ] Consultorio médico
- [ ] Ferretería

## Antes del Demo Day (4 dic 2026)
- [ ] Revisión de código y seguridad completa (agentes de QA) sobre los 6 rubros.
- [ ] Prueba en celulares reales (Android y iPhone), incluido el lector de códigos por cámara.
- [ ] Guiones de 5 minutos ensayados (están en `docs/demos/`).

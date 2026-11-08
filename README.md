# ACMIAS Factory

Demos por rubro con la marca de cada cliente. El vendedor carga el negocio, su logo y sus colores, y toca **Abrir demo**.

**Rubro disponible:** Restaurante y cafetería (BRD 01). Los demás rubros aparecen como "próximamente".

## Qué hace hoy

| Ruta | Para quién | Qué hace |
| --- | --- | --- |
| `/` | Vendedor | Nueva demo (logo con colores automáticos, WhatsApp, mesas, moneda, horario, delivery), lista de demos, compartir por QR o enlace |
| `/d/{slug}` | Comensal | Carta con categorías, destacados, etiquetas, alérgenos, agotados, letra grande, abierto o cerrado, carrito con notas y pedido por WhatsApp (mesa, retiro o delivery). `?mesa=4` toma la mesa del QR |
| `/d/{slug}/panel` | Dueño | Editar precios, agotados, destacados y fotos; subir precios en masa con vista previa y deshacer; pedidos del día y lo más visto; importar el menú desde foto o PDF con IA; ajustes |
| `/d/{slug}/qr` | Dueño | Un QR por mesa listo para imprimir |
| `/d/{slug}/imprimir` | Dueño | Carta impresa generada desde los mismos datos |
| `/d/{slug}/sitio` | Comensal | Landing estándar del restaurante |
| `/api/importar-menu` | Panel | Lee una carta con la API de Claude y devuelve platos validados con zod |

**Limitación temporal:** las demos se guardan en el dispositivo del vendedor (localStorage). El enlace para compartir lleva los datos sin el logo. La base de datos (Neon) y los archivos (Vercel Blob) llegan con la plataforma (BRD 00, E2 y E4).

## Desarrollo

```bash
npm install
npm run dev            # http://localhost:3000
npm run lint && npx tsc --noEmit && npm run build
PORT=3100 npm start & npx playwright test   # pruebas a 390 y 1440 px
```

Variables de entorno: ver `.env.example`. Sin `ANTHROPIC_API_KEY`, la importación con IA avisa que falta la clave y el resto funciona igual.

## Reglas

- Leer `CLAUDE.md` (raíz) y `rubros/restaurante/CLAUDE.md` antes de tocar código.
- Todo PR pasa por el workflow **Calidad** (lint, tipos, build, Playwright) y por aprobación humana. Nada llega a `main` sin revisión.
- Las demos dicen "Demo ilustrativa", llevan `noindex` y usan datos ficticios.

## Estructura

```
src/
├─ app/                      # rutas (panel del vendedor, demos, API)
├─ components/
│  ├─ vendedor/              # panel del vendedor
│  └─ demo/                  # carta, panel del dueño, importador, impresiones, sitio
└─ lib/
   ├─ marca.ts               # motor de marca: colores del cliente con contraste 4,5:1
   ├─ imagen.ts              # reducción de imágenes y colores desde el logo
   ├─ almacen.ts             # almacenamiento de demos (temporal, en el dispositivo)
   └─ rubros/restaurante/    # datos de ejemplo e importación de menú
tests/                       # Playwright
docs/demos/restaurante.md    # guion de la visita de 5 minutos
```

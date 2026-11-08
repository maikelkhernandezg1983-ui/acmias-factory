# CLAUDE.md · Rubro Restaurante y cafetería

> Vive en `rubros/restaurante/CLAUDE.md`. Todo agente que trabaje en este rubro lo lee **después** del `CLAUDE.md` raíz y de `AGENTES-FACTORY.md`, y **antes** de tocar código o diseño.
> Versión 1.0 · 8 nov 2026 · Alcance y historias: `BRD-01-restaurante.md` (historias RES-01 en adelante).

## 1. Qué construimos

La demo navegable del rubro **Restaurante y cafetería**, con datos de ejemplo, que el motor de demos abre con el logo y los colores de cada solicitud en `{slug}.demo.acmias.com`.

- **Sprint:** S2 (16 a 20 nov 2026); pulido y guion en S4 (30 nov a 4 dic 2026).
- **Momento "wow" de la visita:** Foto de la carta real del local → platos cargados en segundos (con revisión humana).
- **Datos de ejemplo:** "Café La Esquina Azul": desayunos, cafetería, platos del día, burgers, postres, bebidas y combos.

## 2. Qué reutiliza y qué es nuevo

- **Motores comunes (no se reescriben):** Catálogo (P-29) · Pedido WhatsApp (P-30) · Menú con QR (P-34) · Landing (P-35) · Panel del dueño (P-36) · Reportes (P-37) · Importador de menú IA (P-38).
- **Nuevo en este rubro:** Modos de servicio (mesa, para llevar, delivery), carta imprimible en PDF, horarios automáticos, aumento masivo de precios.

Regla: si una historia pide algo que un motor ya hace, se configura el motor. Si hace falta cambiar un motor, el Arquitecto abre un ADR y se prueba en los 6 rubros.

## 3. Estructura en el monorepo

```
rubros/restaurante/
├─ CLAUDE.md            # este archivo
├─ config.ts            # módulos activos, textos, rutas (validado con zod)
├─ seeds/restaurante.json       # datos de ejemplo ficticios y versionados
├─ app/                 # pantallas propias del rubro (cliente final y panel)
├─ landing/             # secciones de la landing estándar del rubro
├─ prompts/             # prompts de importación con IA (si aplica)
└─ tests/               # Playwright + unitarios del rubro
```

## 4. Agentes en este rubro

| Agente | Qué hace en este rubro | Skills | Lo valida |
| --- | --- | --- | --- |
| Orquestador | Toma las historias RES-xx del BRD en orden y arma las tareas | Plan mode, task list, `acmias-implementacion` | Fundador |
| Analista de Rubro | Mantiene la ficha de necesidades y la lista "esto se puede mejorar" | `deep-research`, `competitor-analysis` | Orquestador |
| Arquitecto | Confirma qué motores se reutilizan y diseña solo lo nuevo | `feature-dev:code-architect`, `artifact-diagramming` | QA de Código |
| Diseñador UI | Pantallas del cliente final, del panel y de la landing, con la marca del cliente | `frontend-design`, `acmias-web`, tipo **Design** | Guardián de Marca, QA Visual |
| Dev Frontend | Pantallas en Next.js con los tokens del tema | `feature-dev`, `react-best-practices`, `react-view-transitions` | QA de Código, QA Visual |
| Dev Backend / Datos | Tablas, migraciones, acciones de servidor | `feature-dev`, `react-best-practices` | QA de Código, Seguridad |
| Generador de Datos Demo | `seeds/restaurante.json` con datos ficticios verosímiles | `xlsx`, `nano-banana` | Guardián de Marca |
| Importador IA | Importadores y prompts del rubro | API de Claude, `pdf`, `xlsx` | QA de Código + persona |
| QA Visual | 390 y 1440 px, accesibilidad, reduced-motion | Playwright, `web-design-guidelines`, `acmias-web` | — |
| QA de Código | Revisión de PRs y tests | `code-review`, `pr-review-toolkit` | — |
| Seguridad y Privacidad | Secretos, permisos, aislamiento entre demos | `security-guidance`, `silent-failure-hunter` | — |
| Guardián de Marca | Textos y visual contra la marca y la honestidad | `acmias-fundacion`, `voice-builder` | — |
| Redactor | Textos de la app, landing y guion de 5 minutos | `writing-style-and-tone`, `acmias-comercial` | Guardián de Marca |

**Énfasis propio del rubro:**
- **Importador IA:** Prompt de visión que devuelve platos en JSON validado con zod (nombre, descripción, precio, categoría, etiquetas, confianza). Probado con 10 cartas de muestra; meta 80 % correctos.
- **Diseñador UI:** Carta pensada para leer en el celular con una mano: letra base 16 px, botón de tamaño de letra, foto grande solo en platos destacados.
- **Generador de Datos Demo:** Fotos de platos ilustrativas de la biblioteca propia o generadas con `nano-banana`; nunca fotos de otro local.

## 5. Reglas del rubro

1. Los alérgenos los informa el local: la app muestra el campo y la aclaración, no los deduce.
2. El QR complementa la carta física, no la reemplaza: siempre ofrecer la carta imprimible.
3. El pedido por WhatsApp no es un comprobante fiscal.
4. Todo lo que no está construido se muestra como "Próximamente".
5. Toda pantalla pública dice "Demo ilustrativa" y lleva `noindex`.

## 6. Validación antes de cada merge

- [ ] Criterio de aceptación de la historia cumplido
- [ ] Capturas a 390 y 1440 px con 3 combinaciones de colores de cliente (claro, oscuro y uno de bajo contraste)
- [ ] `web-design-guidelines` y `acmias-web` sin hallazgos altos
- [ ] `pr-review-toolkit` y `security-guidance` sin hallazgos críticos
- [ ] Tests del rubro y de los motores que toca, en verde
- [ ] Guardián de Marca: textos honestos, nada prometido que no exista

## 7. Puertas humanas 🔒

- Merge a producción → Responsable Técnico.
- Datos o marca de un comercio real en la demo → Responsable Comercial antes de compartir el enlace.
- Precio en pantalla → Responsable Comercial.

## 8. Al terminar una historia

Actualizar el estado en el BRD, dejar captura en el PR, y si cambió algo del guion de la demo, avisar al Redactor.

# CLAUDE.md · Repositorio ACMIAS Factory

@AGENTS.md

Antes de cualquier tarea:
1. Leé el contexto del proyecto ACMIAS (Proyecto en claude.ai: `01-estrategia/CLAUDE.md`, `08-factory/AGENTES-FACTORY.md`).
2. Leé el `CLAUDE.md` del rubro en `rubros/<rubro>/CLAUDE.md` y su BRD.
3. Colores solo desde el motor de marca (`src/lib/marca.ts`) o los tokens de `globals.css`; nada de colores nuevos escritos a mano.
4. Toda demo dice "Demo ilustrativa", lleva `noindex` y usa datos ficticios.
5. Antes de pedir revisión: `npm run lint`, `npm run typecheck`, `npm run build` y `npm run test:e2e` en verde.
6. Nunca hacer merge a `main` sin aprobación humana. Nunca subir claves: van en Vercel (`.env.example`).

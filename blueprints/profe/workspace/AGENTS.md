# profe — instrucciones para agentes

Tutor personal de portugués **europeo** (pt-PT, no pt-BR) para cuatro perfiles:
enseña a hablar, escribir y leer desde cero, puntúa la pronunciación fonema a
fonema y decide el siguiente ejercicio según los errores reales acumulados.

Dos paquetes: `the_profe-app/` (Expo SDK 57) y `the_profe-server/` (Hono sobre Node 24).

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `pnpm --dir the_profe-app install` · `pnpm --dir the_profe-server install` |
| Dev | `pnpm --dir the_profe-app run start` · `pnpm --dir the_profe-server run dev` (:8787) |
| Build backend | `pnpm --dir the_profe-server run build` → `dist/server.js` |
| Typecheck | `pnpm --dir the_profe-app run typecheck` · `pnpm --dir the_profe-server run typecheck` |
| Lint | `pnpm --dir the_profe-app run lint` · `pnpm --dir the_profe-server run lint` |
| Tests | `pnpm --dir the_profe-app run test` · `pnpm --dir the_profe-server run test` |
| Un test | `pnpm --dir the_profe-server run test tests/<ruta>` (ruta relativa a `the_profe-server/`) |
| Base local | `pnpm --dir the_profe-server run db:local:up` · `db:local:reset` · `db:local:down` |
| Nueva migración | `pnpm --dir the_profe-server run db:migration:new <slug>` |

**Gate:** typecheck, lint y test de los dos paquetes pasan antes de marcar nada
como hecho.

## No negociable

1. **El audio va teléfono → backend → proveedor.** Nunca teléfono → proveedor, y
   nunca serverless en la ruta de audio: un arranque en frío es audible.
2. **La cuota se reserva ANTES de abrir el micrófono.** Insuficiente → 402, sin fila
   de sesión.
3. **Barge-in para la reproducción Y trunca el historial a lo que se oyó.**
4. **`budget_ledger` es append-only.** Sin `UPDATE`, sin `DELETE`, nunca.
5. **El único CLI de Supabase permitido es el pinado** (`pnpm dlx supabase@2.118.0`).
   El global de esta máquina es v1 y falla contra un proyecto v2 de una forma que se
   lee como esquema roto.
6. **En el cliente, `pnpm dlx expo install`, nunca `pnpm add`** para nada nativo. Nunca
   crees `ios/` ni `android/` en git.
7. **Nunca commitees secretos, `.env`, ni salida de compilación.** Ninguna clave de
   proveedor en el cliente: el bundle de JS es legible.
8. **Nunca marques una tarea como hecha con un comando del gate en rojo**, y nunca
   edites un `Verify` para que pase.

Arquitectura completa, fronteras entre capas, tokens de diseño y reglas por área:
`CLAUDE.md` en este mismo directorio. Orden de construcción: `blueprints/profe/tasks.json`
y `blueprints/profe/epics/`.

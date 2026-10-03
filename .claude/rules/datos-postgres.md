---
description: Convenciones de esquema, migraciones y RLS de Postgres en Supabase para profe
paths:
  - "supabase/migrations/**"
  - "supabase/seed/**"
  - "the_profe-server/src/db/**"
  - "the_profe-server/tests/sql/**"
  - "the_profe-server/tests/db/**"
---

# Postgres, migraciones y RLS

Antes de crear o alterar cualquier cosa que viva en Postgres, usa la skill
`supabase-postgres-best-practices`. También para diagnosticar consultas lentas,
bloqueos o filas visibles para el perfil equivocado.

## Propiedad del esquema

- **Las migraciones SQL de `supabase/migrations/` son las dueñas únicas del
  esquema.** No hay ORM y no habrá uno: dos sistemas de migración sobre una base
  de datos es una combinación conocida-mala — el estado deriva y la siguiente
  migración falla sólo en producción.
- **El panel de Supabase está en modo solo-lectura desde el día uno.** Un cambio
  hecho a mano allí no existe en el repositorio y se pierde en el siguiente push.
- Nunca edites una migración que ya se aplicó. Añade otra.
- El nombre de archivo es `supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql`.
  Créalo con `pnpm --dir the_profe-server run db:migration:new <slug>`, que invoca el
  CLI **pinado** (`supabase@2.118.0`). Nunca teclees `supabase` a secas: el CLI
  global de esta máquina es v1 y falla contra un proyecto v2 de una forma que se
  lee como esquema roto en vez de como herramienta equivocada.
- Aplica en local con `pnpm --dir the_profe-server run db:local:reset`. Contra Supabase,
  sólo `pnpm --dir the_profe-server run db:push`.

## Tipos

- Segundos: `integer`. Coste: `cost_micros` en `bigint`, millonésimas de euro.
  **Nunca coma flotante** — la deriva de redondeo aparece como un saldo que no
  llega a cero.
- Identificadores: `uuid` con `default gen_random_uuid()`, salvo `budget_ledger`,
  que usa `bigserial` porque su orden de inserción importa.
- Marcas de tiempo: `timestamptz`, nunca `timestamp`.
- Todo conjunto cerrado de valores lleva `check (col in (...))`. Sin enums de
  Postgres: añadir un valor a un enum es una migración con bloqueo.

## RLS

- **Toda tabla con `profile_id` lleva RLS activado y una política por operación.**
  Una tabla sin política y con RLS activado es invisible, no insegura: si una
  consulta devuelve cero filas inesperadamente, esto es lo primero que mirar.
- `audio_assets` tiene la distinción que importa: `kind = 'tts_cache'` es
  **legible por todos los perfiles autenticados** —es lo que hace que la caché
  sirva a los cuatro y que el TTS tienda a gratis— y `kind = 'user_recording'` es
  **privado de su dueño, siempre**.
- `budget_ledger` sólo lo escribe `service_role`. El cliente jamás inserta ahí.
- Toda política nueva llega con un test en `the_profe-server/tests/db/` que prueba las dos
  direcciones: el dueño ve su fila, y otro perfil no la ve. Una política sin el
  test negativo no está probada.

## `budget_ledger` es append-only

Sin `UPDATE`, sin `DELETE`, nunca. Hay un trigger que lo hace cumplir. Los
contadores de `budget_periods` se mantienen **dentro de la misma transacción**
que inserta en el ledger, y son objetivo de bloqueo y lectura rápida, no la
fuente de verdad.

## Retención

`user_recording` y las transcripciones son datos personales de cuatro personas
reales. Toda fila que los contenga lleva `retention_until`. La función
`public.purge_expired_audio()` borra lo vencido y es lo que ejecuta el trabajo
programado; los tests la llaman directamente en vez de depender de `pg_cron`.

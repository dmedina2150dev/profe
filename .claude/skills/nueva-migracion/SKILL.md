---
name: nueva-migracion
description: Usar al crear o alterar cualquier cosa en Postgres en profe — añadir o cambiar una tabla, columna, índice, política RLS, trigger o función. Cubre el nombre del archivo, el CLI pinado, la aplicación local, el test de RLS obligatorio en las dos direcciones y la verificación. Úsala también si una consulta devuelve cero filas inesperadamente.
---

# Nueva migración de Postgres

## Cuándo usarla

- «añade una tabla», «añade una columna», «cambia el tipo de…»
- «hace falta un índice para…»
- «esta consulta devuelve cero filas y no debería» (casi siempre es RLS)
- cualquier función, trigger o trabajo programado en la base de datos

## Antes de escribir una línea

Consulta la skill `supabase-postgres-best-practices`. No es opcional para
políticas RLS ni para elegir tipos de columna.

## Pasos

1. **Crea el archivo con el CLI pinado.** Nunca `supabase` a secas: el global de
   esta máquina es v1 y falla contra un proyecto v2 de una forma que se lee como
   esquema roto.

   ```bash
   pnpm --dir the_profe-server run db:migration:new <slug_en_snake_case>
   ```

   Esto escribe `supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql`. El nombre lo
   pone la herramienta: no lo inventes ni lo escribas a mano en ningún sitio.

2. **Escribe el DDL.** Reglas duras: `timestamptz` nunca `timestamp`; segundos en
   `integer` y coste en `bigint` de micro-euros, nunca coma flotante; todo
   conjunto cerrado con `check (col in (...))` y sin enums de Postgres.

3. **Activa RLS y escribe una política por operación** si la tabla tiene
   `profile_id`. Una tabla con RLS y sin política es invisible.

4. **Añade la aserción de existencia** a `the_profe-server/tests/sql/assert_schema.sql`:
   una línea `select '<tabla>'::regclass;` por cada tabla nueva. Falla si la tabla
   no existe, y no depende de contar nada.

5. **Escribe el test de RLS en las DOS direcciones** en `the_profe-server/tests/db/`: el
   dueño ve su fila, y otro perfil no la ve. Una política sin el caso negativo no
   está probada.

6. **Aplica en local y prueba.**

   ```bash
   pnpm --dir the_profe-server run db:local:reset
   pnpm --dir the_profe-server run test
   ```

7. **No apliques a Supabase desde aquí.** `pnpm --dir the_profe-server run db:push` es un
   paso de despliegue, con revisión, no parte de este flujo.

## Verify

```bash
pnpm --dir the_profe-server run db:local:reset                    # expect: exit 0, "OK: esquema local aplicado."
pnpm --dir the_profe-server run test tests/db                  # expect: exit 0, 0 fallos, 0 omitidos
pnpm --dir the_profe-server run typecheck                         # expect: exit 0
```

## No hagas

- **No edites una migración que ya se aplicó.** Añade otra.
- **No toques el esquema desde el panel de Supabase.** Está en solo-lectura desde
  el día uno; un cambio hecho allí no existe en el repositorio.
- **No introduzcas un ORM ni un segundo sistema de migración.** Dos sistemas de
  migración sobre una base es una combinación conocida-mala: el estado deriva y la
  siguiente migración falla sólo en producción.
- **No escribas `UPDATE` ni `DELETE` contra `budget_ledger`.** Es append-only y
  hay un trigger que lo hace cumplir.

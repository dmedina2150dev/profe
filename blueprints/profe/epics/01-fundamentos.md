# Epic 01: Fundamentos

> Al terminar este epic existe una app instalable con el sistema de diseño real, navegación, el esquema completo de Postgres con RLS probada, y autenticación con borrado de cuenta desde dentro de la app.

| | |
|---|---|
| **Epic id** | `01-fundamentos` |
| **Tareas** | `E1-T1` … `E1-T4` |
| **Depende de** | nada — empieza aquí |
| **Desbloquea** | `02-columna-agente`, `03-curriculo-texto` |
| **Paralelo con** | nada al principio: `E1-T1` y `E1-T3` no comparten archivos y pueden ir a la vez |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo está repetido aquí a propósito.

---

## Stack

Expo SDK 57 + expo-router + NativeWind (Tailwind **3.4**) · Hono sobre Node 24 · Postgres en
Supabase con RLS y **sin ORM** · Supabase Auth. Gestor de paquetes: `pnpm`, uno solo para los dos
paquetes. Node pinado en `.nvmrc`. Las versiones de dependencias están en los lockfiles — léelos,
nunca adivines una.

| Tarea | Comando |
|---|---|
| Dev cliente | `pnpm --dir the_profe-app run start` |
| Typecheck | `pnpm --dir the_profe-app run typecheck` · `pnpm --dir the_profe-server run typecheck` |
| Lint | `pnpm --dir the_profe-app run lint` · `pnpm --dir the_profe-server run lint` |
| Test cliente | `pnpm --dir the_profe-app run test` |
| Test backend (un archivo) | `pnpm --dir the_profe-server run test tests/<ruta>` |
| Base local arriba | `pnpm --dir the_profe-server run db:local:up` |
| Aplicar migraciones | `pnpm --dir the_profe-server run db:local:apply` |
| Reset completo | `pnpm --dir the_profe-server run db:local:reset` |
| Aserción de esquema | `pnpm --dir the_profe-server run db:local:assert` |
| Nueva migración | `pnpm --dir the_profe-server run db:migration:new <slug>` |

**Gate:** `pnpm --dir the_profe-app run typecheck && pnpm --dir the_profe-app run lint && pnpm --dir the_profe-app run test`
y lo mismo con `the_profe-server` pasan antes de marcar cualquier tarea de aquí como hecha.

`E1-T3` y `E1-T4` verifican contra un Postgres real. Arráncalo primero con
`pnpm --dir the_profe-server run db:local:up`. El archivo que lo define (`docker-compose.yml`) llegó en
`workspace/` y ya está en la raíz del proyecto: no lo escribes tú, y **nunca sustituyas la base de
datos por un doble** — las políticas RLS sólo se pueden probar contra Postgres.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a `the_profe-server/`.

## Subárbol de directorios

```
the_profe-app/
  app/
    _layout.tsx            # Raíz: proveedores, fuentes, gate de splash — NUEVO en E1-T1
    (tabs)/
      _layout.tsx          # Barra de pestañas — NUEVO en E1-T2
      index.tsx            # Hoy — NUEVO en E1-T2
      practicar.tsx        # Repaso y voz — NUEVO en E1-T2
      ajustes.tsx          # Tema, perfil, borrar cuenta — NUEVO en E1-T2
    (auth)/
      entrar.tsx           # Enlace mágico — NUEVO en E1-T4
  constants/theme.ts       # Capa primitiva de color, escala, radios — NUEVO en E1-T1
  lib/
    theme-context.tsx      # Resolución de tema antes del primer pintado — NUEVO en E1-T1
    supabase.ts            # Cliente con adaptador de expo-secure-store — NUEVO en E1-T4
    session.tsx            # useSession() — NUEVO en E1-T4
  assets/fonts/            # Los tres .ttf — obtenidos antes del paso 1, ver §10 del blueprint
  tailwind.config.js       # Capa semántica — ya existe, NO lo edites
  global.css               # Directivas de Tailwind — ya existe
  jest.config.js           # Preset jest-expo y alias @/ — ya existe
  tests/
    tokens.test.ts         # Prueba que cada token resuelve en los dos temas
    theme.test.ts          # Prueba preferencia del sistema vs elección explícita
    navigation.test.tsx    # Prueba rutas registradas y estados vacíos
supabase/
  migrations/              # Dueñas únicas del esquema — NUEVO en E1-T3 y E1-T4
the_profe-server/
  src/
    env.ts                 # Entorno validado al importarse — NUEVO en E1-T3
    db/pool.ts             # El único sitio que abre una conexión — NUEVO en E1-T3
  tests/
    setup.ts               # Carga .env y valores de prueba — ya existe
    sql/00_auth_stub.sql   # Esqueleto de auth para la base local — ya existe
    sql/assert_schema.sql  # Una línea ::regclass por tabla — NUEVO en E1-T3
    db/rls.test.ts         # RLS en las dos direcciones — NUEVO en E1-T3
    db/account-deletion.test.ts  # Cascada y caché preservada — NUEVO en E1-T4
docker-compose.yml         # Postgres local — ya existe
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar un
archivo que no está listado, para y reporta: significa que la frontera del epic está mal.

## Modelo de datos que se toca aquí

Este epic crea **el esquema completo**, porque las políticas RLS y las claves ajenas no se pueden
escribir a trozos sin que las migraciones intermedias queden inconsistentes.

| Entidad | Campos que este epic crea o lee | Notas |
|---|---|---|
| `curriculum_units` | `code` único, `cefr_level`, `ordinal`, `title_pt`, `title_es`, `objectives jsonb`, `published` | Compartida, solo lectura para todo perfil autenticado |
| `curriculum_items` | `unit_id`, `kind`, `pt_text`, `es_gloss`, `ipa`, `audio_asset_id`, `ordinal` | `unique (unit_id, ordinal)` |
| `profiles` | `id` → `auth.users`, `display_name`, `level_cefr`, `voice_pref` | La cascada de borrado sale de aquí |
| `lessons`, `exercises`, `attempts` | `profile_id`, `unit_id`, `status`, `kind`, `prompt jsonb`, `score`, `feedback jsonb` | RLS por `profile_id`, directa o vía padre |
| `error_items` | `profile_id`, `kind`, `key`, `strength`, `due_at`, `unique (profile_id, kind, key)` | Motor de repetición espaciada; índice en `(profile_id, due_at)` |
| `pronunciation_scores` | `accuracy`, `fluency`, `completeness`, `words jsonb`, `phonemes jsonb`, `retention_until` | **Sin columna de prosodia**: Azure no la puntúa fuera de en-US |
| `conversations`, `messages`, `turns` | `mode`, `role`, `content`, `barge_in`, cinco campos de latencia por segmento | `unique (conversation_id, ordinal)` |
| `audio_assets` | `kind`, `text_hash`, `voice`, `owner_profile_id`, `retention_until` | **Índice único en `(text_hash, voice)` donde `kind = 'tts_cache'`** |
| `traces` | `provider`, `operation`, tokens, `audio_seconds`, `chars`, `cost_micros bigint` | Enteros, nunca coma flotante |
| `budget_periods`, `budget_ledger`, `voice_sessions` | Contadores, `kind`, `idempotency_key` único, `status`, `expires_at` | `budget_ledger` es **append-only** por trigger |
| `eval_cases` | `suite`, `input jsonb`, `expected jsonb`, `tags`, `baseline_score` | Se rellena en el epic 06 |

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `workspace/` | `docker-compose.yml`, servicio `db` | Postgres en `127.0.0.1:55432`, base `profe_test`, `up -d --wait` sólo devuelve 0 cuando acepta conexiones |
| `workspace/` | `the_profe-server/scripts/apply-migrations.sh` | Reconstruye `public` y `auth`, aplica `00_auth_stub.sql` y luego cada migración en orden de nombre. Idempotente |
| `workspace/` | `the_profe-server/tests/setup.ts` | Carga `the_profe-server/.env` y rellena valores de prueba antes de cualquier import |
| `workspace/` | `the_profe-app/tailwind.config.js` | Capa semántica de color, escala tipográfica, espaciado, radios |

**Producidos** — los epics siguientes dependen de estas firmas exactas. Cambiar una los rompe:

| Export | Firma | Lo usa |
|---|---|---|
| `the_profe-app/constants/theme.ts` → `tokens` | `{ light: Record<TokenName, string>, dark: Record<TokenName, string> }` | todo el cliente |
| `the_profe-app/lib/theme-context.tsx` → `useTheme()` | `() => { scheme: "light" \| "dark"; setScheme(s: "light" \| "dark" \| "system"): void }` | `02`, `03`, `04` |
| `the_profe-app/lib/session.tsx` → `useSession()` | `() => { profileId: string \| null; accessToken: string \| null; signOut(): Promise<void> }` | `03`, `04`, `05` |
| `the_profe-server/src/env.ts` → `loadEnv`, `describeEnv` | `loadEnv(o: { step: number }) => { ok: true; env: Env } \| { ok: false; problems: string[] }` | `02` en adelante |
| `the_profe-server/src/db/pool.ts` → `withClient`, `withTransaction` | `<T>(fn: (c: PoolClient) => Promise<T>) => Promise<T>` | `02` en adelante |
| `supabase/migrations/**` | el esquema completo y `public.delete_my_account()` | todos |

## Convenios que muerden en esta zona

- **`pnpm dlx expo install`, nunca `pnpm add`,** para cualquier paquete con código nativo. El SDK es un
  conjunto emparejado de ~40 módulos; `pnpm add` traería `latest` y rompe la compilación nativa con
  errores opacos de Gradle o CocoaPods. Excepciones —paquetes que no están en la lista del SDK—:
  `nativewind`, `tailwindcss`, `@supabase/supabase-js`, `@tanstack/react-query`, que van con `pnpm
  install` al pin exacto.
- **El tema se aplica antes del primer pintado.** Resolverlo dentro de un `useEffect` garantiza un
  destello blanco. Se decide en `theme-context.tsx` durante el render inicial, con el splash aún
  visible.
- **Un hex dentro de un componente es un defecto** y el linter lo falla. Los componentes leen sólo la
  capa semántica.
- **`pnpm --dir the_profe-server run db:migration:new <slug>` pone el nombre del archivo, no tú.** No
  escribas un nombre de migración literal en ningún sitio: refiérete a «la migración que crea ese
  comando». Y nunca uses `supabase` a secas: el CLI global de esta máquina es v1 y falla contra un
  proyecto v2 de una forma que se lee como esquema roto.
- **Una tabla con RLS activado y sin política es invisible, no insegura.** Si una consulta devuelve
  cero filas y no debería, eso es lo primero que mirar.
- **Los tres `.ttf` no se descargan en el build.** Se obtienen una vez, antes del paso 1, según la
  tabla de activos de §10 del blueprint. El gate de `E1-T1` falla si faltan, y eso es correcto.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de zona: `.claude/rules/datos-postgres.md` y
`.claude/rules/cliente-expo.md`. Las dos están en la raíz del proyecto — el constructor las copió
desde `workspace/` del bundle antes de la tarea uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E1-T1` — Tokens de diseño, tres fuentes y tema claro/oscuro

**Depende de:** nada · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de ejecución

Escribe la capa primitiva de color, la escala tipográfica, el espaciado y los radios en
`constants/theme.ts`, y la resolución de tema en `lib/theme-context.tsx`. La capa semántica ya existe
en `tailwind.config.js`: **no la dupliques ni la edites** — `theme.ts` exporta los primitivos y el
mapa semántico que los tests comprueban, y `tailwind.config.js` los expone a las clases de utilidad.
Carga las tres fuentes con `useFonts` de `expo-font` desde `assets/fonts/`, y mantén el splash
visible hasta que estén cargadas y el tema resuelto: si sueltas el splash antes, hay un fotograma con
la fuente del sistema y el tema claro. La preferencia del sistema es el valor inicial; la elección
explícita del usuario la sobrescribe y se persiste.

**Archivos**
- `the_profe-app/constants/theme.ts` — nuevo: primitivos, mapa semántico claro/oscuro, escala, espaciado, radios, movimiento
- `the_profe-app/lib/theme-context.tsx` — nuevo: proveedor y `useTheme()`, resolución en el render inicial
- `the_profe-app/app/_layout.tsx` — nuevo: proveedores, `useFonts`, gate de splash, importa `global.css`
- `the_profe-app/tests/tokens.test.ts` — nuevo: cada token resuelve en los dos temas, sin `#000`/`#FFF`
- `the_profe-app/tests/theme.test.ts` — nuevo: sistema como inicial, elección explícita gana y persiste

**Aceptación**

Copiados literalmente del array `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un
comando de abajo, en esta máquina, durante el build.

1. **CUANDO** `pnpm --dir the_profe-app run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.
2. **CUANDO** se resuelve la paleta semántica **EL SISTEMA DEBERÁ** devolver un valor hexadecimal para cada token del tema claro y del oscuro, sin ninguno indefinido.
3. **CUANDO** se resuelve el tema oscuro **EL SISTEMA DEBERÁ** devolver `#1E1B17` para `bg` y `#F0EADF` para `text`, y nunca `#000000` ni `#FFFFFF` para fondo o texto.
4. **CUANDO** el usuario no ha elegido tema **EL SISTEMA DEBERÁ** usar la preferencia del sistema como valor inicial, y **CUANDO** ha elegido uno explícitamente **EL SISTEMA DEBERÁ** usar el elegido y persistirlo.
5. **CUANDO** se registran las familias tipográficas **EL SISTEMA DEBERÁ** exponer `SourceSerif4` para portugués, `Inter` para interfaz y `CharisSIL` para el Alfabeto Fonético Internacional, con los tres archivos presentes en `the_profe-app/assets/fonts/`.
6. **CUANDO** `pnpm --dir the_profe-app run lint` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, sin errores ni advertencias.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea
es correcta; que el último salga con 0 es lo que la marca hecha.

```bash
test -f the_profe-app/assets/fonts/SourceSerif4-Regular.ttf
test -f the_profe-app/assets/fonts/Inter-Regular.ttf
test -f the_profe-app/assets/fonts/CharisSIL-Regular.ttf
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: tokens de diseño, tres fuentes y tema claro/oscuro"
git tag step-01-tokens-tema
```

### `E1-T2` — Esqueleto de navegación con pestañas y estados vacíos

**Depende de:** `E1-T1` · **Prioridad:** p0

Tres pestañas y nada más: Hoy, Practicar, Ajustes. Con expo-router el sistema de archivos *es* la
navegación, así que un archivo de más en `(tabs)/` es una pestaña de más. Escribe los tres estados
—carga, vacío y error con reintento— como componentes reutilizables desde el primer día: los estados
vacíos son el hueco más común en interfaces construidas por agentes, y cada pantalla de este proyecto
los necesita. Las pantallas todavía no piden datos reales; usan un gancho con datos falsos que el
epic 03 sustituye por `lib/api.ts`.

**Archivos**
- `the_profe-app/app/(tabs)/_layout.tsx` — nuevo: barra de pestañas, área táctil de 44 px, etiquetas accesibles
- `the_profe-app/app/(tabs)/index.tsx` — nuevo: Hoy, con los tres estados
- `the_profe-app/app/(tabs)/practicar.tsx` — nuevo: Practicar, con los tres estados
- `the_profe-app/app/(tabs)/ajustes.tsx` — nuevo: selector de tema y hueco para borrar cuenta (`E1-T4` lo rellena)
- `the_profe-app/tests/navigation.test.tsx` — nuevo: rutas registradas, estados vacíos, tamaño de destino

**Aceptación**

1. **CUANDO** se monta el enrutador **EL SISTEMA DEBERÁ** registrar exactamente las rutas de pestaña `/`, `/practicar` y `/ajustes`, y ninguna otra pestaña.
2. **CUANDO** una pantalla de lista no tiene datos **EL SISTEMA DEBERÁ** renderizar un estado vacío con texto, y nunca una lista en blanco sin explicación.
3. **CUANDO** una pantalla está cargando **EL SISTEMA DEBERÁ** renderizar un estado de carga, y **CUANDO** su fuente de datos falla **EL SISTEMA DEBERÁ** renderizar un estado de error con un botón de reintento alcanzable por teclado.
4. **CUANDO** se renderiza la barra de pestañas **EL SISTEMA DEBERÁ** dar a cada destino un área táctil de al menos 44 por 44 píxeles y una etiqueta accesible, nunca sólo un icono.
5. **CUANDO** `pnpm --dir the_profe-app run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Verify**

```bash
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: esqueleto de navegación con pestañas y estados vacíos"
git tag step-02-navegacion
```

### `E1-T3` — Esquema Postgres consciente de variante, índices y políticas RLS

**Depende de:** nada · **Prioridad:** p0

Escribe el esquema completo en **una** migración creada con
`pnpm --dir the_profe-server run db:migration:new esquema_base`. El orden dentro del archivo importa:
`audio_assets` antes de `pronunciation_scores` y de la clave ajena de `curriculum_items`, y
`voice_sessions` antes de `budget_ledger`, que la referencia. Activa RLS en cada tabla con
`profile_id` y escribe una política por operación. El trigger de append-only sobre `budget_ledger`
va en esta misma migración: si llega después, hay una ventana en la que el ledger es mutable.
`the_profe-server/src/env.ts` y `the_profe-server/src/db/pool.ts` nacen aquí porque los tests de RLS necesitan una
conexión; `env.ts` marca obligatorias **sólo** las variables del paso 3 y del 5, y el paso 5 promueve
las suyas — así ninguna tarea posterior rompe el gate de una anterior.

**Este paso nace consciente de la variante y del cobro, y eso no es adelantarse: es el único momento
barato.** `content_variant` es un **enum** con `pt-PT` y `pt-BR` —nunca un booleano, que sería
irreversible el día que exista pt-AO— y toda tabla de contenido lleva
`variant content_variant not null default 'pt-PT'`. La unicidad de `curriculum_units.code` es
**compuesta**: `unique (variant, code)`, porque con `code` solo la unidad `A1-U01` de una segunda
variante colisionaría con la existente y el curso nuevo no entraría sin renombrar todo.
`phoneme_rubric` lleva clave de variante porque **el inventario fonético es dato, no constantes**: una
tabla se amplía sin desplegar.

La v1 siembra **sólo `pt-PT`**, y no hay selector en la interfaz — ver §1 Non-Goals del blueprint. Lo
que se construye aquí es la forma, no el segundo curso.

En la misma migración entran `subscriptions`, `entitlements` y `stripe_events`, con RLS de
solo-lectura del propio perfil. **Escritura sólo con la clave de servicio:** un cliente que pudiera
escribir su propio `entitlements` se regalaría el plan de pago, y entonces todo el epic 04 sería
decorativo. Llegan en el paso 3 y no en el 13 por la misma razón que la variante: retrofitear un
esquema con datos de clientes dentro es la clase de migración que se hace de madrugada.

**Archivos**
- `supabase/migrations/**` — nuevo: la migración que crea `db:migration:new`, con esquema, índices, RLS y trigger
- `the_profe-server/src/env.ts` — nuevo: `loadEnv` con obligatoriedad por paso, `describeEnv` sin secretos
- `the_profe-server/src/db/pool.ts` — nuevo: el único sitio que abre una conexión; `withClient`, `withTransaction`
- `the_profe-server/tests/sql/assert_schema.sql` — nuevo: una línea `select '<tabla>'::regclass;` por tabla
- `the_profe-server/tests/db/rls.test.ts` — nuevo: cada política en las dos direcciones, índice único, append-only
- `the_profe-server/tests/sql/variant.test.ts` — nuevo: el enum existe, el valor por defecto se aplica, `unique (variant, code)` rechaza el duplicado
- `the_profe-server/tests/sql/rls-billing.test.ts` — nuevo: `subscriptions` y `entitlements` en las dos direcciones, y que el cliente no puede escribirlos
- `the_profe-server/tests/sql/disociacion.test.ts` — nuevo: `on delete set null` en `traces` y `budget_ledger`, y que el trigger permite `profile_id → NULL` y **nada más**

**Aceptación**

1. **CUANDO** `pnpm --dir the_profe-server run db:local:reset` se ejecuta contra una base vacía **EL SISTEMA DEBERÁ** crear todas las tablas que el esquema define y salir con 0.
2. **CUANDO** `pnpm --dir the_profe-server run db:local:assert` se ejecuta **EL SISTEMA DEBERÁ** resolver como `regclass`, sin error, cada tabla del esquema, incluidas `curriculum_units`, `profiles`, `audio_assets`, `budget_ledger` y `voice_sessions`.
3. **CUANDO** un perfil autenticado consulta `attempts` **EL SISTEMA DEBERÁ** devolver sólo sus propias filas, y **CUANDO** consulta las de otro perfil **EL SISTEMA DEBERÁ** devolver cero filas en lugar de un error.
4. **CUANDO** cualquier perfil autenticado consulta `audio_assets` con `kind = 'tts_cache'` **EL SISTEMA DEBERÁ** devolver la fila, y **CUANDO** consulta un `kind = 'user_recording'` de otro perfil **EL SISTEMA DEBERÁ** devolver cero filas.
5. **CUANDO** se intenta un `UPDATE` o un `DELETE` sobre `budget_ledger` **EL SISTEMA DEBERÁ** abortar con una excepción que nombre la tabla como append-only.
6. **CUANDO** se insertan dos filas de `audio_assets` con el mismo `text_hash`, la misma `voice` y `kind = 'tts_cache'` **EL SISTEMA DEBERÁ** rechazar la segunda por violación del índice único.
7. **CUANDO** se crea el tipo de variante **EL SISTEMA DEBERÁ** definirlo como enum `content_variant` con los valores `pt-PT` y `pt-BR`, y nunca como booleano, para que añadir una tercera variante no exija reescribir filas.
8. **CUANDO** se inserta cualquier fila de contenido sin variante explícita **EL SISTEMA DEBERÁ** aplicar `pt-PT` por defecto, y **CUANDO** se consulta contenido **EL SISTEMA DEBERÁ** filtrar por la variante objetivo del perfil.
9. **CUANDO** se consulta la rúbrica de fonemas **EL SISTEMA DEBERÁ** resolverla desde una tabla con clave de variante, no desde constantes en el código.
10. **CUANDO** un usuario autenticado consulta `subscriptions` o `entitlements` **EL SISTEMA DEBERÁ** devolver únicamente sus propias filas, y 0 filas para las de otro usuario.
11. **CUANDO** se declaran las claves ajenas de `traces.profile_id` y `budget_ledger.profile_id` **EL SISTEMA DEBERÁ** usar `on delete set null` y no `cascade`, y el trigger de sólo-anexado de `budget_ledger` **DEBERÁ** permitir exactamente la actualización de `profile_id` a `NULL` y ninguna otra, para que el borrado de cuenta pueda disociar sin romper la contabilidad.

**Verify**

```bash
pnpm --dir the_profe-server run db:local:up
pnpm --dir the_profe-server run db:local:apply
pnpm --dir the_profe-server run db:local:assert
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run test tests/db/rls.test.ts
pnpm --dir the_profe-server run test tests/sql/variant.test.ts
pnpm --dir the_profe-server run test tests/sql/rls-billing.test.ts
pnpm --dir the_profe-server run test tests/sql/disociacion.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: Esquema Postgres consciente de variante, índices y políticas RLS"
git tag step-03-esquema-variante-rls
```

### `E1-T4` — Auth con almacenamiento seguro y borrado de cuenta

**Depende de:** `E1-T2`, `E1-T3` · **Prioridad:** p0

Enlace mágico con Supabase Auth, y el cliente configurado con un adaptador de almacenamiento
respaldado por `expo-secure-store` — **no** AsyncStorage, que no está cifrado. No uses
`@supabase/ssr`: apunta a manejo de sesión por cookie en SSR y es irrelevante en React Native. El
borrado de cuenta es una función `security definer` en Postgres, `public.delete_my_account()`,
llamada por RPC: así no necesita backend y el esquema sigue siendo el dueño único de la cascada.
Cuidado con el detalle que se olvida: al borrar un perfil se borran sus grabaciones, pero **no** las
filas de `tts_cache`, que son compartidas y no le pertenecen. La pantalla de Ajustes de `E1-T2` gana
aquí su botón de borrar, con confirmación.

**Archivos**
- `the_profe-app/lib/supabase.ts` — nuevo: cliente con adaptador de `expo-secure-store`
- `the_profe-app/lib/session.tsx` — nuevo: proveedor y `useSession()`, redirección si no hay sesión
- `the_profe-app/app/(auth)/entrar.tsx` — nuevo: envío del enlace mágico y estados de error
- `supabase/migrations/**` — nuevo: la migración que añade `public.delete_my_account()` y sus permisos
- `the_profe-server/tests/db/account-deletion.test.ts` — nuevo: cascada, caché preservada, llamada sin sesión

**Aceptación**

1. **CUANDO** se inicia sesión con un enlace mágico válido **EL SISTEMA DEBERÁ** crear una fila en `profiles` con `id` igual al del usuario de `auth.users` y guardar el token en `expo-secure-store`, nunca en AsyncStorage.
2. **CUANDO** no hay sesión y se abre una ruta protegida **EL SISTEMA DEBERÁ** redirigir a `/entrar` en lugar de renderizar la pantalla vacía.
3. **CUANDO** un perfil autenticado llama a `public.delete_my_account()` **EL SISTEMA DEBERÁ** borrar su fila de `profiles`, cascadear a sus `lessons`, `attempts`, `error_items`, `conversations` y `audio_assets` propios, y borrar su fila de `auth.users`.
4. **CUANDO** `public.delete_my_account()` se llama sin sesión **EL SISTEMA DEBERÁ** abortar con una excepción y no borrar ninguna fila.
5. **CUANDO** un perfil borra su cuenta **EL SISTEMA DEBERÁ** conservar las filas de `audio_assets` con `kind = 'tts_cache'`, porque la caché es compartida y no le pertenece.
6. **CUANDO** `pnpm --dir the_profe-app run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Verify**

```bash
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/db/account-deletion.test.ts
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: auth con almacenamiento seguro y borrado de cuenta"
git tag step-04-auth-borrado
```

---

## Aceptación del epic

El epic está hecho cuando las cuatro tareas están `done` **y**:

1. **CUANDO** se aplica el esquema desde cero y se ejecuta la suite del backend **EL SISTEMA DEBERÁ** salir con 0, con cada política RLS probada en las dos direcciones y ninguna tabla sin política.
2. **CUANDO** un perfil borra su cuenta desde Ajustes **EL SISTEMA DEBERÁ** dejar cero filas suyas en `profiles`, `lessons`, `attempts` y `error_items`, y dejar intactas las filas de `audio_assets` con `kind = 'tts_cache'`.

```bash
pnpm --dir the_profe-app run typecheck && pnpm --dir the_profe-app run lint && pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run db:local:reset && pnpm --dir the_profe-server run db:local:assert
pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint && pnpm --dir the_profe-server run test
```

Desde la raíz del proyecto. Los dos criterios los deciden estos comandos.

## Trampas

- **Aplicar el tema en un efecto.** Produce un destello blanco en cada arranque que se lee como un
  fallo. Resuélvelo en el render inicial, con el splash aún visible.
- **`pnpm add` para un módulo nativo.** Trae `latest`, que para `react-native` pertenece a la línea
  del SDK 58 y para `react-native-gesture-handler` es una reescritura con API nueva. Resultado: build
  nativa rota con un error de Gradle que no menciona la versión. Usa `pnpm dlx expo install`.
- **Escribir un nombre literal de archivo de migración.** Lo pone la herramienta con marca de tiempo.
  Refiérete a «la migración que crea `db:migration:new`» y verifica el efecto, no el nombre.
- **Crear `budget_ledger` antes de `voice_sessions`.** La clave ajena falla y la migración muere a
  medias, dejando el esquema en un estado que la siguiente aplicación no reconoce.
- **Olvidar que `tts_cache` sobrevive al borrado de cuenta.** Si la cascada se la lleva, el primer
  perfil que borre su cuenta destruye la caché de los otros tres y la factura de TTS se dispara.
- **Probar RLS con `service_role`.** Ese rol la evita por diseño (`bypassrls`), así que el test pasa
  siempre y no prueba nada. Fija `request.jwt.claims` y usa el rol `authenticated`.
- **Dar por hecho que `the_profe-app/` ya tiene los `.ttf`.** No se descargan en el build. Si faltan, el gate
  de `E1-T1` falla — y eso es la señal correcta, no un defecto del blueprint.

## Antes de seguir

- [ ] Las cuatro tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` se editó, y ninguno se saltó porque un archivo que nombra no existiera.
- [ ] Las cuatro tareas tienen su etiqueta de checkpoint en git: `git tag -l 'step-0*'` lista cuatro.
- [ ] El comando del gate pasa limpio, ejecutado desde la raíz del proyecto.
- [ ] Cada contrato de «Producidos» existe con la firma indicada.
- [ ] No se modificó ningún archivo fuera del subárbol.
- [ ] `the_profe-server/.env.example` y `the_profe-app/.env.example` reflejan cualquier variable que este epic añadiera.
- [ ] Un commit por tarea, cada uno con su id de prefijo y seguido de su etiqueta.

# Epic 03: Currículo y texto

> Al terminar este epic la app ya es útil: hay un temario A1→A2 sembrado, se leen y se escriben ejercicios, el modelo corrige, y la repetición espaciada decide qué toca según los errores reales. Y casi no se ha gastado nada en voz.

| | |
|---|---|
| **Epic id** | `03-curriculo-texto` |
| **Tareas** | `E3-T1` … `E3-T4` |
| **Depende de** | `01-fundamentos`, `02-columna-agente` |
| **Desbloquea** | `05-voz-afinar`, `07-endurecimiento-entrega` |
| **Paralelo con** | nada: sus cuatro tareas forman una cadena |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo está repetido aquí a propósito.

---

## Stack

Expo SDK 57 + expo-router + NativeWind (Tailwind **3.4**) · Hono sobre Node 24 · Postgres en Supabase
con RLS y **sin ORM** · Claude Opus 5 vía la pasarela. Gestor de paquetes: `pnpm`. Node pinado en
`.nvmrc`. Las versiones están en los lockfiles — léelos, nunca adivines una.

| Tarea | Comando |
|---|---|
| Dev cliente | `pnpm --dir the_profe-app run start` |
| Dev backend | `pnpm --dir the_profe-server run dev` — http://127.0.0.1:8787 |
| Typecheck | `pnpm --dir the_profe-app run typecheck` · `pnpm --dir the_profe-server run typecheck` |
| Lint | `pnpm --dir the_profe-app run lint` · `pnpm --dir the_profe-server run lint` |
| Test cliente | `pnpm --dir the_profe-app run test` |
| Test backend (un archivo) | `pnpm --dir the_profe-server run test tests/<ruta>` |
| Reset completo de la base | `pnpm --dir the_profe-server run db:local:reset` |
| Aserción de esquema | `pnpm --dir the_profe-server run db:local:assert` |

**Gate:** typecheck, lint y test de los dos paquetes pasan antes de marcar cualquier tarea de aquí
como hecha.

Las cuatro tareas verifican contra un Postgres real. `pnpm --dir the_profe-server run db:local:reset` lo
levanta, reconstruye el esquema y aplica la semilla si ya existe. El archivo que define el servicio
llegó en `workspace/` y ya está en la raíz — no lo escribes tú, y **nunca sustituyas la base de datos
por un doble**.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a `the_profe-server/`.

## Subárbol de directorios

```
supabase/
  seed/curriculum_a1_a2.sql   # Temario versionado y revisable — NUEVO en E3-T1
the_profe-server/
  src/
    routes/
      curriculum.ts      # GET unidades e ítems — NUEVO en E3-T1
      lessons.ts         # POST crear lección, GET leerla — NUEVO en E3-T1
      exercises.ts       # GET ejercicios, POST intento — NUEVO en E3-T2, LO EDITAS en E3-T3
      review.ts          # GET vencidos, POST calificar — NUEVO en E3-T4
    exercises/
      read.ts            # Genera y puntúa ejercicios de lectura — NUEVO en E3-T2
      write.ts           # Corrección por modelo y extracción de errores — NUEVO en E3-T3
    prompts/
      correct-writing.md # El prompt como archivo, versionado — NUEVO en E3-T3
    srs/schedule.ts      # Intervalos, prioridad, idempotencia — NUEVO en E3-T4
    gateway/             # ya existe (E2-T2) — solo lectura para este epic
    budget/              # ya existe (E2-T3) — solo lectura para este epic
  tests/
    db/seed.test.ts              # NUEVO en E3-T1
    http/curriculum.test.ts      # NUEVO en E3-T1 (cubre también lecciones)
    http/exercises-read.test.ts  # NUEVO en E3-T2
    exercises/write.test.ts      # NUEVO en E3-T3
    exercises/write-errors.test.ts  # NUEVO en E3-T3
    srs/schedule.test.ts         # NUEVO en E3-T4
    http/review.test.ts          # NUEVO en E3-T4
the_profe-app/
  lib/api.ts             # Cliente tipado del backend — NUEVO en E3-T2
  features/
    lesson/ReadExercise.tsx   # NUEVO en E3-T2
    lesson/WriteExercise.tsx  # NUEVO en E3-T3
    review/DueList.tsx        # NUEVO en E3-T4
  lib/session.tsx        # ya existe (E1-T4) — solo lectura
  constants/theme.ts     # ya existe (E1-T1) — solo lectura
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar un
archivo que no está listado, para y reporta: significa que la frontera del epic está mal.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `curriculum_units` | escribe `code`, `cefr_level`, `ordinal`, `title_pt`, `title_es`, `objectives jsonb`, `published` | Semilla idempotente sobre `code`. `unique (cefr_level, ordinal)` |
| `curriculum_items` | escribe `unit_id`, `kind`, `pt_text`, `es_gloss`, `ipa`, `ordinal` | `unique (unit_id, ordinal)`. La `ipa` es obligatoria en todo ítem de pronunciación |
| `lessons` | escribe `profile_id`, `unit_id`, `status`, `started_at`, `completed_at` | RLS por `profile_id`; índice en `(profile_id, status)` |
| `exercises` | escribe `lesson_id`, `kind`, `prompt jsonb`, `expected jsonb`, `ordinal` | `unique (lesson_id, ordinal)`; RLS vía la lección |
| `attempts` | escribe `exercise_id`, `profile_id`, `response jsonb`, `score`, `feedback jsonb` | `score` entre 0 y 100; índice en `(profile_id, created_at desc)` |
| `error_items` | escribe y actualiza `kind`, `key`, `strength`, `due_at`, `last_seen_at` | `unique (profile_id, kind, key)`; índice en `(profile_id, due_at)`. `strength` entre 0 y 8 |
| `traces` | escribe una fila por corrección | Vía `withTrace` de la pasarela, nunca a mano |

El esquema ya existe: este epic **no** escribe migraciones. La semilla va en `supabase/seed/`, que es
datos, no esquema. Si necesitas una columna nueva, para y reporta.

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `02-columna-agente` | `the_profe-server/src/envelope.ts` → `ok`, `fail`, `ErrorCode` | Un solo sobre; `fail` mapea el código a su estado HTTP |
| `02-columna-agente` | `the_profe-server/src/app.ts` → `createApp` | Devuelve la app de Hono con `/healthz`, 404 y manejador de error ya montados |
| `02-columna-agente` | `the_profe-server/src/gateway/anthropic.ts` → `complete` | Prefijo estable cacheado, `effort` dentro de `output_config`, sin `budget_tokens` ni prefill |
| `02-columna-agente` | `the_profe-server/src/gateway/trace.ts` → `withTrace` | Escribe la fila de `traces` en éxito y en fallo |
| `01-fundamentos` | `the_profe-server/src/db/pool.ts` → `withClient`, `withTransaction` | `ROLLBACK` si la función lanza |
| `01-fundamentos` | `the_profe-app/lib/session.tsx` → `useSession()` | `{ profileId, accessToken, signOut }` |
| `01-fundamentos` | `the_profe-app/constants/theme.ts` → `tokens` | Mapa semántico claro/oscuro y escala tipográfica |

**Producidos** — los epics siguientes dependen de estas firmas exactas. Cambiar una los rompe:

| Export | Firma | Lo usa |
|---|---|---|
| `the_profe-app/lib/api.ts` → `api` | objeto con un método por ruta, todos devolviendo `{ ok: true; data: T } \| { ok: false; error: ApiError }` | `04`, `05` |
| `the_profe-server/src/routes/exercises.ts` → `exercisesRoutes` | `Hono` montable en `/api/v1/exercises` | `04` (ejercicios `speak_drill`) |
| `the_profe-server/src/srs/schedule.ts` → `grade`, `nextDue` | `grade(i: { kind: ErrorKind; key: string; correct: boolean; idempotencyKey: string }) => Promise<ErrorItem>` | `04`, `05` (los errores de fonema entran por aquí) |
| `supabase/seed/curriculum_a1_a2.sql` | el temario con `ipa` en cada ítem de pronunciación | `04` (el TTS sintetiza estos textos; la caché depende de que se repitan) |

## Convenios que muerden en esta zona

- **La serif es el portugués. La sans es la app hablándote. Nunca se cruzan.** Todo texto en portugués
  va en `font-serif`, toda la interfaz en `font-sans`, y la transcripción fonética en `font-ipa`
  (Charis SIL). Con otra familia, ɐ̃ ʃ ʎ ɲ ɨ ɾ salen como cuadros vacíos, y eso no es un detalle
  estético: el medidor de fonemas del epic 04 depende de esta decisión.
- **`body-pt` es 17/26 y la interfaz 15/22.** El portugués es más grande a propósito: lo estás
  descifrando, no leyéndolo.
- **La semilla es idempotente sobre `code`.** `db:local:reset` la aplica en cada ejecución y el
  bootstrap corre dos veces: una semilla que inserta sin resolver conflicto duplica el temario y el
  test de la segunda aplicación lo detecta.
- **El prompt es un archivo, no una cadena en el código.** `src/prompts/correct-writing.md` se puede
  revisar en un diff y versionar; un literal multilínea incrustado en TypeScript no.
- **El prefijo estable de la llamada al modelo lleva el currículo y el prompt de sistema**, con punto
  de corte explícito; la respuesta del usuario va después. Meter el texto del usuario en el prefijo
  invalida la caché en cada petición y multiplica el coste de texto sin que nada falle.
- **`effort` es `low` para corregir un ejercicio rutinario y `high` para interpretar un informe
  fonémico**, siempre dentro de `output_config`.
- **Un error de `lexeme` por falso amigo nombra la palabra española que lo induce.** Para un
  hispanohablante el problema no es el vocabulario, son los falsos amigos y la fonética: un error que
  no dice de qué palabra española viene no enseña nada.
- **La prioridad de la repetición espaciada es `phoneme` sobre `lexeme`** con el mismo `due_at`,
  porque la fonética es el cuello de botella.
- **El texto en streaming entra por frase con un fundido**, no carácter a carácter: lo segundo tiembla
  en un teléfono y se lee como un fallo.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de zona: `.claude/rules/voz-y-coste.md`,
`.claude/rules/datos-postgres.md` y `.claude/rules/cliente-expo.md`. Las tres están en la raíz del
proyecto — el constructor las copió desde `workspace/` del bundle antes de la tarea uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E3-T1` — Currículo sembrado y ruta de lectura de lección

**Depende de:** `E2-T1` · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de ejecución

El temario A1→A2 como datos versionados en SQL, no como filas creadas a mano en un panel. Organízalo
alrededor del problema real de un hispanohablante: vocales nasales (ã, õ), la *s* final que suena /ʃ/,
las vocales reducidas que se eliden, *lh* /ʎ/ y *nh* /ɲ/, la vocal /ɨ/ que el español no tiene, y los
falsos amigos. Cada ítem de pronunciación lleva su `ipa`. Usa `insert ... on conflict (code) do update`
para que aplicar la semilla dos veces no duplique nada — el bootstrap la aplica dos veces. Las rutas
de currículo y de lecciones son de solo lectura sobre datos compartidos más una escritura acotada:
crear una lección.

**Archivos**
- `supabase/seed/curriculum_a1_a2.sql` — nuevo: unidades e ítems, idempotente sobre `code`
- `the_profe-server/src/routes/curriculum.ts` — nuevo: `GET /api/v1/curriculum/units` y `/units/:code`
- `the_profe-server/src/routes/lessons.ts` — nuevo: `POST /api/v1/lessons`, `GET /api/v1/lessons/:id`
- `the_profe-server/tests/db/seed.test.ts` — nuevo: cobertura fonética, `ipa` presente, doble aplicación
- `the_profe-server/tests/http/curriculum.test.ts` — nuevo: orden, sólo publicadas, creación de lección, 404 ajeno

**Aceptación**

Copiados literalmente del array `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** la semilla del currículo se aplica **EL SISTEMA DEBERÁ** crear todas las unidades A1 y A2 que el archivo de semilla define, cada una con `objectives` no vacío y con al menos un elemento de `curriculum_items` cuya `ipa` esté presente.
2. **CUANDO** la semilla se aplica dos veces seguidas **EL SISTEMA DEBERÁ** dejar el mismo número de filas que tras la primera aplicación, porque está escrita como inserción idempotente sobre `code`.
3. **CUANDO** un perfil autenticado pide `GET /api/v1/curriculum/units` **EL SISTEMA DEBERÁ** devolver 200 con sólo las unidades publicadas, ordenadas por `cefr_level` y `ordinal`.
4. **CUANDO** un perfil pide `POST /api/v1/lessons` con el código de una unidad publicada **EL SISTEMA DEBERÁ** crear una fila en `lessons` con `status` igual a `active` y `started_at` no nulo, y devolver 200 con su identificador.
5. **CUANDO** un perfil pide una lección de otro perfil **EL SISTEMA DEBERÁ** responder 404 con `code` igual a `NOT_FOUND`, nunca 200 con datos ajenos.
6. **CUANDO** se revisa el temario **EL SISTEMA DEBERÁ** incluir al menos una unidad dedicada a vocales nasales, una a la ese final que suena /ʃ/ y una a los falsos amigos con el español.

**Verify** — cada comando, en orden, desde la raíz del proyecto.

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/db/seed.test.ts
pnpm --dir the_profe-server run test tests/http/curriculum.test.ts
pnpm --dir the_profe-server run lint
```

Los criterios 4 y 5 los decide `tests/http/curriculum.test.ts`, que monta `createApp()` y ejercita
también las rutas de lecciones; el 6 lo decide `tests/db/seed.test.ts` buscando las unidades por
`code` y comprobando que sus `objectives` nombran esos fenómenos.

**Checkpoint**

```bash
git add -A && git commit -m "E3-T1: currículo sembrado y ruta de lectura de lección"
git tag step-08-curriculo-lecciones
```

### `E3-T2` — Ejercicios de lectura en cliente y servidor

**Depende de:** `E3-T1`, `E1-T4` · **Prioridad:** p0

La primera rebanada vertical completa: base de datos, ruta, cliente tipado y pantalla. `lib/api.ts`
nace aquí y es el único sitio del cliente que hace red — devuelve el mismo sobre que el backend, así
que las pantallas nunca ven un `throw` por un 404. Los ejercicios de lectura no llaman al modelo: la
puntuación es determinista contra `expected`, lo que mantiene el coste en cero y hace el test rápido.
Respeta la regla tipográfica al renderizar: portugués en serif, glosa e interfaz en sans, AFI en
Charis SIL.

**Archivos**
- `the_profe-server/src/exercises/read.ts` — nuevo: genera los ejercicios de una lección y puntúa la respuesta
- `the_profe-server/src/routes/exercises.ts` — nuevo: `GET /api/v1/lessons/:id/exercises`, `POST /api/v1/exercises/:id/attempts`
- `the_profe-app/lib/api.ts` — nuevo: cliente tipado, único punto de red, devuelve el sobre sin lanzar
- `the_profe-app/features/lesson/ReadExercise.tsx` — nuevo: tarjeta de lectura con las tres familias y los tres estados
- `the_profe-server/tests/http/exercises-read.test.ts` — nuevo: ordinales sin huecos, intento, cierre de lección

**Aceptación**

1. **CUANDO** se abre una lección activa **EL SISTEMA DEBERÁ** crear sus ejercicios de tipo `read` con `ordinal` consecutivo desde 1 y sin huecos.
2. **CUANDO** se renderiza un ejercicio de lectura **EL SISTEMA DEBERÁ** mostrar el texto portugués en la familia serif y la glosa española y la interfaz en la familia sans, sin cruzarlas.
3. **CUANDO** se renderiza una transcripción fonética **EL SISTEMA DEBERÁ** usar la familia CharisSIL, de modo que ɐ̃ ʃ ʎ ɲ ɨ ɾ se dibujen como glifos y no como cuadros vacíos.
4. **CUANDO** un ejercicio de lectura se responde **EL SISTEMA DEBERÁ** insertar una fila en `attempts` con `score` entre 0 y 100 y avanzar el `ordinal` activo de la lección.
5. **CUANDO** se responden todos los ejercicios de una lección **EL SISTEMA DEBERÁ** poner su `status` en `completed` y `completed_at` no nulo.
6. **CUANDO** la petición de ejercicios falla **EL SISTEMA DEBERÁ** renderizar el estado de error con reintento, no una pantalla en blanco.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/http/exercises-read.test.ts
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

Los criterios 2, 3 y 6 los decide la suite del cliente, que renderiza `ReadExercise` y comprueba la
familia tipográfica resuelta de cada nodo de texto y el estado de error. El criterio 3 se decide en el
árbol renderizado —la familia asignada—, no inspeccionando el archivo de fuente: el glifo real sólo
existe en el dispositivo, y ese paso está en la lista de comprobación de lanzamiento.

**Checkpoint**

```bash
git add -A && git commit -m "E3-T2: ejercicios de lectura en cliente y servidor"
git tag step-09-ejercicios-lectura
```

### `E3-T3` — Ejercicios de escritura corregidos por el modelo

**Depende de:** `E3-T2`, `E2-T2` · **Prioridad:** p0

Aquí entra el modelo por primera vez en una función de producto. Pide salida estructurada con
`output_config.format` y **valida con zod antes de persistir**: una corrección que no valida no escribe
nada en `error_items`, porque un error mal tipado contamina la repetición espaciada durante semanas. La
extracción de errores es lo que hace útil al producto: cada error con su `kind` y su `key`, y
`on conflict (profile_id, kind, key)` para que el mismo error repetido refuerce la fila en vez de
duplicarla. Los falsos amigos son un caso de primera clase: el error nombra la palabra española que lo
induce.

**Archivos**
- `the_profe-server/src/exercises/write.ts` — nuevo: corrección, esquema de salida, extracción a `error_items`
- `the_profe-server/src/prompts/correct-writing.md` — nuevo: el prompt, con el contrato de salida descrito dentro
- `the_profe-app/features/lesson/WriteExercise.tsx` — nuevo: entrada, envío y corrección con fundido por frase
- `the_profe-server/tests/exercises/write.test.ts` — nuevo: corrección válida, `feedback`, traza escrita, `effort`
- `the_profe-server/tests/exercises/write-errors.test.ts` — nuevo: falso amigo, salida inválida, no duplicar

**Aceptación**

1. **CUANDO** se envía una respuesta escrita **EL SISTEMA DEBERÁ** devolver una corrección estructurada con la lista de errores, cada uno con su tipo en `phoneme`, `lexeme` o `grammar_rule` y su clave, validada contra el esquema antes de persistirse.
2. **CUANDO** la corrección se completa **EL SISTEMA DEBERÁ** insertar una fila en `attempts` con `feedback` no nulo y una fila por error en `error_items`, resolviendo el conflicto sobre `(profile_id, kind, key)` para no duplicar.
3. **CUANDO** la respuesta contiene un falso amigo con el español **EL SISTEMA DEBERÁ** marcarlo como error de tipo `lexeme` y nombrar la palabra española que lo induce.
4. **CUANDO** se corrige un ejercicio rutinario **EL SISTEMA DEBERÁ** usar `effort` igual a `low` dentro de `output_config`, y **CUANDO** interpreta un informe fonémico **DEBERÁ** usar `high`.
5. **CUANDO** el modelo devuelve una salida que no valida contra el esquema **EL SISTEMA DEBERÁ** responder con `code` igual a `UPSTREAM_FAILED` y no escribir ninguna fila en `error_items`.
6. **CUANDO** la corrección termina **EL SISTEMA DEBERÁ** haber escrito una fila en `traces` para esa llamada.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/exercises/write.test.ts
pnpm --dir the_profe-server run test tests/exercises/write-errors.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run lint
```

Las dos suites usan un doble del SDK que devuelve respuestas fijas: una válida, una con un falso
amigo y una que no valida. Ningún test de este epic sale a la red — un test que necesita una clave
real es un test que no puede pasar en un build desatendido.

**Checkpoint**

```bash
git add -A && git commit -m "E3-T3: ejercicios de escritura corregidos por el modelo"
git tag step-10-ejercicios-escritura
```

### `E3-T4` — Motor de repetición espaciada sobre error_items

**Depende de:** `E3-T3` · **Prioridad:** p0

Lo que convierte una lista de errores en un plan de estudio. Nueve niveles de `strength`, del 0 al 8,
con intervalos crecientes; un acierto sube uno, un fallo baja a como máximo 1 y devuelve el error en
diez minutos o menos — porque un fallo significa que no está aprendido y esperar un día lo desaprende
del todo. La calificación es idempotente por clave, así que un reintento de red no adelanta el
intervalo dos veces. La prioridad entre errores empatados en `due_at` es `phoneme` primero: es el
cuello de botella del hispanohablante y el resto del producto existe para eso.

**Archivos**
- `the_profe-server/src/srs/schedule.ts` — nuevo: tabla de intervalos, `grade`, `nextDue`, orden de prioridad
- `the_profe-server/src/routes/review.ts` — nuevo: `GET /api/v1/review/due`, `POST /api/v1/review/grade`
- `the_profe-app/features/review/DueList.tsx` — nuevo: lista de vencidos con su estado vacío
- `the_profe-server/tests/srs/schedule.test.ts` — nuevo: subida, bajada, prioridad, idempotencia
- `the_profe-server/tests/http/review.test.ts` — nuevo: orden por `due_at`, lista vacía con 200

**Aceptación**

1. **CUANDO** un error se acierta **EL SISTEMA DEBERÁ** incrementar su `strength` en 1 hasta un máximo de 8 y adelantar su `due_at` según el intervalo de ese nivel.
2. **CUANDO** un error se falla **EL SISTEMA DEBERÁ** reducir su `strength` a como máximo 1 y poner su `due_at` a no más de 10 minutos en el futuro.
3. **CUANDO** se pide `GET /api/v1/review/due` **EL SISTEMA DEBERÁ** devolver sólo los errores del perfil con `due_at` menor o igual a ahora, ordenados por `due_at` ascendente.
4. **CUANDO** no hay errores vencidos **EL SISTEMA DEBERÁ** devolver 200 con una lista vacía y el cliente **DEBERÁ** renderizar su estado vacío, nunca un error.
5. **CUANDO** se generan los ejercicios del día **EL SISTEMA DEBERÁ** priorizar los errores de tipo `phoneme` sobre los de tipo `lexeme` con el mismo `due_at`, porque la fonética es el cuello de botella del hispanohablante.
6. **CUANDO** se califica un error dos veces con la misma clave de idempotencia **EL SISTEMA DEBERÁ** dejar `strength` y `due_at` idénticos tras la segunda llamada.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/srs/schedule.test.ts
pnpm --dir the_profe-server run test tests/http/review.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T4: motor de repetición espaciada sobre error_items"
git tag step-11-repeticion-espaciada
```

---

## Aceptación del epic

El epic está hecho cuando las cuatro tareas están `done` **y**:

1. **CUANDO** un perfil abre una unidad del temario, responde sus ejercicios de lectura y de escritura, y vuelve a Practicar **EL SISTEMA DEBERÁ** mostrar los errores que acaba de cometer como vencidos o programados, con los de pronunciación por delante de los de vocabulario.
2. **CUANDO** el modelo devuelve una corrección inválida en mitad de una lección **EL SISTEMA DEBERÁ** dejar la lección utilizable, no escribir ningún error nuevo, y mostrar un estado de error con reintento.

```bash
pnpm --dir the_profe-app run typecheck && pnpm --dir the_profe-app run lint && pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run db:local:reset && pnpm --dir the_profe-server run db:local:assert
pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint && pnpm --dir the_profe-server run test
```

Desde la raíz del proyecto. Los dos criterios los deciden estos comandos.

## Trampas

- **Sembrar sin `on conflict`.** El bootstrap aplica la semilla dos veces y el temario se duplica.
  El síntoma llega tarde: unidades repetidas en la pantalla de Hoy semanas después.
- **Meter el texto del usuario en el prefijo estable.** La caché de prompt deja de acertar,
  `cached_tokens` sale cero, y el coste de texto se multiplica sin que ningún test falle. Comprueba
  `cached_tokens` cuando toques la construcción del prompt.
- **Persistir una corrección sin validarla.** Un `kind` fuera del conjunto o una `key` vacía contamina
  `error_items`, y la repetición espaciada arrastra ese error durante semanas sin que nada lo señale.
- **Cruzar las familias tipográficas.** Portugués en sans, o AFI en Inter: en el segundo caso salen
  cuadros vacíos y el medidor de fonemas del epic 04 hereda el problema.
- **Un hex dentro de un componente.** El linter lo falla, y con razón: rompe el tema oscuro en
  silencio.
- **Hacer que un fallo mande el error a mañana.** Un fallo significa que no está aprendido; diez
  minutos, no un día.
- **Olvidar la idempotencia en la calificación.** Un reintento de red adelanta el intervalo dos veces y
  el error desaparece del plan sin haberse aprendido.
- **Dejar la prioridad al orden natural de la base de datos.** Sin el orden explícito
  `phoneme` → `lexeme` → `grammar_rule`, los ejercicios del día salen dominados por vocabulario, que no
  es el problema.

## Antes de seguir

- [ ] Las cuatro tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` se editó, y ninguno se saltó porque un archivo que nombra no existiera.
- [ ] Las cuatro tareas tienen su etiqueta de checkpoint en git: `git tag -l 'step-0[89]-* step-1[01]-*'` lista cuatro.
- [ ] El comando del gate pasa limpio, ejecutado desde la raíz del proyecto.
- [ ] Cada contrato de «Producidos» existe con la firma indicada.
- [ ] Los gates de `01-fundamentos` y `02-columna-agente` siguen en verde.
- [ ] No se modificó ningún archivo fuera del subárbol.
- [ ] `the_profe-server/.env.example` y `the_profe-app/.env.example` reflejan cualquier variable que este epic añadiera.
- [ ] Un commit por tarea, cada uno con su id de prefijo y seguido de su etiqueta.

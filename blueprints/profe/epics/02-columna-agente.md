# Epic 02: Columna vertebral del agente

> Al terminar este epic hay un backend en contenedor que se puede arrancar y consultar, toda llamada al modelo deja una fila de coste en `traces`, y ninguna sesión de voz puede empezar sin haber reservado cuota antes.

| | |
|---|---|
| **Epic id** | `02-columna-agente` |
| **Tareas** | `E2-T1` … `E2-T3` |
| **Depende de** | `01-fundamentos` (sólo `E1-T3`: el esquema y la conexión) |
| **Desbloquea** | `03-curriculo-texto`, `05-voz-afinar` |
| **Paralelo con** | `E1-T2` y `E1-T4`, que sólo tocan `the_profe-app/` |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo está repetido aquí a propósito.

---

## Stack

Hono sobre Node 24 en contenedor · zod para límites de API y entorno · Postgres en Supabase con RLS y
**sin ORM** · Claude Opus 5 vía `@anthropic-ai/sdk`. Gestor de paquetes: `pnpm`. Node pinado en
`.nvmrc`. Las versiones están en los lockfiles — léelos, nunca adivines una.

| Tarea | Comando |
|---|---|
| Dev backend | `pnpm --dir the_profe-server run dev` — http://127.0.0.1:8787 |
| Build | `pnpm --dir the_profe-server run build` → `the_profe-server/dist/server.js` |
| Arrancar el build | `pnpm --dir the_profe-server run start` |
| Typecheck | `pnpm --dir the_profe-server run typecheck` |
| Lint / formato | `pnpm --dir the_profe-server run lint` · `pnpm --dir the_profe-server run format` |
| Test (un archivo) | `pnpm --dir the_profe-server run test tests/<ruta>` |
| Validar entorno | `node the_profe-server/scripts/check-env.ts` |
| Base local arriba | `pnpm --dir the_profe-server run db:local:up` |
| Reset completo | `pnpm --dir the_profe-server run db:local:reset` |

**Gate:** `pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint && pnpm --dir the_profe-server run test`
pasa antes de marcar cualquier tarea de aquí como hecha.

Las tres tareas verifican contra un Postgres real. Arráncalo primero con
`pnpm --dir the_profe-server run db:local:up`. El archivo que lo define llegó en `workspace/` y ya está en la
raíz — no lo escribes tú, y **nunca sustituyas la base de datos por un doble**: la reserva de cuota es
una transacción con `for update` y sólo Postgres la prueba.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a `the_profe-server/`.

## Subárbol de directorios

```
the_profe-server/
  src/
    env.ts               # ya existe (E1-T3) — LO EDITAS en E2-T1 para promover las variables del paso 5
    db/pool.ts           # ya existe (E1-T3) — solo lectura para este epic
    envelope.ts          # El sobre de respuesta y el mapa de códigos a HTTP — NUEVO en E2-T1
    app.ts               # La app de Hono: rutas, validación, manejador de error — NUEVO en E2-T1
    server.ts            # Punto de entrada: serve() y apagado limpio — NUEVO en E2-T1
    gateway/
      anthropic.ts       # El ÚNICO sitio que importa el SDK de Anthropic — NUEVO en E2-T2
      pricing.ts         # Precios por proveedor, en micro-euros — NUEVO en E2-T2
      trace.ts           # Escritura de traces, también en el camino de fallo — NUEVO en E2-T2
    budget/
      ledger.ts          # Inserciones append-only y claves de idempotencia — NUEVO en E2-T3
      reserve.ts         # reserve(), settle(), release() — una transacción cada una — NUEVO en E2-T3
      sweeper.ts         # Libera reservas sin estado terminal pasado expires_at — NUEVO en E2-T3
  tests/
    setup.ts             # ya existe — carga .env y valores de prueba
    http/health.test.ts  # NUEVO en E2-T1
    gateway/trace.test.ts    # NUEVO en E2-T2
    gateway/pricing.test.ts  # NUEVO en E2-T2
    budget/reserve.test.ts      # NUEVO en E2-T3
    budget/concurrency.test.ts  # NUEVO en E2-T3
  scripts/check-env.ts   # ya existe — script autónomo, lo ejercita el Verify de E2-T1
  tsconfig.json          # ya existe: comprobación de tipos
  tsconfig.build.json    # ya existe: ÚNICA dueña de rootDir=src y outDir=dist
  Dockerfile             # ya existe — su CMD nombra dist/server.js
  vitest.config.ts       # ya existe
docker-compose.yml       # ya existe
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar un
archivo que no está listado, para y reporta: significa que la frontera del epic está mal.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic añade o lee | Notas |
|---|---|---|
| `traces` | escribe `profile_id`, `session_id`, `provider`, `operation`, `model_or_voice`, `input_tokens`, `output_tokens`, `cached_tokens`, `audio_seconds`, `chars`, `cost_micros`, `latency_ms` | `cost_micros` es `bigint` de millonésimas de euro. **Nunca coma flotante** |
| `budget_periods` | bloquea con `for update`; actualiza `voice_seconds_held`, `voice_seconds_used`, `cost_micros_used` | Objetivo de bloqueo y lectura rápida, **no** la fuente de verdad. `check (held + used <= granted)` |
| `budget_ledger` | inserta `kind` en `grant`, `hold`, `release`, `settle`, `adjust`, con `idempotency_key` único | **Append-only**: un trigger aborta todo `UPDATE` y `DELETE`. Es la fuente de verdad |
| `voice_sessions` | inserta con `status = 'queued'`, `seconds_held`, `expires_at`; transiciona a `running`, `succeeded`, `failed`, `expired` | Índice parcial en `(status, expires_at)` para el barrendero |

El esquema ya existe: este epic **no** escribe migraciones. Si necesitas una columna nueva, para y
reporta — significa que el modelo de datos del blueprint está incompleto.

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `01-fundamentos` | `the_profe-server/src/db/pool.ts` → `withClient`, `withTransaction` | `withTransaction` abre `BEGIN`, hace `ROLLBACK` si la función lanza, `COMMIT` si no |
| `01-fundamentos` | `the_profe-server/src/env.ts` → `loadEnv`, `describeEnv` | Obligatoriedad por paso: una variable es obligatoria sólo desde el paso que la consume |
| `01-fundamentos` | el esquema completo, con `traces`, `budget_*` y `voice_sessions` | RLS activa; el backend usa `service_role`, que la evita por diseño |
| `workspace/` | `the_profe-server/Dockerfile` | `CMD ["node", "dist/server.js"]` — la misma ruta que emite `tsconfig.build.json` |
| `workspace/` | `the_profe-server/tests/setup.ts` | Carga `the_profe-server/.env` y rellena claves falsas de proveedor antes de cualquier import |

**Producidos** — los epics siguientes dependen de estas firmas exactas. Cambiar una los rompe:

| Export | Firma | Lo usa |
|---|---|---|
| `the_profe-server/src/envelope.ts` → `ok`, `fail`, `ErrorCode` | `ok<T>(data: T)`, `fail(code: ErrorCode, message: string, details?: unknown)` | `03`, `04`, `05`, `06` |
| `the_profe-server/src/app.ts` → `createApp` | `() => Hono` | `03`, `04`, `05` (montan rutas), y los tests HTTP |
| `the_profe-server/src/gateway/anthropic.ts` → `complete` | `(req: { system: string; stablePrefix: string; messages: Msg[]; effort: "low" \| "high"; format?: JsonSchema }) => Promise<{ text: string; usage: Usage }>` | `03`, `04` |
| `the_profe-server/src/gateway/trace.ts` → `withTrace` | `<T>(meta: TraceMeta, fn: () => Promise<{ value: T; usage: Usage }>) => Promise<T>` | `03`, `04`, `05` |
| `the_profe-server/src/gateway/pricing.ts` → `costMicros` | `(t: TraceMeta & Usage) => bigint` | `04`, `05`, `06` |
| `the_profe-server/src/budget/reserve.ts` → `reserve`, `settle`, `release` | `reserve(p: { profileId: string; mode: "afinar" \| "conversar"; estimateSeconds: number }) => Promise<{ ok: true; sessionId: string } \| { ok: false; code: "QUOTA_EXCEEDED" }>` | `04`, `05` |

## Convenios que muerden en esta zona

- **El convenio de imports del backend es la extensión `.ts` literal** en cada import relativo:
  `import { ok } from "./envelope.ts"`. Node 24 elimina los tipos pero resuelve los especificadores
  **literalmente**, así que `./envelope.js` no encuentra `envelope.ts` cuando
  `node the_profe-server/scripts/check-env.ts` se ejecuta. `tsconfig.json` lo permite con
  `allowImportingTsExtensions` y `tsconfig.build.json` lo reescribe a `.js` al emitir, de modo que
  `dist/` corre en Node desnudo. **No mezcles las dos formas** y no resuelvas esto con un cargador por
  script.
- **`the_profe-server/tsconfig.build.json` es la única dueña de la ruta de salida.** `rootDir: "src"` más
  `outDir: "dist"` significa `src/server.ts` → `dist/server.js`, que es exactamente lo que declara
  `main` en `package.json`, lo que arranca `pnpm run start` y lo que ejecuta el `CMD` del Dockerfile.
  Si cambias una, cambias las cuatro.
- **Sólo `gateway/anthropic.ts` importa el SDK de Anthropic.** Un SDK importado en un handler de ruta
  salta la traza y la cuota, y eso no se ve hasta que llega la factura.
- **Tres parámetros de Claude Opus 5 devuelven 400** y hay que escribirlos bien a la primera:
  `thinking: { type: "adaptive" }` **sin** `budget_tokens`, que está eliminado en este modelo;
  `effort` **dentro** de `output_config`, no en el nivel superior; y **ningún prefill** de mensaje de
  asistente — para forzar formato, `output_config.format`.
- **La caché de prompt es la economía del diseño.** Currículo y prompt de sistema en el prefijo
  estable con punto de corte explícito; la conversación después. Nada variable dentro del prefijo. Si
  `usage.cache_read_input_tokens` sale cero en peticiones repetidas, hay un invalidador silencioso.
- **La reserva va antes de abrir el micrófono**, en la misma transacción que crea `voice_sessions`, y
  el WebSocket se abre sólo después del `COMMIT`. Cobrar después de que el proveedor responda es el
  error clásico: cada sesión abandonada sería dinero que nunca se reservó.
- **`env.ts` degrada por paso.** `E2-T1` promueve a obligatorias las variables del paso 5 y **sólo**
  ésas. Si marcas obligatoria una clave de Azure aquí, rompes el gate de `E1-T3` y todos los
  anteriores, y el constructor no tendrá más salida que inventarse credenciales.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de zona: `.claude/rules/voz-y-coste.md` y
`.claude/rules/datos-postgres.md`. Las dos están en la raíz del proyecto — el constructor las copió
desde `workspace/` del bundle antes de la tarea uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E2-T1` — Backend Hono con entorno validado y salud ejecutable

**Depende de:** `E1-T3` · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de ejecución

La app de Hono con un solo sobre de respuesta, un manejador de error que convierte cualquier
excepción en ese sobre, y validación con zod en cada límite. `/healthz` **consulta la base de datos**,
no sólo devuelve 200: un health check que no toca sus dependencias reporta verde con la base caída.
Acepta `SKIP_DB_CHECK` para el arranque del contenedor en CI, donde no hay Postgres — es la única
excepción y va documentada en el propio archivo. Edita `env.ts` para promover a obligatorias las
variables del paso 5 y ninguna más. El Verify de esta tarea **arranca el artefacto construido y lo
consulta**: compilar prueba que el compilador estaba contento, ejecutar prueba que la ruta que emite
el build es la que declara el manifiesto.

**Archivos**
- `the_profe-server/src/envelope.ts` — nuevo: `ok`, `fail`, el conjunto enumerado de `ErrorCode` y su mapa a HTTP
- `the_profe-server/src/app.ts` — nuevo: `createApp()`, `/healthz`, 404 con sobre, manejador de error global
- `the_profe-server/src/server.ts` — nuevo: lee `PORT`, `serve()`, apagado limpio con SIGTERM
- `the_profe-server/src/env.ts` — edición: promueve a obligatorias las variables del paso 5
- `the_profe-server/tests/http/health.test.ts` — nuevo: 200 con base viva, 404 con sobre, 422 de validación

**Aceptación**

Copiados literalmente del array `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** `pnpm --dir the_profe-server run build` se ejecuta **EL SISTEMA DEBERÁ** emitir `the_profe-server/dist/server.js`, que es exactamente la ruta que declara `main` en `the_profe-server/package.json` y la que arranca el `CMD` del Dockerfile.
2. **CUANDO** se arranca el artefacto construido y se pide `GET /healthz` **EL SISTEMA DEBERÁ** responder 200 con `ok` en verdadero y comprobar que la base de datos acepta una consulta, no sólo que el proceso está vivo.
3. **CUANDO** se pide una ruta inexistente bajo `/api/v1/` **EL SISTEMA DEBERÁ** responder 404 con el sobre de error y `code` igual a `NOT_FOUND`.
4. **CUANDO** un cuerpo de petición no valida contra su esquema **EL SISTEMA DEBERÁ** responder 422 con `code` igual a `VALIDATION_FAILED` y no ejecutar ninguna lógica de negocio.
5. **CUANDO** falta una variable de entorno que el paso 5 declara obligatoria **EL SISTEMA DEBERÁ** fallar al arrancar con un error que la nombre, en lugar de servir tráfico con un valor por defecto.
6. **CUANDO** `node the_profe-server/scripts/check-env.ts` se ejecuta con el entorno completo **EL SISTEMA DEBERÁ** salir con 0 e imprimir un resumen sin revelar ningún valor secreto.

**Verify** — cada comando, en orden, desde la raíz del proyecto.

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run build
test -f the_profe-server/dist/server.js
node the_profe-server/scripts/check-env.ts
pnpm --dir the_profe-server run db:local:up
pnpm --dir the_profe-server run test tests/http/health.test.ts
pnpm --dir the_profe-server run start & sleep 3; curl -sf http://127.0.0.1:8787/healthz | jq -e '.ok == true'; RC=$?; pkill -f 'node dist/server.js' 2>/dev/null; exit $RC
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T1: backend Hono con entorno validado y salud ejecutable"
git tag step-05-backend-hono
```

### `E2-T2` — Pasarela de modelo con trazas de coste y tokens

**Depende de:** `E2-T1` · **Prioridad:** p0

Esta tarea va **antes** de que exista cualquier función que use el modelo, y ése es el punto: sin una
traza por llamada se depura a ciegas y no hay modelo de coste. `withTrace` envuelve la llamada y
escribe la fila **también cuando falla** — una llamada que costó dinero y explotó es exactamente la
que hay que poder ver. Los precios viven sólo en `pricing.ts`, en micro-euros enteros: entrada
5,00 $/MTok, salida 25,00 $/MTok, lectura de caché a 0,1× de la entrada. Usa el TTL de caché de 5
minutos, no el de 1 hora: con tráfico continuo cada petición refresca la entrada y sale estrictamente
más barato. Antes de escribir cualquier ID de modelo o parámetro, consulta la skill `claude-api`.

**Archivos**
- `the_profe-server/src/gateway/anthropic.ts` — nuevo: el único importador del SDK; prefijo estable con punto de corte
- `the_profe-server/src/gateway/pricing.ts` — nuevo: tabla de precios por proveedor y `costMicros()`
- `the_profe-server/src/gateway/trace.ts` — nuevo: `withTrace`, escribe en éxito y en fallo
- `the_profe-server/tests/gateway/trace.test.ts` — nuevo: una fila por llamada, fila en fallo, caché acierta, frontera de import
- `the_profe-server/tests/gateway/pricing.test.ts` — nuevo: aritmética entera, lectura de caché a 0,1×

**Aceptación**

1. **CUANDO** la pasarela completa una llamada a Claude **EL SISTEMA DEBERÁ** insertar exactamente una fila en `traces` con `provider` igual a `anthropic`, los tokens de entrada, salida y caché, `cost_micros` calculado desde el módulo de precios y `latency_ms`.
2. **CUANDO** una llamada a Claude falla o expira **EL SISTEMA DEBERÁ** insertar igualmente una fila en `traces` con el coste observado y responder con `code` igual a `UPSTREAM_FAILED` o `UPSTREAM_TIMEOUT`.
3. **CUANDO** se envía la segunda petición de una conversación con el mismo prefijo estable **EL SISTEMA DEBERÁ** registrar `cached_tokens` mayor que cero, probando que la caché de prompt acierta.
4. **CUANDO** se construye una petición **EL SISTEMA DEBERÁ** enviar `thinking` con tipo `adaptive` y **NO DEBERÁ** incluir `budget_tokens` ni un prefill de mensaje de asistente, porque ambos devuelven 400 en este modelo.
5. **CUANDO** se pide un formato estructurado **EL SISTEMA DEBERÁ** usar `output_config.format` y colocar `effort` dentro de `output_config`, nunca en el nivel superior.
6. **CUANDO** un módulo fuera de `the_profe-server/src/gateway/` importa el SDK de Anthropic **EL SISTEMA DEBERÁ** fallar el test de frontera que lo prohíbe.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/gateway/trace.test.ts
pnpm --dir the_profe-server run test tests/gateway/pricing.test.ts
pnpm --dir the_profe-server run lint
```

El criterio 3 se prueba con un doble del SDK que devuelve un `usage` con
`cache_read_input_tokens` positivo en la segunda llamada y comprueba que el cuerpo enviado por la
pasarela fue byte a byte idéntico en el prefijo. El criterio 6 se prueba con una búsqueda estática
sobre `the_profe-server/src/` dentro de `trace.test.ts`: un import es visible en el texto del módulo, y ése es
el medio correcto para decidirlo — un test en tiempo de ejecución no lo vería.

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: pasarela de modelo con trazas de coste y tokens"
git tag step-06-pasarela-trazas
```

### `E2-T3` — Cuotas con ledger, reserva, liquidación y barrendero

**Depende de:** `E2-T2` · **Prioridad:** p0

El orden dentro de la transacción es lo importante y no se puede reordenar: bloquear el periodo con
`for update`, comprobar `granted - held - used` contra el estimado, y sólo si alcanza insertar el
`hold`, actualizar los contadores y crear la sesión. Si no alcanza, `ROLLBACK` y 402 — sin fila de
sesión, y el micrófono no se abre nunca. Al terminar, `settle` con la duración y el coste reales. Al
fallar, expirar o cancelar, `release` con clave en `session_id`, para que un segundo intento no haga
nada. El barrendero es lo que evita que un proceso caído se coma la cuota de un perfil en silencio:
libera toda reserva cuya `voice_sessions` no alcanzó estado terminal pasado `expires_at`. Se compila a
`dist/budget/sweeper.js` y se invoca con `pnpm --dir the_profe-server run sweep`.

**Archivos**
- `the_profe-server/src/budget/ledger.ts` — nuevo: inserciones append-only, construcción de claves de idempotencia
- `the_profe-server/src/budget/reserve.ts` — nuevo: `reserve`, `settle`, `release`, una transacción cada una
- `the_profe-server/src/budget/sweeper.ts` — nuevo: barrendero con punto de entrada propio
- `the_profe-server/tests/budget/reserve.test.ts` — nuevo: los dos caminos, liquidación, doble liberación, barrendero
- `the_profe-server/tests/budget/concurrency.test.ts` — nuevo: 20 peticiones contra saldo para 5

**Aceptación**

1. **CUANDO** se pide una sesión de voz y el saldo de segundos disponibles es suficiente **EL SISTEMA DEBERÁ** insertar una fila `hold` en `budget_ledger`, actualizar `voice_seconds_held` y crear una fila en `voice_sessions` con estado `queued`, todo en una sola transacción.
2. **CUANDO** el saldo disponible es menor que la reserva estimada **EL SISTEMA DEBERÁ** responder 402 con `code` igual a `QUOTA_EXCEEDED`, no crear ninguna fila en `voice_sessions` y dejar `budget_ledger` sin cambios.
3. **CUANDO** se lanzan 20 peticiones concurrentes de sesión contra un saldo que sólo alcanza para 5 **EL SISTEMA DEBERÁ** conceder exactamente 5, rechazar 15 con 402 y dejar `voice_seconds_held` igual a la suma de esas 5 reservas, sin ningún valor negativo.
4. **CUANDO** una sesión termina **EL SISTEMA DEBERÁ** insertar una fila `settle` con la duración real y el coste real del proveedor, y mover los segundos de `voice_seconds_held` a `voice_seconds_used`.
5. **CUANDO** se libera dos veces la misma sesión **EL SISTEMA DEBERÁ** dejar el saldo idéntico tras la segunda llamada, porque la clave de idempotencia está en `session_id`.
6. **CUANDO** el barrendero corre sobre una sesión sin estado terminal pasado su `expires_at` **EL SISTEMA DEBERÁ** marcarla `expired`, insertar una fila `release` y devolver los segundos al saldo disponible.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/budget/reserve.test.ts
pnpm --dir the_profe-server run test tests/budget/concurrency.test.ts
pnpm --dir the_profe-server run lint
```

Los criterios 4, 5 y 6 los decide `tests/budget/reserve.test.ts`; el 3, `concurrency.test.ts`, que
lanza las 20 peticiones con `Promise.all` contra la base local real — un doble en memoria no tiene
`for update` y el test pasaría sin probar nada.

**Checkpoint**

```bash
git add -A && git commit -m "E2-T3: cuotas con ledger, reserva, liquidación y barrendero"
git tag step-07-cuotas
```

---

## Aceptación del epic

El epic está hecho cuando las tres tareas están `done` **y**:

1. **CUANDO** se arranca el artefacto construido, se hace una llamada al modelo con un doble y se pide una sesión de voz **EL SISTEMA DEBERÁ** haber escrito una fila en `traces` por la llamada y una fila `hold` en `budget_ledger` por la sesión, y responder 402 sin crear sesión cuando el saldo no alcanza.
2. **CUANDO** el proveedor falla en mitad de una sesión reservada **EL SISTEMA DEBERÁ** dejar la sesión en un estado terminal y el saldo restaurado, nunca una reserva colgada.

```bash
pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint
pnpm --dir the_profe-server run db:local:reset && pnpm --dir the_profe-server run test
pnpm --dir the_profe-server run build && pnpm --dir the_profe-server run start & sleep 3; curl -sf http://127.0.0.1:8787/healthz | jq -e '.ok == true'; RC=$?; pkill -f 'node dist/server.js' 2>/dev/null; exit $RC
```

Desde la raíz del proyecto. Los dos criterios los deciden estos comandos.

## Trampas

- **Escribir `budget_tokens` en la llamada a Claude.** Está eliminado en Opus 5 y devuelve 400. El
  error habla de un parámetro desconocido y se lee como un problema de SDK.
- **Poner `effort` en el nivel superior.** Mismo 400, misma confusión. Va dentro de `output_config`.
- **Usar un prefill de mensaje de asistente para forzar formato.** 400 en este modelo. Usa
  `output_config.format`.
- **Meter algo variable dentro del prefijo estable** —una marca de tiempo, un id de petición, un
  `JSON.stringify` con claves en orden distinto—. La caché deja de acertar, `cached_tokens` sale cero y
  el coste de texto se multiplica sin que nada falle.
- **Cobrar después de que el proveedor responda.** Cada sesión abandonada, cancelada o caída te cuesta
  dinero que nunca reservaste. La reserva va en la transacción que crea la sesión.
- **Olvidar `for update` en `budget_periods`.** Dos peticiones concurrentes leen el mismo saldo y las
  dos pasan. El test de concurrencia existe para eso, y con un doble en memoria pasaría igual.
- **Hacer del contador la fuente de verdad.** `budget_periods` es objetivo de bloqueo y lectura
  rápida; `budget_ledger` es la verdad. Si discrepan, el bug está en la transacción, y se puede
  rastrear porque el ledger es append-only.
- **Marcar obligatoria en `env.ts` una variable de un paso posterior.** Rompe retroactivamente el gate
  de todos los pasos anteriores y fuerza al constructor a inventar credenciales de servicios que
  todavía no ha integrado.
- **Mezclar especificadores `.js` y `.ts` en los imports del backend.** `node the_profe-server/scripts/check-env.ts`
  resuelve literalmente y muere con módulo no encontrado; la otra forma la rechaza el compilador. Una
  sola forma: `.ts`.

## Antes de seguir

- [ ] Las tres tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` se editó, y ninguno se saltó porque un archivo que nombra no existiera.
- [ ] Las tres tareas tienen su etiqueta de checkpoint en git: `git tag -l 'step-0[567]-*'` lista tres.
- [ ] El comando del gate pasa limpio, ejecutado desde la raíz del proyecto.
- [ ] Cada contrato de «Producidos» existe con la firma indicada.
- [ ] Los gates de `01-fundamentos` siguen en verde: `pnpm --dir the_profe-server run db:local:assert` y
      `pnpm --dir the_profe-server run test tests/db/rls.test.ts` pasan.
- [ ] No se modificó ningún archivo fuera del subárbol.
- [ ] `the_profe-server/.env.example` refleja cualquier variable que este epic añadiera.
- [ ] Un commit por tarea, cada uno con su id de prefijo y seguido de su etiqueta.

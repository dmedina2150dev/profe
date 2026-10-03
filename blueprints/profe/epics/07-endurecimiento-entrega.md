# Epic 07: Endurecimiento y entrega

> Al terminar este epic un cambio de prompt o de modelo no puede degradar la calidad sin que CI lo pare, ningún usuario ni ninguna IP puede multiplicar el plan gratuito con peticiones o con cuentas desechables, un borrado de cuenta está probado fila por fila y la copia de seguridad se ha restaurado de verdad al menos una vez, el backend se despliega como imagen verificada, y la app está lista para distribuirse a cuatro personas por TestFlight y pruebas internas de Play.

| | |
|---|---|
| **Epic id** | `07-endurecimiento-entrega` |
| **Tareas** | `E7-T1` … `E7-T4` |
| **Depende de** | `03-curriculo-texto` (casos de texto), `04-identidad-cobro` (derechos y `email_log`), `06-voz-conversar` (latencia que informar) y `01-fundamentos` (la cascada de borrado) |
| **Desbloquea** | nada — es el último |
| **Paralelo con** | nada fuera del epic. Dentro, `E7-T1`, `E7-T2` y `E7-T3` son independientes entre sí; `E7-T4` depende de las tres |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo está repetido aquí a propósito.

---

## Stack

Hono sobre Node 24 en contenedor, desplegado en Railway · Expo SDK 57 con EAS Build y EAS Update ·
GitHub Actions · Postgres en Supabase. Gestor de paquetes: `pnpm`. Node pinado en `.nvmrc`. Las
versiones están en los lockfiles — léelos, nunca adivines una. **Este epic no añade ni una
dependencia**: el límite de tasa es una `Map` en memoria y el ensayo de restauración es `psql` y
`pg_dump` dentro del contenedor de la base local.

| Tarea | Comando |
|---|---|
| Typecheck | `pnpm --dir the_profe-app run typecheck` · `pnpm --dir the_profe-server run typecheck` |
| Lint | `pnpm --dir the_profe-app run lint` · `pnpm --dir the_profe-server run lint` |
| Test cliente | `pnpm --dir the_profe-app run test` |
| Test backend | `pnpm --dir the_profe-server run test` · un archivo: `pnpm --dir the_profe-server run test tests/<ruta>` |
| Build backend | `pnpm --dir the_profe-server run build` → `the_profe-server/dist/server.js` |
| Arnés de evaluación | `pnpm --dir the_profe-server run eval` |
| Reset completo de la base | `pnpm --dir the_profe-server run db:local:reset` |
| Ensayo de restauración | `pnpm --dir the_profe-server run db:restore:drill` |
| Imagen del backend | `docker build -t profe-server:ci the_profe-server` |
| Config de EAS | `cd the_profe-app && pnpm dlx eas-cli@^24.8.0 config --profile preview` |

**Gate:** typecheck, lint y test de los dos paquetes, más `pnpm --dir the_profe-server run eval`, pasan antes
de marcar cualquier tarea de aquí como hecha.

`db:restore:drill` no existe todavía como script en `the_profe-server/package.json`: lo añade `E7-T3`, apuntando
a `bash scripts/restore-drill.sh`. Es la única entrada que este epic agrega al manifiesto y se declara
aquí para que no parezca un hallazgo a mitad de la tarea.

Las cuatro tareas verifican contra un Postgres real; `pnpm --dir the_profe-server run db:local:reset` lo levanta.
`E7-T3` usa ese mismo contenedor para volcar y restaurar en una base de trabajo aparte, así que no
necesita nada más que Docker. `E7-T4` además construye y **arranca** la imagen del backend: necesita
un demonio de Docker en marcha. Ningún gate de este epic sube nada a ninguna tienda ni publica ninguna
actualización — eso depende de colas ajenas y está en la lista de comprobación de lanzamiento del
blueprint.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a `the_profe-server/`.

## Subárbol de directorios

```
the_profe-server/
  src/
    eval/runner.ts       # Arnés: puntúa casos, compara con la línea base, punto de entrada propio — NUEVO en E7-T1
    http/rate-limit.ts   # Cubeta de tokens en memoria del proceso, por usuario y por IP — NUEVO en E7-T2
    routes/auth.ts       # Alta de cuenta por el backend, con límite por IP — NUEVO en E7-T2
    db/account-deletion.ts  # Borra, disocia y verifica; el audio primero — NUEVO en E7-T3
    obs/logger.ts        # JSON estructurado de una línea con id de petición y redacción — NUEVO en E7-T4
    envelope.ts          # ya existe (E2-T1) — recibe el código RATE_LIMITED
    app.ts               # ya existe (E2-T1) — monta el middleware de límite por ruta
    billing/entitlements.ts  # ya existe (E4-T2) — solo lectura
    gateway/             # ya existe (E2-T2) — solo lectura
    voice/latency.ts     # ya existe (E6-T2) — solo lectura: summarize
    srs/schedule.ts      # ya existe (E3-T4) — solo lectura
  eval/
    cases/text.json      # Casos dorados de texto con etiquetas — NUEVO en E7-T1
    baseline.json        # Umbrales por suite y por etiqueta — NUEVO en E7-T1
  scripts/
    restore-drill.sh     # Volcado → base vacía → migraciones → aserción de esquema — NUEVO en E7-T3
    apply-migrations.sh  # ya existe (workspace/) — solo lectura, lo invoca el ensayo
  tests/
    eval/runner.test.ts        # NUEVO en E7-T1
    http/limite-tasa.test.ts   # NUEVO en E7-T2
    http/limite-altas.test.ts  # NUEVO en E7-T2
    db/borrado-cuenta.test.ts  # NUEVO en E7-T3
    db/ledger-sobrevive.test.ts  # NUEVO en E7-T3
    obs/logger.test.ts         # NUEVO en E7-T4
  Dockerfile             # ya existe — su CMD nombra dist/server.js
  tsconfig.build.json    # ya existe — ÚNICA dueña de rootDir=src y outDir=dist
the_profe-app/
  lib/reporting.ts       # Captura de errores no manejados y reporte opcional — NUEVO en E7-T4
  eas.json               # ya existe — los tres perfiles. NO lo edites
  app.config.ts          # ya existe — identificadores por variante
.github/workflows/
  ci.yml                 # Gate completo en cada push — NUEVO en E7-T1
  release.yml            # Imagen del backend y validación de EAS, sin publicar — NUEVO en E7-T4
docs/
  limites.md             # Los límites vigentes y su validez para una sola instancia — NUEVO en E7-T2
  retencion.md           # Un plazo por tipo de dato; el audio, el más corto — NUEVO en E7-T3
  LANZAMIENTO.md         # Lista de comprobación de lanzamiento con dueño y cuándo empezar — NUEVO en E7-T4
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar un
archivo que no está listado, para y reporta: significa que la frontera del epic está mal. Las dos
excepciones declaradas y acotadas son `the_profe-server/src/envelope.ts`, que recibe `RATE_LIMITED` en su unión
de códigos porque esa unión es la fuente única del conjunto enumerado, y `the_profe-server/src/app.ts`, que monta
el middleware de límite porque es el único sitio del backend donde se monta middleware.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `eval_cases` | lee, y opcionalmente siembra desde `the_profe-server/eval/cases/text.json` | `suite` en `text` o `audio`, `input jsonb`, `expected jsonb`, `tags text[]`, `baseline_score` |
| `traces` | lee para el informe de coste del arnés; en `E7-T3` **disocia** `profile_id` | Fuente del coste real por proveedor. Sus filas sobreviven al borrado de cuenta |
| `turns` | lee para el informe de latencia del arnés; en `E7-T3` se borra con el resto | Vía `summarize` del epic 05. Contiene transcripciones: dato personal |
| `budget_ledger` | en `E7-T3` **disocia** `profile_id` | Append-only: sin `UPDATE` ni `DELETE`, con la única excepción de poner `profile_id` a `NULL` |
| `profiles`, `lessons`, `exercises`, `attempts`, `error_items`, `pronunciation_scores`, `conversations`, `messages`, `voice_sessions`, `budget_periods` | en `E7-T3` se vacían de las filas del usuario | Por la cascada de `public.delete_my_account()` del paso 4 |
| `audio_assets` | en `E7-T3` borra las de `kind = 'user_recording'` del usuario; **conserva** las de `kind = 'tts_cache'` | La caché es compartida y no pertenece a nadie |
| `email_log`, `subscriptions`, `entitlements` | en `E7-T3` se vacían de las filas del usuario | Llegaron en el epic 04 |
| `stripe_events` | en `E7-T3` vacía el `payload` de los eventos de ese cliente y conserva la clave | Ni borrado ni disociado: la clave primaria es la defensa de idempotencia y se queda |

El esquema ya existe: este epic **no** escribe migraciones. Los casos dorados viven en un archivo JSON
del repositorio, no sólo en la base de datos, porque un caso dorado tiene que poder revisarse en un
diff. El límite de tasa no tiene tabla a propósito: vive en memoria del proceso y eso es la decisión,
no un atajo.

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `03-curriculo-texto` | `the_profe-server/src/exercises/write.ts` → la corrección estructurada | Validada con esquema antes de devolverse; errores con `kind` y `key` |
| `03-curriculo-texto` | `the_profe-server/src/srs/schedule.ts` → `grade`, `nextDue` | Idempotente por clave |
| `06-voz-conversar` | `the_profe-server/src/voice/latency.ts` → `summarize` | Devuelve p50/p95 por segmento, el segmento más lento y el número fuera de presupuesto |
| `02-columna-agente` | `the_profe-server/src/gateway/pricing.ts` → `costMicros` | Precios por proveedor en micro-euros enteros |
| `02-columna-agente` | `the_profe-server/src/envelope.ts` → `ok`, `fail`, `ErrorCode` | El conjunto enumerado de códigos y su mapeo a estado HTTP |
| `01-fundamentos` | `supabase/migrations/**` → `public.delete_my_account()` | Borra el perfil y cascadea a sus lecciones, intentos, errores, conversaciones y grabaciones; conserva `tts_cache` |
| `01-fundamentos` | `the_profe-server/src/db/pool.ts` → `withTransaction` | Revierte entero si lanza |
| `04-identidad-cobro` | `the_profe-server/src/billing/entitlements.ts` → `resolveEntitlement` | Lee la proyección local; nunca llama a la API de Stripe |
| `workspace/` | `the_profe-server/scripts/apply-migrations.sh` | Reconstruye `public` y `auth` y aplica cada migración en orden de nombre. Idempotente |
| `workspace/` | `docker-compose.yml`, servicio `db` | Postgres en `127.0.0.1:55432`, base `profe_test` |
| `workspace/` | `the_profe-server/Dockerfile` | `CMD ["node", "dist/server.js"]` — la misma ruta que emite `tsconfig.build.json` |
| `workspace/` | `the_profe-app/eas.json` | Los tres perfiles `development`, `preview` y `production` con su canal |

**Producidos** — nada depende de ellos dentro del build; son la salida del proyecto:

| Export | Firma | Lo usa |
|---|---|---|
| `the_profe-server/src/eval/runner.ts` → punto de entrada compilado a `dist/eval/runner.js` | sale 0 si toda suite iguala o supera su umbral, 1 si alguna baja | `pnpm --dir the_profe-server run eval`, `ci.yml` |
| `the_profe-server/src/http/rate-limit.ts` → `rateLimit` | `(o: { bucket: string; capacity: number; refillPerSecond: number; by: "user" \| "ip" }) => MiddlewareHandler` | `app.ts`, `routes/auth.ts` |
| `the_profe-server/src/db/account-deletion.ts` → `deleteAccount` | `(profileId: string) => Promise<{ deleted: Record<string, number>; dissociated: Record<string, number> }>` | la ruta `DELETE /me`, los tests, el soporte |
| `the_profe-server/scripts/restore-drill.sh` | sale 0 si el volcado se carga en una base vacía y las migraciones se aplican sobre él | `pnpm --dir the_profe-server run db:restore:drill` |
| `the_profe-server/src/obs/logger.ts` → `log` | `(level, event, fields) => void`, JSON de una línea con `requestId`, con redacción | todo el backend, a partir de aquí |
| `docs/limites.md`, `docs/retencion.md`, `docs/LANZAMIENTO.md` | documentos, no código | las personas, y los gates que hacen `grep` sobre ellos |

## Convenios que muerden en esta zona

- **El arnés informa por etiqueta, no un único número.** Un agregado sube porque mejoró el vocabulario
  mientras la fonética empeoraba, y ésa es justo la regresión que importa. La línea base es un umbral
  por suite y por etiqueta.
- **La línea base es un umbral, no una salida esperada byte a byte.** Es deliberado: una comparación
  byte a byte contra la salida de un modelo se rompe con cualquier cambio de versión del proveedor por
  razones que no tienen nada que ver con la calidad. Se afirma la propiedad —la tasa de acierto no baja
  del umbral—, no los bytes.
- **La suite de audio se declara omitida, no pasada.** Sin grabaciones reales no se puede ejecutar, y
  una suite que se da por buena en silencio es peor que no tenerla: reporta verde. Que el arnés imprima
  explícitamente que la omite y por qué.
- **El arnés usa un doble de proveedor determinista.** Dos ejecuciones sobre los mismos casos dan la
  misma tasa. Un arnés no reproducible no puede detectar una regresión: no se distingue el ruido del
  cambio.
- **El límite de tasa vive en memoria del proceso y hay una sola instancia.** Es una decisión, no una
  carencia: a cero usuarios, Redis es una pieza de infraestructura más que mantener, pagar y vigilar a
  cambio de nada. La limitación se declara en `docs/limites.md` y en el registro de decisiones, y es lo
  **primero** que cambia el día que haya dos instancias — con dos procesos, cada uno aplica el límite
  completo y el límite real se duplica en silencio.
- **Los contadores se pierden al reiniciar, y está aceptado.** Un despliegue regala una ventana a quien
  estuviera limitado en ese instante. La alternativa es un almacén compartido; el coste de esa ventana
  es menor que el de la pieza nueva, y queda escrito para que nadie lo descubra como si fuera un fallo.
- **El límite de altas por IP existe para que el plan gratuito no se multiplique.** Tres minutos de voz
  al día por cuenta son un gancho; con cien cuentas desechables son cinco horas de Azure pagadas por
  el fundador. El límite no hace imposible el abuso: lo hace lento y caro, que es todo lo que se puede
  pedir sin molestar a un usuario legítimo detrás de un NAT.
- **`budget_ledger` es de sólo anexado**, y por eso el borrado de cuenta **disocia** en vez de borrar:
  `profile_id` pasa a `NULL` y la fila se queda. La contabilidad tiene que sobrevivir al borrado — es
  obligación fiscal y es la única forma de responder «¿cuánto costó este mes?» después de que alguien
  se vaya. El mismo trato recibe `traces`.
- **Una copia que nunca restauraste no es una copia.** El ensayo carga un volcado en una base vacía,
  aplica todas las migraciones encima y afirma el esquema. Es la diferencia entre tener una copia y
  creer que la tienes, y se descubre siempre en el peor momento posible.
- **Toda transcripción y toda grabación llevan plazo.** `docs/retencion.md` fija un plazo por tipo de
  dato y el audio de pronunciación tiene el **más corto** de todos: es el dato más sensible y el que
  menos falta hace conservar.
- **El logger nunca registra una clave de proveedor, un token de sesión ni una transcripción completa.**
  Las transcripciones son datos personales de cuatro personas reales, y un log es el sitio donde
  terminan filtrándose. Redacción por lista de campos, no por buena intención.
- **`SENTRY_DSN` vacío no rompe nada.** El reporte de errores es opcional por construcción: el cliente
  registra localmente y sigue. Un producto que falla al arrancar porque falta telemetría es un producto
  peor.
- **La imagen se arranca, no sólo se construye.** `docker build` prueba que el Dockerfile es válido;
  `docker run` más un `curl` prueba que `dist/server.js` existe donde el `CMD` lo busca. Es la misma
  ruta que declara `main` y que emite `tsconfig.build.json`: un solo literal, cuatro sitios.
- **`SKIP_DB_CHECK=1` sólo se usa para arrancar el contenedor en CI**, donde no hay Postgres. Es la
  única excepción a que `/healthz` toque la base de datos y está documentada en el propio archivo.
- **Ningún gate sube nada a una tienda.** EAS Build y EAS Submit dependen de colas de Apple y Google, y
  de verificación de identidad. Están en `docs/LANZAMIENTO.md` con dueño y fecha de inicio, no aquí.
- **`the_profe-app/eas.json` y `the_profe-app/app.config.ts` ya existen y no se editan aquí.** `eas.json` llegó en
  `workspace/`; si un perfil falta, el defecto está en el bundle, no en esta tarea.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de zona: `.claude/rules/voz-y-coste.md`,
`.claude/rules/datos-postgres.md` y `.claude/rules/cliente-expo.md`. Las tres están en la raíz del
proyecto — el constructor las copió desde `workspace/` del bundle antes de la tarea uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E7-T1` — Arnés de evaluación con casos dorados y CI

**Depende de:** `E3-T4`, `E6-T2` · **Prioridad:** p1 — metadato para recortes de alcance, no un orden de ejecución

Sin esto, editar un prompt es infalsificable: se cambia, parece mejor, y nadie sabe si empeoró la
fonética. Escribe los casos de texto con etiquetas que correspondan a los fenómenos que importan
—`nasal`, `s-final`, `lh-nh`, `vocal-reducida`, `falso-amigo`, `gramatica`— para que la tasa se pueda
leer por fenómeno. `runner.ts` lleva su propio punto de entrada y compila a `dist/eval/runner.js`, que
es lo que invoca `pnpm --dir the_profe-server run eval`. `ci.yml` corre el gate completo de los dos paquetes:
si una comprobación no está en CI, no está.

**Archivos**
- `the_profe-server/src/eval/runner.ts` — nuevo: carga casos, puntúa con doble determinista, compara con umbrales, punto de entrada
- `the_profe-server/eval/cases/text.json` — nuevo: casos con `input`, `expected` y `tags`
- `the_profe-server/eval/baseline.json` — nuevo: umbral por suite y por etiqueta
- `the_profe-server/tests/eval/runner.test.ts` — nuevo: por etiqueta, fallo bajo umbral, reproducibilidad, suite omitida
- `.github/workflows/ci.yml` — nuevo: typecheck, lint, test y arnés de los dos paquetes, con Postgres de servicio

**Aceptación**

Copiados literalmente del array `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** el arnés se ejecuta **EL SISTEMA DEBERÁ** puntuar todos los casos del archivo de casos de texto y devolver una tasa de acierto por etiqueta, nunca un único número agregado.
2. **CUANDO** la tasa de acierto de cualquier suite queda por debajo del umbral de la línea base comprometida **EL SISTEMA DEBERÁ** salir con código 1 y nombrar la suite y la etiqueta que bajó.
3. **CUANDO** la tasa de acierto iguala o supera el umbral **EL SISTEMA DEBERÁ** salir con 0 e imprimir la tasa por etiqueta.
4. **CUANDO** el arnés corre dos veces sobre los mismos casos y el mismo doble de proveedor **EL SISTEMA DEBERÁ** producir la misma tasa, porque la puntuación no depende del orden de ejecución.
5. **CUANDO** el flujo de integración continua se ejecuta **EL SISTEMA DEBERÁ** correr typecheck, lint, pruebas y el arnés de los dos paquetes, y fallar el trabajo si cualquiera de ellos falla.
6. **CUANDO** los casos de audio no se pueden ejecutar sin grabaciones reales **EL SISTEMA DEBERÁ** omitir esa suite declarándolo explícitamente en la salida, en lugar de darla por pasada.

**Verify** — cada comando, en orden, desde la raíz del proyecto.

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/eval/runner.test.ts
pnpm --dir the_profe-server run build
pnpm --dir the_profe-server run eval
pnpm --dir the_profe-server run lint
```

El criterio 2 se decide dentro de `runner.test.ts` invocando el arnés en proceso con una línea base
imposible y comprobando que devuelve el fallo y nombra la etiqueta — nunca dejando que un comando
falle en el bloque, porque un `Verify` tiene que salir 0 cuando la tarea es correcta. El criterio 5 se
decide leyendo `ci.yml` y confirmando que los seis comandos del gate aparecen en él; la ejecución real
del flujo ocurre en GitHub, fuera de esta máquina.

**Checkpoint**

```bash
git add -A && git commit -m "E7-T1: arnés de evaluación con casos dorados y CI"
git tag step-21-arnes-eval
```

### `E7-T2` — Límite de tasa y endurecimiento frente a abuso

**Depende de:** `E2-T2`, `E4-T3` · **Prioridad:** p0

Un endpoint que llama a un proveedor de pago y no tiene límite de tasa es una factura abierta. Las
cuotas del epic 02 protegen el presupuesto **por perfil y por periodo**, que es la mitad del problema:
no impiden que un bucle de reintentos del cliente dispare doscientas correcciones en un minuto, ni que
alguien cree cuentas nuevas para cobrar el plan gratuito una y otra vez. Esta tarea pone la otra
mitad, y la pone donde se puede: delante de los endpoints de modelo y delante del alta.

**Diseño: una cubeta de tokens por clave.** `http/rate-limit.ts` exporta una fábrica de middleware:

```ts
rateLimit(o: { bucket: string; capacity: number; refillPerSecond: number; by: "user" | "ip" }): MiddlewareHandler
```

El estado es un `Map<string, { tokens: number; updatedAt: number }>` en el módulo. Cada petición
recarga primero —`tokens = min(capacity, tokens + (ahora - updatedAt) * refillPerSecond)`— y después
intenta restar uno. Si queda menos de uno, responde **429** con la cabecera `Retry-After` puesta a
`Math.ceil((1 - tokens) / refillPerSecond)` **segundos enteros**, y el sobre de error con el código
enumerado `RATE_LIMITED`. Una cubeta, y no una ventana fija de contador, porque la ventana fija deja
pasar el doble del límite justo en el borde entre dos ventanas y porque la cubeta permite una ráfaga
corta legítima sin permitir un caudal sostenido. Se elige cubeta y el motivo queda aquí escrito para
que nadie la «simplifique» a un contador.

La limpieza de la `Map` es perezosa: en cada acceso se descartan las entradas cuyo `updatedAt` es más
viejo que dos veces la ventana de la cubeta. Sin `setInterval`, porque un temporizador en un módulo
mantiene el proceso vivo, ensucia los tests y hay que recordar limpiarlo.

**Los límites vigentes**, y de dónde sale cada número:

| Clave | Ámbito | Capacidad | Recarga | Por qué |
|---|---|---|---|---|
| `modelo` | por usuario, en `/api/v1/exercises/*`, `/api/v1/tts`, `/api/v1/voice/sessions` | 20 | 20/60 por segundo (20 por minuto) | Una persona corrigiendo ejercicios hace dos o tres por minuto; 20 deja sitio de sobra para reintentos y para una ráfaga de la interfaz, y corta en seco un bucle |
| `altas` | por IP, en `POST /api/v1/auth/signup` | 5 | 5/3600 por segundo (5 por hora) | Una familia o una oficina detrás de un NAT no llega a cinco altas en una hora; cien cuentas desechables pasan a costar veinte horas |

**La IP.** Detrás del proxy de Railway, la dirección del cliente está en el primer elemento de
`x-forwarded-for`, no en la del socket, que es la del proxy y sería la misma para todo el mundo —el
límite por IP se convertiría en un límite global y el primer usuario del día lo agotaría para todos.
La cabecera se lee **sólo** porque este backend siempre está detrás de ese proxy, que la reescribe; en
un despliegue sin proxy delante, esa cabecera la pone el cliente y no vale nada. La condición queda
escrita en `docs/limites.md` junto al límite.

**El alta por el backend.** `routes/auth.ts` expone `POST /api/v1/auth/signup`, que valida el cuerpo
con zod y reenvía el alta a Supabase Auth. Es la ruta que usa la web y cualquier alta programática, y
es donde se puede aplicar un límite propio. **Esta tarea no cambia el camino de alta del cliente
móvil**: el enlace mágico sigue saliendo del paso 4 contra Supabase directamente, porque cambiarlo
aquí sería modificar un paso anterior y romper su gate. La consecuencia —que las altas del móvil sólo
están limitadas por el límite propio de Supabase Auth— se declara en `docs/limites.md` como la segunda
mitad de la defensa, con su número tomado del panel del proveedor y no de la memoria de nadie.

**El montaje.** El middleware se monta por prefijo de ruta en `the_profe-server/src/app.ts`, que es el único
sitio donde se monta middleware; y **después** del middleware de autenticación, porque la clave por
usuario necesita el perfil resuelto. `RATE_LIMITED` se añade a la unión `ErrorCode` de
`the_profe-server/src/envelope.ts`, mapeado a 429. Ésas son las dos únicas ediciones de esta tarea fuera de sus
archivos, y están declaradas arriba.

**`docs/limites.md`** lleva: la tabla de límites de arriba, la frase literal de que el límite es válido
sólo para **una sola instancia** y lo que hay que hacer el día que haya dos, la pérdida de contadores
al reiniciar como coste aceptado, el límite por IP de Supabase Auth, y los límites de los proveedores
—Stripe, Azure, Anthropic, Google— que marcan el techo real del sistema.

**Qué NO hace esta tarea.** No añade Redis ni ningún almacén compartido. No limita por dirección de
correo ni exige verificación telefónica. No toca las cuotas de voz: siguen siendo las del epic 02, y
el límite diario por plan sigue siendo el del epic 04. No limita `/healthz`, que lo consulta el
contenedor y debe poder preguntar sin coste. No cambia el alta del cliente móvil.

**Trampas.** Usar la IP del socket detrás del proxy y convertir el límite por IP en un límite global.
Devolver `Retry-After` con decimales, que algunos clientes ignoran. Una ventana fija en vez de una
cubeta, que deja pasar el doble en el borde. Un `setInterval` de limpieza que mantiene el proceso vivo
y cuelga la suite de tests. Montar el límite antes de la autenticación, con lo que la clave por usuario
es `undefined` y todos los usuarios comparten cubeta. Y presentar la pérdida de contadores al reiniciar
como un detalle en lugar de declararla.

**Aceptación**

1. **CUANDO** un mismo usuario supera el límite de peticiones de un endpoint de modelo en la ventana configurada **EL SISTEMA DEBERÁ** responder 429 con cabecera `Retry-After` y no llamar al proveedor.
2. **CUANDO** una misma dirección IP supera el límite de altas de cuenta en una hora **EL SISTEMA DEBERÁ** responder 429, para que el plan gratuito no se multiplique con cuentas desechables.
3. **CUANDO** el contador de un endpoint se consulta **EL SISTEMA DEBERÁ** resolverlo en memoria del proceso, y la limitación **DEBERÁ** quedar declarada en `docs/limites.md` como válida sólo para una instancia.
4. **CUANDO** el proceso se reinicia **EL SISTEMA DEBERÁ** empezar con los contadores a cero, y esa pérdida **DEBERÁ** estar declarada como aceptada en el registro de decisiones.
5. **CUANDO** `pnpm --dir the_profe-server run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Archivos**
- `the_profe-server/src/http/rate-limit.ts` — nuevo: cubeta de tokens, recarga, `Retry-After` entero, limpieza perezosa
- `the_profe-server/src/routes/auth.ts` — nuevo: alta por el backend con límite por IP, cuerpo validado con zod
- `the_profe-server/tests/http/limite-tasa.test.ts` — nuevo: 429 al pasarse, cero llamadas al proveedor, cabecera presente
- `the_profe-server/tests/http/limite-altas.test.ts` — nuevo: 429 por IP, dos IP distintas no se estorban
- `docs/limites.md` — nuevo: la tabla, la frase de una sola instancia, la pérdida al reiniciar, los techos de los proveedores

**Verify**

```bash
pnpm --dir the_profe-server run test tests/http/limite-tasa.test.ts
pnpm --dir the_profe-server run test tests/http/limite-altas.test.ts
test -f docs/limites.md
grep -q 'una sola instancia' docs/limites.md
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

La cuarta línea exige la frase **literal** «una sola instancia» en `docs/limites.md`: no la parafrasees
ni la pongas sólo en un título de otra forma, porque el gate busca esa cadena. El criterio 1 lo decide
`limite-tasa.test.ts` con un doble del proveedor que **cuenta llamadas**: después del 429 el contador
tiene que seguir en el valor que tenía, porque un límite que responde 429 **después** de llamar al
proveedor no ahorra nada. El criterio 4 se decide por inspección del registro de decisiones del
blueprint y por un caso del test que reconstruye el módulo —`vi.resetModules()`— y comprueba que la
primera petición tras la reconstrucción pasa; el reinicio real de un proceso no es observable desde
dentro de la suite, así que se afirma la propiedad en el medio donde sí lo es.

**Checkpoint**

```bash
git add -A && git commit -m "E7-T2: límite de tasa y endurecimiento frente a abuso"
git tag step-22-limite-tasa
```

### `E7-T3` — Borrado RGPD verificado y ensayo de restauración de copia

**Depende de:** `E1-T4`, `E4-T2`, `E5-T3` · **Prioridad:** p0

El paso 4 escribió la cascada de borrado y probó que funciona. Lo que falta, y es lo que esta tarea
cierra, son las tres cosas que la cascada no puede resolver sola: el audio, que no vive en Postgres
sino en Storage; la contabilidad, que **no debe** borrarse; y la copia de seguridad, que nadie ha
restaurado nunca. Las tres son obligación legal además de buena idea, y las tres se descubren mal en
el peor momento: cuando alguien ejerce su derecho, o cuando hay que restaurar.

**Diseño: qué se borra y qué se disocia.** `db/account-deletion.ts` expone
`deleteAccount(profileId)` y devuelve un recuento por tabla, que es lo que el test afirma.

| Trato | Tablas |
|---|---|
| **Se vacían** las filas del usuario | `profiles` y, por la cascada del paso 4, `lessons`, `exercises`, `attempts`, `error_items`, `pronunciation_scores`, `conversations`, `messages`, `turns`, `voice_sessions`, `budget_periods`, y `audio_assets` con `kind = 'user_recording'`. Además, directamente: `email_log`, `subscriptions` y `entitlements` |
| **Se disocian**: `profile_id` pasa a `NULL` y la fila se queda | `traces` y `budget_ledger` |
| **Se conserva íntegro, con el `payload` vaciado** | `stripe_events`: la clave primaria es la defensa de idempotencia de todo el cobro y borrarla haría que una reentrega antigua se reaplicara. Se queda `id`, `type` y `applied_at`; el `payload`, que es lo que contiene datos del cliente, pasa a `'{}'::jsonb` |
| **Se conserva y no es suyo** | `audio_assets` con `kind = 'tts_cache'`: la caché es compartida por todos los perfiles y no pertenece a nadie |

El criterio 1 nombra la tabla por su nombre real, `voice_sessions`. **No crees una tabla `sessions`**:
no existe en el esquema. (Una redacción anterior la abreviaba; corregido el 2026-10-03.)

**La disociación y el `budget_ledger` append-only.** Poner `profile_id` a `NULL` es un `UPDATE` sobre
una tabla que tiene un trigger que prohíbe `UPDATE` y `DELETE`. El trigger del paso 3 permite
exactamente **una** forma de actualización —`profile_id` de un valor a `NULL`, con todas las demás
columnas idénticas— y rechaza cualquier otra y todo `DELETE`. Si el trigger que llegó en el paso 3 no
contempla esa excepción, **para y reporta**: la excepción pertenece a esa migración, y esta tarea no
escribe migraciones. Lo mismo para la clave ajena de `traces` y `budget_ledger` hacia `profiles`, que
tiene que ser `on delete set null` y no `on delete cascade`: con cascada, borrar el perfil se lleva la
contabilidad entera y el criterio 2 es imposible de cumplir.

**El orden importa, y el audio va primero.** Dentro de `deleteAccount`:

1. Listar las rutas de Storage del usuario leyendo `audio_assets` con `kind = 'user_recording'`.
2. Borrarlas del bucket. Storage **no** es transaccional, así que si esto falla se aborta y no se ha
   borrado ninguna fila: se puede reintentar entero.
3. Abrir la transacción: disociar `traces` y `budget_ledger`, vaciar el `payload` de los
   `stripe_events` de ese cliente, borrar `email_log`, `subscriptions` y `entitlements`, y llamar a
   `public.delete_my_account()` para la cascada y la fila de `auth.users`.
4. Commit, y devolver el recuento.

Si se invirtiera el orden —filas primero, audio después— un fallo en el borrado del bucket dejaría
audio huérfano **sin ninguna forma de encontrarlo**, porque la ruta del objeto vive en la fila que ya
se borró. Es audio de una persona que pidió que se borrara, en un bucket, para siempre.

**El ensayo de restauración.** `scripts/restore-drill.sh`, en orden: `pg_dump` de `profe_test` dentro
del contenedor de la base local; `createdb profe_restore`; cargar el volcado; ejecutar
`apply-migrations.sh` contra esa base para probar que las migraciones se aplican **encima** de un
volcado real y no sólo sobre una base vacía; ejecutar `tests/sql/assert_schema.sql` contra ella; y
`dropdb` al terminar, también si algo falla, con una trampa de salida. Sale 0 sólo si todo encajó, y
nombra la etapa que falló si no. Acepta una ruta de volcado como primer argumento, para poder apuntarlo
a un volcado descargado de Supabase; sin argumento, usa el de la base local, que es lo que convierte
el ensayo en un gate ejecutable en cualquier máquina. **El ensayo contra el volcado real de producción
queda en la lista de comprobación de lanzamiento**, porque necesita credenciales de producción y una
persona que las tenga: lo que esta tarea garantiza es que el procedimiento existe, está escrito y
funciona.

**`docs/retencion.md`** fija un plazo por tipo de dato, y el audio tiene el más corto:

| Dato | Plazo | Por qué |
|---|---|---|
| Grabaciones de pronunciación (`user_recording`) | **30 días** | El dato más sensible. Pasado el repaso, la puntuación ya está en `pronunciation_scores`: el audio no aporta |
| Transcripciones de turnos | 180 días | Sirven para medir progreso durante un curso; más allá, no |
| `email_log` | 12 meses | Responder «¿se envió?» cubre un ciclo de facturación anual |
| `traces` y `budget_ledger` disociados | 6 años | Obligación de conservación contable. Ya no identifican a nadie |
| `audio_assets` con `kind = 'tts_cache'` | sin plazo | No es de nadie y es lo que mantiene el coste de TTS cerca de cero |

Los mismos plazos aparecen en `web/privacidad.html` del paso 15. Si cambias uno, cambia el otro en el
mismo commit: dos plazos para el mismo dato es peor que no publicar ninguno.

**Qué NO hace esta tarea.** No escribe migraciones. No implementa el trabajo programado que purga lo
vencido: `public.purge_expired_audio()` llegó con el esquema y los tests la llaman directamente, sin
depender de `pg_cron`. No configura las copias de seguridad de Supabase —eso es una casilla del panel y
va en la lista de lanzamiento—. No exporta los datos del usuario: el derecho de portabilidad se atiende
a mano desde el soporte y está dicho en `borrado-de-datos.html`.

**Trampas.** Borrar las filas antes que los objetos de Storage, que deja audio imposible de encontrar.
Dejar `on delete cascade` en `traces` o `budget_ledger` y perder la contabilidad con el perfil. Intentar
`DELETE` sobre `budget_ledger` y chocar con el trigger, que es exactamente lo que el trigger tiene que
hacer. Borrar `stripe_events` y abrir la puerta a que una reentrega antigua se reaplique. Llamar copia
de seguridad a algo que nunca se restauró. Y publicar un plazo de retención distinto del que dice la
política de privacidad.

**Aceptación**

1. **CUANDO** un usuario borra su cuenta **EL SISTEMA DEBERÁ** dejar 0 filas con su identificador en `profiles`, `voice_sessions`, `error_items`, `email_log` y `subscriptions`, y 0 objetos suyos en el bucket de audio.
2. **CUANDO** un usuario borra su cuenta **EL SISTEMA DEBERÁ** conservar sus filas de `traces` y de `budget_ledger` con el identificador disociado, porque el ledger es de sólo anexado y la contabilidad debe sobrevivir al borrado.
3. **CUANDO** se ejecuta el ensayo de restauración **EL SISTEMA DEBERÁ** cargar un volcado en una base vacía, aplicar todas las migraciones y salir con 0, demostrando que la copia es restaurable y no sólo que existe.
4. **CUANDO** se consulta la política de retención **EL SISTEMA DEBERÁ** encontrarla declarada en `docs/retencion.md` con un plazo por tipo de dato, y el audio de pronunciación **DEBERÁ** tener el plazo más corto de todos.
5. **CUANDO** `pnpm --dir the_profe-server run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Archivos**
- `the_profe-server/src/db/account-deletion.ts` — nuevo: audio primero, disociación, vaciado de `payload`, cascada y recuento
- `the_profe-server/scripts/restore-drill.sh` — nuevo: volcado → base nueva → migraciones → aserción → limpieza
- `the_profe-server/tests/db/borrado-cuenta.test.ts` — nuevo: cero filas por tabla, cero objetos, caché intacta
- `the_profe-server/tests/db/ledger-sobrevive.test.ts` — nuevo: filas conservadas, `profile_id` nulo, `DELETE` rechazado
- `docs/retencion.md` — nuevo: un plazo por tipo de dato, con el audio en el más corto

**Verify**

```bash
pnpm --dir the_profe-server run test tests/db/borrado-cuenta.test.ts
pnpm --dir the_profe-server run test tests/db/ledger-sobrevive.test.ts
pnpm --dir the_profe-server run db:restore:drill
test -f docs/retencion.md
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

Los dos primeros comandos necesitan la base local en marcha: si fallan con un error de conexión y no
de aserción, ejecuta `pnpm --dir the_profe-server run db:local:reset` y repite. El tercero es el criterio 3 y usa
el mismo contenedor, en una base de trabajo aparte que borra al terminar; si el contenedor no está
arriba, sale 1 nombrando la etapa. El criterio 4 lo decide `docs/retencion.md` y la comprobación de que
el audio tiene el plazo más corto está dentro de `borrado-cuenta.test.ts`, que lee el documento y
compara los plazos entre sí: es una propiedad del documento, no un número que haya que recordar en dos
sitios. El criterio 1 comprueba también el bucket, con el almacén en memoria que llegó en el paso 16
—la interfaz `AudioStore`—, porque un gate que necesitara un almacén de objetos real no podría correr
en una máquina limpia.

**Checkpoint**

```bash
git add -A && git commit -m "E7-T3: borrado RGPD verificado y ensayo de restauración de copia"
git tag step-23-rgpd-restauracion
git ls-files --error-unmatch docs/retencion.md   # expect: exit 0 — ya commiteado una línea arriba
```

### `E7-T4` — Telemetría, imagen de despliegue y distribución interna

**Depende de:** `E7-T1`, `E7-T2`, `E7-T3`, `E4-T4` · **Prioridad:** p1

Tres cosas que cierran el proyecto. El logger, con redacción por lista de campos: un log con una
transcripción completa dentro convierte la telemetría en una fuga de datos personales. La imagen del
backend, **construida y arrancada**, que es lo que prueba de una vez que `dist/server.js` es la misma
ruta en el compilador, en el manifiesto y en el `CMD`. Y `docs/LANZAMIENTO.md`, que recoge todo lo que
no puede ser un gate del build porque depende de hardware en la mano o de una cola ajena: instalar en
un iPhone y un Android físicos, tunear el umbral de fin de turno contra grabaciones reales —el audio
sintético no tiene las pausas ni el ruido que lo desafinan—, confirmar el fallo simbolizado en el panel
de errores, el alta en el Programa de Desarrolladores de Apple y en Play Console con verificación de
identidad (que se empieza el día uno, porque es procedimiento y no código), la distribución por
TestFlight y pruebas internas de Play, y escuchar cada semana una muestra de conversaciones reales,
porque no hay métrica para «sonó raro» y alguien tiene que oírlo.

**Archivos**
- `the_profe-server/src/obs/logger.ts` — nuevo: `log`, JSON de una línea, `requestId`, redacción por lista de campos
- `the_profe-app/lib/reporting.ts` — nuevo: captura de errores no manejados, reporte opcional, sin fallar si falta el destino
- `.github/workflows/release.yml` — nuevo: construye la imagen y valida la configuración de EAS, sin publicar
- `docs/LANZAMIENTO.md` — nuevo: lista de comprobación con dueño y cuándo empezar cada punto
- `the_profe-server/tests/obs/logger.test.ts` — nuevo: una línea, `requestId`, ninguna clave ni transcripción

**Aceptación**

1. **CUANDO** el backend registra un evento **EL SISTEMA DEBERÁ** emitir JSON estructurado en una sola línea con un identificador de petición, y **NO DEBERÁ** incluir ninguna clave de proveedor, token de sesión ni transcripción completa.
2. **CUANDO** se construye la imagen del backend y se arranca el contenedor **EL SISTEMA DEBERÁ** responder 200 en `GET /healthz`, probando que la ruta que emite el build es la que arranca el contenedor.
3. **CUANDO** el cliente captura un error no manejado **EL SISTEMA DEBERÁ** pasarlo al reportero configurado, y **CUANDO** no hay destino de reporte configurado **DEBERÁ** registrarlo localmente sin fallar.
4. **CUANDO** se inspecciona `the_profe-app/eas.json` **EL SISTEMA DEBERÁ** encontrar los tres perfiles `development`, `preview` y `production`, cada uno con su canal y su variante de identificador.
5. **CUANDO** el flujo de release se ejecuta **EL SISTEMA DEBERÁ** construir la imagen del backend y validar la configuración de EAS sin publicar nada, dejando la subida a tiendas fuera del build.
6. **CUANDO** `pnpm --dir the_profe-server run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run test tests/obs/logger.test.ts
pnpm --dir the_profe-server run test
jq -e '.build.development and .build.preview and .build.production' the_profe-app/eas.json
docker build -t profe-server:ci the_profe-server
docker run --rm -d --name profe-ci -p 8788:8787 -e PORT=8787 -e NODE_ENV=production -e SKIP_DB_CHECK=1 profe-server:ci; sleep 5; curl -sf http://127.0.0.1:8788/healthz | jq -e '.ok == true'; RC=$?; docker rm -f profe-ci >/dev/null; exit $RC
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

El puerto del host es 8788 y el del contenedor 8787 a propósito: así el contenedor y un servidor de
desarrollo pueden coexistir sin que el gate falle por un puerto ocupado. `SKIP_DB_CHECK=1` es lo que
permite arrancar sin Postgres, y es la única excepción documentada. El criterio 5 se decide leyendo
`release.yml`: el flujo real corre en GitHub.

**Checkpoint**

```bash
git add -A && git commit -m "E7-T4: telemetría, imagen de despliegue y distribución interna"
git tag step-24-telemetria-entrega
git ls-files --error-unmatch docs/LANZAMIENTO.md    # expect: exit 0 — ya commiteado una línea arriba
git ls-files --error-unmatch .github/workflows/release.yml   # expect: exit 0
```

---

## Aceptación del epic

El epic está hecho cuando las cuatro tareas están `done` **y**:

1. **CUANDO** se ejecuta el gate global del blueprint sobre un clon limpio **EL SISTEMA DEBERÁ** salir con 0 en typecheck, lint, pruebas, build, arnés de evaluación y arranque de la imagen, de los dos paquetes.
2. **CUANDO** se baja a propósito un umbral de la línea base por debajo de la tasa real **EL SISTEMA DEBERÁ** hacer fallar el arnés nombrando la suite y la etiqueta, probando que el gate puede fallar y no sólo pasar.
3. **CUANDO** un mismo usuario dispara más peticiones de las que la cubeta permite **EL SISTEMA DEBERÁ** responder 429 con `Retry-After` sin haber llamado al proveedor, y **CUANDO** una misma IP supera el límite de altas **DEBERÁ** responder 429.
4. **CUANDO** un usuario borra su cuenta **EL SISTEMA DEBERÁ** dejar cero filas suyas en las tablas de datos personales y cero objetos suyos en el bucket, conservando `traces` y `budget_ledger` disociados, y el ensayo de restauración **DEBERÁ** salir con 0.

```bash
pnpm --dir the_profe-app run typecheck && pnpm --dir the_profe-app run lint && pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint && pnpm --dir the_profe-server run test
pnpm --dir the_profe-server run build && pnpm --dir the_profe-server run eval
pnpm --dir the_profe-server run db:restore:drill
docker build -t profe-server:ci the_profe-server
```

Desde la raíz del proyecto. Los cuatro criterios los deciden estos comandos; el segundo lo cubre
`tests/eval/runner.test.ts`, que invoca el arnés en proceso con una línea base imposible; el tercero y
el cuarto los cubren `tests/http/limite-tasa.test.ts`, `tests/http/limite-altas.test.ts`,
`tests/db/borrado-cuenta.test.ts` y `tests/db/ledger-sobrevive.test.ts` dentro de la suite completa del
backend, más la línea del ensayo de restauración.

## Trampas

- **Un único número agregado en el arnés.** Sube porque mejoró el vocabulario mientras la fonética
  empeoraba, que es exactamente la regresión que este proyecto no se puede permitir.
- **Comparar la salida del modelo byte a byte contra un archivo dorado.** Se rompe con cada cambio de
  versión del proveedor por razones ajenas a la calidad, y el constructor acaba decidiendo si el
  archivo o el modelo está mal. Afirma la propiedad: la tasa no baja del umbral.
- **Dar por pasada la suite de audio.** Sin grabaciones reales no se puede ejecutar. Omitida y dicho en
  voz alta, nunca verde por omisión.
- **Un arnés no determinista.** Si dos ejecuciones dan tasas distintas, no se distingue una regresión
  del ruido y el gate no significa nada.
- **Leer la IP del socket detrás del proxy.** Todos los usuarios comparten entonces la misma cubeta y
  el límite por IP se convierte en un límite global que el primero del día agota para todos.
- **Responder 429 después de haber llamado al proveedor.** El límite existe para no pagar la llamada;
  si la llamada ya ocurrió, el 429 es decorativo.
- **Una ventana fija de contador en vez de una cubeta.** Deja pasar el doble del límite justo en el
  borde entre dos ventanas, que es donde mira quien abusa.
- **Un `setInterval` de limpieza en el módulo del límite.** Mantiene el proceso vivo y cuelga la suite
  de tests sin decir por qué.
- **Borrar las filas antes que los objetos de Storage.** La ruta del objeto vive en la fila: borrada la
  fila, el audio de una persona que pidió su borrado queda en el bucket y nadie puede encontrarlo.
- **`on delete cascade` en `traces` o en `budget_ledger`.** Borrar un perfil se lleva la contabilidad, y
  la contabilidad tiene que sobrevivir al borrado.
- **Borrar filas de `stripe_events`.** Se pierde la defensa de idempotencia del cobro y una reentrega
  antigua puede reaplicarse.
- **Llamar copia de seguridad a algo que nunca se restauró.** Es la trampa de este epic que más caro
  sale, porque sólo se descubre el día que hace falta.
- **Plazos de retención distintos en `docs/retencion.md` y en `web/privacidad.html`.** Dos verdades
  publicadas sobre el mismo dato.
- **Registrar una transcripción completa.** Es un dato personal de una persona real y el log es donde
  se filtra. Redacción por lista de campos.
- **Hacer obligatorio `SENTRY_DSN`.** El producto dejaría de arrancar por falta de telemetría, que es
  cambiar un problema pequeño por uno grande.
- **Construir la imagen y no arrancarla.** `docker build` sólo prueba que el Dockerfile es válido. Si
  `dist/server.js` no está donde el `CMD` lo busca, el fallo aparece en el despliegue, no en el gate.
- **Editar `the_profe-app/eas.json` o `the_profe-app/app.config.ts` aquí.** Llegaron en `workspace/`. Si falta algo, el
  defecto está en el bundle y hay que reportarlo, no parchearlo en esta tarea.
- **Meter `eas submit` en CI.** Depende de la cola de revisión de Apple y Google y de verificación de
  identidad: no puede terminar dentro de un build autónomo. Va en `docs/LANZAMIENTO.md`.
- **Asumir que el primer envío a tienda es rápido.** Una primera publicación de una cuenta nueva puede
  quedarse días en revisión extendida, y Play exige pruebas cerradas antes de producción. Por eso el
  alta se empieza el día uno.

## Antes de seguir

- [ ] Las cuatro tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` se editó, y ninguno se saltó porque un archivo que nombra no existiera.
- [ ] Las cuatro tareas tienen su etiqueta de checkpoint en git: `git tag -l 'step-2[1234]-*'` lista cuatro.
- [ ] `git tag -l 'step-*'` lista **24** etiquetas, una por paso del blueprint.
- [ ] El comando del gate pasa limpio, ejecutado desde la raíz del proyecto **con el bundle presente**.
- [ ] Los gates de los epics 01 a 06 siguen en verde.
- [ ] `the_profe-server/package.json` tiene la entrada `db:restore:drill` y el epic no añadió ninguna dependencia.
- [ ] `docs/limites.md` contiene la frase literal «una sola instancia» y la tabla de límites vigentes.
- [ ] `docs/retencion.md` fija un plazo por tipo de dato, el audio tiene el más corto, y coincide con
      `web/privacidad.html`.
- [ ] `docs/LANZAMIENTO.md` tiene un dueño y un «cuándo empezar» en cada punto, y ninguno de ellos es
      un gate del build.
- [ ] No se modificó ningún archivo fuera del subárbol, salvo las dos excepciones declaradas:
      `the_profe-server/src/envelope.ts` (el código `RATE_LIMITED`) y `the_profe-server/src/app.ts` (montar el middleware).
- [ ] `the_profe-server/.env.example` y `the_profe-app/.env.example` reflejan cualquier variable que este epic añadiera.
- [ ] Un commit por tarea, cada uno con su id de prefijo y seguido de su etiqueta.
- [ ] Se ha recorrido el gate de aceptación global de §20.1 del blueprint, incluidas sus comprobaciones
      manuales.

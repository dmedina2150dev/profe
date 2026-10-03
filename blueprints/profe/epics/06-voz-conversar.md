# Epic 06: Voz — Conversar

> Al terminar este epic se puede conversar en portugués europeo con interrupción real, y cada turno queda medido segmento a segmento para poder atribuir el retraso.

| | |
|---|---|
| **Epic id** | `06-voz-conversar` |
| **Tareas** | `E6-T1` … `E6-T2` |
| **Depende de** | `05-voz-afinar` (relé, cuotas y grabación ya probados) |
| **Desbloquea** | `07-endurecimiento-entrega` |
| **Paralelo con** | nada: es lo más difícil del proyecto y va al final a propósito |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo está repetido aquí a propósito.

**Por qué esto va último.** El riesgo real del proyecto era que el tiempo real —fin de turno,
barge-in, latencia— se comiera el proyecto antes de que hubiera algo usable. Cuando llegas aquí, la app
ya enseña portugués: si este epic se atasca, lo anterior sigue siendo un producto.

---

## Stack

Hono sobre Node 24 con `ws` · `@google/genai` para la Live API en JavaScript —**no**
`@google/generative-ai`, que Google tiene deprecado y cuyo propio repositorio se llama ya
`deprecated-generative-ai-js`— · Expo SDK 57 con `expo-audio` · Postgres en Supabase. Gestor de
paquetes: `pnpm`. Node pinado en `.nvmrc`. Las versiones están en los lockfiles — léelos, nunca
adivines una.

| Tarea | Comando |
|---|---|
| Dev cliente | `pnpm --dir the_profe-app run start` |
| Dev backend | `pnpm --dir the_profe-server run dev` — http://127.0.0.1:8787 |
| Typecheck | `pnpm --dir the_profe-app run typecheck` · `pnpm --dir the_profe-server run typecheck` |
| Lint | `pnpm --dir the_profe-app run lint` · `pnpm --dir the_profe-server run lint` |
| Test cliente | `pnpm --dir the_profe-app run test` |
| Test backend (un archivo) | `pnpm --dir the_profe-server run test tests/<ruta>` |
| Reset completo de la base | `pnpm --dir the_profe-server run db:local:reset` |

**Gate:** typecheck, lint y test de los dos paquetes pasan antes de marcar cualquier tarea de aquí
como hecha.

Las dos tareas verifican contra un Postgres real; `pnpm --dir the_profe-server run db:local:reset` lo levanta.
El archivo que define el servicio llegó en `workspace/` y ya está en la raíz. **Ningún test de este
epic sale a la red:** Gemini Live se sustituye por un doble que habla el mismo protocolo de eventos.
Una conversación real con el proveedor es un paso de la lista de comprobación de lanzamiento, no un
gate del build.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a `the_profe-server/`.

## Subárbol de directorios

```
the_profe-server/
  src/
    voice/
      gemini-live.ts   # Conexión semi-cascada con language_code pt-PT — NUEVO en E6-T1
      latency.ts       # Cronómetro por segmento y agregación p50/p95 — NUEVO en E6-T2
      tts.ts           # ya existe (E5-T1) — solo lectura
      azure-stt.ts     # ya existe (E5-T3) — solo lectura
    ws/
      conversar.ts     # El relé de Conversar, con barge-in — NUEVO en E6-T1
      afinar.ts        # ya existe (E5-T2) — solo lectura: copia su forma, no la edites
    routes/latency.ts  # GET resumen de latencia — NUEVO en E6-T2
    budget/            # ya existe (E2-T3) — solo lectura
    gateway/           # ya existe (E2-T2) — solo lectura
  tests/
    voice/barge-in.test.ts      # NUEVO en E6-T1
    voice/gemini-config.test.ts # NUEVO en E6-T1
    voice/latency.test.ts       # NUEVO en E6-T2
the_profe-app/
  features/
    voice/ConverseScreen.tsx        # NUEVO en E6-T1
    diagnostics/LatencyPanel.tsx    # NUEVO en E6-T2
    voice/useRecorder.ts            # ya existe (E5-T2) — solo lectura
    voice/MicRing.tsx               # ya existe (E5-T2) — solo lectura
  lib/api.ts           # ya existe (E3-T2) — solo lectura
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar un
archivo que no está listado, para y reporta: significa que la frontera del epic está mal.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `conversations` | escribe `profile_id`, `mode` en `converse` o `tutor_chat`, `title` | RLS por `profile_id` |
| `messages` | escribe `conversation_id`, `role`, `content`, `audio_asset_id`, `status` en `streaming`, `complete` o `truncated` | `truncated` es lo que marca un mensaje cortado por barge-in |
| `turns` | escribe `ordinal`, `speaker`, `transcript`, `barge_in`, y los cinco campos de latencia por segmento | `unique (conversation_id, ordinal)`. **Latencia por segmento, nunca un total** |
| `voice_sessions` | lee y transiciona `status` | Vía `reserve`/`settle`/`release` de `02`, nunca con SQL directo |
| `traces` | escribe con `provider = 'gemini_live'`, tokens de audio de entrada y salida | El precio de Gemini Live es de **confianza baja**: ver el registro de riesgos |

El esquema ya existe: este epic **no** escribe migraciones. Si necesitas una columna nueva, para y
reporta.

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `05-voz-afinar` | `the_profe-server/src/ws/afinar.ts` → `attachAfinar` | La forma a copiar: ping cada 20 s en ambos sentidos, liberación de la reserva al cerrar sin liquidar, reenvío sin bufferizar |
| `05-voz-afinar` | `the_profe-app/features/voice/useRecorder.ts` → `useRecorder` | Pide la reserva antes del micrófono; expone `amplitude` y el estado |
| `05-voz-afinar` | `the_profe-app/features/voice/PhonemeMeter.tsx` → `PhonemeMeter` | Chips por sílaba con AFI, banda con etiqueta y forma |
| `02-columna-agente` | `the_profe-server/src/budget/reserve.ts` → `reserve`, `settle`, `release` | `release` es idempotente por `session_id` |
| `02-columna-agente` | `the_profe-server/src/gateway/trace.ts` → `withTrace` | Escribe la fila de `traces` en éxito y en fallo |
| `02-columna-agente` | `the_profe-server/src/envelope.ts` → `ok`, `fail`, `ErrorCode` | `UPSTREAM_FAILED` mapea a 502 |

**Producidos** — el epic siguiente depende de estas firmas exactas. Cambiar una lo rompe:

| Export | Firma | Lo usa |
|---|---|---|
| `the_profe-server/src/voice/gemini-live.ts` → `openLiveSession` | `(p: { languageCode: "pt-PT"; systemPrompt: string }) => Promise<LiveSession>`, con `LiveSession` exponiendo `sendAudio`, `onAudio`, `onTranscript`, `interrupt`, `close` | `06` (el arnés replica turnos por aquí) |
| `the_profe-server/src/voice/latency.ts` → `startTurnTimer`, `summarize` | `startTurnTimer() => { mark(seg: Segment): void; finish(): TurnLatency }` y `summarize(rows: TurnLatency[]) => { perSegment: Record<Segment, { p50: number; p95: number }>; slowest: Segment; overBudget: number }` | `06` (el arnés informa p95) |
| `the_profe-server/src/routes/latency.ts` → `latencyRoutes` | `Hono` montable en `/api/v1/latency` | `06` |

## Convenios que muerden en esta zona

- **Semi-cascada, siempre, con `speech_config.language_code = "pt-PT"`.** Los modelos de **audio
  nativo no pueden fijar el idioma** — la documentación de Google es literal: eligen automáticamente el
  idioma apropiado y no admiten fijar el código. Para un tutor de portugués **europeo** eso es
  descalificante: derivaría a portugués genérico o brasileño, que es exactamente lo que este producto
  existe para no hacer.
- **La lista literal de IDs de modelo que admiten `language_code` quedó SIN VERIFICAR.** `E6-T1`
  la resuelve contra la documentación en vivo **antes** de escribir el ID en `the_profe-server/.env`, y deja la
  fuente anotada. No copies un ID de memoria ni de este archivo: aquí no hay ninguno a propósito.
- **No reintroduzcas OpenAI Realtime.** Mezcla acento brasileño y europeo, los desarrolladores
  reportan no poder forzar Lisboa por instrucciones, y con este uso saldría a unos 115 $/mes. Doble
  descalificación, escrita para que nadie la deshaga.
- **El barge-in hace DOS cosas**, y olvidar la segunda es el error clásico: **para la reproducción** y
  **trunca el historial a lo que el usuario realmente oyó**. Si no, el modelo cree que dijo tres frases
  que nadie escuchó y responde a una pregunta que nunca se hizo. Los criterios de aceptación afirman
  las dos, y el test comprueba el `transcript` persistido, no sólo que el audio paró.
- **La latencia va por segmento, nunca como un total.** `turns` guarda captura, reconocimiento, primer
  token del modelo, primer audio sintetizado y total. No se afina lo que no se puede atribuir.
  Presupuesto objetivo: menos de 800 ms desde la última sílaba del usuario hasta la primera de la
  respuesta.
- **En modo Conversar NO se puntúa la pronunciación.** La característica no se activa, y hay un test en
  el epic 04 que lo afirma y que debe seguir pasando: son 0,30 $/hora que sólo corresponden a Afinar.
- **Ping cada 20 segundos y proxy TCP nativo de Railway**, no el proxy HTTP: hay cortes silenciosos
  reportados alrededor de los 50 minutos a través del HTTP, y una sesión de Conversar es justo la que
  llega ahí.
- **Escribe el prompt para el oído.** El lenguaje hablado es más corto, más interrumpible y menos
  tolerante con respuestas largas: dos frases y para. Un chatbot con voz encima no es un tutor de
  conversación.
- **El texto en streaming entra por frase con un fundido**, no carácter a carácter.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de zona: `.claude/rules/voz-y-coste.md` y
`.claude/rules/cliente-expo.md`. Las dos están en la raíz del proyecto — el constructor las copió desde
`workspace/` del bundle antes de la tarea uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E6-T1` — Relé de Gemini Live en pt-PT con barge-in

**Depende de:** `E5-T3` · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de ejecución

Lo primero, antes de escribir código: **resuelve qué modelos de semi-cascada admiten
`speech_config.language_code`** consultando la documentación en vivo de la Live API, escribe el ID en
`the_profe-server/.env` como `GEMINI_LIVE_MODEL` y anota en el commit la URL y la fecha. El blueprint dejó ese
dato marcado como sin verificar a propósito: rellenarlo de memoria es lo que produce un modelo de audio
nativo que ignora el idioma y un tutor que habla portugués brasileño.

Copia la forma de `ws/afinar.ts` para el ciclo de vida del socket: es la que ya se probó. Lo nuevo es
el barge-in, y hazlo de las dos formas a la vez: al detectar voz del usuario mientras el tutor
reproduce, envía `interrupt` al proveedor **y** recorta el mensaje del asistente en la base de datos a
las palabras que el cliente confirma haber reproducido, marcándolo `truncated`. El cliente es el único
que sabe cuánto oyó de verdad, así que el recorte usa su confirmación, no una estimación del servidor.

**Archivos**
- `the_profe-server/src/voice/gemini-live.ts` — nuevo: `openLiveSession`, semi-cascada, `language_code`, `interrupt`
- `the_profe-server/src/ws/conversar.ts` — nuevo: relé de Conversar, barge-in, truncado del historial, liquidación
- `the_profe-app/features/voice/ConverseScreen.tsx` — nuevo: pantalla de conversación, confirma lo reproducido
- `the_profe-server/tests/voice/barge-in.test.ts` — nuevo: parada bajo 200 ms, truncado, `barge_in` verdadero, caída del proveedor
- `the_profe-server/tests/voice/gemini-config.test.ts` — nuevo: semi-cascada, `language_code` pt-PT, ID resuelto presente

**Aceptación**

Copiados literalmente del array `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** se abre una sesión de Conversar **EL SISTEMA DEBERÁ** conectar con un modelo de semi-cascada y fijar el código de idioma de `speech_config` a `pt-PT`, nunca con un modelo de audio nativo, que no admite fijar el idioma.
2. **CUANDO** se escribe el identificador del modelo en la configuración **EL SISTEMA DEBERÁ** haberlo resuelto antes contra la documentación en vivo y haber registrado la fuente, porque la lista de modelos que admiten fijar el idioma quedó sin verificar.
3. **CUANDO** el usuario interrumpe al tutor **EL SISTEMA DEBERÁ** parar la reproducción en 200 ms o menos **Y** truncar el historial de la conversación a las palabras que realmente se reprodujeron.
4. **CUANDO** se persiste un turno interrumpido **EL SISTEMA DEBERÁ** marcar `barge_in` en verdadero y guardar como `transcript` sólo lo que el usuario oyó, no lo que el modelo generó.
5. **CUANDO** la sesión termina **EL SISTEMA DEBERÁ** liquidar la reserva con los segundos reales y escribir una fila en `traces` con `provider` igual a `gemini_live` y los tokens de audio de entrada y salida.
6. **CUANDO** el proveedor se cae en mitad de la sesión **EL SISTEMA DEBERÁ** cerrar limpiamente, liberar la reserva y devolver `code` igual a `UPSTREAM_FAILED`, sin dejar la sesión colgada en `running`.

**Verify** — cada comando, en orden, desde la raíz del proyecto.

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/barge-in.test.ts
pnpm --dir the_profe-server run test tests/voice/gemini-config.test.ts
pnpm --dir the_profe-server run lint
```

El criterio 2 se decide en `gemini-config.test.ts` comprobando que `GEMINI_LIVE_MODEL` no está vacío y
que la configuración que construye `openLiveSession` no pide audio nativo — la verificación contra la
documentación la hace la persona o el agente que resuelve el ID, y queda anotada en el commit: un
script no puede leer la documentación por ti, y un test que lo pretendiera sería un test que se
autocertifica. Los criterios 3, 4 y 6 los decide `barge-in.test.ts` con un doble del proveedor que
emite audio en trozos y un reloj falso, midiendo el retardo hasta la parada y comparando el
`transcript` persistido con lo que el cliente confirmó.

**Checkpoint**

```bash
git add -A && git commit -m "E6-T1: relé de Gemini Live en pt-PT con barge-in"
git tag step-19-gemini-conversar
```

### `E6-T2` — Instrumentación de latencia por segmento y panel

**Depende de:** `E6-T1` · **Prioridad:** p1

Cinco marcas por turno, no una. `startTurnTimer` devuelve un objeto con `mark(segmento)` que cada
etapa llama al terminar, y `finish()` produce la fila. La comprobación de cuadre es lo que detecta una
etapa sin instrumentar: si la suma de los segmentos se aparta del total más de 50 ms, hay tiempo que
nadie está midiendo, y ése es exactamente el tiempo que luego no se puede recortar. El resumen nombra
el segmento más lento porque «va lento» no es accionable y «el primer audio sintetizado tarda 400 ms en
p95» sí lo es.

**Archivos**
- `the_profe-server/src/voice/latency.ts` — nuevo: `startTurnTimer`, `summarize`, comprobación de cuadre
- `the_profe-server/src/routes/latency.ts` — nuevo: `GET /api/v1/latency/summary`
- `the_profe-app/features/diagnostics/LatencyPanel.tsx` — nuevo: p50/p95 por segmento, fuera de presupuesto, estado vacío
- `the_profe-server/tests/voice/latency.test.ts` — nuevo: cinco campos, p50/p95, cuadre, marca de fuera de presupuesto

**Aceptación**

1. **CUANDO** un turno de voz se completa **EL SISTEMA DEBERÁ** persistir en la fila de `turns` los cinco campos de latencia por segmento —captura, reconocimiento, primer token del modelo, primer audio sintetizado y total— cada uno por separado y nunca sólo el total.
2. **CUANDO** se consulta el resumen de latencia **EL SISTEMA DEBERÁ** devolver p50 y p95 por segmento y nombrar el segmento más lento, para que se pueda atribuir el retraso.
3. **CUANDO** la suma de los segmentos no cuadra con la latencia total dentro de un margen de 50 ms **EL SISTEMA DEBERÁ** registrar una advertencia, porque significa que hay una etapa sin instrumentar.
4. **CUANDO** un turno excede 800 ms desde la última sílaba del usuario hasta el primer audio del tutor **EL SISTEMA DEBERÁ** marcarlo en el resumen como fuera de presupuesto.
5. **CUANDO** el panel de latencia se renderiza sin turnos **EL SISTEMA DEBERÁ** mostrar su estado vacío en lugar de una gráfica de ceros.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/latency.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run lint
```

`latency.test.ts` siembra turnos con latencias conocidas y comprueba los percentiles contra valores
calculados a mano, la advertencia de cuadre con una fila cuyos segmentos suman 200 ms menos que el
total, y la marca de presupuesto con un turno de 900 ms. El criterio 5 lo decide la suite del cliente.

**Checkpoint**

```bash
git add -A && git commit -m "E6-T2: instrumentación de latencia por segmento y panel"
git tag step-20-latencia
```

---

## Aceptación del epic

El epic está hecho cuando las dos tareas están `done` **y**:

1. **CUANDO** se replica una conversación con el doble del proveedor y se interrumpe al tutor a media frase **EL SISTEMA DEBERÁ** haber parado la reproducción en 200 ms o menos, persistido como `transcript` sólo lo reproducido, marcado `barge_in`, y guardado los cinco campos de latencia del turno.
2. **CUANDO** el proveedor se cae durante esa réplica **EL SISTEMA DEBERÁ** dejar la sesión en estado terminal, el saldo de cuota restaurado y ninguna fila de `voice_sessions` en `running`.

```bash
pnpm --dir the_profe-app run typecheck && pnpm --dir the_profe-app run lint && pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run db:local:reset && pnpm --dir the_profe-server run db:local:assert
pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint && pnpm --dir the_profe-server run test
```

Desde la raíz del proyecto. Los dos criterios los deciden estos comandos.

## Trampas

- **Usar un modelo de audio nativo de Gemini.** No admite fijar el idioma y el tutor derivará a
  portugués brasileño o genérico. No falla nada: simplemente el producto deja de ser lo que es. Semi-
  cascada, siempre.
- **Escribir un ID de modelo de memoria.** El dato quedó sin verificar a propósito. Resuélvelo contra la
  documentación en vivo y anota la fuente, o acabarás en la trampa anterior sin saberlo.
- **Parar el audio y dejar el historial entero.** El error clásico del barge-in. El modelo cree que dijo
  tres frases que nadie oyó y responde a una pregunta que no se hizo. El síntoma parece una alucinación
  del modelo y es un bug de estado.
- **Truncar el historial con una estimación del servidor.** Sólo el cliente sabe cuántas palabras llegó
  a reproducir. Usa su confirmación.
- **Guardar un único `latency_total_ms`.** No se afina lo que no se puede atribuir, y cuando el
  presupuesto de 800 ms se rompa no habrá forma de saber qué etapa lo rompió.
- **Ignorar la advertencia de cuadre.** Significa que hay una etapa sin medir. Es el único aviso que vas
  a tener.
- **Escribir respuestas largas.** Dos frases y para. Una respuesta de cinco frases en voz es
  insoportable y además se interrumpe siempre, lo que multiplica el gasto en tokens de audio que nadie
  oyó.
- **Activar la evaluación de pronunciación aquí.** No corresponde a Conversar y el test del epic 04 lo
  falla — comprueba que sigue pasando después de tocar el relé.
- **Quedarse en el proxy HTTP de Railway.** La sesión se corta en silencio alrededor de los 50 minutos y
  parece un bug del cliente.

## Antes de seguir

- [ ] Las dos tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` se editó, y ninguno se saltó porque un archivo que nombra no existiera.
- [ ] Las dos tareas tienen su etiqueta de checkpoint en git: `git tag -l 'step-1[56]-*'` lista dos.
- [ ] El comando del gate pasa limpio, ejecutado desde la raíz del proyecto.
- [ ] Cada contrato de «Producidos» existe con la firma indicada.
- [ ] `GEMINI_LIVE_MODEL` está relleno en `the_profe-server/.env` con un ID resuelto contra la documentación en
      vivo, y el commit anota la URL y la fecha.
- [ ] Los gates de los epics 01 a 04 siguen en verde, incluido
      `pnpm --dir the_profe-server run test tests/voice/no-prosody-in-converse.test.ts`.
- [ ] No se modificó ningún archivo fuera del subárbol.
- [ ] `the_profe-server/.env.example` y `the_profe-app/.env.example` reflejan cualquier variable que este epic añadiera.
- [ ] Un commit por tarea, cada uno con su id de prefijo y seguido de su etiqueta.

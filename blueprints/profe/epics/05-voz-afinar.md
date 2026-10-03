# Epic 05: Voz — Afinar

> Al terminar este epic el tutor habla y el usuario es puntuado fonema a fonema: hay TTS con caché compartida, captura de audio con relé por WebSocket, y evaluación de pronunciación de Azure alimentando el medidor de fonemas y la repetición espaciada. Voz por turnos: se graba, se puntúa. Sin barge-in y sin tiempo real — eso es el epic 05.

| | |
|---|---|
| **Epic id** | `05-voz-afinar` |
| **Tareas** | `E5-T1` … `E5-T3` |
| **Depende de** | `02-columna-agente` (cuotas y pasarela), `03-curriculo-texto` (el temario que se sintetiza), `04-identidad-cobro` (**el derecho que permite abrir el micrófono**) |
| **Desbloquea** | `06-voz-conversar`, `07-endurecimiento-entrega` |
| **Paralelo con** | nada: sus tres tareas forman una cadena |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo está repetido aquí a propósito.

---

## Stack

Expo SDK 57 con `expo-audio` (**no** `expo-av`, que es el módulo legado) · Hono sobre Node 24 con `ws`
· `microsoft-cognitiveservices-speech-sdk` **sólo en el backend** · Supabase Storage para el audio ·
Postgres en Supabase con RLS. Gestor de paquetes: `pnpm`. Node pinado en `.nvmrc`. Las versiones están
en los lockfiles — léelos, nunca adivines una.

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

Las tres tareas verifican contra un Postgres real; `pnpm --dir the_profe-server run db:local:reset` lo levanta
y reconstruye el esquema. El archivo que define el servicio llegó en `workspace/` y ya está en la raíz.
El almacenamiento de audio va detrás de una interfaz con una implementación en memoria para los tests:
**no** se levanta un almacén de objetos local, y eso es deliberado.

`E5-T1` tiene un comando `Verify` que **sí** sale a la red: consulta el endpoint de lista de voces de
Azure para confirmar que el nombre de voz configurado existe de verdad. Necesita `the_profe-server/.env`
relleno con la clave de Azure. Es el único gate de este epic que depende de un servicio externo, y
existe porque el nombre de voz se verificó por consenso de fuentes y no leyéndolo del proveedor: así el
build valida su propio supuesto en vez de confiar en un documento.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a `the_profe-server/`.

## Subárbol de directorios

```
the_profe-server/
  src/
    voice/
      tts.ts          # Síntesis con consulta de caché previa — NUEVO en E5-T1
      storage.ts      # Interfaz de almacén + implementación de Supabase Storage — NUEVO en E5-T1
      azure-stt.ts    # Reconocimiento con evaluación de pronunciación — NUEVO en E5-T3
      score.ts        # Normaliza la puntuación y extrae errores de fonema — NUEVO en E5-T3
    ws/
      afinar.ts       # El relé: teléfono → backend → Azure, con ping cada 20 s — NUEVO en E5-T2
    routes/tts.ts     # POST /api/v1/tts — NUEVO en E5-T1
    budget/           # ya existe (E2-T3) — solo lectura: reserve, settle, release
    gateway/          # ya existe (E2-T2) — solo lectura: withTrace, costMicros
    srs/schedule.ts   # ya existe (E3-T4) — solo lectura: grade
  tests/
    voice/tts-cache.test.ts   # NUEVO en E5-T1
    voice/tts-hash.test.ts    # NUEVO en E5-T1
    ws/afinar.test.ts         # NUEVO en E5-T2
    voice/pronunciation.test.ts           # NUEVO en E5-T3
    voice/no-prosody-in-converse.test.ts  # NUEVO en E5-T3
the_profe-app/
  features/voice/
    useRecorder.ts    # Captura con expo-audio, amplitud real, reserva antes del micrófono — NUEVO en E5-T2
    MicRing.tsx       # Anillo que pulsa con la amplitud; barra estática si se reduce movimiento — NUEVO en E5-T2
    PhonemeMeter.tsx  # Chips por sílaba con AFI debajo, banda + etiqueta + forma — NUEVO en E5-T3
  tests/recorder.test.tsx     # NUEVO en E5-T2
  lib/api.ts          # ya existe (E3-T2) — solo lectura
  constants/theme.ts  # ya existe (E1-T1) — solo lectura
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar un
archivo que no está listado, para y reporta: significa que la frontera del epic está mal.

## Modelo de datos que se toca aquí

| Entidad | Campos que este epic escribe o lee | Notas |
|---|---|---|
| `audio_assets` | escribe `storage_path` único, `kind`, `text_hash`, `voice`, `duration_ms`, `bytes`, `owner_profile_id`, `retention_until` | **Índice único en `(text_hash, voice)` donde `kind = 'tts_cache'`.** RLS: `tts_cache` legible por todo perfil autenticado; `user_recording` privado de su dueño, siempre |
| `pronunciation_scores` | escribe `attempt_id`, `profile_id`, `accuracy`, `fluency`, `completeness`, `words jsonb`, `phonemes jsonb`, `audio_asset_id`, `retention_until` | **No existe columna de prosodia**: Azure no la puntúa fuera de en-US, y una columna siempre nula es peor que su ausencia |
| `error_items` | inserta y actualiza con `kind = 'phoneme'` | Vía `grade` de `03`, nunca con SQL directo |
| `voice_sessions` | lee y transiciona `status`; lee `seconds_held`, `expires_at` | Vía `reserve`/`settle`/`release` de `02`, nunca con SQL directo |
| `traces` | escribe con `provider` en `azure_stt` y `azure_tts`, más `chars` y `audio_seconds` | Un acierto de caché escribe una traza con `cost_micros = 0`: sirve para medir el acierto |

El esquema ya existe: este epic **no** escribe migraciones. Si necesitas una columna nueva, para y
reporta.

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `02-columna-agente` | `the_profe-server/src/budget/reserve.ts` → `reserve`, `settle`, `release` | `reserve` devuelve `{ ok: false, code: "QUOTA_EXCEEDED" }` sin crear sesión; `release` es idempotente por `session_id` |
| `02-columna-agente` | `the_profe-server/src/gateway/trace.ts` → `withTrace` | Escribe la fila de `traces` en éxito y en fallo |
| `02-columna-agente` | `the_profe-server/src/gateway/pricing.ts` → `costMicros` | Conoce ya los medidores de Azure: 1,00 $/hora de reconocimiento, 0,30 $/hora de recargo de evaluación, 15,00 $/1M de caracteres neurales |
| `02-columna-agente` | `the_profe-server/src/envelope.ts` → `ok`, `fail`, `ErrorCode` | `QUOTA_EXCEEDED` mapea a 402 |
| `03-curriculo-texto` | `the_profe-server/src/srs/schedule.ts` → `grade` | Idempotente por clave; `on conflict (profile_id, kind, key)` |
| `03-curriculo-texto` | `the_profe-app/lib/api.ts` → `api` | Único punto de red del cliente; devuelve el sobre sin lanzar |

**Producidos** — el epic siguiente depende de estas firmas exactas. Cambiar una lo rompe:

| Export | Firma | Lo usa |
|---|---|---|
| `the_profe-server/src/voice/tts.ts` → `synthesize` | `(p: { text: string; voice: string }) => Promise<{ assetId: string; storagePath: string; cached: boolean }>` | `05` (frases de relleno y audio de referencia) |
| `the_profe-server/src/voice/storage.ts` → `AudioStore` | interfaz `{ put(key, bytes): Promise<void>; signedUrl(key, ttl): Promise<string> }` con implementación real y en memoria | `05` |
| `the_profe-server/src/ws/afinar.ts` → `attachAfinar` | `(server: http.Server) => void`, monta `/ws/afinar`, ping cada 20 s en ambos sentidos, libera la reserva al cerrar sin liquidar | `05` copia esta forma para `/ws/conversar` |
| `the_profe-app/features/voice/useRecorder.ts` → `useRecorder` | `() => { start(): Promise<void>; stop(): Promise<string>; amplitude: number; state: "idle" \| "reserving" \| "recording" \| "denied" }` | `05` |
| `the_profe-app/features/voice/PhonemeMeter.tsx` → `PhonemeMeter` | `(p: { syllables: { ipa: string; score: number }[] }) => JSX.Element` | `05` |

## Convenios que muerden en esta zona

- **El audio va teléfono → backend → proveedor. Nunca teléfono → proveedor.** Tres razones
  independientes, y basta con una: `microsoft-cognitiveservices-speech-sdk` no funciona dentro de
  React Native —su objetivo publicado es navegador y Node, y Metro falla al empaquetarlo—; una clave de
  Azure en un bundle de JS es una clave pública; y la ruta de medios necesita un proceso vivo. De ahí
  que el backend sea un contenedor de larga vida y **nunca** serverless: un arranque en frío es
  audible.
- **Ping de mantenimiento cada 20 segundos en ambos sentidos**, y el relé usa el **proxy TCP nativo**
  de Railway, no el proxy HTTP: hay cortes silenciosos reportados alrededor de los 50 minutos a través
  del HTTP.
- **La reserva va antes de abrir el micrófono.** Un 402 no abre el micrófono en absoluto. Y si el
  socket se cierra sin liquidar, se libera la reserva — si no, un cierre de app se come la cuota.
- **El recargo de evaluación de pronunciación se paga sólo en Afinar.** En Conversar no se puntúa
  pronunciación, así que la característica no se activa. Se aplica por código y hay un test que lo
  afirma: es una línea de coste de 0,30 $/hora, no un detalle.
- **`expo-audio`, no `expo-av`.** `expo-av` es el módulo legado; no empieces nada nuevo sobre él.
- **La caché de TTS es la pieza económica del diseño.** Clave `(text_hash, voice)`, hash sobre el texto
  **normalizado**, y RLS que la hace legible por los cuatro perfiles. Un temario estructurado repite
  las mismas frases entre lecciones y entre perfiles, así que el TTS tiende a gratis. Un hash sobre el
  texto crudo con espacios variables destruye ese ahorro sin que nada falle.
- **La banda de puntuación lleva etiqueta textual y forma distinta además de color.** Oliva ≥80, ámbar
  60–79, terracota <60: oliva contra terracota es exactamente el eje rojo-verde, y un cuarto de los
  hombres tiene alguna deficiencia ahí.
- **El anillo del micrófono pulsa con la amplitud real de entrada**, no con una animación falsa: es la
  única señal fiable de «te estoy oyendo» mientras el reconocimiento no ha devuelto nada. Con «Reducir
  movimiento» pasa a ser una barra de nivel estática — **no se elimina la señal, se cambia de medio**.
- **Las grabaciones del usuario son datos personales de personas reales.** Toda fila lleva
  `retention_until` y es privada de su dueño. La caché de TTS no: no pertenece a nadie.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de zona: `.claude/rules/voz-y-coste.md` y
`.claude/rules/cliente-expo.md`. Las dos están en la raíz del proyecto — el constructor las copió desde
`workspace/` del bundle antes de la tarea uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E5-T1` — Pipeline de TTS con caché compartida en Storage

**Depende de:** `E4-T3`, `E3-T1` · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de ejecución

El TTS empieza por la caché, no por Azure: consulta `(text_hash, voice)` y sólo sintetiza si falla. El
hash se calcula sobre el texto **normalizado** —espacios colapsados, sin espacios al borde, sin
diferencias de mayúscula inicial— porque el temario repite la misma frase escrita de formas ligeramente
distintas y cada variante sería una síntesis pagada. El almacén va detrás de la interfaz `AudioStore`
con dos implementaciones: Supabase Storage y una en memoria para los tests. Un acierto de caché escribe
igualmente una traza, con `cost_micros = 0`: así el acierto de caché es una consulta y no una
suposición.

**Archivos**
- `the_profe-server/src/voice/tts.ts` — nuevo: `synthesize`, consulta de caché, normalización y hash
- `the_profe-server/src/voice/storage.ts` — nuevo: interfaz `AudioStore`, implementación de Supabase Storage y en memoria
- `the_profe-server/src/routes/tts.ts` — nuevo: `POST /api/v1/tts`, devuelve una URL firmada de corta vida
- `the_profe-server/tests/voice/tts-cache.test.ts` — nuevo: primer fallo, segundo acierto, dos perfiles, traza a 0
- `the_profe-server/tests/voice/tts-hash.test.ts` — nuevo: normalización, colisiones deseadas y no deseadas
- `the_profe-server/scripts/check-azure-voice.ts` — nuevo: resuelve `voices/list` de la región y afirma que `AZURE_TTS_VOICE` aparece. **Es un script y no una línea de shell en el `Verify`** porque necesita cargar `.env` antes de llamar, y un comando compuesto con `set -a; . ./the_profe-server/.env; …` queda fuera de la lista de permitidos y detiene el build pidiendo autorización a mitad del gate

**Aceptación**

Copiados literalmente del array `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** se pide sintetizar un texto por primera vez **EL SISTEMA DEBERÁ** llamar a Azure TTS, guardar el audio en el almacén, insertar una fila en `audio_assets` con `kind` igual a `tts_cache`, `text_hash` y `voice`, y escribir una fila en `traces` con los caracteres facturados.
2. **CUANDO** se pide el mismo texto con la misma voz una segunda vez **EL SISTEMA DEBERÁ** servirlo desde la caché sin llamar a Azure y escribir una traza con `cost_micros` igual a 0.
3. **CUANDO** dos perfiles distintos piden el mismo texto con la misma voz **EL SISTEMA DEBERÁ** servir a los dos desde la misma fila de caché, porque `tts_cache` es legible por todos los perfiles autenticados.
4. **CUANDO** se calcula `text_hash` **EL SISTEMA DEBERÁ** hacerlo sobre el texto normalizado, de modo que dos textos que sólo difieren en espacios o en mayúsculas iniciales produzcan el mismo acierto de caché.
5. **CUANDO** se consulta el endpoint de lista de voces de la región configurada **EL SISTEMA DEBERÁ** encontrar en la respuesta el nombre corto de la voz configurada, validando el supuesto en lugar de confiar en la documentación.
6. **CUANDO** falta la clave de Azure **EL SISTEMA DEBERÁ** fallar al arrancar con un error que la nombre, y no intentar la llamada.

**Verify** — cada comando, en orden, desde la raíz del proyecto.

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/tts-cache.test.ts
pnpm --dir the_profe-server run test tests/voice/tts-hash.test.ts
pnpm --dir the_profe-server run check:azure-voice
pnpm --dir the_profe-server run lint
```

La línea de `curl` es el criterio 5 y es el único gate de este epic que sale a la red. Carga las
variables desde `the_profe-server/.env` en el mismo bloque: un script de shell no hereda el `.env` de nadie. Si
la voz configurada no aparece en la respuesta, **cambia la voz en `the_profe-server/.env` por una que sí
aparezca** — no relajes la comprobación. El criterio 6 lo decide `tts-cache.test.ts` con un caso que
vacía la variable y espera el error nombrado.

**Checkpoint**

```bash
git add -A && git commit -m "E5-T1: pipeline de TTS con caché compartida en Storage"
git tag step-16-tts-cache
```

### `E5-T2` — Captura de audio en el cliente y relé WebSocket

**Depende de:** `E5-T1` · **Prioridad:** p0

El relé es un único archivo, `ws/afinar.ts`, porque el reenvío y el ciclo de vida de la sesión son la
misma responsabilidad: quien abre el socket es quien tiene que liberar la reserva si se cae. Reenvía
las tramas **sin bufferizar la entrada completa** — cualquier etapa que espere al final del turno
duplica la latencia total y se lleva por delante el presupuesto de 800 ms del epic 05. En el cliente,
`useRecorder` pide la reserva **antes** de tocar el micrófono y expone la amplitud real para que
`MicRing` pulse con ella. El estado `denied` existe porque el permiso de micrófono se puede rechazar y
la pantalla no puede quedarse en blanco.

**Archivos**
- `the_profe-server/src/ws/afinar.ts` — nuevo: `attachAfinar`, reenvío en streaming, ping cada 20 s, liberación al cerrar
- `the_profe-server/tests/ws/afinar.test.ts` — nuevo: reenvío sin buffer, ping en ambos sentidos, liberación
- `the_profe-app/features/voice/useRecorder.ts` — nuevo: reserva primero, captura con `expo-audio`, amplitud, estados
- `the_profe-app/features/voice/MicRing.tsx` — nuevo: anillo por amplitud; barra estática si se reduce movimiento
- `the_profe-app/tests/recorder.test.tsx` — nuevo: 402 no abre micrófono, amplitud, movimiento reducido, frontera de import

**Aceptación**

1. **CUANDO** el cliente pide una sesión de voz **EL SISTEMA DEBERÁ** abrir el micrófono sólo después de una reserva confirmada, y **CUANDO** la respuesta es 402 **NO DEBERÁ** abrirlo en absoluto.
2. **CUANDO** el WebSocket está abierto **EL SISTEMA DEBERÁ** enviar un ping de mantenimiento cada 20 segundos en ambos sentidos, para que el proxy no corte la conexión en silencio.
3. **CUANDO** el cliente envía tramas de audio **EL SISTEMA DEBERÁ** reenviarlas al proveedor sin esperar al final del turno, de modo que ninguna etapa de la ruta bufferice la entrada completa.
4. **CUANDO** el socket se cierra sin haber liquidado la sesión **EL SISTEMA DEBERÁ** insertar una fila `release` y devolver los segundos reservados al saldo.
5. **CUANDO** el anillo del micrófono se anima **EL SISTEMA DEBERÁ** usar la amplitud real de entrada, y **CUANDO** la preferencia de reducir movimiento está activa **DEBERÁ** mostrar una barra de nivel estática en lugar de eliminar la señal.
6. **CUANDO** un módulo del cliente importa el SDK de Azure Speech **EL SISTEMA DEBERÁ** fallar el test de frontera, porque ese SDK no funciona dentro de React Native.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/ws/afinar.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

Los criterios 2, 3 y 4 los decide `tests/ws/afinar.test.ts` con un servidor y un cliente `ws` reales
en el proceso de prueba y un doble del proveedor que registra cuándo recibe cada trama. Los criterios
1, 5 y 6 los decide `the_profe-app/tests/recorder.test.tsx`; el 6 con una búsqueda estática sobre `the_profe-app/`,
que es el medio correcto para decidir un import — un test en tiempo de ejecución no lo vería porque el
módulo nunca llegaría a cargarse.

**Checkpoint**

```bash
git add -A && git commit -m "E5-T2: captura de audio en el cliente y relé WebSocket"
git tag step-17-rele-audio
```

### `E5-T3` — Azure STT con evaluación de pronunciación y medidor de fonemas

**Depende de:** `E5-T2` · **Prioridad:** p0

El componente que define el producto. Pide la evaluación con granularidad de fonema y normaliza la
respuesta a una forma estable en `score.ts`, porque la del SDK es verbosa y cambia entre versiones.
**No hay columna de prosodia y no la inventes**: Azure sólo la puntúa en en-US, y una columna siempre
nula sería peor que su ausencia — la mitigación para el ritmo son ejercicios de imitación contra audio
de referencia, y está en el registro de riesgos, no aquí. Los errores de fonema salen por `grade` del
epic 03, así que aparecen en el plan de repaso sin código nuevo. `PhonemeMeter` es una fila de chips,
uno por sílaba, con el AFI debajo en Charis SIL y la banda acompañada de etiqueta y forma.

**Archivos**
- `the_profe-server/src/voice/azure-stt.ts` — nuevo: reconocimiento con evaluación, granularidad de fonema
- `the_profe-server/src/voice/score.ts` — nuevo: normaliza la puntuación, extrae errores de fonema, llama a `grade`
- `the_profe-app/features/voice/PhonemeMeter.tsx` — nuevo: chips por sílaba, AFI en Charis SIL, banda + etiqueta + forma
- `the_profe-server/tests/voice/pronunciation.test.ts` — nuevo: fila persistida, sin prosodia, errores a `error_items`, retención
- `the_profe-server/tests/voice/no-prosody-in-converse.test.ts` — nuevo: cero llamadas con evaluación en modo Conversar

**Aceptación**

1. **CUANDO** una sesión en modo Afinar reconoce voz **EL SISTEMA DEBERÁ** pedir la evaluación de pronunciación con granularidad de fonema e insertar una fila en `pronunciation_scores` con `accuracy`, `fluency`, `completeness`, `words` y `phonemes`.
2. **CUANDO** se persiste una puntuación **EL SISTEMA DEBERÁ** no escribir ninguna columna de prosodia, porque la prosodia es exclusiva de en-US y una columna siempre nula es peor que su ausencia.
3. **CUANDO** una sesión está en modo Conversar **EL SISTEMA DEBERÁ** emitir cero llamadas con evaluación de pronunciación activada, para no pagar el recargo por hora que sólo corresponde a Afinar.
4. **CUANDO** un fonema puntúa 80 o más **EL SISTEMA DEBERÁ** mostrarlo en la banda oliva, entre 60 y 79 en ámbar y por debajo de 60 en terracota, y en los tres casos **DEBERÁ** acompañar el color con una etiqueta textual y una forma distinta.
5. **CUANDO** la puntuación produce errores de fonema **EL SISTEMA DEBERÁ** insertarlos o actualizarlos en `error_items` con tipo `phoneme`, de modo que la repetición espaciada los recoja.
6. **CUANDO** se guarda una grabación del usuario **EL SISTEMA DEBERÁ** fijar su `retention_until` y marcarla como privada de su dueño, nunca legible por otro perfil.

**Verify**

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/pronunciation.test.ts
pnpm --dir the_profe-server run test tests/voice/no-prosody-in-converse.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

El criterio 2 se decide consultando las columnas de `pronunciation_scores`: ninguna con «prosody» en
el nombre. El criterio 3 se decide con un doble del SDK que registra la configuración de cada llamada
y afirma que en modo Conversar ninguna lleva la evaluación activada. El criterio 4 lo decide la suite
del cliente, comprobando que cada chip lleva además de color un texto de banda y un nombre de forma.

**Checkpoint**

```bash
git add -A && git commit -m "E5-T3: Azure STT con evaluación de pronunciación y medidor de fonemas"
git tag step-18-azure-pronunciacion
```

---

## Aceptación del epic

El epic está hecho cuando las tres tareas están `done` **y**:

1. **CUANDO** un perfil con saldo abre un ejercicio de pronunciación, graba una frase y la envía **EL SISTEMA DEBERÁ** devolver una puntuación por sílaba y por fonema, renderizarla con banda, etiqueta y forma, dejar los fonemas fallados en el plan de repaso, y haber liquidado la reserva con los segundos reales.
2. **CUANDO** un perfil sin saldo intenta lo mismo **EL SISTEMA DEBERÁ** responder 402, no abrir el micrófono y no escribir ninguna fila en `voice_sessions`.

```bash
pnpm --dir the_profe-app run typecheck && pnpm --dir the_profe-app run lint && pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run db:local:reset && pnpm --dir the_profe-server run db:local:assert
pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint && pnpm --dir the_profe-server run test
```

Desde la raíz del proyecto. Los dos criterios los deciden estos comandos.

## Trampas

- **Importar `microsoft-cognitiveservices-speech-sdk` desde `the_profe-app/`.** Metro falla al empaquetarlo y
  el error no menciona el objetivo de publicación del paquete. El test de frontera de `E5-T2` existe
  para atraparlo antes.
- **Hashear el texto crudo en lugar del normalizado.** La caché deja de acertar entre variantes de la
  misma frase, el TTS se paga cada vez, y nada falla: sólo sube la factura.
- **Activar la evaluación de pronunciación en modo Conversar.** Son 0,30 $/hora que no hacen falta, y
  sin el test de `no-prosody-in-converse.test.ts` nadie lo nota hasta la factura.
- **Añadir una columna de prosodia «para cuando Azure la soporte».** Sería siempre nula en pt-PT y
  cualquier consulta que la use devolvería nada. La mitigación real es la imitación contra audio de
  referencia.
- **Bufferizar el turno completo antes de reenviarlo.** Serializa las etapas y duplica la latencia. El
  epic 05 mide esto y no habrá margen.
- **Abrir el micrófono antes de tener la reserva.** Cada sesión abandonada costaría dinero no
  reservado, que es exactamente el error que las cuotas existen para evitar.
- **Olvidar liberar la reserva al cerrarse el socket.** Un cierre de app deja los segundos retenidos
  para siempre hasta que pase el barrendero, y el perfil ve una cuota que no gastó.
- **Distinguir las bandas sólo por color.** Oliva contra terracota es el eje rojo-verde. Sin etiqueta y
  sin forma, un cuarto de los hombres no puede leer el medidor que es el producto.
- **Dejar `retention_until` nulo en una grabación.** El trabajo de borrado no la encuentra nunca y el
  audio de una persona real se queda indefinidamente.

## Antes de seguir

- [ ] Las tres tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` se editó, y ninguno se saltó porque un archivo que nombra no existiera.
- [ ] Las tres tareas tienen su etiqueta de checkpoint en git: `git tag -l 'step-1[234]-*'` lista tres.
- [ ] El comando del gate pasa limpio, ejecutado desde la raíz del proyecto.
- [ ] Cada contrato de «Producidos» existe con la firma indicada.
- [ ] Los gates de los epics 01, 02 y 03 siguen en verde.
- [ ] La voz configurada en `the_profe-server/.env` apareció de verdad en la respuesta de `voices/list`.
- [ ] No se modificó ningún archivo fuera del subárbol.
- [ ] `the_profe-server/.env.example` y `the_profe-app/.env.example` reflejan cualquier variable que este epic añadiera.
- [ ] Un commit por tarea, cada uno con su id de prefijo y seguido de su etiqueta.

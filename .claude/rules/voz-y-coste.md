---
description: Reglas de la ruta de audio, la pasarela de modelo, las cuotas y el coste por proveedor en profe
paths:
  - "the_profe-server/src/voice/**"
  - "the_profe-server/src/gateway/**"
  - "the_profe-server/src/budget/**"
  - "the_profe-server/src/ws/**"
  - "the_profe-app/features/voice/**"
---

# Voz, modelo y coste

Antes de escribir cualquier ID de modelo, precio o parámetro de la API de Claude,
usa la skill `claude-api`. Nunca mantengas a mano una tabla de modelos.

## La ruta de audio no se negocia

**teléfono → backend por WebSocket → proveedor.** Nunca teléfono → proveedor.
Tres razones independientes, y basta con una:

1. `microsoft-cognitiveservices-speech-sdk` no funciona dentro de React Native:
   su objetivo publicado es navegador y Node, y Metro falla al empaquetarlo.
2. Una clave de Azure en un bundle de JS es una clave pública.
3. La ruta de medios necesita un proceso vivo. **Nunca serverless para audio**:
   un arranque en frío es audible.

Por eso el backend es un contenedor de larga vida en Railway, y el relé usa el
**proxy TCP nativo** de Railway, no el proxy HTTP: hay cortes silenciosos
reportados alrededor de los 50 minutos a través del HTTP. Ping de mantenimiento
cada **20 segundos en ambos sentidos**.

## Los dos modos, y lo que cuesta cada uno

| Modo | Proveedor | Evaluación de pronunciación |
|---|---|---|
| **Afinar** | Azure STT + TTS | **sí** — se paga el recargo de 0,30 $/hora |
| **Conversar** | Gemini Live, semi-cascada, `speech_config.language_code = "pt-PT"` | **no** — la característica no se activa |

**Una sesión de Conversar nunca debe emitir una llamada con evaluación de
pronunciación activada.** Se aplica en la pasarela por código y hay un test que
lo afirma. Es una línea de coste, no un detalle.

Los modelos de **audio nativo de Gemini no pueden fijar el idioma** — derivarían a
portugués genérico o brasileño. Para un tutor de portugués **europeo** eso es
descalificante. Usa semi-cascada, siempre.

No reintroduzcas OpenAI Realtime: mezcla acento brasileño y europeo, no se puede
forzar Lisboa por instrucciones, y con este uso saldría a unos 115 $/mes.

## Claude Opus 5 — parámetros que devuelven 400

- `thinking: { type: "adaptive" }`. **`budget_tokens` está eliminado en este
  modelo y devuelve 400.** No lo escribas.
- El esfuerzo va **dentro de `output_config`**: `output_config: { effort: "low" }`
  para corregir ejercicios rutinarios, `"high"` para generar una lección o
  interpretar un informe fonémico. No en el nivel superior.
- **Sin prefill de mensaje de asistente**: devuelve 400. Para forzar formato usa
  `output_config.format`.

## Caché de prompt: es la economía del diseño

El currículo y el prompt de sistema van en el **prefijo estable** con un punto de
corte explícito; la conversación va después. Lecturas de caché a 0,1× de la
entrada. Con tráfico continuo, TTL de 5 minutos: cada petición refresca la
entrada y es estrictamente más barato que el de 1 hora.

**Verifica el acierto leyendo `usage.cache_read_input_tokens`.** Si sale cero en
peticiones repetidas hay un invalidador silencioso — casi siempre un cuerpo JSON
que cambia dentro del prefijo. Diferencia los cuerpos y vuelve a medir.

## Cuotas: reservar antes de abrir el micrófono

El orden es lo importante y no se puede reordenar:

```
BEGIN
  SELECT ... FROM budget_periods WHERE profile_id = :p FOR UPDATE
  si (granted - held - used) < estimado:  ROLLBACK  →  HTTP 402, sin sesión
  INSERT budget_ledger (kind='hold', delta_seconds = -estimado, idempotency_key)
  UPDATE budget_periods SET voice_seconds_held = ...
  INSERT voice_sessions (status='queued', seconds_held = estimado)
COMMIT
→ sólo entonces se abre el WebSocket
```

- Al terminar: `settle` con la duración real y el coste real del proveedor.
- Al fallar, expirar o cancelar: `release`, con clave en `session_id`, para que un
  segundo intento no haga nada.
- El barrendero libera las reservas cuyo `voice_sessions` no alcanzó estado
  terminal pasado `expires_at`. Sin él, un proceso caído se come la cuota del
  perfil en silencio.

**Cobrar después de que el proveedor responda es el error clásico.** Cada sesión
abandonada costaría dinero que nunca se reservó.

## Barge-in hace DOS cosas

1. Para la reproducción.
2. **Trunca el historial a lo que el usuario realmente oyó.**

Olvidar la segunda es el error clásico: el modelo cree que dijo tres frases que
nadie escuchó y responde a una pregunta que nunca se hizo. Los criterios de
aceptación afirman las dos.

## Latencia por segmento, nunca un total

`turns` guarda `latency_capture_ms`, `latency_stt_ms`, `latency_llm_ttft_ms`,
`latency_tts_first_ms` y `latency_total_ms`. No se afina lo que no se puede
atribuir. Presupuesto objetivo: menos de 800 ms desde la última sílaba del usuario
hasta la primera de la respuesta.

## Toda llamada a proveedor escribe una fila en `traces`

Proveedor, operación, modelo o voz, tokens de entrada/salida/caché, segundos de
audio, caracteres, `cost_micros` y `latency_ms`. Sin traza por llamada se depura a
ciegas y no hay modelo de coste. La traza se escribe **siempre**, también cuando
la llamada falla.

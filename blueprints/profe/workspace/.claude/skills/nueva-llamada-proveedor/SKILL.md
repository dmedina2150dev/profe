---
name: nueva-llamada-proveedor
description: Usar al añadir o cambiar cualquier llamada a Anthropic, Azure Speech o Gemini Live en profe. Cubre la traza de coste obligatoria, la reserva de cuota antes de abrir el micrófono, la caché de prompt, la caché de TTS y el test que impide activar la evaluación de pronunciación en modo Conversar.
---

# Nueva llamada a un proveedor

## Cuándo usarla

- «llama a Claude para…», «añade un prompt que…»
- cualquier cosa que sintetice o reconozca voz
- cualquier cambio en el relé de audio o en el modo Conversar
- «¿por qué la factura ha subido?»

Antes de escribir un ID de modelo, un precio o un parámetro de la API de Claude,
consulta la skill `claude-api`.

## Pasos

1. **La llamada pasa por la pasarela, no por el SDK directamente.** Todo sale por
   `the_profe-server/src/gateway/`. Un SDK importado en un handler de ruta salta la traza y
   la cuota.

2. **Escribe la fila de `traces` en el mismo camino de código, también al fallar.**
   Proveedor, operación, modelo o voz, tokens de entrada/salida/caché, segundos de
   audio, caracteres, `cost_micros` y `latency_ms`. El precio vive en
   `the_profe-server/src/gateway/pricing.ts` y en ningún otro sitio.

3. **Si la llamada consume voz, reserva ANTES.** `reserve()` en la misma
   transacción que crea `voice_sessions`, y sólo entonces se abre el WebSocket. Un
   402 no deja fila de sesión y no abre el micrófono.

4. **Si es texto a Claude, respeta el prefijo cacheado.** Currículo y prompt de
   sistema en el prefijo estable con punto de corte explícito; la conversación
   después. Nada variable dentro del prefijo. Después de la segunda petición,
   afirma que `usage.cache_read_input_tokens` es mayor que cero.

5. **Si es TTS, consulta la caché primero.** Clave `(text_hash, voice)` con índice
   único donde `kind = 'tts_cache'`. Un acierto no llama a Azure y escribe una
   traza con `cost_micros = 0`.

6. **Si es modo Conversar, NO actives la evaluación de pronunciación.** El recargo
   de 0,30 $/hora se paga sólo en Afinar. Hay un test que lo afirma y que debe
   seguir pasando.

7. **Prueba con un doble del proveedor.** Ningún test de esta suite sale a la red:
   un test que necesita una clave real es un test que no puede pasar en el build.

## Verify

```bash
pnpm --dir the_profe-server run test tests/gateway                    # expect: exit 0, 0 fallos, 0 omitidos
pnpm --dir the_profe-server run test tests/budget/reserve.test.ts     # expect: exit 0
pnpm --dir the_profe-server run test tests/voice                      # expect: exit 0
pnpm --dir the_profe-server run typecheck                                # expect: exit 0
```

## No hagas

- **No escribas `budget_tokens`** en una llamada a Claude Opus 5: está eliminado en
  este modelo y devuelve 400. El pensamiento es `thinking: { type: "adaptive" }`.
- **No pongas `effort` en el nivel superior**: va dentro de `output_config`.
- **No uses prefill de mensaje de asistente**: devuelve 400. Para forzar formato,
  `output_config.format`.
- **No uses un modelo de audio nativo de Gemini**: no admite fijar el idioma y
  derivaría a portugués brasileño o genérico. Semi-cascada con
  `speech_config.language_code = "pt-PT"`, siempre.
- **No cobres después de que el proveedor responda.** Cada sesión abandonada sería
  dinero no reservado.
- **No metas una clave de proveedor en el cliente.** El bundle de JS es legible.

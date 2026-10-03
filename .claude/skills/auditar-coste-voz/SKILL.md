---
name: auditar-coste-voz
description: Usar cuando haya que saber cuánto se está gastando en profe, antes de subir una cuota, o cuando la factura de Azure, Anthropic o Google no cuadre con lo esperado. Lee `traces` y `budget_periods` de la base local o de Supabase y produce el coste por proveedor, el acierto de caché de TTS y de prompt, y el coste por minuto de voz.
---

# Auditar el coste de voz

## Cuándo usarla

- «¿cuánto llevamos gastado este mes?»
- antes de tocar `VOICE_QUOTA_SECONDS_PER_PERIOD` o `COST_MICROS_CAP_PER_PERIOD`
- la factura no cuadra con la estimación
- «¿está funcionando la caché?»

El presupuesto es 50 € al mes para cuatro perfiles y la estimación es de 34–41 €.
El margen es delgado y descansa en dos supuestos declarados (reparto 50/50 entre
usuario y tutor hablando, 900 caracteres por minuto de habla sintetizada) y en un
precio de **confianza baja** (Gemini Live). Por eso esto se audita con datos
reales antes de subir cualquier límite.

## Pasos

1. **Coste por proveedor y operación en el periodo actual.**

   ```sql
   select provider, operation,
          count(*)                       as llamadas,
          sum(cost_micros) / 1000000.0   as euros,
          round(avg(latency_ms))         as latencia_media_ms
   from traces
   where created_at >= date_trunc('month', now())
   group by provider, operation
   order by euros desc;
   ```

2. **Acierto de la caché de TTS.** Una traza de `azure_tts` con `cost_micros = 0`
   es un acierto.

   ```sql
   select count(*) filter (where cost_micros = 0) as aciertos,
          count(*)                                as total
   from traces
   where provider = 'azure_tts' and created_at >= date_trunc('month', now());
   ```

   Por debajo de ~60 % a partir del segundo mes, revisa que el `text_hash` se
   calcule sobre el texto normalizado y no sobre el original con espacios variables.

3. **Acierto de la caché de prompt.** `cached_tokens` a cero en peticiones
   repetidas significa un invalidador silencioso dentro del prefijo estable.

   ```sql
   select date_trunc('day', created_at) as dia,
          sum(input_tokens)  as entrada,
          sum(cached_tokens) as cacheados
   from traces
   where provider = 'anthropic' and created_at >= now() - interval '7 days'
   group by 1 order by 1;
   ```

4. **Coste por minuto de voz.** Es el número que decide si el techo es realista.

   ```sql
   select sum(cost_micros) / 1000000.0
            / nullif(sum(audio_seconds) / 60.0, 0) as euros_por_minuto
   from traces
   where provider in ('azure_stt','azure_tts','gemini_live')
     and created_at >= date_trunc('month', now());
   ```

5. **Saldo de cuota por perfil**, y comprueba que el ledger cuadra con los
   contadores. Si no cuadran, el ledger es la verdad y hay un bug en la transacción.

   ```sql
   select p.display_name,
          bp.voice_seconds_granted, bp.voice_seconds_held, bp.voice_seconds_used,
          (select coalesce(sum(delta_seconds), 0) from budget_ledger l
            where l.period_id = bp.id) as suma_ledger
   from budget_periods bp join profiles p on p.id = bp.profile_id
   where now()::date between bp.period_start and bp.period_end;
   ```

## Verify

```bash
pnpm --dir the_profe-server run db:local:up                                   # expect: exit 0, contenedor sano
pnpm --dir the_profe-server run test tests/gateway/trace.test.ts           # expect: exit 0
curl -sf "http://127.0.0.1:8787/api/v1/traces/summary" | jq -e '.ok == true'   # expect: exit 0
```

## No hagas

- **No subas la cuota con esta estimación.** Recalcula contra la página de precios
  en vivo de Google primero: el precio de Gemini Live que hay en el blueprint vino
  de un resumen automatizado, no de una cita directa.
- **No metas la capa gratuita F0 de Azure en el modelo de coste.** F0 es un recurso
  aparte que no se mezcla con S1 en el mismo recurso. Es una palanca opcional, no
  una línea del presupuesto.
- **No borres filas de `traces` para «limpiar».** Es el único registro del coste
  real por sesión y lo que permite revisar el techo con datos en vez de con la
  estimación.

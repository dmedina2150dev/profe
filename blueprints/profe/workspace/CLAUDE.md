# profe

Tutor de portugués **europeo** (pt-PT, no pt-BR) para **hispanohablantes**,
vendido por suscripción. Enseña a hablar, escribir y leer desde cero, puntúa la
pronunciación fonema a fonema y decide el siguiente ejercicio según los errores
reales acumulados.

**pt-PT es el único curso.** El esquema es consciente de la variante
(`content_variant` enum) para que pt-BR sea una migración de datos y no una
reescritura, pero **el curso pt-BR no existe y no hay selector en la interfaz**.
Ver §1 Non-Goals del blueprint.

## Comandos

| Tarea | Comando |
|---|---|
| Instalar (cliente) | `pnpm --dir the_profe-app install` |
| Instalar (backend) | `pnpm --dir the_profe-server install` |
| Dev (cliente) | `pnpm --dir the_profe-app run start` — development build, **nunca Expo Go** |
| Dev (backend) | `pnpm --dir the_profe-server run dev` — http://127.0.0.1:8787 |
| Build (backend) | `pnpm --dir the_profe-server run build` → `dist/server.js` |
| Arrancar el build | `pnpm --dir the_profe-server run start` |
| Typecheck | `pnpm --dir the_profe-app run typecheck` · `pnpm --dir the_profe-server run typecheck` |
| Lint / formato | `pnpm --dir the_profe-app run lint` · `pnpm --dir the_profe-server run lint` · `pnpm --dir the_profe-server run format` |
| Tests (cliente) | `pnpm --dir the_profe-app run test` |
| Tests (backend) | `pnpm --dir the_profe-server run test` · un archivo: `pnpm --dir the_profe-server run test tests/<ruta>` |
| Validar entorno | `pnpm --dir the_profe-server run check:env` |
| Validar DNS de correo | `pnpm --dir the_profe-server run check:mail-dns` — SPF, DKIM, DMARC |
| Ensayo de restauración | `pnpm --dir the_profe-server run db:restore:drill` |
| Base local arriba | `pnpm --dir the_profe-server run db:local:up` |
| Base local reset | `pnpm --dir the_profe-server run db:local:reset` |
| Base local abajo | `pnpm --dir the_profe-server run db:local:down` |
| Nueva migración | `pnpm --dir the_profe-server run db:migration:new <slug>` |
| Migrar Supabase | `pnpm --dir the_profe-server run db:push` |
| Salud de deps Expo | `cd the_profe-app && pnpm dlx expo-doctor@latest` |
| Build EAS | `cd the_profe-app && pnpm dlx eas-cli@^24.8.0 build -p all --profile preview` |

**Gate:** los seis comandos de typecheck, lint y test de ambos paquetes pasan
antes de marcar cualquier tarea como hecha.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a
`the_profe-server/`. Igual con el cliente y `the_profe-app/`.

Node está pinado en `.nvmrc`. Las versiones de dependencias viven en los
lockfiles — léelos, nunca adivines una.

## Stack

Expo SDK 57 + expo-router + NativeWind (Tailwind **3.4**) · Hono sobre Node 24 en
contenedor Railway · Postgres en Supabase (plan **Pro**) con RLS y **sin ORM** ·
Supabase Auth · Supabase Storage · Claude Opus 5 · Azure Speech (STT + evaluación
de pronunciación + TTS neural pt-PT) · Gemini Live en semi-cascada ·
**Stripe `22.6.2`** con `apiVersion: "2026-08-26.dahlia"` · **Resend** ·
`web/` en HTML y CSS planos sobre Cloudflare Pages.

## Arquitectura

**La ruta de audio, que gobierna todo lo demás:**
`the_profe-app/features/voice/` → WebSocket → `the_profe-server/src/ws/{afinar,conversar}.ts` →
`the_profe-server/src/voice/{azure-stt,tts,gemini-live}.ts` → proveedor.
**Nunca teléfono → proveedor.** El SDK de Azure Speech no funciona dentro de React
Native, una clave en el bundle de JS es pública, y la ruta de medios necesita un
proceso vivo. Por eso el backend es un contenedor de larga vida y **nunca
serverless**: un arranque en frío es audible.

**La ruta de texto:** `the_profe-app/app/leccion/[id].tsx` → `the_profe-app/lib/api.ts` →
`the_profe-server/src/routes/*.ts` → `the_profe-server/src/gateway/anthropic.ts` → Claude, y de vuelta.
Toda llamada a proveedor escribe una fila en `traces` antes de devolver.

| Capa | Puede importar de | Nunca |
|---|---|---|
| `the_profe-app/app/**` | `features`, `components`, `lib` | El SDK de un proveedor, o `the_profe-server/` |
| `the_profe-app/components/**` | `lib`, otros componentes | Hacer fetch, o leer la base de datos |
| `the_profe-app/features/**` | `lib`, `components` | Un hex literal (el linter lo falla) |
| `the_profe-server/src/routes/**` | `gateway`, `budget`, `billing`, `db`, `envelope` | Un SDK de proveedor directamente |
| `the_profe-server/src/gateway/**`, `voice/**` | `db`, `env` | Importar `routes/` |
| `the_profe-server/src/billing/**`, `email/**` | `db`, `env` | Importar `routes/`, `gateway/` o `voice/` |
| `the_profe-server/src/db/**` | `env` | Importar `routes/`, `gateway/` o `voice/` |

| Cosa | Fuente única |
|---|---|
| Esquema de la base | `supabase/migrations/**` — sin ORM, sin panel; ver `.claude/rules/datos-postgres.md` |
| Entorno del backend | `the_profe-server/src/env.ts` — validado al importarse; nunca leas `process.env` fuera |
| Tokens de diseño | `the_profe-app/constants/theme.ts` (primitivos) y `the_profe-app/tailwind.config.js` (semánticos) |
| Precios de proveedor | `the_profe-server/src/gateway/pricing.ts` |
| Ruta de salida del backend | `the_profe-server/tsconfig.build.json` → `dist/server.js` |
| Sesión del cliente | `the_profe-app/lib/session.tsx` — un solo `useSession()` |
| Plan y derechos | tabla `entitlements`, resuelta por `the_profe-server/src/billing/entitlements.ts`. **La verdad de la suscripción vive en Stripe**; esto es una proyección |
| Versión de API de Stripe | `the_profe-server/src/billing/stripe.ts` — literal `2026-08-26.dahlia` |
| Colores de `web/` | `web/estilos.css`, con los hex de `the_profe-app/constants/theme.ts` y ningún otro |

## Reglas de código

1. **Un componente por archivo, máximo 150 líneas.** Una pantalla de `app/` que
   crece baja su lógica a `features/<dominio>/`.
2. **Cliente: alias `@/` → `the_profe-app/`, sin extensión.** Backend: imports relativos
   **con extensión `.ts` literal** — `node` resuelve especificadores literalmente y
   `tsconfig` los reescribe a `.js` al emitir. No mezcles las dos formas.
3. **Valida en el borde.** Toda ruta parsea su entrada con un esquema de zod antes
   de tocar lógica. Nada sin validar llega a `gateway/` ni a `db/`.
4. **Un solo sobre de respuesta:** `{ ok: true, data }` | `{ ok: false, error: { code, message, details } }`, con `code` del conjunto enumerado. Sin excepciones.
5. **Sin archivos barril.** Importa del módulo fuente.
6. **Sin hex ni píxeles crudos en componentes.** Sólo tokens y clases de utilidad.
7. **Enteros para dinero y tiempo.** Segundos en `integer`, coste en `bigint` de
   micro-euros. Nunca coma flotante.
8. **Ninguna dependencia nueva sin una razón en el mensaje del commit**, y en el
   cliente con `pnpm dlx expo install`, nunca `pnpm add`.

## Sistema de diseño

**La serif es el portugués. La sans es la app hablándote. Nunca se cruzan.**

| Rol | Claro | Oscuro |
|---|---|---|
| `bg` | `#FBF7F0` | `#1E1B17` |
| `surface` | `#FFFFFF` | `#2A2621` |
| `surface-raised` | `#F4EDE1` | `#3A342C` |
| `border` | `#E8DECD` | `#3A342C` |
| `text` | `#1F1B16` | `#F0EADF` |
| `text-muted` | `#6B6153` | `#A89C8B` |
| `primary` | `#2A5C8A` | `#8FB4D4` |
| `on-primary` | `#FFFFFF` | `#14120F` |
| `success` | `#5E7248` | `#8FA872` |
| `warn` | `#B07D2B` | `#D9A852` |
| `attention` | `#B5543A` | `#D98467` |
| `danger` | `#A32E38` | `#E0707A` |

- **Tipografía:** portugués `SourceSerif4` · interfaz `Inter` (numerales tabulares)
  · AFI `CharisSIL` — la única de las tres que cubre ɐ̃ ʃ ʎ ɲ ɨ ɾ.
- **Escala:** display 32/38 · title 24/30 · heading 20/26 · body-pt **17/26 serif**
  · body 15/22 · label 13/18 · caption 11/16 · ipa 13/18.
- **Espaciado (base 4):** 4 8 12 16 20 24 32 40 56 72. Nada arbitrario.
- **Radios:** 6 campos y chips · 12 tarjetas · 20 hojas · 999 pastillas.
- **Elevación:** en claro, sombra cálida `rgba(31,27,22,0.08)`. En oscuro, superficie
  más clara y **nada de sombra**.
- **Movimiento:** 150 ms estado · 250 ms entrada/salida · 400 ms hojas · curva
  `cubic-bezier(0.2, 0, 0, 1)`. Respeta «Reducir movimiento» cambiando de medio, no
  quitando la señal.
- **Bandas de puntuación:** oliva ≥80 · ámbar 60–79 · terracota <60, **siempre con
  etiqueta textual y forma distinta además del color**.

## Entorno

| Variable | Requerida desde | La lee |
|---|---|---|
| `PORT`, `TEST_DATABASE_URL` | paso 5 | `the_profe-server/src/env.ts` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | paso 5 | `the_profe-server/src/db/` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | paso 6 | `the_profe-server/src/gateway/anthropic.ts` |
| `VOICE_QUOTA_SECONDS_PER_PERIOD`, `COST_MICROS_CAP_PER_PERIOD` | paso 7 | `the_profe-server/src/budget/` |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_DOMAIN` | paso 12 | `the_profe-server/src/email/` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` | paso 13 | `the_profe-server/src/billing/` |
| `STRIPE_PORTAL_RETURN_URL`, `WEB_BASE_URL` | paso 14 | `the_profe-server/src/billing/` |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_TTS_VOICE` | paso 16 | `the_profe-server/src/voice/` |
| `GEMINI_API_KEY`, `GEMINI_LIVE_MODEL` | paso 19 | `the_profe-server/src/voice/gemini-live.ts` |
| `RATE_LIMIT_*` | paso 22 | `the_profe-server/src/http/rate-limit.ts` |
| `EXPO_PUBLIC_*` | según la tabla de `the_profe-app/.env.example` | el cliente |

`the_profe-server/.env.example` y `the_profe-app/.env.example` se commitean y se mantienen al día.
Los `.env` con valores reales, nunca. **Una variable es obligatoria sólo desde el
paso que la consume**, para que un paso nuevo no rompa el gate de un paso anterior.

## Reglas por área

| Archivo | Se aplica a |
|---|---|
| `.claude/rules/datos-postgres.md` | `supabase/**`, `the_profe-server/src/db/**`, `the_profe-server/tests/{sql,db}/**` |
| `.claude/rules/voz-y-coste.md` | `the_profe-server/src/{voice,gateway,budget,ws}/**`, `the_profe-app/features/voice/**` |
| `.claude/rules/cliente-expo.md` | `the_profe-app/**` |
| `.claude/rules/pagos-y-correo.md` | `the_profe-server/src/{billing,email}/**`, `web/**` |

## No negociable

1. **El audio va teléfono → backend → proveedor.** Nunca teléfono → proveedor, y
   nunca serverless en la ruta de audio.
2. **La cuota se reserva ANTES de abrir el micrófono.** Insuficiente → 402, sin fila
   de sesión. Cobrar después de que el proveedor responda es el error clásico.
3. **Barge-in para la reproducción Y trunca el historial a lo que se oyó.** Las dos
   cosas, o el modelo responde a una pregunta que nadie escuchó.
4. **`budget_ledger` es append-only.** Sin `UPDATE`, sin `DELETE`, nunca.
5. **El único CLI de Supabase que puede tocar este proyecto es el pinado**
   (`pnpm dlx supabase@2.118.0`, o el de `node_modules` del backend). El global de
   esta máquina es v1 y falla contra un proyecto v2 de una forma que se lee como
   esquema roto en vez de como herramienta equivocada.
6. **En el cliente, `pnpm dlx expo install`, nunca `pnpm add`** para nada con código
   nativo. Y nunca crees `ios/` ni `android/` en git.
7. **Nunca commitees secretos, `.env`, ni salida de compilación.** Nada de claves de
   proveedor en el cliente: el bundle de JS es legible.
8. **Nunca marques una tarea como hecha con un comando del gate en rojo**, y nunca
   edites un comando `Verify` para que pase.
9. **La app NUNCA menciona ni enlaza compra, pago, precio o suscripción.** Se
   vende sólo en `web/`. No es estética: es la regla de la App Store que permite
   cobrar fuera, y el `Verify` del paso 15 la comprueba con un `grep` sobre
   `the_profe-app/` que falla el gate.
10. **El webhook de Stripe lee el cuerpo CRUDO y se monta antes de cualquier
    middleware de JSON.** Si algo parsea antes, la firma no vuelve a validar
    nunca y el síntoma se lee como secreto mal copiado.
11. **Orden del middleware en toda ruta medida: auth → derecho → cuota →
    proveedor.** Reservar cuota a quien no tiene plan escribe en un ledger de
    sólo anexado una fila que habrá que liberar.
12. **`stripe_events.id` es clave primaria.** La idempotencia es estructural, no
    un `if`: Stripe reentrega eventos de rutina.

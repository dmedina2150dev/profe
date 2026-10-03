# Epic 04: Identidad, correo y cobro

> Al terminar este epic el producto cobra: hay correo transaccional desde el dominio propio con SPF, DKIM y DMARC publicados, Stripe Checkout en la web con un webhook idempotente que proyecta los derechos en local, un middleware que resuelve el derecho **antes** de reservar cuota, y una página de venta estática con sus páginas legales. La aplicación móvil no menciona el pago en ninguna parte, y eso es un gate, no una recomendación.

| | |
|---|---|
| **Epic id** | `04-identidad-cobro` |
| **Tareas** | `E4-T1` … `E4-T4` |
| **Depende de** | `01-fundamentos` (auth, esquema de suscripciones y derechos, borrado de cuenta), `02-columna-agente` (backend, sobre de respuesta, cuotas) |
| **Desbloquea** | `05-voz-afinar`, `07-endurecimiento-entrega` |
| **Paralelo con** | nada fuera del epic. Dentro, `E4-T3` y `E4-T4` sólo dependen de `E4-T2` y pueden ir en paralelo; `E4-T1` es independiente de las tres |

No necesitas ningún otro archivo para completar este epic. Todo lo de abajo está repetido aquí a propósito.

---

## Stack

Hono sobre Node 24 con `stripe` y `resend` · Supabase Auth con su SMTP apuntando a Resend · Postgres
en Supabase con RLS y **sin ORM** · `web/` en HTML y CSS planos desplegado en Cloudflare Pages ·
Expo SDK 57 en el cliente, que aquí sólo **lee** el estado del plan. Gestor de paquetes: `pnpm`. Node
pinado en `.nvmrc`.

| Paquete | Versión | Por qué esa |
|---|---|---|
| `stripe` | `22.6.2` | La 23.0.0 es un major publicado el 2026-10-01. Un major recién salido en la ruta de pago es riesgo sin recompensa: se adopta cuando haya parches y notas de migración leídas, no el tercer día. Verificado en el registro de npm el 2026-10-03 |
| `resend` | `6.32.0` | Verificado en el registro de npm el 2026-10-03 |

Las versiones de todo lo demás viven en los lockfiles — léelos, nunca adivines una. Las dos
dependencias de arriba se instalan con `pnpm --dir the_profe-server add stripe@22.6.2 resend@6.32.0` y la razón
va en el mensaje del commit, como exige la regla 8 de `CLAUDE.md`.

| Tarea | Comando |
|---|---|
| Dev backend | `pnpm --dir the_profe-server run dev` — http://127.0.0.1:8787 |
| Typecheck | `pnpm --dir the_profe-app run typecheck` · `pnpm --dir the_profe-server run typecheck` |
| Lint | `pnpm --dir the_profe-app run lint` · `pnpm --dir the_profe-server run lint` |
| Test backend (un archivo) | `pnpm --dir the_profe-server run test tests/<ruta>` |
| Test cliente (un archivo) | `pnpm --dir the_profe-app run test tests/<ruta>` |
| Validar entorno | `pnpm --dir the_profe-server run check:env` |
| Validar DNS de correo | `pnpm --dir the_profe-server run check:mail-dns` |
| Reset completo de la base | `pnpm --dir the_profe-server run db:local:reset` |
| Nueva migración | `pnpm --dir the_profe-server run db:migration:new <slug>` |

**Gate:** typecheck, lint y test de los dos paquetes pasan antes de marcar cualquier tarea de aquí
como hecha.

`check:mail-dns` no existe todavía como script en `the_profe-server/package.json`: lo añade `E4-T1`, apuntando a
`node scripts/check-mail-dns.ts`. Es la única entrada que este epic agrega al manifiesto, y se declara
aquí para que no parezca un hallazgo a mitad de la tarea.

Las cuatro tareas verifican contra un Postgres real; `pnpm --dir the_profe-server run db:local:reset` lo levanta
y reconstruye el esquema. **Ningún gate de este epic llama a la API de Stripe ni envía un correo real.**
La firma del webhook se genera en el propio test con el secreto de pruebas, y el envío de correo va
contra un doble. El único gate que sale a la red es `check:mail-dns`, que resuelve DNS: necesita
`MAIL_DOMAIN` relleno en `the_profe-server/.env` y los registros ya publicados en el proveedor de DNS del
dominio.

Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas a `the_profe-server/`. Igual con el
cliente y `the_profe-app/`.

## Variables de entorno que aparecen aquí

Regla vigente del proyecto: **una variable es obligatoria sólo desde el paso que la consume**, para que
un paso nuevo no rompa el gate de un paso anterior. `the_profe-server/src/env.ts` lo implementa por capas y
`the_profe-server/scripts/check-env.ts` elige la capa con `PROFE_STEP`.

| Variable | Obligatoria desde | La lee | Dónde se obtiene |
|---|---|---|---|
| `RESEND_API_KEY` | paso 12 | `the_profe-server/src/email/client.ts` | Panel de Resend → API Keys |
| `MAIL_FROM` | paso 12 | `the_profe-server/src/email/client.ts` | Decisión propia: `profe <hola@tu-dominio>` |
| `MAIL_DOMAIN` | paso 12 | `the_profe-server/scripts/check-mail-dns.ts` | El dominio remitente, sin protocolo |
| `STRIPE_SECRET_KEY` | paso 13 | `the_profe-server/src/billing/stripe.ts` | Panel de Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | paso 13 | `the_profe-server/src/billing/webhook.ts` | Panel de Stripe → Webhooks → el endpoint creado |
| `STRIPE_PRICE_MONTHLY` | paso 13 | `the_profe-server/src/billing/stripe.ts` | Panel de Stripe → Products → el precio mensual |
| `STRIPE_PRICE_YEARLY` | paso 13 | `the_profe-server/src/billing/stripe.ts` | Panel de Stripe → Products → el precio anual |
| `STRIPE_PORTAL_RETURN_URL` | paso 14 | `the_profe-server/src/routes/billing.ts` | Decisión propia: una URL absoluta de `web/` |
| `WEB_BASE_URL` | paso 15 | `the_profe-server/tests/web/enlaces.test.ts` | El origen público de Cloudflare Pages |

`the_profe-server/.env.example` recibe las nueve con un valor de ejemplo vacío y un comentario de una línea, y se
commitea. Los `.env` con valores reales, nunca.

## Subárbol de directorios

```
the_profe-server/
  src/
    email/
      client.ts        # Cliente de Resend, entorno validado al importarse, send() — NUEVO en E4-T1
      templates.ts     # Las cinco plantillas, HTML y texto plano — NUEVO en E4-T1
      log.ts           # Inserción en email_log con el destinatario en hash — NUEVO en E4-T1
    billing/
      stripe.ts        # Cliente con apiVersion literal y resolución de precios — NUEVO en E4-T2
      webhook.ts       # Verificación de firma sobre el cuerpo crudo e idempotencia — NUEVO en E4-T2
      entitlements.ts  # Proyección local de derechos; nunca llama a la API — NUEVO en E4-T2
      plan-guard.ts    # Middleware de derecho, antes de la reserva de cuota — NUEVO en E4-T3
    routes/billing.ts  # Checkout, webhook, portal y lectura de plan — NUEVO en E4-T2, ampliado en E4-T3
    envelope.ts        # ya existe (E2-T1) — se le añaden dos códigos enumerados
    app.ts             # ya existe (E2-T1) — se le monta el router de billing
    budget/            # ya existe (E2-T3) — solo lectura: reserve, settle, release
  scripts/
    check-mail-dns.ts  # Resuelve SPF, DKIM y DMARC; sale distinto de 0 nombrando el que falta — NUEVO en E4-T1
  tests/
    email/plantillas.test.ts        # NUEVO en E4-T1
    email/registro.test.ts          # NUEVO en E4-T1
    billing/firma.test.ts           # NUEVO en E4-T2
    billing/idempotencia.test.ts    # NUEVO en E4-T2
    billing/derechos.test.ts        # NUEVO en E4-T2
    billing/fixtures/eventos.json   # NUEVO en E4-T2
    billing/bloqueo-plan.test.ts    # NUEVO en E4-T3
    billing/portal.test.ts          # NUEVO en E4-T3
    web/tokens-web.test.ts          # NUEVO en E4-T4
    web/enlaces.test.ts             # NUEVO en E4-T4
    sql/rls-billing.test.ts         # ya existe (E1-T3) — solo lectura, se vuelve a ejecutar en E4-T3
supabase/
  migrations/          # Dos migraciones nuevas: email_log en E4-T1, stripe_events en E4-T2
the_profe-app/
  features/plan/use-plan.ts   # Lectura del plan; ni un enlace ni un texto de compra — NUEVO en E4-T3
  app/(tabs)/ajustes.tsx      # ya existe (E1-T2) — muestra el estado del plan en E4-T3
  tests/plan-sin-compra.test.ts  # NUEVO en E4-T3
  constants/theme.ts   # ya existe (E1-T1) — fuente de los hex que copia web/estilos.css
  lib/api.ts           # ya existe (E3-T2) — solo lectura: único punto de red del cliente
web/
  index.html           # Página de venta — NUEVO en E4-T4
  precios.html         # Los dos planes y lo que incluye cada uno — NUEVO en E4-T4
  privacidad.html      # Tratamiento de datos, voz incluida, subencargados y plazos — NUEVO en E4-T4
  terminos.html        # Condiciones del servicio — NUEVO en E4-T4
  borrado-de-datos.html  # Cómo se borra una cuenta y qué sobrevive — NUEVO en E4-T4
  estilos.css          # Variables CSS con los hex de theme.ts, y ningún otro — NUEVO en E4-T4
docs/
  correo-dns.md        # Los registros exactos a publicar y en qué orden — NUEVO en E4-T1
  despliegue-web.md    # Cloudflare Pages, directorio de salida, sin build — NUEVO en E4-T4
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar un
archivo que no está listado, para y reporta: significa que la frontera del epic está mal. Las dos
excepciones nombradas y acotadas son `the_profe-server/src/envelope.ts`, que recibe `PLAN_REQUIRED` y
`PLAN_LIMIT_REACHED` en su unión de códigos porque esa unión es la fuente única del conjunto
enumerado y no hay otro sitio donde ponerlos, y `the_profe-server/src/app.ts`, que monta el router de billing
porque es el único sitio del backend donde se monta un router.

## Modelo de datos que se toca aquí

`subscriptions` y `entitlements` las creó el paso 3 en la migración de suscripciones; este epic las
escribe desde el webhook y las lee desde el middleware. `email_log` y `stripe_events` son nuevas y
llegan en las migraciones de `E4-T1` y `E4-T2`.

| Entidad | Columnas y tipos | Notas |
|---|---|---|
| `subscriptions` | `profile_id uuid` clave primaria → `auth.users`, `stripe_customer_id text` único, `stripe_subscription_id text` único, `plan text check (plan in ('free','paid'))`, `billing_period text check (billing_period in ('monthly','yearly'))`, `status text check (status in ('trialing','active','past_due','canceled'))`, `current_period_end timestamptz`, `cancel_at_period_end boolean`, `updated_at timestamptz` | **Proyección, no verdad.** La verdad vive en Stripe. RLS: cada usuario ve su fila y cero filas de otro |
| `entitlements` | `profile_id uuid` clave primaria, `plan text`, `voice_seconds_per_day integer`, `source text check (source in ('stripe','grant'))`, `resolved_at timestamptz` — la fila que lee el middleware en la ruta caliente | Lo que el middleware consulta en caliente. `integer` para los segundos, nunca coma flotante. `source = 'grant'` existe para una cortesía manual sin pasar por Stripe |
| `stripe_events` | `id text` **clave primaria** —el id del evento de Stripe—, `type text`, `payload jsonb`, `received_at timestamptz default now()`, `applied_at timestamptz`. **Sin `profile_id`:** no lleva RLS y sólo la escribe la clave de servicio | La clave primaria **es** el mecanismo de idempotencia. Sin `profile_id`: no lleva RLS y sólo la escribe `service_role` |
| `email_log` | `id bigserial` clave primaria, `profile_id uuid` → `auth.users` `on delete cascade`, `kind text check (kind in ('confirm','reset','trial_end','canceled','deleted'))`, `to_hash text not null`, `provider_id text`, `status text check (status in ('sent','rejected'))`, `sent_at timestamptz default now()`, `error text` | **El destinatario va en hash, nunca en claro.** Un registro de envíos con direcciones legibles es una lista de correo de personas reales dentro de la base de producción |
| `audio_assets`, `traces`, `budget_ledger`, `budget_periods` | sólo lectura aquí | El middleware de plan lee el consumo del día; no escribe nada en ellas |

Los nombres de archivo de las dos migraciones los pone el CLI pinado:
`pnpm --dir the_profe-server run db:migration:new email_log` y `... db:migration:new stripe_events` crean
`supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql`. `tasks.json` las nombra por su slug
(`0004_email_log.sql`, `0005_stripe_events.sql`); el nombre real en disco es el que emita el CLI y
ningún comando `Verify` depende de él. **Nunca edites una migración ya aplicada: añade otra.**

## Contratos

**Consumidos** — ya existen, no los reconstruyas:

| De | Interfaz | Garantía |
|---|---|---|
| `01-fundamentos` | `the_profe-server/src/env.ts` → `loadEnv`, `describeEnv` | `loadEnv({ step })` valida por capas; una variable sólo es obligatoria desde su paso |
| `01-fundamentos` | `the_profe-server/src/db/pool.ts` → `withClient`, `withTransaction` | El único sitio que abre una conexión; `withTransaction` revierte entero si lanza |
| `01-fundamentos` | `supabase/migrations/**` | `subscriptions`, `entitlements` y sus políticas RLS ya existen desde el paso 3 |
| `01-fundamentos` | `the_profe-app/lib/session.tsx` → `useSession()` | `{ profileId, accessToken, signOut }`; un solo proveedor |
| `02-columna-agente` | `the_profe-server/src/envelope.ts` → `ok`, `fail`, `ErrorCode` | `QUOTA_EXCEEDED` mapea a 402; `VALIDATION_FAILED` a 422 |
| `02-columna-agente` | `the_profe-server/src/budget/reserve.ts` → `reserve`, `settle`, `release` | `reserve` devuelve `{ ok: false, code: "QUOTA_EXCEEDED" }` sin crear sesión |
| `03-curriculo-texto` | `the_profe-app/lib/api.ts` → `api` | Único punto de red del cliente; devuelve el sobre sin lanzar |
| `01-fundamentos` | `the_profe-app/constants/theme.ts` | Los primitivos de color; la fuente de los hex que copia `web/estilos.css` |

**Producidos** — los epics siguientes dependen de estas firmas exactas. Cambiar una lo rompe:

| Export | Firma | Lo usa |
|---|---|---|
| `the_profe-server/src/billing/stripe.ts` → `stripe`, `priceFor` | `stripe: Stripe` con `apiVersion` literal; `priceFor(p: "mensual" \| "anual") => string` | `E4-T3`, `E4-T4` |
| `the_profe-server/src/billing/entitlements.ts` → `resolveEntitlement` | `(c: PoolClient, userId: string) => Promise<{ plan: "free" \| "pago"; voiceSecondsPerDay: number; status: string }>` | `E4-T3`, `07` |
| `the_profe-server/src/billing/webhook.ts` → `handleStripeEvent` | `(raw: string, signature: string) => Promise<{ status: 200 \| 400; applied: boolean }>` | `E4-T4`, `07` |
| `the_profe-server/src/billing/plan-guard.ts` → `planGuard` | middleware de Hono que resuelve el derecho y responde 402 antes de tocar `reserve` | `05`, `06` |
| `the_profe-app/features/plan/use-plan.ts` → `usePlan` | `() => { plan: "free" \| "pago"; secondsLeftToday: number; loading: boolean }` | `05`, `06` |
| `web/estilos.css` | variables CSS cuyos valores son exactamente los hex de `theme.ts` | `E4-T4` y cualquier página futura |

## Planes y economía

Los números que el epic escribe en `precios.html`, en `entitlements` y en la política de retención.

| | Gratuito | Pago |
|---|---|---|
| Texto (leer, escribir, corrección, repaso) | completo | completo |
| Voz al día | **3 min** = `180` s | **15 min** = `900` s |
| Precio | 0 | **12,99 €/mes** o **89 €/año** |

- El plan gratuito da texto completo **y** voz limitada a propósito: la puntuación fonema a fonema es
  la magia del producto, y un gancho que no la deja sentir no engancha. Tres minutos bastan para una
  sesión de afinar y no para vivir en el plan gratis.
- Coste de voz mezclado ≈ **0,012 €/min**. Quince minutos al día son ≈450 min/mes ≈ **5,4 € de coste**.
  De 12,99 € quedan ≈**10,2 € netos** tras IVA y comisión de Stripe, así que el margen por suscriptor
  activo al límite es ≈**4,7 €**.
- Infraestructura fija ≈ **75 $/mes**, así que **≈15 suscriptores cubren la infraestructura**. Ése es el
  número que importa y el que decide si el proyecto sigue.
- **Stripe Tax activado** (0,5 % sobre el cobro). El IVA de servicios digitales se liquida por país del
  cliente a través de la ventanilla única, y hacerlo a mano siendo una sola persona no es viable: es
  medio punto de comisión a cambio de no equivocarse con la Agencia Tributaria de siete países.

## Convenios que muerden en esta zona

- **Se cobra sólo en la web, con Stripe. Ni RevenueCat ni compras in-app.** Un único sistema de cobro,
  un único sitio donde está la verdad del plan, y nada de reconciliar dos fuentes de suscripciones.
- **La app móvil no menciona el pago ni enlaza a él.** Es el patrón de Spotify y Netflix: un servicio
  multiplataforma puede vivir en la tienda sin compra integrada siempre que **no** haya botón de compra
  ni enlace externo al pago. Un botón o un enlace sin el permiso específico de Apple es rechazo en
  revisión, y una revisión perdida cuesta días. Por eso `E4-T4` tiene un `grep` sobre `the_profe-app/` como
  gate: es cumplimiento, no decoración.
- **`stripe@22.6.2`, no la 23.** La 23.0.0 salió el 2026-10-01. Un major de dos días en la ruta que
  mueve dinero no se adopta porque sea nuevo.
- **`apiVersion: "2026-08-26.dahlia"` escrito a mano en el código.** Es el valor por defecto de la
  22.6.2, verificado en `unpkg.com/stripe@22.6.2/cjs/apiVersion.js`. Se fija explícitamente para que
  actualizar el SDK no cambie el comportamiento de la API en silencio: el cambio de versión de API
  pasa a ser un commit visible en vez de un efecto secundario de `pnpm update`.
- **La firma del webhook se verifica contra el cuerpo CRUDO.** Si cualquier middleware parsea el JSON
  antes, la firma no valida nunca y el fallo se lee como «el secreto está mal». Es la trampa clásica de
  Stripe y se evita montando la ruta del webhook **antes** de cualquier middleware de cuerpo y leyendo
  el texto sin tocar.
- **La idempotencia es la clave primaria de `stripe_events`.** Stripe reentrega. Un evento aplicado dos
  veces duplica un periodo de suscripción o revierte una cancelación. `insert ... on conflict (id) do
  nothing returning id`: si no devuelve fila, es una reentrega y se responde 200 sin hacer nada.
- **La verdad de la suscripción vive en Stripe; `subscriptions` y `entitlements` son una proyección.**
  La ruta de lectura **nunca** llama a la API de Stripe: añadiría de 200 a 600 ms y un punto de fallo
  externo a cada pantalla de ajustes. El webhook es el único escritor de la proyección.
- **El derecho se resuelve ANTES de la reserva de cuota.** Orden del middleware:
  autenticación → derecho → cuota → proveedor. Y por eso este epic va completo **antes** del 05: la
  ruta de audio nace protegida en vez de recibir un `if` retroactivo cuando ya haya tres sitios que
  abren el micrófono.
- **SPF, DKIM y DMARC el primer día, y es irreversible.** Enviar antes de publicarlos deja el dominio
  marcado como spam, y la reputación de un dominio tarda **semanas** en recuperarse: no hay parche de
  código que lo arregle. `check-mail-dns.ts` existe para que el build no pueda avanzar sin ellos.
- **`email_log` guarda el destinatario en hash.** Saber «¿se envió el correo de borrado a esta
  dirección?» no requiere conservar la dirección: requiere poder compararla. `sha256` del correo en
  minúsculas y sin espacios al borde resuelve la consulta y no crea una lista de correo.
- **`web/` no tiene framework ni paso de compilación ni gestor de paquetes.** Cinco páginas estáticas y
  una hoja de estilos. Stripe Checkout es una redirección alojada, así que no hay nada que empaquetar;
  un tercer `package.json` en el repositorio traería un tercer lockfile, un tercer `node_modules` y un
  tercer sitio donde falla el build, a cambio de nada.
- **Los colores de `web/estilos.css` son literalmente los de `the_profe-app/constants/theme.ts`.** Hay un test
  que lo comprueba, porque una web que no se parece a la app es la primera grieta de confianza de un
  producto de suscripción.

Reglas completas del proyecto: `CLAUDE.md`. Reglas de zona: `.claude/rules/datos-postgres.md` y
`.claude/rules/cliente-expo.md`. Las dos están en la raíz del proyecto — el constructor las copió desde
`workspace/` del bundle antes de la tarea uno.

---

## Tareas

Listadas en el mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba
abajo y no reordenes por prioridad ni por lo que parezca rápido.

### `E4-T1` — Correo transaccional con dominio propio verificado

**Depende de:** `E1-T4`, `E2-T1` · **Prioridad:** p0 — metadato para recortes de alcance, no un orden de ejecución

El correo es la única vía por la que el producto habla con alguien que no tiene la app abierta:
confirmar la dirección, restablecer la contraseña, avisar de que la prueba acaba, confirmar la
cancelación, confirmar el borrado. Si cae en spam, el usuario no puede ni entrar. Y aquí está la parte
que no se puede arreglar después: **la reputación del dominio remitente se construye desde el primer
envío**. Mandar correo desde un dominio sin SPF, sin DKIM y sin DMARC publicados hace que Gmail y
Outlook lo clasifiquen como sospechoso, y una vez clasificado así el dominio tarda **semanas** en
recuperarse aunque publiques los registros al día siguiente. No es un problema de código: es un
problema de historial. Por eso el primer envío ocurre después del DNS, y el build lo comprueba.

**Diseño.** `email/client.ts` importa `loadEnv({ step: 12 })` y **aborta al importarse** si falta
`RESEND_API_KEY` o `MAIL_FROM`, nombrando la ausente. No existe la rama «si no hay clave, no envíes y
sigue»: un envío silencioso que nadie ve es peor que un arranque fallido que todo el mundo ve.
Expone una sola función:

```ts
send(p: { kind: EmailKind; to: string; vars: Record<string, string> }): Promise<{ providerId: string }>
```

El orden interno importa: renderiza la plantilla, llama a Resend, y **con el `provider_id` que Resend
devuelve** inserta la fila en `email_log` por `email/log.ts`, todo antes de devolver al llamante. Así
no hay correo enviado sin fila y la fila lleva el identificador con el que se puede rastrear en el
panel del proveedor.

`email/templates.ts` tiene las **cinco** plantillas, cada una con versión HTML **y** versión de texto
plano: `confirmacion`, `restablecimiento`, `fin-de-prueba`, `cancelacion`, `borrado`. El texto plano
no es cortesía: un correo sólo-HTML puntúa peor en los filtros de spam y algunos clientes lo muestran
vacío. Las dos primeras las envía **Supabase Auth**, no nuestro código, así que su HTML se pega además
en las plantillas de Auth del panel y el procedimiento queda escrito en `docs/correo-dns.md`; viven
igualmente en `templates.ts` porque el test de las cinco las renderiza y porque el día que el envío
pase a ser propio no hay que reescribirlas. **Ninguna de las cinco lleva un enlace de compra dirigido
a la aplicación móvil** — un correo es un canal fuera de la app y puede enlazar a la web, pero nunca
un «completa tu compra» que el usuario abra desde el móvil con la app instalada, porque eso es
exactamente el enlace que la regla de Apple prohíbe.

El SMTP de Supabase Auth apunta a Resend (`smtp.resend.com`, puerto 587, usuario `resend`, contraseña
= `RESEND_API_KEY`) para que confirmación y restablecimiento salgan del dominio propio. El remitente
por defecto de Supabase tiene límite de envíos bajo, va a su dominio y no es tuyo: cualquier producto
que cobre tiene que mandar desde su propio dominio.

`scripts/check-mail-dns.ts` resuelve con `node:dns/promises` sobre `MAIL_DOMAIN`: el `TXT` del dominio
buscando una política `v=spf1` que incluya el host que indica el panel de Resend, el registro del
selector DKIM que ese mismo panel entrega, y el `TXT` de `_dmarc.<MAIL_DOMAIN>` buscando `v=DMARC1`.
Imprime una línea por registro y **sale con 1 nombrando el primero que falta**. Los valores exactos
—el `include` del SPF y el selector del DKIM— los da el panel de Resend al verificar el dominio y se
copian a `docs/correo-dns.md`: no se adivinan.

**Qué NO hace esta tarea.** No manda nada de marketing ni gestiona bajas de boletín. No toca Stripe.
No escribe plantillas de factura: las facturas las emite y envía Stripe. No implementa reintentos
propios: Resend reintenta, y un reintento nuestro encima duplica correos.

**Trampas.** Enviar el primer correo antes de publicar el DNS, que es el daño que no se revierte.
Guardar el destinatario en claro «de momento». Degradar a no-op cuando falta la clave. Olvidar el
texto plano. Y dejar la confirmación de Auth saliendo del remitente de Supabase, que es el defecto que
nadie nota hasta que un usuario dice que no le llegó nada.

**Archivos**
- `the_profe-server/src/email/client.ts` — nuevo: entorno validado al importarse, `send`, un solo camino de envío
- `the_profe-server/src/email/templates.ts` — nuevo: las cinco plantillas con HTML y texto plano
- `the_profe-server/src/email/log.ts` — nuevo: inserción en `email_log` con `to_hash`
- `the_profe-server/scripts/check-mail-dns.ts` — nuevo: SPF, DKIM y DMARC; sale 1 nombrando el que falta
- `supabase/migrations/**` — nuevo: la migración que crea `email_log`, su `check` de `kind` y sus índices
- `the_profe-server/tests/email/plantillas.test.ts` — nuevo: las cinco, HTML y texto, sin enlace de compra al móvil
- `the_profe-server/tests/email/registro.test.ts` — nuevo: fila escrita con `provider_id`, destinatario en hash
- `docs/correo-dns.md` — nuevo: los registros exactos, en qué orden y de dónde salen

**Aceptación**

Copiados literalmente del array `acceptance` de esta tarea en `tasks.json`.

1. **CUANDO** se importa `the_profe-server/src/email/client.ts` sin `RESEND_API_KEY` o sin `MAIL_FROM` **EL SISTEMA DEBERÁ** abortar el arranque nombrando la variable ausente, y nunca degradar a un envío silencioso.
2. **CUANDO** se comprueban los registros DNS del dominio remitente **EL SISTEMA DEBERÁ** encontrar publicados SPF, DKIM y DMARC, y **CUANDO** falte cualquiera de los tres **EL SISTEMA DEBERÁ** salir con código distinto de 0 nombrando el que falta.
3. **CUANDO** se envía un correo transaccional **EL SISTEMA DEBERÁ** escribir una fila en `email_log` con `kind`, `provider_id` y el destinatario en forma de hash, antes de devolver al llamante.
4. **CUANDO** Supabase Auth envía confirmación de correo o restablecimiento de contraseña **EL SISTEMA DEBERÁ** entregarlos por el SMTP de Resend desde el dominio propio, y nunca desde el remitente por defecto de Supabase.
5. **CUANDO** se renderiza cualquiera de las cinco plantillas **EL SISTEMA DEBERÁ** producir una versión de texto plano además de la HTML, y ninguna **DEBERÁ** contener un enlace de compra dirigido a la aplicación móvil.
6. **CUANDO** `pnpm --dir the_profe-server run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Verify** — cada comando, en orden, desde la raíz del proyecto.

```bash
pnpm --dir the_profe-server run check:env
pnpm --dir the_profe-server run check:mail-dns
pnpm --dir the_profe-server run test tests/email/plantillas.test.ts
pnpm --dir the_profe-server run test tests/email/registro.test.ts
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

`check:env` sin `PROFE_STEP` valida la **capa base** del paso 5, no la del 12: es deliberado y es lo
que permite que esta tarea añada tres variables obligatorias sin romper el gate del paso 5. Para ver
la capa de correo, `PROFE_STEP=12 pnpm --dir the_profe-server run check:env`. El criterio 1 lo decide
`registro.test.ts` importando el módulo con la variable vaciada y esperando el error que la nombra. El
criterio 2 lo decide `check:mail-dns`, el único gate de este epic que sale a la red; si falla, **publica
el registro que nombra** y vuelve a ejecutarlo — no relajes la comprobación. El criterio 4 no se puede
decidir con un script: la configuración SMTP vive en el panel de Supabase, así que `docs/correo-dns.md`
lleva la lista de pasos y la confirmación queda en la lista de comprobación de lanzamiento.

**Checkpoint**

```bash
git add -A && git commit -m "E4-T1: correo transaccional con dominio propio verificado"
git tag step-12-correo-dominio
```

### `E4-T2` — Stripe Checkout, webhook idempotente y proyección de derechos

**Depende de:** `E1-T3`, `E2-T1` · **Prioridad:** p0

Ésta es la tarea donde entra el dinero, y es la única del proyecto donde un error silencioso tiene
coste directo: un webhook que se aplica dos veces le regala un mes a alguien o le quita una
cancelación; un webhook cuya firma no se verifica deja que cualquiera con la URL conceda plan de pago
con un `curl`. Las tres propiedades que la definen son: firma sobre el cuerpo crudo, idempotencia por
clave primaria, y proyección en la misma transacción.

**Diseño: el cliente.** `billing/stripe.ts` construye uno solo:

```ts
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" });
export function priceFor(plan: "mensual" | "anual"): string;
```

`apiVersion` literal, no leído de ninguna variable, porque es una decisión de código revisable en un
diff. `priceFor` devuelve `STRIPE_PRICE_MONTHLY` o `STRIPE_PRICE_YEARLY`: **el identificador de precio
nunca viaja desde el navegador**, porque un precio elegido por el cliente es un precio que el cliente
puede cambiar.

**Diseño: la ruta de alta.** `POST /api/v1/billing/checkout`, autenticada, con el cuerpo validado por
zod (`{ plan: "mensual" | "anual" }`) antes de tocar lógica. Crea la sesión con `mode: "subscription"`,
`line_items: [{ price: priceFor(plan), quantity: 1 }]`, `client_reference_id` con el id del usuario del
JWT —así el webhook sabe a quién pertenece el pago sin confiar en nada del navegador—,
`automatic_tax: { enabled: true }` y `billing_address_collection: "required"`, que es lo que Stripe Tax
necesita para determinar el país. Devuelve `{ ok: true, data: { url } }` y el navegador redirige.
`success_url` y `cancel_url` se construyen sobre el **origen** de `STRIPE_PORTAL_RETURN_URL`
(`new URL(env.STRIPE_PORTAL_RETURN_URL).origin`), nunca sobre nada que mande el cliente: una URL de
retorno recibida en el cuerpo es un redirector abierto. `WEB_BASE_URL` no se usa aquí a propósito —
es obligatoria desde el paso 15 y exigirla en el 13 rompería el gate del 13 en una máquina donde la
web aún no existe.

**Diseño: el webhook, y la trampa clásica.** `POST /api/v1/billing/webhook` se monta **antes** de
cualquier middleware que parsee cuerpos, y lee el cuerpo como texto sin tocar
(`const raw = await c.req.text()`). Si un `app.use()` de JSON lo parsea primero, la firma **nunca**
valida, el error que se ve es «firma inválida» y se pierde medio día cambiando el secreto, que estaba
bien. Con el crudo en mano:

```ts
const event = stripe.webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET);
```

Si lanza: **400 y cero filas en cualquier tabla**. La verificación ocurre antes de abrir la
transacción, no dentro, para que no haya nada que revertir.

**Diseño: idempotencia y proyección, en una transacción.** Con la firma válida, dentro de un único
`withTransaction`:

1. `insert into stripe_events (id, type, payload) values ($1,$2,$3) on conflict (id) do nothing
   returning id`. **Si no devuelve fila, es una reentrega**: commit, 200, `applied: false`, y ni una
   escritura más. Esto es lo que hace que el reintento de Stripe sea inofensivo.
2. `upsert` de `subscriptions` con plan, periodo de facturación, `stripe_customer_id`,
   `stripe_subscription_id`, `status`, `current_period_end` y `cancel_at_period_end`.
3. `upsert` de `entitlements` derivado del anterior: `status` en `trialing` o `active` → `plan = 'paid'`
   y `voice_seconds_per_day = 900`; cualquier otro → `plan = 'free'` y `180`.
4. `update stripe_events set applied_at = now() where id = $1`, y commit.

Los cuatro pasos en la misma transacción porque el estado intermedio —evento registrado, derechos sin
proyectar— es precisamente el estado en el que la reentrega ya no vuelve a intentarlo y el usuario se
queda pagando sin derecho.

**Eventos que se manejan**, y nada más:

| Evento | Qué hace |
|---|---|
| `checkout.session.completed` | Crea la fila de `subscriptions` con el `client_reference_id` como usuario y proyecta derechos |
| `customer.subscription.created` · `customer.subscription.updated` | Reescribe estado, periodo y `cancel_at_period_end`, y reproyecta |
| `customer.subscription.deleted` | Deja los derechos en plan gratuito y `status = 'canceled'`, **sin borrar la fila**: el historial de suscripción se conserva |
| `invoice.payment_failed` | Pasa `status` a `past_due` y reproyecta; Stripe ya avisa al cliente por su cuenta |

**Eventos que se ignoran a propósito**: `payment_intent.*`, `charge.*`, `invoice.created`,
`invoice.finalized`, `customer.created`. Se registran en `stripe_events` y se responden con 200 sin
proyectar, porque no contienen información de derecho que `customer.subscription.updated` no diga ya
mejor, y reaccionar a dos eventos que describen el mismo hecho es la forma más fácil de proyectar dos
veces. Un evento desconocido también responde 200: devolver error haría que Stripe reintentara para
siempre algo que nunca vamos a aplicar.

**El fixture.** `tests/billing/fixtures/eventos.json` lleva un payload por evento manejado, con **sólo
los campos que el código lee**. La firma no se copia de ninguna parte: cada test la calcula con
`stripe.webhooks.generateTestHeaderString({ payload, secret })` usando un secreto de pruebas local. Así
los tres tests corren sin red, sin claves reales y sin la CLI de Stripe instalada.

**Qué NO hace esta tarea.** No bloquea ninguna función por plan: eso es `E4-T3`. No construye interfaz
de cobro. No llama a la API de Stripe en ninguna ruta de lectura. No calcula prorrateos ni cambios de
plan a mano: eso lo hace el portal de cliente. No envía correos de factura.

**Trampas.** Parsear el JSON antes de verificar la firma. Confiar en el cuerpo para saber quién paga en
lugar de en `client_reference_id`. Proyectar fuera de la transacción del evento. Borrar la fila de
`subscriptions` al cancelar, que destruye el historial y con él la posibilidad de contestar «¿cuándo
canceló?». Y dejar `apiVersion` al valor por defecto del SDK, que convierte una actualización de
dependencia en un cambio de comportamiento de la API.

**Archivos**
- `the_profe-server/src/billing/stripe.ts` — nuevo: cliente con `apiVersion` literal, `priceFor`
- `the_profe-server/src/billing/webhook.ts` — nuevo: cuerpo crudo, firma, idempotencia, transacción única
- `the_profe-server/src/billing/entitlements.ts` — nuevo: proyección y `resolveEntitlement`, sin llamadas a Stripe
- `the_profe-server/src/routes/billing.ts` — nuevo: `checkout` y `webhook`, el webhook antes de todo parseo
- `supabase/migrations/**` — nuevo: la migración que crea `stripe_events` con el id del evento como clave primaria
- `the_profe-server/tests/billing/firma.test.ts` — nuevo: firma inválida → 400 y cero filas
- `the_profe-server/tests/billing/idempotencia.test.ts` — nuevo: doble entrega → una fila, estado idéntico
- `the_profe-server/tests/billing/derechos.test.ts` — nuevo: alta, cancelación, lectura sin tocar la API
- `the_profe-server/tests/billing/fixtures/eventos.json` — nuevo: un payload por evento manejado

**Aceptación**

1. **CUANDO** se inicializa el cliente de Stripe **EL SISTEMA DEBERÁ** fijar `apiVersion` en `2026-08-26.dahlia` de forma explícita en el código, y nunca depender del valor por defecto del SDK.
2. **CUANDO** llega un webhook cuya firma no valida contra `STRIPE_WEBHOOK_SECRET` **EL SISTEMA DEBERÁ** responder 400 y no escribir ninguna fila en ninguna tabla.
3. **CUANDO** el mismo evento de Stripe se entrega dos veces **EL SISTEMA DEBERÁ** aplicarlo una sola vez, dejando exactamente una fila en `stripe_events` y el estado de la suscripción idéntico tras la segunda entrega.
4. **CUANDO** se procesa `checkout.session.completed` **EL SISTEMA DEBERÁ** escribir plan, periodo y `stripe_customer_id` en `subscriptions`, y dejar `entitlements` resuelto para ese usuario en la misma transacción.
5. **CUANDO** se procesa `customer.subscription.deleted` **EL SISTEMA DEBERÁ** dejar los derechos del usuario en el plan gratuito sin borrar su historial de suscripción.
6. **CUANDO** se consulta el estado de suscripción de un usuario **EL SISTEMA DEBERÁ** leerlo de la proyección local y nunca llamar a la API de Stripe en la ruta de lectura.
7. **CUANDO** `pnpm --dir the_profe-server run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Verify**

```bash
grep -q '2026-08-26.dahlia' the_profe-server/src/billing/stripe.ts
pnpm --dir the_profe-server run test tests/billing/firma.test.ts
pnpm --dir the_profe-server run test tests/billing/idempotencia.test.ts
pnpm --dir the_profe-server run test tests/billing/derechos.test.ts
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

La primera línea es el criterio 1 y es un `grep` a propósito: la versión de API es un literal en el
código y la forma más directa de probar que está es buscarlo. Los tres tests necesitan la base local
en marcha; si `firma.test.ts` falla con un error de conexión y no de firma, ejecuta
`pnpm --dir the_profe-server run db:local:reset` y repite. El criterio 6 lo decide `derechos.test.ts` con un
doble del SDK que **cuenta las llamadas**: la lectura del plan tiene que registrar cero. El criterio 2
comprueba además las tablas: `stripe_events`, `subscriptions` y `entitlements` con cero filas nuevas
después del 400.

**Checkpoint**

```bash
git add -A && git commit -m "E4-T2: Stripe Checkout, webhook idempotente y proyección de derechos"
git tag step-13-stripe-webhook
```

### `E4-T3` — Portal de cliente y bloqueo de funciones medidas por plan

**Depende de:** `E4-T2`, `E2-T3` · **Prioridad:** p0

Aquí el derecho se convierte en comportamiento. Dos mitades: nadie abre un micrófono sin derecho, y
quien paga puede cancelar sin escribirle un correo al fundador — un flujo de cancelación manual es un
problema de atención al cliente y, en algunas jurisdicciones, un problema legal.

**Diseño: el orden del middleware, que es el corazón de la tarea.**

```
autenticación (JWT de Supabase)  →  planGuard (derecho)  →  reserve (cuota)  →  proveedor
```

Cada flecha tiene su razón y ninguna es intercambiable:

- **Autenticación primero** porque la identidad determina el plan, y porque un 401 no debe consumir
  nada.
- **Derecho antes que cuota** porque la reserva de cuota **escribe**: inserta una fila `hold` en
  `budget_ledger` y actualiza `voice_seconds_held`. Si el derecho se comprobara después, cada petición
  de un usuario sin plan dejaría una reserva que hay que liberar, y una liberación que hay que deshacer
  es una superficie de fallo que no tiene por qué existir. Comprobar primero el derecho hace que el
  402 por plan sea una respuesta **sin ninguna escritura**.
- **Cuota antes que proveedor** es la regla no negociable del proyecto: se reserva antes de abrir el
  micrófono, nunca después de que el proveedor responda.

`plan-guard.ts` exporta un middleware de Hono que resuelve el derecho con `resolveEntitlement` y
deja dos decisiones:

| Situación | Respuesta |
|---|---|
| Sin suscripción activa y la función pedida requiere plan | `402` con `code: "PLAN_REQUIRED"`, sin reservar cuota y sin fila de sesión |
| Con derecho, pero los segundos del día agotados | `402` con `code: "PLAN_LIMIT_REACHED"` y `details` |

El sobre del segundo caso es:

```json
{ "ok": false, "error": { "code": "PLAN_LIMIT_REACHED", "message": "...",
  "details": { "seconds_allowed_today": 180, "seconds_used_today": 180, "seconds_until_reset": 41231 } } }
```

Los tres valores son **enteros de segundos**, nunca minutos con coma. El día se corta a medianoche de
`Europe/Lisbon` —el producto es pt-PT y su público es ibérico, así que el reinicio cae de madrugada
para todos— y se calcula en SQL con `timezone('Europe/Lisbon', now())` en vez de en JavaScript, para
que no haya dos definiciones del día. El consumo del día sale de sumar los `settle` de
`budget_ledger` del perfil desde ese corte; el ledger ya es la fuente de verdad del gasto y no hace
falta un contador nuevo que pueda derivar.

`PLAN_REQUIRED` y `PLAN_LIMIT_REACHED` se añaden a la unión `ErrorCode` de `the_profe-server/src/envelope.ts`,
los dos mapeados a 402. Es la única edición de esta tarea fuera de sus archivos y es inevitable: esa
unión es la fuente única del conjunto enumerado de códigos.

**Diseño: el portal.** `POST /api/v1/billing/portal`, autenticada, llama a
`stripe.billingPortal.sessions.create({ customer, return_url: env.STRIPE_PORTAL_RETURN_URL })` y
devuelve `{ url }`. La URL es de un solo uso por construcción del proveedor: no la cacheamos ni la
guardamos. Si el usuario no tiene `stripe_customer_id`, no hay nada que gestionar y la respuesta es
`402` con `PLAN_REQUIRED`. **Sí se llama a la API de Stripe aquí**, y no contradice el convenio: la
prohibición es sobre la ruta de **lectura** del estado del plan; crear una sesión de portal es una
escritura que el usuario pidió explícitamente.

**Diseño: el cliente, que es donde está el riesgo de tienda.** `the_profe-app/features/plan/use-plan.ts`
expone `usePlan()`, que lee `GET /api/v1/billing/plan` a través de `the_profe-app/lib/api.ts` —único punto de
red del cliente— y devuelve plan y segundos restantes hoy. `ajustes.tsx` muestra **sólo estado**: el
nombre del plan y los minutos de voz que quedan hoy. Cuando el límite se agota, el mensaje es «Has
usado tus minutos de voz de hoy» y nada más: ni un enlace, ni un botón, ni una frase que diga dónde
mejorar el plan. No es timidez, es el requisito: un enlace al pago desde la app sin el permiso
específico de Apple es rechazo en revisión. Como consecuencia práctica, ningún archivo bajo
`the_profe-app/app`, `the_profe-app/components` o `the_profe-app/features` puede contener las cadenas que el `grep` de
`E4-T4` busca —`stripe`, `checkout`, `suscríbete`, `comprar`, `precio`, `€`—, así que la ruta se llama
`/api/v1/billing/plan` y los importes no se formatean nunca en la app.

**Diseño: RLS en los dos sentidos.** `tests/sql/rls-billing.test.ts` llegó en el paso 3 y aquí se
vuelve a ejecutar como gate de regresión: el dueño ve su fila de `subscriptions` y de `entitlements`, y
otro usuario autenticado ve **cero filas**, no un error. Una política sin el test negativo no está
probada.

**Qué NO hace esta tarea.** No crea interfaz de compra en ningún sitio. No implementa lógica de prueba
gratuita propia: `trialing` viene de Stripe. No calcula prorrateos. No guarda contadores en memoria —
el límite diario se calcula del ledger, que es la base de datos. Y no cambia nada de la ruta de audio:
`05` montará `planGuard` delante de la suya cuando exista.

**Trampas.** Resolver el derecho después de reservar, que deja reservas que liberar. Definir el día en
JavaScript y en SQL a la vez. Devolver minutos con coma en `details`. Llamar a la API de Stripe para
pintar la pantalla de ajustes. Y escribir en el cliente, aunque sea en un comentario, una de las
palabras que el gate de cumplimiento busca.

**Archivos**
- `the_profe-server/src/billing/plan-guard.ts` — nuevo: middleware de derecho, 402 sin escribir, `details` en enteros
- `the_profe-server/src/routes/billing.ts` — ampliado: `portal` y la lectura de plan
- `the_profe-app/features/plan/use-plan.ts` — nuevo: `usePlan()` por `lib/api.ts`, sin una sola palabra de compra
- `the_profe-app/app/(tabs)/ajustes.tsx` — ampliado: estado del plan y minutos restantes, y nada más
- `the_profe-server/tests/billing/bloqueo-plan.test.ts` — nuevo: 402 por plan y por límite, sin fila de sesión
- `the_profe-server/tests/billing/portal.test.ts` — nuevo: URL devuelta, y 402 sin `stripe_customer_id`
- `the_profe-app/tests/plan-sin-compra.test.ts` — nuevo: búsqueda estática de cualquier mención de compra

**Aceptación**

1. **CUANDO** un usuario sin suscripción activa solicita abrir una sesión de voz **EL SISTEMA DEBERÁ** responder 402 con `code: "PLAN_REQUIRED"`, sin reservar cuota y sin crear fila de sesión.
2. **CUANDO** un usuario del plan gratuito ha consumido sus 3 minutos de voz del día **EL SISTEMA DEBERÁ** responder 402 con `code: "PLAN_LIMIT_REACHED"` e indicar en `details` los segundos restantes hasta el reinicio.
3. **CUANDO** el middleware de derechos resuelve un plan **EL SISTEMA DEBERÁ** hacerlo antes de la reserva de cuota, de modo que ninguna llamada a proveedor ocurra para un usuario sin derecho.
4. **CUANDO** un suscriptor activo solicita el portal **EL SISTEMA DEBERÁ** devolver una URL de Stripe Customer Portal de un solo uso, y **CUANDO** la solicita un usuario sin `stripe_customer_id` **EL SISTEMA DEBERÁ** responder 402 con `code: "PLAN_REQUIRED"`.
5. **CUANDO** un usuario autenticado consulta la suscripción de otro usuario **EL SISTEMA DEBERÁ** devolver 0 filas, y la prueba **DEBERÁ** comprobarlo en ambos sentidos.
6. **CUANDO** la aplicación móvil muestra el estado del plan **EL SISTEMA DEBERÁ** leerlo del backend y no **DEBERÁ** incluir ningún enlace, botón ni texto de compra.
7. **CUANDO** `pnpm --dir the_profe-server run test` se ejecuta **EL SISTEMA DEBERÁ** salir con 0, 0 fallos y 0 omitidos.

**Verify**

```bash
pnpm --dir the_profe-server run test tests/billing/bloqueo-plan.test.ts
pnpm --dir the_profe-server run test tests/billing/portal.test.ts
pnpm --dir the_profe-server run test tests/sql/rls-billing.test.ts
pnpm --dir the_profe-app run test tests/plan-sin-compra.test.ts
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-server run lint
pnpm --dir the_profe-app run lint
```

El criterio 3 lo decide `bloqueo-plan.test.ts` comprobando el **efecto** y no el orden del código:
tras el 402 por plan, `budget_ledger` y `voice_sessions` tienen cero filas nuevas y el doble del
proveedor registra cero llamadas. Un test que leyera el orden de los `app.use()` probaría la forma del
código y no su comportamiento. El criterio 6 lo decide `plan-sin-compra.test.ts` con una **búsqueda
estática** sobre `the_profe-app/`, que es el medio correcto para decidir qué contiene un archivo: un test en
tiempo de ejecución no vería un texto que sólo aparece en una rama no renderizada. La tercera línea
re-ejecuta el test de RLS del paso 3 a propósito, porque esta tarea es la primera que lee esas tablas
en caliente.

**Checkpoint**

```bash
git add -A && git commit -m "E4-T3: portal de cliente y bloqueo de funciones medidas por plan"
git tag step-14-portal-bloqueo-plan
```

### `E4-T4` — Página de venta estática y páginas legales

**Depende de:** `E4-T2` · **Prioridad:** p1

La web es el único sitio donde se vende, así que es la única pieza del producto que **tiene** que
existir para que entre un euro. Son cinco páginas de HTML y una hoja de estilos: sin framework, sin
paso de compilación y sin un tercer gestor de paquetes en el repositorio. Stripe Checkout es una
redirección alojada, así que no hay nada que empaquetar; y Cloudflare Pages sirve un directorio
estático gratis, con el `web/` del repositorio como directorio de salida y ningún comando de build.
Lo que haría grande esta tarea no es el HTML: es que las páginas legales digan la verdad.

**Las cinco páginas.**

| Archivo | Qué lleva |
|---|---|
| `index.html` | Qué es profe, para quién —hispanohablantes que aprenden portugués europeo—, la puntuación fonema a fonema como el argumento central, y el botón de suscripción. Pie con los tres enlaces legales |
| `precios.html` | Los dos planes con lo que incluye cada uno: gratuito con texto completo y 3 min de voz al día; pago a 12,99 €/mes o 89 €/año con 15 min de voz al día. El IVA se indica como calculado en el pago según el país |
| `privacidad.html` | El tratamiento de datos completo, voz incluida. Ver abajo |
| `terminos.html` | Condiciones del servicio, facturación recurrente, cancelación en cualquier momento efectiva al final del periodo, y qué es el servicio y qué no (no es una certificación de idioma) |
| `borrado-de-datos.html` | Cómo se borra una cuenta, qué se borra, qué sobrevive disociado y por qué. Es requisito de las dos tiendas tener esta página en una URL pública |

**La política de privacidad declara que se procesa voz.** Es el punto que no se puede dejar genérico,
porque es el dato más sensible que el producto toca y porque las dos tiendas lo revisan. Tiene que
decir, explícitamente: que la grabación de voz se envía al backend y de ahí a proveedores externos;
**quiénes son los subencargados** —Microsoft Azure Speech para reconocimiento, evaluación de
pronunciación y síntesis; Google para Gemini Live en la conversación; Anthropic para la corrección de
texto; Supabase para datos y almacenamiento de audio; Resend para correo; Stripe para el pago;
Railway para el alojamiento del backend; Cloudflare para esta web—; y **cuánto se conserva cada
cosa**, con el audio de pronunciación en el plazo más corto de todos. Los plazos son los mismos que
`docs/retencion.md` fija en el paso 23, y son: audio de pronunciación **30 días**, transcripciones de
turnos **180 días**, `email_log` **12 meses**, y `traces` y `budget_ledger` **6 años** ya disociados,
por la obligación de conservación contable. Si cambias uno, cambia el otro documento en el mismo
commit: dos plazos distintos para el mismo dato es peor que no publicar ninguno.

**El botón de suscripción no construye la URL de pago.** Hace `fetch` a
`POST /api/v1/billing/checkout` con el plan elegido y redirige a la `url` que devuelve el backend. La
alternativa —un enlace a `buy.stripe.com` con el identificador de precio dentro— pone el precio en
manos del visitante y pierde el `client_reference_id` que el webhook necesita para saber quién pagó.
`enlaces.test.ts` comprueba que en `web/` no aparece ni `buy.stripe.com` ni ningún literal `price_`.

**Los colores salen de `theme.ts`, y hay un test.** `estilos.css` declara variables CSS
(`--bg`, `--surface`, `--text`, `--primary`, …) con los hex **literales** del tema claro de
`the_profe-app/constants/theme.ts`. `tokens-web.test.ts` extrae todos los `#rrggbb` de `estilos.css` y
comprueba que cada uno está en el conjunto declarado en `theme.ts`. Lee `theme.ts` **como texto, con
una expresión regular**, y no lo importa: importar un módulo del cliente dentro del runner del backend
arrastra la resolución de React Native y NativeWind y falla en el `import`, no en la aserción. Es el
medio correcto para una comprobación sobre el contenido de un archivo.

**El `grep` final es un gate de cumplimiento de Apple.** Busca, sin distinguir mayúsculas, las cadenas
`stripe`, `checkout`, `suscríbete`, `comprar`, `precio` y `€` en `the_profe-app/app`, `the_profe-app/components` y
`the_profe-app/features`, y la tarea está hecha cuando **no aparece ninguna**. No es decorativo: ése es
exactamente el material que hace que una revisión de App Store se caiga, y una revisión perdida son
días. Antes de confiar en esa línea, confirma que los tres directorios existen —lo hacen desde `E1-T2`
y `E3-T2`—, porque un `grep` sobre un directorio inexistente termina por error de uso y la negación lo
convertiría en un verde que no significa nada.

**Qué NO hace esta tarea.** No despliega: `docs/despliegue-web.md` explica cómo conectar Cloudflare
Pages al repositorio con `web/` como directorio de salida y sin comando de build, y el despliegue
real lo hace una persona. No añade analítica ni un gestor de consentimiento —no hay cookies de
terceros en estas cinco páginas, y mantenerlo así es lo que permite no tener banner—. No construye un
panel de cuenta en la web: eso es el portal de Stripe. No traduce la web al portugués: el público es
hispanohablante.

**Trampas.** Meter un `package.json` en `web/` «para un minificador». Copiar un hex a mano y que quede
a un dígito del token. Enlazar a Stripe directamente. Dejar la política de privacidad sin mencionar la
voz, que es justo el dato que el revisor va a buscar. Y escribir plazos de retención distintos a los
de `docs/retencion.md`.

**Archivos**
- `web/index.html` — nuevo: venta, botón de suscripción contra el backend, pie con los tres enlaces legales
- `web/precios.html` — nuevo: los dos planes, con los límites de voz y los importes
- `web/privacidad.html` — nuevo: tratamiento de datos, voz, subencargados y plazos
- `web/terminos.html` — nuevo: condiciones, facturación recurrente y cancelación
- `web/borrado-de-datos.html` — nuevo: qué se borra, qué sobrevive disociado y por qué
- `web/estilos.css` — nuevo: variables CSS con los hex de `theme.ts`, y ningún otro
- `the_profe-server/tests/web/tokens-web.test.ts` — nuevo: todo hex de la hoja está en el tema; lectura por texto
- `the_profe-server/tests/web/enlaces.test.ts` — nuevo: pie completo, sin URL de pago ni `price_`, botón contra el backend
- `docs/despliegue-web.md` — nuevo: Cloudflare Pages, directorio de salida, sin build

**Aceptación**

1. **CUANDO** se sirve `web/` **EL SISTEMA DEBERÁ** hacerlo como HTML y CSS estáticos sin paso de compilación, sin framework y sin un tercer gestor de paquetes en el repositorio.
2. **CUANDO** se inspeccionan los colores de `web/estilos.css` **EL SISTEMA DEBERÁ** encontrar únicamente los valores hexadecimales declarados en `the_profe-app/constants/theme.ts`, y ningún otro.
3. **CUANDO** el visitante pulsa el botón de suscripción **EL SISTEMA DEBERÁ** redirigirlo a una sesión de Stripe Checkout creada por el backend, y nunca construir la URL de pago en el navegador.
4. **CUANDO** se publican las páginas legales **EL SISTEMA DEBERÁ** servir privacidad, términos y política de borrado de datos, cada una enlazada desde el pie de la página de venta.
5. **CUANDO** se registra el tratamiento de datos **EL SISTEMA DEBERÁ** declarar en la política de privacidad que se procesa voz, con qué subencargados y durante cuánto tiempo se conserva.
6. **CUANDO** se analiza el código del cliente móvil **EL SISTEMA DEBERÁ** no contener ninguna mención ni enlace de compra, pago, precio o suscripción, porque la venta ocurre sólo en la web.

**Verify**

```bash
test -f web/index.html && test -f web/precios.html && test -f web/privacidad.html && test -f web/terminos.html && test -f web/borrado-de-datos.html
test ! -f web/package.json
pnpm --dir the_profe-server run test tests/web/tokens-web.test.ts
pnpm --dir the_profe-server run test tests/web/enlaces.test.ts
test -d the_profe-app/app && test -d the_profe-app/components && test -d the_profe-app/features
test -z "$(grep -rniE 'stripe|checkout|suscríbete|comprar|precio|€' the_profe-app/app the_profe-app/components the_profe-app/features || true)"
```

La segunda línea es la mitad verificable del criterio 1: la otra mitad —que no hay paso de
compilación— la decide `docs/despliegue-web.md`, donde el comando de build está declarado vacío. El
criterio 5 lo decide `enlaces.test.ts`, que busca en `privacidad.html` la mención de la voz, el nombre
de cada subencargado y un plazo de conservación por tipo de dato; es una comprobación de contenido,
hecha sobre el texto del archivo, que es el medio donde ese contenido existe. La última línea sale 0
cuando no hay ninguna coincidencia, que es el caso correcto. Este bloque no incluye typecheck ni lint,
pero el **gate del epic sí**: los seis comandos de los dos paquetes pasan antes de marcar la tarea.

**Checkpoint**

```bash
git add -A && git commit -m "E4-T4: página de venta estática y páginas legales"
git tag step-15-web-venta-legales
```

---

## Aceptación del epic

El epic está hecho cuando las cuatro tareas están `done` **y**:

1. **CUANDO** un visitante se suscribe desde la web y el webhook de alta se entrega **EL SISTEMA DEBERÁ** dejar una fila en `subscriptions` con su `stripe_customer_id`, `entitlements` con 900 segundos de voz al día, y el mismo evento reentregado **DEBERÁ** no cambiar nada.
2. **CUANDO** un usuario del plan gratuito que ya gastó sus 180 segundos del día pide una sesión de voz **EL SISTEMA DEBERÁ** responder 402 con `PLAN_LIMIT_REACHED`, sin escribir en `budget_ledger` ni en `voice_sessions`, y sin llamar a ningún proveedor.
3. **CUANDO** se analiza el código del cliente móvil **EL SISTEMA DEBERÁ** no contener ninguna mención de compra, pago, precio ni suscripción, y **CUANDO** se consulta `web/privacidad.html` **DEBERÁ** encontrarse declarado el tratamiento de voz con sus subencargados y plazos.

```bash
pnpm --dir the_profe-server run check:mail-dns
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run typecheck && pnpm --dir the_profe-server run lint && pnpm --dir the_profe-server run test
pnpm --dir the_profe-app run typecheck && pnpm --dir the_profe-app run lint && pnpm --dir the_profe-app run test
test -d the_profe-app/app && test -d the_profe-app/components && test -d the_profe-app/features
test -z "$(grep -rniE 'stripe|checkout|suscríbete|comprar|precio|€' the_profe-app/app the_profe-app/components the_profe-app/features || true)"
```

Desde la raíz del proyecto. Los tres criterios los deciden estos comandos: el primero y el segundo por
`tests/billing/idempotencia.test.ts`, `derechos.test.ts` y `bloqueo-plan.test.ts` dentro de la suite
del backend; el tercero por `tests/web/enlaces.test.ts` y por la última línea.

## Trampas

- **Parsear el cuerpo del webhook antes de verificar la firma.** La firma no valida nunca y el error
  apunta al secreto, que está bien. Es el fallo más caro de este epic en horas perdidas.
- **Confiar en el cuerpo de la petición para saber qué usuario paga.** La identidad sale del JWT al
  crear la sesión y de `client_reference_id` al recibir el evento. Nunca del navegador.
- **Aplicar un evento sin pasar por `stripe_events`.** Stripe reentrega por diseño. Sin la clave
  primaria como guarda, una reentrega regala un periodo o revierte una cancelación.
- **Proyectar los derechos fuera de la transacción del evento.** El estado intermedio —evento
  registrado, derechos sin proyectar— es el único del que la reentrega ya no te rescata.
- **Llamar a la API de Stripe en la ruta de lectura del plan.** Añade latencia y un fallo externo a
  cada pantalla de ajustes, y convierte una caída de Stripe en una app que no abre.
- **Comprobar el derecho después de reservar la cuota.** Deja reservas de usuarios sin plan que hay
  que liberar, y una liberación que hay que deshacer es un defecto que no tenía por qué existir.
- **Un botón, un enlace o una frase de compra en la app.** Es rechazo en revisión de App Store sin el
  permiso específico de Apple. El `grep` de `E4-T4` existe por esto y no se relaja.
- **Enviar el primer correo antes de publicar SPF, DKIM y DMARC.** La reputación del dominio tarda
  semanas en recuperarse y ningún commit lo arregla.
- **Guardar el destinatario en claro en `email_log`.** Convierte una tabla operativa en una lista de
  direcciones de personas reales dentro de la base de producción.
- **Dejar `apiVersion` al valor por defecto del SDK.** Una actualización de dependencia se convierte en
  un cambio de comportamiento de la API que nadie decidió.
- **Pinar `stripe@23`.** Un major de dos días en la ruta del dinero.
- **Un `package.json` en `web/`.** Un tercer lockfile, un tercer `node_modules` y un tercer sitio donde
  falla el build, a cambio de minificar cinco páginas estáticas.
- **Plazos de retención distintos en `web/privacidad.html` y en `docs/retencion.md`.** Publicar dos
  verdades sobre el mismo dato es peor que no publicar ninguna.

## Antes de seguir

- [ ] Las cuatro tareas están `done` en `tasks.json` — ninguna quedó `in_progress`.
- [ ] Todos los comandos `verify` de cada tarea pasaron, no sólo el primero.
- [ ] Ningún comando `verify` se editó, y ninguno se saltó porque un archivo que nombra no existiera.
- [ ] Las cuatro tareas tienen su etiqueta de checkpoint en git: `git tag -l 'step-1[2345]-*'` lista cuatro.
- [ ] El comando del gate pasa limpio, ejecutado desde la raíz del proyecto.
- [ ] Cada contrato de «Producidos» existe con la firma indicada.
- [ ] Los gates de los epics 01, 02 y 03 siguen en verde — en particular, `check:env` sin `PROFE_STEP`
      sigue saliendo 0 sin las nueve variables nuevas.
- [ ] `the_profe-server/.env.example` recoge las nueve variables nuevas con valor vacío y un comentario.
- [ ] `the_profe-server/package.json` tiene la entrada `check:mail-dns`, y `stripe@22.6.2` y `resend@6.32.0`
      están en `dependencies` con la razón en el mensaje del commit.
- [ ] SPF, DKIM y DMARC están publicados y `check:mail-dns` sale 0 nombrando los tres.
- [ ] El SMTP de Supabase Auth apunta a Resend y la confirmación de correo llega desde el dominio
      propio, no desde el remitente de Supabase.
- [ ] Los plazos de retención de `web/privacidad.html` son los mismos que fijará `docs/retencion.md`.
- [ ] No se modificó ningún archivo fuera del subárbol, salvo las dos excepciones declaradas:
      `the_profe-server/src/envelope.ts` (dos códigos) y `the_profe-server/src/app.ts` (montar el router de billing).
- [ ] Un commit por tarea, cada uno con su id de prefijo y seguido de su etiqueta.

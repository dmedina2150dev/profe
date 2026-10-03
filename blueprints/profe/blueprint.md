# profe — Blueprint

> Tutor de portugués **europeo** (pt-PT) para hispanohablantes, por suscripción. Enseña a hablar, escribir y
> leer desde cero, puntúa la pronunciación fonema a fonema y decide el siguiente ejercicio según los
> errores reales acumulados.

| | |
|---|---|
| **Slug** | `profe` |
| **Forma** | `agent-app` (primaria) + `mobile-app` (secundaria) |
| **Tracks** | `mobile-native` (cliente) + `ts-node` (backend) |
| **Modo de emisión** | Bundle — 24 pasos, 7 epics |
| **Pasos** | 18 · **Epics** 6 · **Tareas** 18 |
| **Generado** | 2026-09-30 |
| **Pins verificados** | 2026-09-30 contra registros en vivo. Ver §11 |

**Cómo se usa este bundle.** `blueprint.md` es el documento de diseño: el porqué de cada decisión.
`tasks.json` es el grafo de tareas que `/architect-next` lee. `epics/*.md` son autocontenidos: cada
uno trae repetido todo lo que su epic necesita, para que se pueda construir sin abrir este archivo.
`workspace/` se copia **entero** a la raíz del proyecto antes del primer comando.

**Orden de lectura para construir:** copia `workspace/`, ejecuta §10 Bootstrap, y a partir de ahí
trabaja desde `epics/`. Este archivo se consulta cuando hace falta saber *por qué*.

---

## 1. Project Overview & Non-Goals

### Vision

Un tutor de **portugués europeo para hispanohablantes**, vendido por suscripción. El producto es el
**bucle del agente**: escucha, puntúa la pronunciación fonema a fonema, decide qué toca según los
errores acumulados, y conversa. Si se sustituye el modelo por respuestas grabadas no queda producto —
por eso es un `agent-app` y no una app con IA añadida.

El acento objetivo es **portugués de Portugal, no de Brasil**, y esa distinción gobierna cada
elección de proveedor de voz. Es también la razón por la que se descartan opciones más baratas o más
cómodas: un tutor que entiende tu acento español y sigue la conversación amablemente es lo peor que
puede pasar, porque fosiliza el error.

**pt-PT es el único curso de la v1, y es el foso.** Es un nicho desatendido donde se compite con
Practice Portuguese y poco más. pt-BR es un mercado mucho mayor donde se compite con Duolingo,
Babbel, Speak y Pimsleur siendo uno de cincuenta. El esquema nace consciente de la variante para que
añadir pt-BR el día que la demanda lo justifique sea una migración de datos y no una reescritura —
pero **no se construye el segundo curso ni el selector que llevaría a él**.

### Users

| Usuario | Quién es | Qué necesita |
|---|---|---|
| **Visitante** | Llega a `web/` desde una comunidad de aprendices o de expatriados | Entender en diez segundos que esto es pt-PT y no pt-BR, y probarlo sin pagar |
| **Usuario gratuito** | Hispanohablante, A0 con comprensión pasiva por cercanía al español | Texto completo y **3 min/día de voz** — suficiente para sentir la puntuación fonémica, que es la magia |
| **Suscriptor** | El gratuito que decidió que esto le sirve | **15 min/día de voz**, progreso propio, y poder cancelar sin escribir a nadie |
| **Operador** | El fundador, una persona | Ver coste por usuario y margen sin abrir un panel que no existe: SQL sobre `traces` |

**Consecuencia pedagógica que atraviesa todo el currículo:** para un hispanohablante el problema no
es el vocabulario, es la **fonética y los falsos amigos**. Vocales nasales (ã, õ), la *s* final que
suena /ʃ/, las vocales reducidas que se eliden, *lh* /ʎ/, *nh* /ɲ/, y la /ɨ/ que el español no tiene.
El temario se organiza alrededor de eso, no alrededor de listas de palabras. Un angloparlante
tendría el problema inverso —*«estou a falar»* le cuesta y la /ɨ/ no— y por eso el alumno objetivo
es una decisión de producto, no un detalle de traducción.

### Goals — v1 scope

1. Temario **A1→A2 estructurado**, sembrado como datos versionados y revisables, **con variante
   explícita en cada fila de contenido**.
2. **Leer** — textos graduados con glosa y audio de referencia.
3. **Escribir** — producción corregida por el modelo, con el error registrado, no sólo señalado.
4. **Afinar** — voz por turnos con puntuación fonémica de Azure y medidor por sílaba.
5. **Conversar** — voz en tiempo real en pt-PT, interrumpible.
6. **Repetición espaciada** sobre los errores reales de cada usuario, no sobre un mazo genérico.
7. **Cuentas con RLS** y borrado de cuenta real desde dentro de la app.
8. **Cuota de voz reservada antes de abrir el micrófono**, con el límite derivado del plan.
9. **Suscripción cobrada por web con Stripe**, con proyección local de derechos alimentada por
   webhook idempotente.
10. **Correo transaccional desde dominio propio** con SPF, DKIM y DMARC publicados.
11. **Página de venta y páginas legales** estáticas, incluida la declaración de tratamiento de voz.

### Non-Goals — explicitly out of scope for v1

Cada uno con su razón y cuándo vuelve. Esta lista es la mitad valiosa del alcance.

| Fuera de v1 | Por qué | Cuándo vuelve |
|---|---|---|
| **Puntuación de prosodia y entonación** | Azure sólo puntúa prosodia y contenido en `en-US`. Verificado el 2026-10-03 en su tabla de locales: pt-PT y pt-BR están entre los 33 soportados para evaluación, pero la prosodia no. Es la limitación real de este diseño, **el ritmo es justo lo que más delata a un hispanohablante**, y no se disimula | Si Azure amplía locales. Mitigación parcial en §20.2 R1 |
| **Contenido pt-BR** | **El esquema sí lo contempla; el curso no existe.** No es una bandera: *comboio/trem*, *telemóvel/celular*, *estou a falar / estou falando*, *tu* frente a *você*, y una fonología distinta — pt-PT reduce vocales y pt-BR no. Es un segundo curso y una segunda rúbrica de fonemas | Cuando la demanda de pt-PT esté validada y pagada |
| **Selector de variante en la interfaz** | Un interruptor que lleva a un curso vacío es peor que no tenerlo. Esquema preparado, producto no | Con el curso pt-BR, no antes |
| **Compras in-app (IAP), StoreKit, Google Play Billing** | El cobro es sólo por web. La app **no menciona ni enlaza el pago**: patrón multiplataforma, permitido. Añadir IAP serían dos fuentes de verdad de suscripción y un 15% de comisión | Si el enlace externo deja de estar permitido, o si la conversión web resulta inviable |
| **Niveles B1+** | Ahí el temario pasa de estructurado a emergente, que es otro diseño | Fase 2, cuando A2 esté completo y revisado por un nativo |
| **Funcionamiento sin conexión** | La voz necesita red. Sólo se cachea localmente el texto ya visto | No previsto |
| **Escalado horizontal, Redis, colas, CDN de audio, multi-región** | **Ausencia deliberada.** Todo esto es *aditivo*: se añade el martes que un número lo pida. El límite de tasa en memoria y el WebSocket con estado en proceso son correctos para una instancia y están declarados como tales en `docs/limites.md` | Cuando haya dos instancias. Es lo primero que cambia |
| **Panel de administración** | Supabase Studio y SQL cubren a un operador. Una interfaz de administración para una persona es trabajo que no se paga | Si entra alguien no técnico a operar |
| **Producto de analítica, A/B testing, cohortes** | A cero usuarios es disfraz: no hay señal que medir. Sentry más `traces` más SQL responden a todo lo que se puede preguntar todavía | Cuando haya tráfico que produzca significancia |
| **Equipos, licencias de centro, facturación B2B** | Otro producto, otro ciclo de venta y otro soporte | No previsto |
| **Notificaciones push** | El correo transaccional ya cubre retención en la v1, y push añade token, certificado, fila `device` y permiso que pedir | Cuando el correo demuestre no bastar |
| **Runs durables, cola de trabajos, aprobaciones humanas** | **Ausencia deliberada.** Nada aquí tarda minutos: la unidad de trabajo es un turno, no una ejecución. Una cola sería complejidad muerta | Nunca en este producto |
| **RAG, embeddings, vector store** | **Ausencia deliberada.** El currículo entero cabe en contexto con caché de prompt: más barato y más exacto que trocear y embeber | Si el corpus creciera fuera del contexto |
| **Multi-inquilino, roles, organizaciones** | Es B2C: cuentas planas, todas iguales. RLS por `auth.uid()` ya aísla a miles de usuarios sin inventar un inquilino | Con el producto B2B, que no está previsto |
| **ORM** | Las migraciones SQL de Supabase son dueñas únicas del esquema. Dos sistemas de migración sobre una base es una combinación conocida-mala | Nunca |

Las cuatro «ausencias deliberadas» están escritas aquí para que un validador o un constructor las
lea como decisión y no como olvido.

### Success metrics

| Métrica | Objetivo | Se mide en |
|---|---|---|
| **Margen bruto por suscriptor** | ≥ €4/mes | `traces.cost_micros` agrupado por usuario contra `subscriptions`, §16 |
| **Suscriptores para cubrir la infraestructura** | 15 | Infra fija ≈$75/mes ÷ ≈€4.7 de margen. Es el único número que decide si el producto vive |
| Coste de voz por minuto servido | ≤ €0.015 mezclado | `traces` de `azure_stt`, `azure_tts` y `gemini_live` ÷ segundos liquidados |
| Conversión gratuito → pago | ≥ 3% a los 60 días | `subscriptions` contra altas. Objetivo declaradamente especulativo: no hay base previa |
| Latencia fin de habla → primer audio, p95, modo Conversar | < 1200 ms | `turns.latency_*`, §16 |
| Acierto de caché TTS | > 50% al segundo mes, **y creciendo con los usuarios** | `audio_assets` vs `traces` de `azure_tts`. Es el único coste que mejora con la escala, porque todos estudian el mismo temario |
| Entregabilidad de correo | > 98% | Panel de Resend. Por debajo de eso, el dominio está en spam y la retención no existe |
| Sesiones rechazadas por cuota o por plan | > 0 al menos una vez | Prueba de que el tope funciona antes de que llegue la factura |

---

## 2. Tech Stack

| Capa | Elección | Por qué esta y no otra |
|---|---|---|
| App | **Expo SDK 57** + `expo-router` + NativeWind | Una base de código, dos tiendas. Micrófono, audio en segundo plano y notificación local resueltos. Ir a nativo puro no se justifica: nada aquí es DSP de baja latencia en el dispositivo |
| Estilos | **NativeWind 4.2** sobre **Tailwind 3.4** | Tailwind 4 sólo lo soporta NativeWind v5, que está en release candidate. Prerelease excluido |
| Backend | **Hono** sobre **Node 24 LTS**, en **contenedor** | Portable, mínimo, y corre sin cambios en Node. El contenedor no es preferencia: es requisito de la ruta de audio |
| Hosting backend | **Railway** | Documenta explícitamente la exención de WebSockets a los tiempos de inactividad, y ofrece proxy TCP nativo como salida cuando el proxy HTTP corta. Fly es más barato pero su política no se pudo confirmar |
| Datos + auth + almacenamiento | **Supabase** (plan **Pro**) — Postgres, Auth, RLS, Storage | El aislamiento entre cuentas son políticas RLS, no código de autorización. Una factura, un servicio. El plan gratuito **pausa el proyecto** por inactividad, y un producto de pago no puede dormirse |
| Esquema | **Migraciones SQL de Supabase**, sin ORM | Dueñas únicas. El panel queda en solo-lectura desde el día uno |
| Cerebro del tutor | **Claude Opus 5** con caché de prompt | El currículo va en el prefijo cacheado: lecturas a 0,1× del precio de entrada |
| Modo Afinar | **Azure Speech** — STT + evaluación de pronunciación, `Granularity=Phoneme` | El único que puntúa fonema a fonema en pt-PT |
| Voz del tutor | **Azure Neural TTS** pt-PT, **con caché compartida en Storage** | Voces de Portugal con nombre propio. La caché es la pieza económica del diseño |
| Modo Conversar | **Gemini Live**, semi-cascada, `language_code: pt-PT` | El realtime más barato que respeta el acento europeo |
| Cobro | **Stripe** — Checkout y Customer Portal alojados, `stripe@22.6.2` | Cobro sólo por web, así que no hay IAP ni comisión de tienda. Las páginas alojadas evitan construir interfaz de pago y sacan los datos de tarjeta del alcance de cumplimiento. **Stripe Tax** activado: el IVA de servicios digitales se liquida por país del cliente vía OSS, y a mano es inviable para un fundador solo |
| Correo | **Resend** `6.32.0`, y el SMTP de Supabase Auth apuntando a él | Confirmación y restablecimiento salen del dominio propio en vez del remitente por defecto de Supabase, que está limitado a unos pocos por hora y sirve para probar, no para un producto |
| Página de venta | **HTML y CSS planos** en `web/`, desplegado en **Cloudflare Pages** | Stripe Checkout es una redirección alojada: la página necesita un botón contra un endpoint. Un framework para eso es un paquete más que mantener y una cadena de dependencias más que auditar |
| Gestor de paquetes | **pnpm 12**, fijado con `packageManager` y activado por corepack | Elegido por **seguridad en las dependencias**: `node_modules` aislado que impide dependencias fantasma, scripts de instalación bloqueados salvo aprobación explícita, y un retraso de 24 h antes de adoptar una versión recién publicada. Ver §14 |
| Tests | **Jest** (`jest-expo`) en cliente · **Vitest** en backend | Cada uno el del ecosistema de su paquete |
| Lint/formato | **ESLint** (`eslint-config-expo`) en cliente · **Biome** en backend | El cliente usa lo que dicta el SDK; el backend, una sola herramienta rápida |

### Proveedores descartados, con la razón escrita

Para que nadie los reintroduzca dentro de tres meses.

| Descartado | Por qué |
|---|---|
| **OpenAI Realtime** | Mezcla acento brasileño y europeo, y hay reportes de no poder forzar Lisboa por instrucciones. Además ~$115/mes con este uso. **Doble descalificación** |
| **Gemini Live en audio nativo** | Documentación de Google, textual: «Native audio output models automatically choose the appropriate language and don't support explicitly setting the language code.» Para un tutor de portugués **europeo** eso es descalificante |
| **TTS/STT autohospedado pt-PT** | XTTS-v2 tiene sesgo brasileño documentado y Coqui como empresa cerró; Whisper está afinado mayoritariamente a pt-BR. Hoy no hay una opción abierta de calidad en portugués europeo |
| **Fly.io** | Más barato, pero no se pudo confirmar su política de inactividad para WebSockets. Reevaluable |
| **ORM (Drizzle)** | Correcto y disponible, pero introduce un segundo sistema de migración sobre la misma base |
| **`expo-av`** | Módulo legado. `expo-audio` es el reemplazo enviado |
| **`@google/generative-ai`** | Deprecado por Google; su repo se llama ya `deprecated-generative-ai-js` |
| **`@supabase/ssr`** | Apunta a sesión por cookie en SSR. Irrelevante en un cliente React Native |
| **RevenueCat + IAP** | Correcto y es el estándar para suscripción móvil, pero implica la comisión de tienda y **dos fuentes de verdad** de la suscripción. Con cobro web, Stripe es la única. Vuelve si el enlace externo deja de estar permitido |
| **`stripe@23.0.0`** | Major publicado el 2026-10-01, dos días antes de fijar este blueprint. Pasa el retraso de 24 h de pnpm, pero un major recién salido **en la ruta de pago** es riesgo sin recompensa. Se fija `22.6.2`, y con ella `apiVersion: "2026-08-26.dahlia"` explícito |
| **Paddle, Lemon Squeezy** | Resuelven el IVA como comerciante registrado, que es real, pero cobran bastante más que Stripe Tax y su catálogo de producto es menos flexible para planes medidos |
| **Astro, Next.js para `web/`** | Cinco páginas estáticas y un botón. Un framework añade build, dependencias y despliegue para nada que se note |

### Compatibility check

Comprobado contra `knowledge/stack-compatibility.md`. **Seis filas aplicaban.** Las seis están
resueltas en el diseño; **ninguna de las filas restantes aplica.**

| Fila conocida-mala | Cómo se manifestaría aquí | Resolución |
|---|---|---|
| Proceso de larga vida **+** host por petición | El relé de audio en serverless: el arranque en frío es **audible**, y la conexión muere con la invocación | Backend en **contenedor de larga vida** en Railway. Nunca serverless en la ruta de audio |
| **Dos sistemas de migración** sobre una base | Panel de Supabase editando esquema mientras existen migraciones SQL: el estado deriva y la siguiente migración falla **sólo en producción** | Las migraciones SQL son dueñas únicas. **Panel en solo-lectura desde el día uno** |
| Conexiones por petición **+** Postgres sin pooler | Agotamiento de conexiones al primer pico; el síntoma parece una base lenta y no lo es | **Pooler de Supabase** para la app; URL directa reservada a migraciones. El pooler en modo transacción descarta sentencias preparadas: el driver se configura para ello |
| Módulos nativos **+** cliente genérico preconstruido | `expo-audio` y `expo-secure-store` traen código nativo; Expo Go no puede cargarlo y falla con un error de JS engañoso | **Development build desde el día uno.** Expo Go nunca |
| **Middleware que parsea JSON + verificación de firma de webhook** | El `Content-Type` del webhook de Stripe es JSON, así que cualquier parseo previo consume el cuerpo y reserializa; la firma se calcula sobre bytes y **nunca vuelve a validar**. El síntoma es un 400 constante que se lee como secreto mal copiado | La ruta del webhook se monta **antes** de cualquier middleware de cuerpo y lee el cuerpo **crudo**. Cubierto por `tests/billing/firma.test.ts` del paso 13 |
| **Contador en memoria del proceso + más de una instancia** | El límite de tasa y el estado del WebSocket viven en el proceso: con dos réplicas, cada una cuenta la mitad y el límite real se duplica | **Una sola instancia, declarado** en `docs/limites.md` y en §20.3. Es correcto a esta escala y es **lo primero que cambia** al escalar. No se instala Redis para un problema que todavía no existe |

---

## 3. Directory Structure

Dos paquetes gestionados y una web estática en un repositorio, sin herramienta de monorepo: son dos,
no doce, y `pnpm --dir` basta. `web/` **no es un paquete**: no tiene `package.json`, y hay un `Verify`
en el paso 15 que lo comprueba, para que nadie lo convierta en uno sin decidirlo.

```
profe/
├── CLAUDE.md                      # de workspace/
├── AGENTS.md                      # de workspace/
├── .nvmrc                         # 24.21.0
├── .gitignore
├── docker-compose.yml             # Postgres local para los gates de §9
├── .claude/
│   ├── settings.json              # lista de permitidos de todos los Verify
│   ├── rules/{datos-postgres,voz-y-coste,cliente-expo}.md
│   └── skills/{nueva-migracion,nueva-llamada-proveedor,auditar-coste-voz}/SKILL.md
│
├── the_profe-app/                 # Expo — el scaffolder crea su package.json
│   ├── app/                       # expo-router: el sistema de archivos ES la navegación
│   │   ├── _layout.tsx            # proveedores, fuentes, gate de splash
│   │   ├── (tabs)/                # Hoy · Practicar · Ajustes
│   │   ├── (auth)/entrar.tsx      # enlace mágico
│   │   ├── leccion/[id].tsx
│   │   └── +not-found.tsx
│   ├── components/                # presentacionales. Sin fetch, sin base de datos
│   │   └── fonemas/               # el medidor por sílaba
│   ├── features/                  # lógica por dominio, colocada
│   │   ├── leccion/  escritura/  lectura/  repaso/
│   │   └── voice/                 # captura, WebSocket, barge-in
│   ├── lib/                       # api, supabase, session, storage, theme-context
│   ├── constants/theme.ts         # capa primitiva — fuente única
│   ├── assets/fonts/              # los tres .ttf — §10 los obtiene ANTES del paso 1
│   ├── tests/
│   ├── pnpm-workspace.yaml        # nodeLinker: hoisted — Metro lo exige
│   ├── app.config.ts              # .ts, no .json: identificadores por variante
│   ├── eas.json                   # development · preview · production
│   ├── tailwind.config.js         # capa semántica
│   ├── global.css  babel.config.js  metro.config.js
│   ├── jest.config.js  jest.setup.ts  eslint.config.js  tsconfig.json
│   └── .env.example
│
├── the_profe-server/              # Hono — su package.json lo emite el blueprint
│   ├── src/
│   │   ├── server.ts              # entrada. `dist/server.js` al compilar
│   │   ├── env.ts                 # validado al importarse. Único lector de process.env
│   │   ├── envelope.ts            # el sobre único de respuesta
│   │   ├── routes/                # sin SDK de proveedor aquí dentro
│   │   ├── gateway/               # anthropic.ts, pricing.ts, traces.ts
│   │   ├── voice/                 # azure-stt.ts, tts.ts, gemini-live.ts
│   │   ├── ws/                    # afinar.ts, conversar.ts
│   │   ├── budget/                # reserva, liquidación, barrendero
│   │   ├── billing/               # stripe.ts, webhook.ts, entitlements.ts, plan-guard.ts
│   │   ├── email/                 # client.ts, templates.ts, log.ts
│   │   ├── http/rate-limit.ts     # cubeta en memoria. Una instancia — ver docs/limites.md
│   │   ├── srs/                   # repetición espaciada
│   │   ├── eval/                  # arnés de evaluación
│   │   └── db/pool.ts             # el único sitio que abre una conexión
│   ├── scripts/{check-env.ts,check-mail-dns.ts,apply-migrations.sh,restore-drill.sh}
│   ├── tests/{setup.ts,sql/,db/,unit/,integration/,billing/,email/,http/,web/}
│   ├── pnpm-workspace.yaml        # allowBuilds, minimumReleaseAge
│   ├── Dockerfile  .dockerignore  biome.json
│   ├── tsconfig.json  tsconfig.build.json  vitest.config.ts
│   └── .env.example
│
├── web/                           # venta y legales. HTML y CSS planos, SIN package.json
│   ├── index.html  precios.html
│   ├── privacidad.html  terminos.html  borrado-de-datos.html
│   └── estilos.css                # los hex de the_profe-app/constants/theme.ts, y ningún otro
│
├── docs/
│   ├── correo-dns.md              # SPF, DKIM, DMARC — qué publicar y cómo se comprueba
│   ├── limites.md                 # el límite de tasa y su alcance de una instancia
│   ├── retencion.md               # plazo por tipo de dato; el audio, el más corto
│   └── despliegue-web.md          # Cloudflare Pages
│
├── supabase/
│   ├── migrations/                # dueñas únicas del esquema
│   └── seed/curriculum_a1_a2.sql  # el temario, versionado y revisable
│
└── blueprints/profe/              # este bundle. Excluido de linter y formateador
```

**Dos reglas de frontera que el linter aplica:**

- `the_profe-app/**` nunca importa de `the_profe-server/**`, y ninguno de los dos importa un SDK de proveedor fuera de
  `the_profe-server/src/{gateway,voice,billing,email}/`.
- `the_profe-app/features/**` nunca contiene un hex literal. Sólo tokens.
- **`the_profe-app/**` no contiene ninguna mención ni enlace de compra, pago, precio o suscripción.** La
  venta ocurre sólo en `web/`. No es estética: es la regla de la App Store que permite cobrar fuera
  sin el *entitlement* de enlace externo, y el paso 15 la verifica con un `grep` que falla el gate.

**Nunca se crean `the_profe-app/ios/` ni `the_profe-app/android/` en git.** Se permanece en generación nativa
continua; los cambios nativos van por plugin de configuración o `expo-build-properties`.

---

## 4. Data Model

Postgres en Supabase. Todas las tablas con `profile_id` llevan RLS.

### Entities

**La variante, antes que nada**

```sql
create type content_variant as enum ('pt-PT', 'pt-BR');
```

**Enum, no booleano.** Un `is_european boolean` es irreversible el día que exista pt-AO o pt-MZ: hay
que migrar filas y reescribir cada consulta. Un enum se amplía con `alter type ... add value`. La v1
sólo siembra `pt-PT`; `pt-BR` existe en el tipo y en ninguna fila, y eso es deliberado — ver §1
Non-Goals.

Toda tabla de contenido lleva `variant content_variant not null default 'pt-PT'`, y toda consulta de
contenido filtra por la variante objetivo del perfil. El valor por defecto es lo que permite que las
migraciones del paso 3 y la siembra del paso 8 no se contradigan.

**Currículo — compartido, solo lectura para todo usuario autenticado**

| Tabla | Campos clave |
|---|---|
| `curriculum_units` | `code` único **por variante**, `variant`, `cefr_level`, `ordinal`, `title_pt`, `title_es`, `objectives jsonb`, `published` |
| `curriculum_items` | `unit_id`, `variant`, `kind` (`vocab`·`phrase`·`grammar`·`reading`), `pt_text`, `es_gloss`, `ipa`, `notes`, `audio_asset_id`, `ordinal` |
| `phoneme_rubric` | `variant`, `phoneme` (AFI), `label_es`, `difficulty_for_es`, `notes` — **la rúbrica es dato, no constantes en el código**, porque el inventario fonético difiere entre variantes y una tabla se amplía sin desplegar |

La unicidad de `curriculum_units.code` es **compuesta con la variante**: `unique (variant, code)`. Si
fuera sólo `code`, la unidad `A1-U01` de pt-BR colisionaría con la de pt-PT y el curso nuevo no
entraría sin renombrar todo el existente.

**Progreso — por perfil**

| Tabla | Campos clave |
|---|---|
| `profiles` | `id` → `auth.users`, `display_name`, `level_cefr`, `voice_pref`, `target_variant content_variant not null default 'pt-PT'` |
| `lessons` | `profile_id`, `unit_id`, `status` (`queued`→`active`→`completed`), `started_at`, `completed_at` |
| `exercises` | `lesson_id`, `kind` (`read`·`write`·`listen`·`speak_drill`·`converse`), `prompt jsonb`, `expected jsonb`, `ordinal` |
| `attempts` | `exercise_id`, `profile_id`, `response jsonb`, `score`, `feedback jsonb` |
| `error_items` | `profile_id`, `kind` (`phoneme`·`lexeme`·`grammar_rule`), `key`, `strength`, `due_at` |
| `pronunciation_scores` | `attempt_id`, `accuracy`, `fluency`, `completeness`, `words jsonb`, `phonemes jsonb`, `audio_asset_id`, `retention_until` |

`pronunciation_scores` **no tiene columna de prosodia**. Azure no la puntúa fuera de `en-US`, y una
columna permanentemente nula es peor que su ausencia: invita a rellenarla con una estimación inventada.

**Conversación y voz**

| Tabla | Campos clave |
|---|---|
| `conversations` | `profile_id`, `mode` (`converse`·`tutor_chat`), `title` |
| `messages` | `conversation_id`, `role`, `content`, `audio_asset_id`, `status` |
| `turns` | `conversation_id`, `ordinal`, `speaker`, `transcript`, `barge_in`, y **cinco campos de latencia**: `latency_capture_ms`, `latency_stt_ms`, `latency_llm_ttft_ms`, `latency_tts_first_ms`, `latency_total_ms` |

La latencia va **por segmento y no como un total**: no se puede afinar lo que no se puede atribuir.

**Audio**

| Tabla | Campos clave |
|---|---|
| `audio_assets` | `kind` (`tts_cache`·`user_recording`·`reference`), `text_hash`, `voice`, `owner_profile_id`, `storage_path`, `duration_ms`, `bytes`, `retention_until` |

**Coste y cuota**

| Tabla | Campos clave |
|---|---|
| `traces` | `profile_id`, `provider`, `operation`, `model_or_voice`, `input_tokens`, `output_tokens`, `cached_tokens`, `audio_seconds`, `chars`, `cost_micros bigint`, `latency_ms` |
| `budget_periods` | `profile_id`, `period_start`, `period_end`, `voice_seconds_granted`, `voice_seconds_held`, `voice_seconds_used`, `cost_micros_cap`, `cost_micros_used` |
| `budget_ledger` | `profile_id`, `period_id`, `delta_seconds`, `delta_cost_micros`, `kind` (`grant`·`hold`·`release`·`settle`·`adjust`), `session_id`, `idempotency_key` **único** |
| `voice_sessions` | `profile_id`, `mode`, `status` (`queued`→`running`→`succeeded`\|`failed`\|`expired`), `seconds_held`, `seconds_actual`, `expires_at` |
| `eval_cases` | `suite`, `input jsonb`, `expected jsonb`, `tags`, `baseline_score` |

**Suscripción y cobro — proyección local, la verdad vive en Stripe**

| Tabla | Campos clave |
|---|---|
| `subscriptions` | `profile_id uuid` clave primaria → `auth.users`, `stripe_customer_id text` único, `stripe_subscription_id text` único, `plan text check (plan in ('free','paid'))`, `billing_period text check (billing_period in ('monthly','yearly'))`, `status text check (status in ('trialing','active','past_due','canceled'))`, `current_period_end timestamptz`, `cancel_at_period_end boolean`, `updated_at timestamptz` |
| `entitlements` | `profile_id uuid` clave primaria, `plan text`, `voice_seconds_per_day integer`, `source text check (source in ('stripe','grant'))`, `resolved_at timestamptz` — la fila que lee el middleware en la ruta caliente |
| `stripe_events` | `id text` **clave primaria** —el id del evento de Stripe—, `type text`, `payload jsonb`, `received_at timestamptz default now()`, `applied_at timestamptz`. **Sin `profile_id`:** no lleva RLS y sólo la escribe la clave de servicio |

**`stripe_events.id` es la clave primaria y por eso la idempotencia es estructural, no un `if`.**
Stripe reentrega eventos ante cualquier duda: un `insert` que choca con la clave primaria es la señal
de «ya aplicado», y el manejador sale con 200 sin volver a tocar nada. Resolverlo con una consulta
previa deja una carrera entre dos entregas simultáneas; la restricción no.

**`entitlements` es una proyección y no una tabla editable a mano.** La escribe el webhook en la
misma transacción que `subscriptions`, y la ruta de lectura **nunca llama a la API de Stripe**: una
llamada de red en el camino crítico de cada petición medida es latencia y es un punto de fallo
externo para algo que ya se sabe.

**Correo**

| Tabla | Campos clave |
|---|---|
| `email_log` | `id bigserial` clave primaria, `profile_id uuid` → `auth.users` `on delete cascade`, `kind text check (kind in ('confirm','reset','trial_end','canceled','deleted'))`, `to_hash text not null`, `provider_id text`, `status text check (status in ('sent','rejected'))`, `sent_at timestamptz default now()`, `error text` |

**`plan` y `billing_period` son columnas distintas, y no una sola.** `monthly` y `yearly` conceden
exactamente los mismos segundos: meterlos en `plan` obligaría al middleware a conocer la facturación
para resolver un derecho, que son dos cosas que cambian por razones distintas.

**`entitlements.source` permite conceder acceso sin pasar por Stripe.** Vale `'grant'` para una
cortesía manual — el tutor nativo que revisa el temario, un reembolso, una prueba larga — sin
inventar una suscripción falsa que luego el webhook intentaría reconciliar.

**`email_log` lleva `profile_id` y no es opcional.** El criterio 1 del paso 23 exige dejar **0 filas**
con el identificador del usuario en `email_log`; sin la columna, ese criterio no se puede cumplir ni
comprobar. Es el ejemplo exacto de por qué el borrado se diseña con el esquema y no después.

**El destinatario se guarda en hash, no en claro.** La dirección ya está en `auth.users`; duplicarla
en una tabla de registro sólo multiplica la superficie que hay que borrar en un `E7-T3` y que
declarar en la política de privacidad.

**`budget_ledger` es append-only, aplicado por trigger.** Sin `UPDATE`, sin `DELETE`, nunca. Los
contadores de `budget_periods` se mantienen dentro de la misma transacción que inserta en el ledger;
son objetivo de bloqueo y lectura rápida, **no la fuente de verdad**.

**Enteros, nunca coma flotante.** Segundos en `integer`, dinero en `cost_micros bigint`
(millonésimas de euro). La deriva de redondeo aparece como un saldo que no llega a cero.

### Relationships

```
auth.users 1─1 profiles 1─n lessons 1─n exercises 1─n attempts 1─1 pronunciation_scores
                        1─n error_items
                        1─n conversations 1─n messages
                                          1─n turns
                        1─n budget_periods 1─n budget_ledger
                        1─n voice_sessions
                        1─n traces
curriculum_units 1─n curriculum_items n─1 audio_assets
```

`profiles` es el punto del que sale la cascada de borrado — con **una excepción deliberada**: al
borrar un perfil, sus `audio_assets` de `kind='tts_cache'` **no** se borran, porque son compartidos y
los siguen usando los demás perfiles. Sólo se borran los de `kind='user_recording'` cuyo
`owner_profile_id` es suyo. Un test lo afirma en el paso 4.

### Indexes

| Índice | Sobre | Por qué |
|---|---|---|
| `unique (text_hash, voice) where kind = 'tts_cache'` | `audio_assets` | **La pieza económica del diseño.** Sin él no hay caché y el TTS se paga entero, cada vez, por cada perfil |
| `unique (idempotency_key)` | `budget_ledger` | Hace que un reintento de liquidación sea una no-operación en vez de un doble cargo |
| `(profile_id, due_at)` | `error_items` | La consulta de «qué toca repasar» es la más frecuente de la app |
| `unique (profile_id, kind, key)` | `error_items` | Un error es una fila que se refuerza, no una fila nueva cada vez |
| `unique (conversation_id, ordinal)` | `turns` | El orden de turnos no puede tener huecos ni duplicados |
| `unique (unit_id, ordinal)` | `curriculum_items` | El temario tiene orden, y sembrarlo dos veces no debe duplicarlo |
| `(profile_id, created_at)` | `traces` | La auditoría de coste siempre es por perfil y por periodo |
| `unique (code)` | `curriculum_units` | Clave estable para la semilla idempotente |

### Schema

El esquema **completo** se crea en un solo paso (`E1-T3`). Las políticas RLS y las claves ajenas no
se pueden escribir a trozos sin que las migraciones intermedias queden inconsistentes, y un esquema
a medias hace que los pasos siguientes escriban contra una forma que va a cambiar.

`the_profe-server/tests/sql/assert_schema.sql` lleva una línea `::regclass` por tabla: es la aserción barata de
que el esquema está aplicado, y la usan los gates de §9 antes de probar nada más.

### Migrations

| | |
|---|---|
| **Dueñas únicas** | `supabase/migrations/*.sql`, en orden lexicográfico de nombre |
| **Local** | `pnpm --dir the_profe-server run db:local:apply` → reconstruye `public` y `auth`, aplica el esqueleto y luego cada migración |
| **Supabase real** | `pnpm dlx supabase@2.118.0 db push` — **nunca** el script local |
| **Nueva migración** | `pnpm --dir the_profe-server run db:migration:new <slug>` |
| **Panel de Supabase** | **Solo lectura.** Editar esquema ahí rompe la fuente única |

El script local **reconstruye los esquemas en cada aplicación** en vez de intentar ser incremental,
porque §10 Bootstrap lo ejecuta dos veces seguidas y `create table` no es idempotente. Es seguro
porque apunta exclusivamente a `profe_test`, la base local; nunca a Supabase.

### Seed data

`supabase/seed/curriculum_a1_a2.sql` — el temario A1→A2 completo: unidades, objetivos, vocabulario,
frases de referencia con su transcripción AFI.

**Debe llevar `on conflict do nothing` o `do update`, sin excepción.** El bootstrap la aplica dos
veces; una semilla que inserta a ciegas duplica el temario entero y el resto de gates falla con
errores que no señalan la causa.

El temario lo genera el paso 8 como datos, no como prompt, y se revisa una vez. Es contenido
versionado: cambiarlo es un commit, no una edición en caliente.

---

## 5. API Design

### Conventions

- **REST sobre Hono.** Sin capa de grafo: seis rutas no justifican un gateway, un esquema, una capa
  de resolutores y una historia de agrupación de consultas.
- **Un solo sobre de respuesta**, sin excepciones:
  `{ ok: true, data }` | `{ ok: false, error: { code, message, details } }`, con `code` de un conjunto
  enumerado. Un cliente que sabe la forma de la respuesta no necesita adivinar.
- **Validación en el borde.** Toda ruta parsea su entrada con un esquema de `zod` **antes** de tocar
  lógica. Nada sin validar llega a `gateway/` ni a `db/`.

**El conjunto enumerado de `code`, que es la fuente única.** Vive en `the_profe-server/src/envelope.ts`; un
código que no esté aquí es un defecto, porque el cliente ramifica sobre él:

| `code` | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_FAILED` | 400 | El esquema de `zod` rechazó la entrada |
| `NOT_FOUND` | 404 | El recurso no existe, o existe y RLS lo oculta — **se responden igual a propósito**, para no filtrar existencia |
| `PLAN_REQUIRED` | 402 | Sin suscripción activa. Se resuelve en la web |
| `PLAN_LIMIT_REACHED` | 402 | Plan vigente, cupo diario agotado. `details.seconds_until_reset` |
| `QUOTA_EXCEEDED` | 402 | Tope de gasto del periodo, por encima del plan. Es el freno del operador, no del usuario |
| `RATE_LIMITED` | 429 | Cubeta de tokens agotada. Cabecera `Retry-After` en segundos enteros |
| `UPSTREAM_FAILED` | 502 | El proveedor respondió con error |
| `UPSTREAM_TIMEOUT` | 504 | El proveedor no respondió en plazo |

**`PLAN_LIMIT_REACHED` y `QUOTA_EXCEEDED` son distintos y los dos son 402.** El primero lo provoca el
usuario gastando lo suyo y se arregla esperando; el segundo lo provoca el sistema protegiéndose y se
arregla subiendo un límite. Fusionarlos haría que un incidente de coste se leyera como uso normal.
- **La identidad sale del JWT de Supabase**, nunca del cuerpo de la petición. Un `profile_id` en el
  cuerpo es un defecto de seguridad. La excepción es `/billing/webhook`, que no tiene sesión: ahí la
  identidad se deriva del `stripe_customer_id` del evento ya verificado por firma.
- **Orden del middleware en toda ruta medida: autenticación → derecho → cuota → proveedor.** El
  derecho va antes de la cuota porque reservar segundos a quien no tiene plan es escribir en el ledger
  una fila que habrá que liberar; y la cuota va antes del proveedor porque es la regla fundacional del
  proyecto. Invertir cualquiera de los dos pares convierte una sesión rechazada en dinero gastado.
- Errores: `400` validación · `401` sin sesión · `403` RLS · **`402` sin plan o sin cuota** · `429`
  límite de tasa · `502` proveedor caído.
- **El webhook de Stripe es la única ruta que no sigue el sobre.** Stripe espera un `200` con cuerpo
  vacío y reentrega ante cualquier otra cosa. Está anotado aquí para que un validador lo lea como
  excepción decidida y no como incoherencia.
- **El `402` distingue dos causas, y el cliente las muestra distinto:** `PLAN_REQUIRED` es «hazte
  suscriptor» y se resuelve en la web; `PLAN_LIMIT_REACHED` es «vuelve mañana» y lleva en `details`
  los segundos hasta el reinicio. Un solo código para las dos haría que la app pidiera pagar a quien
  ya paga.

### Routes

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/healthz` | Salud. Sin auth. Lo usa el contenedor y el paso 5 |
| `GET` | `/me` | Perfil, nivel, cuota restante del periodo |
| `DELETE` | `/me` | Borrado de cuenta en cascada. Requisito de tienda y de datos personales |
| `GET` | `/curriculum` | Unidades publicadas y progreso del perfil |
| `GET` | `/lessons/:id` | Lección con sus ejercicios |
| `POST` | `/lessons/:id/start` | Crea o reanuda |
| `POST` | `/exercises/:id/attempt` | Envía respuesta de texto. Corrige, puntúa, registra errores |
| `GET` | `/review/due` | Qué toca repasar hoy, de `error_items` |
| `POST` | `/tts` | Texto → audio. **Consulta la caché antes de sintetizar** |
| `POST` | `/voice/sessions` | **Reserva la cuota.** Devuelve un tique de WebSocket, o `402` |
| `WS` | `/ws/afinar` | Audio → Azure STT+PA → puntuación fonémica |
| `WS` | `/ws/conversar` | Audio ↔ Gemini Live, con barge-in |
| `GET` | `/admin/cost` | Coste y margen por usuario y periodo. Sólo el operador |
| `GET` | `/plan` | Plan vigente y segundos de voz restantes hoy. **Lee `entitlements`, nunca Stripe** |
| `POST` | `/billing/checkout` | Crea la sesión de Stripe Checkout y devuelve su URL. **La llama `web/`, no la app** |
| `POST` | `/billing/portal` | URL de Customer Portal de un solo uso, o `402 PLAN_REQUIRED` |
| `POST` | `/billing/webhook` | Eventos de Stripe. **Cuerpo crudo, firma verificada, idempotente por clave primaria** |

### Critical endpoints — full detail

**`POST /voice/sessions` — el endpoint que protege el presupuesto**

Es el único camino para abrir un micrófono. No existe una ruta que salte este paso.

```
POST /voice/sessions  { mode: "afinar" | "conversar", estimated_seconds: int }

BEGIN
  SELECT ... FROM budget_periods WHERE profile_id = :p FOR UPDATE   -- serializa este perfil
  si (granted - held - used) < estimated:
      ROLLBACK  →  402, SIN fila en voice_sessions, el micrófono nunca se abre
  INSERT budget_ledger (kind='hold', delta_seconds=-estimated, idempotency_key)
  UPDATE budget_periods SET voice_seconds_held = voice_seconds_held + estimated
  INSERT voice_sessions (status='queued', seconds_held=estimated, expires_at=now()+interval '15 min')
COMMIT
→ sólo ahora se devuelve el tique y se permite abrir el WebSocket
```

- **Al terminar:** `settle` con la duración real y el coste real del proveedor leído de la respuesta,
  no estimado por caracteres.
- **Al fallar, expirar o cancelar:** `release`, con clave en `session_id`, para que un segundo intento
  no haga nada.
- **Barrendero:** libera toda reserva cuyo `voice_sessions` no alcanzó estado terminal pasado
  `expires_at`. Sin él, un proceso caído se come la cuota del perfil en silencio y nadie se entera.

**Cobrar después de que el proveedor responda es el error clásico**, y es la razón de que este
endpoint exista: cada sesión abandonada costaría dinero que nunca se reservó.

**`POST /tts` — la caché compartida**

```
hash = sha256(texto_normalizado + '|' + voz)
SELECT storage_path FROM audio_assets WHERE text_hash = hash AND voice = :voz AND kind='tts_cache'
  ├─ acierto → URL firmada. Cero coste. Sin fila en traces de azure_tts
  └─ fallo   → sintetiza → sube a Storage → INSERT audio_assets → INSERT traces → URL firmada
```

La normalización del texto antes del hash es lo que decide el acierto: mismo recorte de espacios,
misma normalización Unicode, siempre. Dos frases idénticas que hashean distinto son dinero tirado.

---

## 6. Frontend Architecture

### Routes

`expo-router`: el sistema de archivos **es** la navegación. Un archivo de más en `(tabs)/` es una
pestaña de más.

| Ruta | Pantalla |
|---|---|
| `app/_layout.tsx` | Raíz: proveedores, fuentes, gate de splash, resolución de tema |
| `app/(tabs)/index.tsx` | **Hoy** — qué toca, progreso, cuota restante |
| `app/(tabs)/practicar.tsx` | **Practicar** — repaso pendiente, Afinar, Conversar |
| `app/(tabs)/ajustes.tsx` | **Ajustes** — tema, voz, perfil, borrar cuenta |
| `app/(auth)/entrar.tsx` | Enlace mágico. Sin barra de pestañas |
| `app/leccion/[id].tsx` | Lección con sus ejercicios |
| `app/+not-found.tsx` | 404 |

### Rendering strategy

Cliente nativo puro. Sin SSR, sin hidratación. La primera pantalla **nunca se bloquea esperando a la
red**: se pinta contenido cacheado y se revalida por detrás. Un arranque en frío que muestra un
spinner hasta que responde la API se lee como roto en un tren.

### Component hierarchy

```
app/<ruta>            ≤150 líneas. Composición y navegación. Sin fetch propio
 └─ features/<dominio>  hooks, llamadas a la API, lógica. Donde vive el trabajo
     └─ components/     presentacionales. Sin fetch, sin base de datos, sin hex
```

Una pantalla que crece baja su lógica a `features/<dominio>/`. La regla de 150 líneas no es estética:
es el disparador que fuerza esa bajada antes de que sea cara.

**`components/fonemas/`** es el componente que define el producto: una fila horizontal de chips, uno
por sílaba, con el AFI debajo en Charis SIL y la banda de puntuación por color **más etiqueta y
forma**.

### State management

| Tipo de estado | Dónde vive |
|---|---|
| Datos del servidor | `@tanstack/react-query`. Una caché, no un store duplicado |
| Sesión | `lib/session.tsx`, un solo `useSession()` |
| Tema | `lib/theme-context.tsx`, resuelto antes del primer pintado |
| Estado de una pantalla | Estado del componente. Sin store global |
| Turno de voz en curso | Máquina de estados en `features/voice/`, efímera: no sobrevive a la pantalla |

Sin librería de store global con ceremonia por funcionalidad. Nada aquí cruza rutas de forma que lo
justifique, y un store que duplica lo que ya tiene la caché de servidor es dos fuentes de verdad.

### Loading, empty, and error states

**Los tres estados se escriben con la pantalla, no después.** Una pantalla sin estado vacío es una
pantalla a medias, y el estado vacío es el que ve el usuario el primer día.

| Estado | Regla |
|---|---|
| Cargando | Esqueleto con la forma del contenido, nunca un spinner centrado |
| Vacío | Dice qué hacer, con la acción a mano. «Sin datos» no es un estado vacío |
| Error | Qué pasó y qué hacer. Reintentar visible |
| Sin conexión | Banner en menos de 2 s. El contenido cacheado se sigue viendo |
| **Cuota agotada** | Estado propio, no un error genérico. Dice cuánto queda y cuándo se renueva |

---

## 7. Design System

**La serif es el portugués. La sans es la app hablándote. Nunca se cruzan.** Esa correspondencia no
es decorativa: es cómo sabes de un vistazo qué es idioma y qué es aplicación, sin icono ni color.

### Colors

Tres capas. Un componente lee **sólo** la capa semántica.

**Primitivos** — nunca directamente en un componente:

```
--paper-50  #FBF7F0   --ink-900 #1F1B16   --azulejo-50  #EAF1F8   --olive-600      #5E7248
--paper-100 #F4EDE1   --ink-700 #443C32   --azulejo-300 #8FB4D4   --olive-400      #8FA872
--paper-200 #E8DECD   --ink-500 #6B6153   --azulejo-600 #2A5C8A   --amber-600      #B07D2B
                                          --azulejo-700 #1E4468   --amber-400      #D9A852
--surface-900 #14120F  --surface-700 #2A2621                       --terracotta-600 #B5543A
--surface-800 #1E1B17  --surface-600 #3A342C                       --terracotta-400 #D98467
--warm-white  #F0EADF  --warm-muted  #A89C8B                       --crimson-600    #A32E38
                                                                   --crimson-400    #E0707A
```

El azul viene del azulejo portugués, apagado a cobalto en vez de saturado. La terracota es teja. El
verde es oliva, no el verde neón de una app de rachas.

**Semánticos** — esto es lo único que leen los componentes:

| Token | Claro | Oscuro |
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

**Reglas no negociables**

- Un hex dentro de un archivo de componente es un defecto, y el linter lo falla.
- En oscuro, las superficies elevadas son **más claras**, nunca más oscuras. **Sin sombras en oscuro.**
- Nada de `#000` ni `#FFF` como fondo o texto: producen halación. De ahí el blanco cálido.
- El tema se aplica **antes del primer pintado**. Resolverlo en un efecto garantiza un destello.
- Preferencia del sistema como valor inicial; la elección explícita la sobrescribe y persiste.
- Contraste comprobado en **ambos** temas. Una paleta que pasa en claro falla en oscuro con frecuencia.

### Typography

| Rol | Familia | Por qué esta |
|---|---|---|
| Contenido en portugués | **Source Serif 4** | Cobertura completa de diacríticos portugueses (ã õ ç á â ê), altura de x generosa, legible a tamaño pequeño |
| Interfaz | **Inter** | Numerales **tabulares**: las puntuaciones no bailan al actualizarse |
| Alfabeto Fonético Internacional | **Charis SIL** | **Requisito funcional, no estético.** Es la única de las tres que cubre ɐ̃ ʃ ʎ ɲ ɨ ɾ. Sin ella el medidor de fonemas muestra cuadros vacíos |

| Token | Tamaño / línea | Familia |
|---|---|---|
| `display` | 32 / 38 | serif |
| `title` | 24 / 30 | serif |
| `heading` | 20 / 26 | sans |
| `body-pt` | 17 / 26 | **serif** — mayor que la UI porque estás descifrando, no leyendo |
| `body` | 15 / 22 | sans |
| `label` | 13 / 18 | sans |
| `caption` | 11 / 16 | sans |
| `ipa` | 13 / 18 | Charis SIL |

Todas escalan con el tamaño de texto del sistema. Un test de instantánea renderiza cada pantalla en el
mínimo y el máximo y afirma cero nodos truncados y cero solapes.

### Spacing, radius, elevation

- **Espaciado, base 4:** `4 8 12 16 20 24 32 40 56 72`. Un píxel fuera de la escala es un defecto.
- **Radios:** `6` campos y chips · `12` tarjetas · `20` hojas · `999` pastillas.
- **Elevación:** en claro, sombra cálida `rgba(31,27,22,0.08)`. En oscuro, superficie más clara y nada más.

### Motion

| Qué | Cuánto |
|---|---|
| Cambio de estado | 150 ms |
| Entrada / salida | 250 ms |
| Hojas | 400 ms |
| Curva | `cubic-bezier(0.2, 0, 0, 1)` |

- El texto en streaming entra **por frase con un fundido**, no carácter a carácter: lo segundo tiembla
  en un teléfono y se lee como un fallo.
- El anillo del micrófono pulsa con la **amplitud real de entrada**, no con una animación falsa. Es la
  única señal fiable de «te estoy oyendo» mientras el reconocimiento no ha devuelto nada.
- Con «Reducir movimiento»: todo instantáneo, y el anillo pasa a barra de nivel estática. **Se cambia
  de medio, no se elimina la señal.**

### Component style

Tarjetas de papel generosas, bordes de un píxel y bajo contraste, **sin degradados, sin sombras
pesadas**. El papel hace el trabajo que en otras apps hacen las sombras.

**Medidor de fonemas** — bandas: oliva ≥80 · ámbar 60–79 · terracota <60, **siempre con etiqueta
textual y forma distinta además del color**. Oliva contra terracota es exactamente el eje rojo-verde,
y una parte considerable de la población tiene alguna deficiencia ahí. Color solo no es información.

---

## 8. Authentication & Authorization

### Provider and rationale

**Supabase Auth**, enlace mágico por correo. Sin contraseñas que gestionar, sin recuperación que
construir, y la sesión ya está en el contexto de las políticas RLS — que es la razón real de aceptar
la gravedad de la plataforma. Un proveedor de identidad separado añadiría un segundo lugar donde vive
la verdad sobre quién es quién, y ninguna respuesta para cuando discrepen.

### Flows

| Flujo | Cómo |
|---|---|
| Alta / entrada | **Abierta**: enlace mágico al correo → enlace profundo de vuelta a la app → sesión. Sin invitación: es un producto, no un círculo cerrado |
| **Verificación antes del primer minuto de voz** | El correo tiene que estar confirmado antes de que el derecho conceda segundos. Es la contención de R9: sin ella, cada dirección inventada regala 3 min/día |
| Límite de altas por IP | Paso 22. Una dirección no puede abrir cuentas en serie para multiplicar el plan gratuito |
| Hacerse suscriptor | **En `web/`**, nunca en la app. La app refleja el plan y no lo vende — ver §5 y el `grep` del paso 15 |
| Gestionar o cancelar la suscripción | Stripe Customer Portal, URL de un solo uso desde `/billing/portal`. **Sin escribir a soporte**, que a un fundador solo le ahorra el único coste que no escala |
| Salir | Limpia el almacén seguro. Verificado relanzando la app |
| **Borrar cuenta** | **Dentro de la app**, no por correo a soporte. Borrado real con dos excepciones declaradas: la caché TTS compartida, y `traces` y `budget_ledger` que se **disocian** porque el ledger es de sólo anexado y la contabilidad sobrevive. Ver paso 23 |

### Route protection

Grupo `(auth)` sin barra de pestañas; todo lo demás detrás del gate de sesión en `app/_layout.tsx`.
En el backend, middleware que valida el JWT antes de cualquier ruta que no sea `/healthz`.

### Roles and permissions

**No hay roles**, y es deliberado. Es B2C: cuentas planas y equivalentes. La única asimetría es
`/admin/cost`, restringida al operador por una comprobación explícita. Inventar un sistema de roles
para una asimetría es construir permisos que nadie va a mantener.

**El plan no es un rol.** Vive en `entitlements` y lo resuelve un middleware, no una tabla de
permisos: un suscriptor y un usuario gratuito son la misma clase de cuenta con distinto número de
segundos. Modelarlo como rol habría metido la facturación en la capa de autorización, y son dos cosas
que cambian por razones distintas.

### Sessions

Tokens en `expo-secure-store` — el enclave seguro del sistema operativo, **nunca** `AsyncStorage`.
La sesión sobrevive al cierre forzado de la app: entrar, forzar el cierre y reabrir aterriza en la
pantalla autenticada sin volver a entrar. Un test lo afirma.

### Multi-tenancy / row-level isolation

No hay inquilinos; hay cuentas, y el aislamiento está **en la base de datos**, no en el código de la
aplicación. Una comprobación en el servidor se olvida en la ruta número once; una política RLS no.
**RLS por `auth.uid()` ya aísla a miles de usuarios**: pasar de cuatro a muchos no exige inventar un
inquilino, y por eso §1 lo deja fuera de alcance.

| Tabla | Política |
|---|---|
| Todo lo que tiene `profile_id` | `profile_id = auth.uid()`, directa o por su padre |
| `curriculum_units`, `curriculum_items` | Lectura para todo perfil autenticado. Escritura, nadie: se siembran por migración |
| `audio_assets` con `kind='tts_cache'` | **Lectura para todo usuario autenticado.** Es lo que hace que la caché sirva a todos y funcione la economía del diseño — y el acierto **sube** con el número de usuarios, porque todos estudian el mismo temario |
| `audio_assets` con `kind='user_recording'` | `owner_profile_id = auth.uid()`. Privado siempre |
| `budget_ledger` | Lectura del propio perfil. **Escritura sólo por función con `security definer`**; ningún cliente inserta directamente |
| `subscriptions`, `entitlements` | `profile_id = auth.uid()` en lectura. **Escritura sólo por el webhook con la clave de servicio**: un cliente que pudiera escribir su propio derecho se regalaría el plan de pago |
| `stripe_events` | Ni lectura ni escritura para ningún cliente. Es bitácora interna de idempotencia |
| `email_log` | Lectura del propio perfil. Escritura sólo por el backend |
| `phoneme_rubric` | Lectura para todo usuario autenticado. Escritura, nadie: se siembra por migración |

Las políticas se prueban **en las dos direcciones**: que el dueño ve lo suyo, y que un segundo perfil
**no** lo ve. Un test que sólo comprueba lo primero pasa con RLS desactivada.

---
## 9. BUILD ORDER

24 pasos, 7 epics. **El orden es el de `tasks.json` y no se reordena** por prioridad ni por lo que
parezca rápido. `priority` es metadato para recortes de alcance, no un orden de ejecución.

Cada paso lleva sus criterios de aceptación en forma EARS — *CUANDO `<disparador>` EL SISTEMA
DEBERÁ `<respuesta observable>`* — copiados **literalmente** del array `acceptance` de su tarea en
`tasks.json`, y un bloque `Verify` cuyos comandos salen con 0. Que el último salga con 0 es lo que
marca el paso como hecho.

### Por qué este orden, y no otro

Cuatro restricciones lo fijan. Si se rompe alguna, el build falla tarde y caro:

1. **Las trazas van antes que las funciones** — el paso 6 antes del 8. Sin una fila en `traces` por
   llamada se depura a ciegas y no existe modelo de coste que verificar.
2. **Las cuotas van antes de la primera llamada de voz** — el paso 7 antes del 16. Cobrar después de
   que el proveedor responda es el error clásico: cada sesión abandonada cuesta dinero no reservado.
3. **El derecho va antes de la función medida** — el epic 04 completo antes del 05. El bloqueo por
   plan se resuelve *antes* de la reserva de cuota, así que la ruta de voz nace ya protegida en vez
   de recibir un `if` retroactivo cuando ya hay tres sitios que abren el micrófono.
4. **Lo más difícil va al final** — texto (8–11), cobro (12–15), luego Afinar por turnos (16–18), y
   Conversar en tiempo real al final (19–20). Empezar por el tiempo real son tres semanas peleando
   con la detección de fin de turno sin nada usable. Al acabar el epic 03 la app ya enseña; al
   acabar el 04 ya puede cobrar.

### Step map

| # | Tarea | Epic | Depende de | Checkpoint |
|---|---|---|---|---|
| 1 | `E1-T1` — Tokens de diseño, tres fuentes y tema claro/oscuro | `01-fundamentos` | — | `step-01-tokens-tema` |
| 2 | `E1-T2` — Esqueleto de navegación con pestañas y estados vacíos | `01-fundamentos` | `E1-T1` | `step-02-navegacion` |
| 3 | `E1-T3` — Esquema Postgres consciente de variante, índices y políticas RLS | `01-fundamentos` | — | `step-03-esquema-variante-rls` |
| 4 | `E1-T4` — Auth con almacenamiento seguro y borrado de cuenta | `01-fundamentos` | `E1-T2`, `E1-T3` | `step-04-auth-borrado` |
| 5 | `E2-T1` — Backend Hono con entorno validado y salud ejecutable | `02-columna-agente` | `E1-T3` | `step-05-backend-hono` |
| 6 | `E2-T2` — Pasarela de modelo con trazas de coste y tokens | `02-columna-agente` | `E2-T1` | `step-06-pasarela-trazas` |
| 7 | `E2-T3` — Cuotas con ledger, reserva, liquidación y barrendero | `02-columna-agente` | `E2-T2` | `step-07-cuotas` |
| 8 | `E3-T1` — Currículo sembrado y ruta de lectura de lección | `03-curriculo-texto` | `E2-T1` | `step-08-curriculo-lecciones` |
| 9 | `E3-T2` — Ejercicios de lectura en cliente y servidor | `03-curriculo-texto` | `E3-T1`, `E1-T4` | `step-09-ejercicios-lectura` |
| 10 | `E3-T3` — Ejercicios de escritura corregidos por el modelo | `03-curriculo-texto` | `E3-T2`, `E2-T2` | `step-10-ejercicios-escritura` |
| 11 | `E3-T4` — Motor de repetición espaciada sobre error_items | `03-curriculo-texto` | `E3-T3` | `step-11-repeticion-espaciada` |
| 12 | `E4-T1` — Correo transaccional con dominio propio verificado | `04-identidad-cobro` | `E1-T4`, `E2-T1` | `step-12-correo-dominio` |
| 13 | `E4-T2` — Stripe Checkout, webhook idempotente y proyección de derechos | `04-identidad-cobro` | `E1-T3`, `E2-T1` | `step-13-stripe-webhook` |
| 14 | `E4-T3` — Portal de cliente y bloqueo de funciones medidas por plan | `04-identidad-cobro` | `E4-T2`, `E2-T3` | `step-14-portal-bloqueo-plan` |
| 15 | `E4-T4` — Página de venta estática y páginas legales | `04-identidad-cobro` | `E4-T2` | `step-15-web-venta-legales` |
| 16 | `E5-T1` — Pipeline de TTS con caché compartida en Storage | `05-voz-afinar` | `E4-T3`, `E3-T1` | `step-16-tts-cache` |
| 17 | `E5-T2` — Captura de audio en el cliente y relé WebSocket | `05-voz-afinar` | `E5-T1` | `step-17-rele-audio` |
| 18 | `E5-T3` — Azure STT con evaluación de pronunciación y medidor de fonemas | `05-voz-afinar` | `E5-T2` | `step-18-azure-pronunciacion` |
| 19 | `E6-T1` — Relé de Gemini Live en pt-PT con barge-in | `06-voz-conversar` | `E5-T3` | `step-19-gemini-conversar` |
| 20 | `E6-T2` — Instrumentación de latencia por segmento y panel | `06-voz-conversar` | `E6-T1` | `step-20-latencia` |
| 21 | `E7-T1` — Arnés de evaluación con casos dorados y CI | `07-endurecimiento-entrega` | `E3-T4`, `E6-T2` | `step-21-arnes-eval` |
| 22 | `E7-T2` — Límite de tasa y endurecimiento frente a abuso | `07-endurecimiento-entrega` | `E2-T2`, `E4-T3` | `step-22-limite-tasa` |
| 23 | `E7-T3` — Borrado RGPD verificado y ensayo de restauración de copia | `07-endurecimiento-entrega` | `E1-T4`, `E4-T2`, `E5-T3` | `step-23-rgpd-restauracion` |
| 24 | `E7-T4` — Telemetría, imagen de despliegue y distribución interna | `07-endurecimiento-entrega` | `E7-T1`, `E7-T2`, `E7-T3`, `E4-T4` | `step-24-telemetria-entrega` |

### Las reglas de un paso

- **Un paso = una sesión.** Si no cabe, está mal dimensionado.
- **Ningún `Verify` afirma estado del repositorio que sólo su propio `Checkpoint` podría producir.**
- **Nunca se edita un comando `Verify` para que pase.** Si falla, falla el paso.
- Todos los comandos se ejecutan **desde la raíz del proyecto**, no desde el bundle ni desde
  `the_profe-app/` o `the_profe-server/`. Las rutas dentro de `pnpm --dir the_profe-server run test <ruta>` son relativas
  a `the_profe-server/`.
- El **gate global** de §20.1 pasa antes de marcar cualquier paso como hecho.

---

## Epic 01 — Fundamentos

> Detalle completo y autocontenido en **`epics/01-fundamentos.md`**.

### Paso 1 · `E1-T1` — Tokens de diseño, tres fuentes y tema claro/oscuro

**Epic:** `01-fundamentos` · **Depende de:** nada — puede empezar ya · **Prioridad:** `p0`

**Archivos**

- `the_profe-app/constants/theme.ts`
- `the_profe-app/lib/theme-context.tsx`
- `the_profe-app/app/_layout.tsx`
- `the_profe-app/tests/theme.test.ts`
- `the_profe-app/tests/tokens.test.ts`

**Aceptación**

1. CUANDO `pnpm --dir the_profe-app run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.
2. CUANDO se resuelve la paleta semántica EL SISTEMA DEBERÁ devolver un valor hexadecimal para cada token del tema claro y del oscuro, sin ninguno indefinido.
3. CUANDO se resuelve el tema oscuro EL SISTEMA DEBERÁ devolver `#1E1B17` para `bg` y `#F0EADF` para `text`, y nunca `#000000` ni `#FFFFFF` para fondo o texto.
4. CUANDO el usuario no ha elegido tema EL SISTEMA DEBERÁ usar la preferencia del sistema como valor inicial, y CUANDO ha elegido uno explícitamente EL SISTEMA DEBERÁ usar el elegido y persistirlo.
5. CUANDO se registran las familias tipográficas EL SISTEMA DEBERÁ exponer `SourceSerif4` para portugués, `Inter` para interfaz y `CharisSIL` para el Alfabeto Fonético Internacional, con los tres archivos presentes en `the_profe-app/assets/fonts/`.
6. CUANDO `pnpm --dir the_profe-app run lint` se ejecuta EL SISTEMA DEBERÁ salir con 0, sin errores ni advertencias.

**Verify** — en orden, desde la raíz del proyecto:

```bash
test -f the_profe-app/assets/fonts/SourceSerif4-Regular.ttf
test -f the_profe-app/assets/fonts/Inter-Regular.ttf
test -f the_profe-app/assets/fonts/CharisSIL-Regular.ttf
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: Tokens de diseño, tres fuentes y tema claro/oscuro"
git tag step-01-tokens-tema
```

Primer paso: no hay objetivo de retroceso anterior al bootstrap.

### Paso 2 · `E1-T2` — Esqueleto de navegación con pestañas y estados vacíos

**Epic:** `01-fundamentos` · **Depende de:** `E1-T1` · **Prioridad:** `p0`

**Archivos**

- `the_profe-app/app/(tabs)/_layout.tsx`
- `the_profe-app/app/(tabs)/index.tsx`
- `the_profe-app/app/(tabs)/practicar.tsx`
- `the_profe-app/app/(tabs)/ajustes.tsx`
- `the_profe-app/tests/navigation.test.tsx`

**Aceptación**

1. CUANDO se monta el enrutador EL SISTEMA DEBERÁ registrar exactamente las rutas de pestaña `/`, `/practicar` y `/ajustes`, y ninguna otra pestaña.
2. CUANDO una pantalla de lista no tiene datos EL SISTEMA DEBERÁ renderizar un estado vacío con texto, y nunca una lista en blanco sin explicación.
3. CUANDO una pantalla está cargando EL SISTEMA DEBERÁ renderizar un estado de carga, y CUANDO su fuente de datos falla EL SISTEMA DEBERÁ renderizar un estado de error con un botón de reintento alcanzable por teclado.
4. CUANDO se renderiza la barra de pestañas EL SISTEMA DEBERÁ dar a cada destino un área táctil de al menos 44 por 44 píxeles y una etiqueta accesible, nunca sólo un icono.
5. CUANDO `pnpm --dir the_profe-app run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: Esqueleto de navegación con pestañas y estados vacíos"
git tag step-02-navegacion
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-01-tokens-tema`.

### Paso 3 · `E1-T3` — Esquema Postgres consciente de variante, índices y políticas RLS

**Epic:** `01-fundamentos` · **Depende de:** nada — puede empezar ya · **Prioridad:** `p0`

**Archivos**

- `supabase/migrations/**`
- `the_profe-server/src/env.ts`
- `the_profe-server/src/db/pool.ts`
- `the_profe-server/tests/sql/assert_schema.sql`
- `the_profe-server/tests/db/rls.test.ts`
- `the_profe-server/tests/sql/variant.test.ts`
- `the_profe-server/tests/sql/rls-billing.test.ts`
- `the_profe-server/tests/sql/disociacion.test.ts`

**Aceptación**

1. CUANDO `pnpm --dir the_profe-server run db:local:reset` se ejecuta contra una base vacía EL SISTEMA DEBERÁ crear todas las tablas que el esquema define y salir con 0.
2. CUANDO `pnpm --dir the_profe-server run db:local:assert` se ejecuta EL SISTEMA DEBERÁ resolver como `regclass`, sin error, cada tabla del esquema, incluidas `curriculum_units`, `profiles`, `audio_assets`, `budget_ledger` y `voice_sessions`.
3. CUANDO un perfil autenticado consulta `attempts` EL SISTEMA DEBERÁ devolver sólo sus propias filas, y CUANDO consulta las de otro perfil EL SISTEMA DEBERÁ devolver cero filas en lugar de un error.
4. CUANDO cualquier perfil autenticado consulta `audio_assets` con `kind = 'tts_cache'` EL SISTEMA DEBERÁ devolver la fila, y CUANDO consulta un `kind = 'user_recording'` de otro perfil EL SISTEMA DEBERÁ devolver cero filas.
5. CUANDO se intenta un `UPDATE` o un `DELETE` sobre `budget_ledger` EL SISTEMA DEBERÁ abortar con una excepción que nombre la tabla como append-only.
6. CUANDO se insertan dos filas de `audio_assets` con el mismo `text_hash`, la misma `voice` y `kind = 'tts_cache'` EL SISTEMA DEBERÁ rechazar la segunda por violación del índice único.
7. CUANDO se crea el tipo de variante EL SISTEMA DEBERÁ definirlo como enum `content_variant` con los valores `pt-PT` y `pt-BR`, y nunca como booleano, para que añadir una tercera variante no exija reescribir filas.
8. CUANDO se inserta cualquier fila de contenido sin variante explícita EL SISTEMA DEBERÁ aplicar `pt-PT` por defecto, y CUANDO se consulta contenido EL SISTEMA DEBERÁ filtrar por la variante objetivo del perfil.
9. CUANDO se consulta la rúbrica de fonemas EL SISTEMA DEBERÁ resolverla desde una tabla con clave de variante, no desde constantes en el código.
10. CUANDO un usuario autenticado consulta `subscriptions` o `entitlements` EL SISTEMA DEBERÁ devolver únicamente sus propias filas, y 0 filas para las de otro usuario.
11. CUANDO se declaran las claves ajenas de `traces.profile_id` y `budget_ledger.profile_id` EL SISTEMA DEBERÁ usar `on delete set null` y no `cascade`, y el trigger de sólo-anexado de `budget_ledger` DEBERÁ permitir exactamente la actualización de `profile_id` a `NULL` y ninguna otra, para que el borrado de cuenta pueda disociar sin romper la contabilidad.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run db:local:up
pnpm --dir the_profe-server run db:local:apply
pnpm --dir the_profe-server run db:local:assert
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run test tests/db/rls.test.ts
pnpm --dir the_profe-server run test tests/sql/variant.test.ts
pnpm --dir the_profe-server run test tests/sql/rls-billing.test.ts
pnpm --dir the_profe-server run test tests/sql/disociacion.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: Esquema Postgres consciente de variante, índices y políticas RLS"
git tag step-03-esquema-variante-rls
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-02-navegacion`.

### Paso 4 · `E1-T4` — Auth con almacenamiento seguro y borrado de cuenta

**Epic:** `01-fundamentos` · **Depende de:** `E1-T2`, `E1-T3` · **Prioridad:** `p0`

**Archivos**

- `the_profe-app/lib/supabase.ts`
- `the_profe-app/lib/session.tsx`
- `the_profe-app/app/(auth)/entrar.tsx`
- `supabase/migrations/**`
- `the_profe-server/tests/db/account-deletion.test.ts`

**Aceptación**

1. CUANDO se inicia sesión con un enlace mágico válido EL SISTEMA DEBERÁ crear una fila en `profiles` con `id` igual al del usuario de `auth.users` y guardar el token en `expo-secure-store`, nunca en AsyncStorage.
2. CUANDO no hay sesión y se abre una ruta protegida EL SISTEMA DEBERÁ redirigir a `/entrar` en lugar de renderizar la pantalla vacía.
3. CUANDO un perfil autenticado llama a `public.delete_my_account()` EL SISTEMA DEBERÁ borrar su fila de `profiles`, cascadear a sus `lessons`, `attempts`, `error_items`, `conversations` y `audio_assets` propios, y borrar su fila de `auth.users`.
4. CUANDO `public.delete_my_account()` se llama sin sesión EL SISTEMA DEBERÁ abortar con una excepción y no borrar ninguna fila.
5. CUANDO un perfil borra su cuenta EL SISTEMA DEBERÁ conservar las filas de `audio_assets` con `kind = 'tts_cache'`, porque la caché es compartida y no le pertenece.
6. CUANDO `pnpm --dir the_profe-app run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/db/account-deletion.test.ts
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: Auth con almacenamiento seguro y borrado de cuenta"
git tag step-04-auth-borrado
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-03-esquema-variante-rls`.

## Epic 02 — Columna vertebral del agente

> Detalle completo y autocontenido en **`epics/02-columna-agente.md`**.

### Paso 5 · `E2-T1` — Backend Hono con entorno validado y salud ejecutable

**Epic:** `02-columna-agente` · **Depende de:** `E1-T3` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/envelope.ts`
- `the_profe-server/src/app.ts`
- `the_profe-server/src/server.ts`
- `the_profe-server/src/env.ts`
- `the_profe-server/tests/http/health.test.ts`

**Aceptación**

1. CUANDO `pnpm --dir the_profe-server run build` se ejecuta EL SISTEMA DEBERÁ emitir `the_profe-server/dist/server.js`, que es exactamente la ruta que declara `main` en `the_profe-server/package.json` y la que arranca el `CMD` del Dockerfile.
2. CUANDO se arranca el artefacto construido y se pide `GET /healthz` EL SISTEMA DEBERÁ responder 200 con `ok` en verdadero y comprobar que la base de datos acepta una consulta, no sólo que el proceso está vivo.
3. CUANDO se pide una ruta inexistente bajo `/api/v1/` EL SISTEMA DEBERÁ responder 404 con el sobre de error y `code` igual a `NOT_FOUND`.
4. CUANDO un cuerpo de petición no valida contra su esquema EL SISTEMA DEBERÁ responder 422 con `code` igual a `VALIDATION_FAILED` y no ejecutar ninguna lógica de negocio.
5. CUANDO falta una variable de entorno que el paso 5 declara obligatoria EL SISTEMA DEBERÁ fallar al arrancar con un error que la nombre, en lugar de servir tráfico con un valor por defecto.
6. CUANDO `node the_profe-server/scripts/check-env.ts` se ejecuta con el entorno completo EL SISTEMA DEBERÁ salir con 0 e imprimir un resumen sin revelar ningún valor secreto.

**Verify** — en orden, desde la raíz del proyecto:

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
git add -A && git commit -m "E2-T1: Backend Hono con entorno validado y salud ejecutable"
git tag step-05-backend-hono
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-04-auth-borrado`.

### Paso 6 · `E2-T2` — Pasarela de modelo con trazas de coste y tokens

**Epic:** `02-columna-agente` · **Depende de:** `E2-T1` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/gateway/anthropic.ts`
- `the_profe-server/src/gateway/pricing.ts`
- `the_profe-server/src/gateway/trace.ts`
- `the_profe-server/tests/gateway/trace.test.ts`
- `the_profe-server/tests/gateway/pricing.test.ts`

**Aceptación**

1. CUANDO la pasarela completa una llamada a Claude EL SISTEMA DEBERÁ insertar exactamente una fila en `traces` con `provider` igual a `anthropic`, los tokens de entrada, salida y caché, `cost_micros` calculado desde el módulo de precios y `latency_ms`.
2. CUANDO una llamada a Claude falla o expira EL SISTEMA DEBERÁ insertar igualmente una fila en `traces` con el coste observado y responder con `code` igual a `UPSTREAM_FAILED` o `UPSTREAM_TIMEOUT`.
3. CUANDO se envía la segunda petición de una conversación con el mismo prefijo estable EL SISTEMA DEBERÁ registrar `cached_tokens` mayor que cero, probando que la caché de prompt acierta.
4. CUANDO se construye una petición EL SISTEMA DEBERÁ enviar `thinking` con tipo `adaptive` y NO DEBERÁ incluir `budget_tokens` ni un prefill de mensaje de asistente, porque ambos devuelven 400 en este modelo.
5. CUANDO se pide un formato estructurado EL SISTEMA DEBERÁ usar `output_config.format` y colocar `effort` dentro de `output_config`, nunca en el nivel superior.
6. CUANDO un módulo fuera de `the_profe-server/src/gateway/` importa el SDK de Anthropic EL SISTEMA DEBERÁ fallar el test de frontera que lo prohíbe.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/gateway/trace.test.ts
pnpm --dir the_profe-server run test tests/gateway/pricing.test.ts
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: Pasarela de modelo con trazas de coste y tokens"
git tag step-06-pasarela-trazas
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-05-backend-hono`.

### Paso 7 · `E2-T3` — Cuotas con ledger, reserva, liquidación y barrendero

**Epic:** `02-columna-agente` · **Depende de:** `E2-T2` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/budget/ledger.ts`
- `the_profe-server/src/budget/reserve.ts`
- `the_profe-server/src/budget/sweeper.ts`
- `the_profe-server/tests/budget/reserve.test.ts`
- `the_profe-server/tests/budget/concurrency.test.ts`

**Aceptación**

1. CUANDO se pide una sesión de voz y el saldo de segundos disponibles es suficiente EL SISTEMA DEBERÁ insertar una fila `hold` en `budget_ledger`, actualizar `voice_seconds_held` y crear una fila en `voice_sessions` con estado `queued`, todo en una sola transacción.
2. CUANDO el saldo disponible es menor que la reserva estimada EL SISTEMA DEBERÁ responder 402 con `code` igual a `QUOTA_EXCEEDED`, no crear ninguna fila en `voice_sessions` y dejar `budget_ledger` sin cambios.
3. CUANDO se lanzan 20 peticiones concurrentes de sesión contra un saldo que sólo alcanza para 5 EL SISTEMA DEBERÁ conceder exactamente 5, rechazar 15 con 402 y dejar `voice_seconds_held` igual a la suma de esas 5 reservas, sin ningún valor negativo.
4. CUANDO una sesión termina EL SISTEMA DEBERÁ insertar una fila `settle` con la duración real y el coste real del proveedor, y mover los segundos de `voice_seconds_held` a `voice_seconds_used`.
5. CUANDO se libera dos veces la misma sesión EL SISTEMA DEBERÁ dejar el saldo idéntico tras la segunda llamada, porque la clave de idempotencia está en `session_id`.
6. CUANDO el barrendero corre sobre una sesión sin estado terminal pasado su `expires_at` EL SISTEMA DEBERÁ marcarla `expired`, insertar una fila `release` y devolver los segundos al saldo disponible.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/budget/reserve.test.ts
pnpm --dir the_profe-server run test tests/budget/concurrency.test.ts
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T3: Cuotas con ledger, reserva, liquidación y barrendero"
git tag step-07-cuotas
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-06-pasarela-trazas`.

## Epic 03 — Currículo y texto

> Detalle completo y autocontenido en **`epics/03-curriculo-texto.md`**.

### Paso 8 · `E3-T1` — Currículo sembrado y ruta de lectura de lección

**Epic:** `03-curriculo-texto` · **Depende de:** `E2-T1` · **Prioridad:** `p0`

**Archivos**

- `supabase/seed/curriculum_a1_a2.sql`
- `the_profe-server/src/routes/curriculum.ts`
- `the_profe-server/src/routes/lessons.ts`
- `the_profe-server/tests/db/seed.test.ts`
- `the_profe-server/tests/http/curriculum.test.ts`

**Aceptación**

1. CUANDO la semilla del currículo se aplica EL SISTEMA DEBERÁ crear todas las unidades A1 y A2 que el archivo de semilla define, cada una con `objectives` no vacío y con al menos un elemento de `curriculum_items` cuya `ipa` esté presente.
2. CUANDO la semilla se aplica dos veces seguidas EL SISTEMA DEBERÁ dejar el mismo número de filas que tras la primera aplicación, porque está escrita como inserción idempotente sobre `code`.
3. CUANDO un perfil autenticado pide `GET /api/v1/curriculum/units` EL SISTEMA DEBERÁ devolver 200 con sólo las unidades publicadas, ordenadas por `cefr_level` y `ordinal`.
4. CUANDO un perfil pide `POST /api/v1/lessons` con el código de una unidad publicada EL SISTEMA DEBERÁ crear una fila en `lessons` con `status` igual a `active` y `started_at` no nulo, y devolver 200 con su identificador.
5. CUANDO un perfil pide una lección de otro perfil EL SISTEMA DEBERÁ responder 404 con `code` igual a `NOT_FOUND`, nunca 200 con datos ajenos.
6. CUANDO se revisa el temario EL SISTEMA DEBERÁ incluir al menos una unidad dedicada a vocales nasales, una a la ese final que suena /ʃ/ y una a los falsos amigos con el español.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/db/seed.test.ts
pnpm --dir the_profe-server run test tests/http/curriculum.test.ts
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T1: Currículo sembrado y ruta de lectura de lección"
git tag step-08-curriculo-lecciones
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-07-cuotas`.

### Paso 9 · `E3-T2` — Ejercicios de lectura en cliente y servidor

**Epic:** `03-curriculo-texto` · **Depende de:** `E3-T1`, `E1-T4` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/exercises/read.ts`
- `the_profe-server/src/routes/exercises.ts`
- `the_profe-app/lib/api.ts`
- `the_profe-app/features/lesson/ReadExercise.tsx`
- `the_profe-server/tests/http/exercises-read.test.ts`

**Aceptación**

1. CUANDO se abre una lección activa EL SISTEMA DEBERÁ crear sus ejercicios de tipo `read` con `ordinal` consecutivo desde 1 y sin huecos.
2. CUANDO se renderiza un ejercicio de lectura EL SISTEMA DEBERÁ mostrar el texto portugués en la familia serif y la glosa española y la interfaz en la familia sans, sin cruzarlas.
3. CUANDO se renderiza una transcripción fonética EL SISTEMA DEBERÁ usar la familia CharisSIL, de modo que ɐ̃ ʃ ʎ ɲ ɨ ɾ se dibujen como glifos y no como cuadros vacíos.
4. CUANDO un ejercicio de lectura se responde EL SISTEMA DEBERÁ insertar una fila en `attempts` con `score` entre 0 y 100 y avanzar el `ordinal` activo de la lección.
5. CUANDO se responden todos los ejercicios de una lección EL SISTEMA DEBERÁ poner su `status` en `completed` y `completed_at` no nulo.
6. CUANDO la petición de ejercicios falla EL SISTEMA DEBERÁ renderizar el estado de error con reintento, no una pantalla en blanco.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/http/exercises-read.test.ts
pnpm --dir the_profe-app run typecheck
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T2: Ejercicios de lectura en cliente y servidor"
git tag step-09-ejercicios-lectura
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-08-curriculo-lecciones`.

### Paso 10 · `E3-T3` — Ejercicios de escritura corregidos por el modelo

**Epic:** `03-curriculo-texto` · **Depende de:** `E3-T2`, `E2-T2` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/exercises/write.ts`
- `the_profe-server/src/prompts/correct-writing.md`
- `the_profe-app/features/lesson/WriteExercise.tsx`
- `the_profe-server/tests/exercises/write.test.ts`
- `the_profe-server/tests/exercises/write-errors.test.ts`

**Aceptación**

1. CUANDO se envía una respuesta escrita EL SISTEMA DEBERÁ devolver una corrección estructurada con la lista de errores, cada uno con su tipo en `phoneme`, `lexeme` o `grammar_rule` y su clave, validada contra el esquema antes de persistirse.
2. CUANDO la corrección se completa EL SISTEMA DEBERÁ insertar una fila en `attempts` con `feedback` no nulo y una fila por error en `error_items`, resolviendo el conflicto sobre `(profile_id, kind, key)` para no duplicar.
3. CUANDO la respuesta contiene un falso amigo con el español EL SISTEMA DEBERÁ marcarlo como error de tipo `lexeme` y nombrar la palabra española que lo induce.
4. CUANDO se corrige un ejercicio rutinario EL SISTEMA DEBERÁ usar `effort` igual a `low` dentro de `output_config`, y CUANDO interpreta un informe fonémico DEBERÁ usar `high`.
5. CUANDO el modelo devuelve una salida que no valida contra el esquema EL SISTEMA DEBERÁ responder con `code` igual a `UPSTREAM_FAILED` y no escribir ninguna fila en `error_items`.
6. CUANDO la corrección termina EL SISTEMA DEBERÁ haber escrito una fila en `traces` para esa llamada.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/exercises/write.test.ts
pnpm --dir the_profe-server run test tests/exercises/write-errors.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T3: Ejercicios de escritura corregidos por el modelo"
git tag step-10-ejercicios-escritura
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-09-ejercicios-lectura`.

### Paso 11 · `E3-T4` — Motor de repetición espaciada sobre error_items

**Epic:** `03-curriculo-texto` · **Depende de:** `E3-T3` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/srs/schedule.ts`
- `the_profe-server/src/routes/review.ts`
- `the_profe-app/features/review/DueList.tsx`
- `the_profe-server/tests/srs/schedule.test.ts`
- `the_profe-server/tests/http/review.test.ts`

**Aceptación**

1. CUANDO un error se acierta EL SISTEMA DEBERÁ incrementar su `strength` en 1 hasta un máximo de 8 y adelantar su `due_at` según el intervalo de ese nivel.
2. CUANDO un error se falla EL SISTEMA DEBERÁ reducir su `strength` a como máximo 1 y poner su `due_at` a no más de 10 minutos en el futuro.
3. CUANDO se pide `GET /api/v1/review/due` EL SISTEMA DEBERÁ devolver sólo los errores del perfil con `due_at` menor o igual a ahora, ordenados por `due_at` ascendente.
4. CUANDO no hay errores vencidos EL SISTEMA DEBERÁ devolver 200 con una lista vacía y el cliente DEBERÁ renderizar su estado vacío, nunca un error.
5. CUANDO se generan los ejercicios del día EL SISTEMA DEBERÁ priorizar los errores de tipo `phoneme` sobre los de tipo `lexeme` con el mismo `due_at`, porque la fonética es el cuello de botella del hispanohablante.
6. CUANDO se califica un error dos veces con la misma clave de idempotencia EL SISTEMA DEBERÁ dejar `strength` y `due_at` idénticos tras la segunda llamada.

**Verify** — en orden, desde la raíz del proyecto:

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
git add -A && git commit -m "E3-T4: Motor de repetición espaciada sobre error_items"
git tag step-11-repeticion-espaciada
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-10-ejercicios-escritura`.

## Epic 04 — Identidad, correo y cobro

> Detalle completo y autocontenido en **`epics/04-identidad-cobro.md`**.

### Paso 12 · `E4-T1` — Correo transaccional con dominio propio verificado

**Epic:** `04-identidad-cobro` · **Depende de:** `E1-T4`, `E2-T1` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/email/client.ts`
- `the_profe-server/src/email/templates.ts`
- `the_profe-server/src/email/log.ts`
- `the_profe-server/scripts/check-mail-dns.ts`
- `supabase/migrations/**`
- `the_profe-server/tests/email/plantillas.test.ts`
- `the_profe-server/tests/email/registro.test.ts`
- `docs/correo-dns.md`

**Aceptación**

1. CUANDO se importa `the_profe-server/src/email/client.ts` sin `RESEND_API_KEY` o sin `MAIL_FROM` EL SISTEMA DEBERÁ abortar el arranque nombrando la variable ausente, y nunca degradar a un envío silencioso.
2. CUANDO se comprueban los registros DNS del dominio remitente EL SISTEMA DEBERÁ encontrar publicados SPF, DKIM y DMARC, y CUANDO falte cualquiera de los tres EL SISTEMA DEBERÁ salir con código distinto de 0 nombrando el que falta.
3. CUANDO se envía un correo transaccional EL SISTEMA DEBERÁ escribir una fila en `email_log` con `kind`, `provider_id` y el destinatario en forma de hash, antes de devolver al llamante.
4. CUANDO Supabase Auth envía confirmación de correo o restablecimiento de contraseña EL SISTEMA DEBERÁ entregarlos por el SMTP de Resend desde el dominio propio, y nunca desde el remitente por defecto de Supabase.
5. CUANDO se renderiza cualquiera de las cinco plantillas EL SISTEMA DEBERÁ producir una versión de texto plano además de la HTML, y ninguna DEBERÁ contener un enlace de compra dirigido a la aplicación móvil.
6. CUANDO `pnpm --dir the_profe-server run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run check:env
pnpm --dir the_profe-server run check:mail-dns
pnpm --dir the_profe-server run test tests/email/plantillas.test.ts
pnpm --dir the_profe-server run test tests/email/registro.test.ts
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E4-T1: Correo transaccional con dominio propio verificado"
git tag step-12-correo-dominio
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-11-repeticion-espaciada`.

### Paso 13 · `E4-T2` — Stripe Checkout, webhook idempotente y proyección de derechos

**Epic:** `04-identidad-cobro` · **Depende de:** `E1-T3`, `E2-T1` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/billing/stripe.ts`
- `the_profe-server/src/billing/webhook.ts`
- `the_profe-server/src/billing/entitlements.ts`
- `the_profe-server/src/routes/billing.ts`
- `supabase/migrations/**`
- `the_profe-server/tests/billing/firma.test.ts`
- `the_profe-server/tests/billing/idempotencia.test.ts`
- `the_profe-server/tests/billing/derechos.test.ts`
- `the_profe-server/tests/billing/fixtures/eventos.json`

**Aceptación**

1. CUANDO se inicializa el cliente de Stripe EL SISTEMA DEBERÁ fijar `apiVersion` en `2026-08-26.dahlia` de forma explícita en el código, y nunca depender del valor por defecto del SDK.
2. CUANDO llega un webhook cuya firma no valida contra `STRIPE_WEBHOOK_SECRET` EL SISTEMA DEBERÁ responder 400 y no escribir ninguna fila en ninguna tabla.
3. CUANDO el mismo evento de Stripe se entrega dos veces EL SISTEMA DEBERÁ aplicarlo una sola vez, dejando exactamente una fila en `stripe_events` y el estado de la suscripción idéntico tras la segunda entrega.
4. CUANDO se procesa `checkout.session.completed` EL SISTEMA DEBERÁ escribir plan, periodo y `stripe_customer_id` en `subscriptions`, y dejar `entitlements` resuelto para ese usuario en la misma transacción.
5. CUANDO se procesa `customer.subscription.deleted` EL SISTEMA DEBERÁ dejar los derechos del usuario en el plan gratuito sin borrar su historial de suscripción.
6. CUANDO se consulta el estado de suscripción de un usuario EL SISTEMA DEBERÁ leerlo de la proyección local y nunca llamar a la API de Stripe en la ruta de lectura.
7. CUANDO `pnpm --dir the_profe-server run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

```bash
grep -q '2026-08-26.dahlia' the_profe-server/src/billing/stripe.ts
pnpm --dir the_profe-server run test tests/billing/firma.test.ts
pnpm --dir the_profe-server run test tests/billing/idempotencia.test.ts
pnpm --dir the_profe-server run test tests/billing/derechos.test.ts
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E4-T2: Stripe Checkout, webhook idempotente y proyección de derechos"
git tag step-13-stripe-webhook
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-12-correo-dominio`.

### Paso 14 · `E4-T3` — Portal de cliente y bloqueo de funciones medidas por plan

**Epic:** `04-identidad-cobro` · **Depende de:** `E4-T2`, `E2-T3` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/billing/plan-guard.ts`
- `the_profe-server/src/routes/billing.ts`
- `the_profe-app/features/plan/use-plan.ts`
- `the_profe-app/app/(tabs)/ajustes.tsx`
- `the_profe-server/tests/billing/bloqueo-plan.test.ts`
- `the_profe-server/tests/billing/portal.test.ts`
- `the_profe-app/tests/plan-sin-compra.test.ts`
- `the_profe-server/src/envelope.ts`
- `the_profe-server/src/app.ts`

**Aceptación**

1. CUANDO un usuario sin suscripción activa solicita abrir una sesión de voz EL SISTEMA DEBERÁ responder 402 con `code: "PLAN_REQUIRED"`, sin reservar cuota y sin crear fila de sesión.
2. CUANDO un usuario del plan gratuito ha consumido sus 3 minutos de voz del día EL SISTEMA DEBERÁ responder 402 con `code: "PLAN_LIMIT_REACHED"` e indicar en `details` los segundos restantes hasta el reinicio.
3. CUANDO el middleware de derechos resuelve un plan EL SISTEMA DEBERÁ hacerlo antes de la reserva de cuota, de modo que ninguna llamada a proveedor ocurra para un usuario sin derecho.
4. CUANDO un suscriptor activo solicita el portal EL SISTEMA DEBERÁ devolver una URL de Stripe Customer Portal de un solo uso, y CUANDO la solicita un usuario sin `stripe_customer_id` EL SISTEMA DEBERÁ responder 402 con `code: "PLAN_REQUIRED"`.
5. CUANDO un usuario autenticado consulta la suscripción de otro usuario EL SISTEMA DEBERÁ devolver 0 filas, y la prueba DEBERÁ comprobarlo en ambos sentidos.
6. CUANDO la aplicación móvil muestra el estado del plan EL SISTEMA DEBERÁ leerlo del backend y no DEBERÁ incluir ningún enlace, botón ni texto de compra.
7. CUANDO `pnpm --dir the_profe-server run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

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

**Checkpoint**

```bash
git add -A && git commit -m "E4-T3: Portal de cliente y bloqueo de funciones medidas por plan"
git tag step-14-portal-bloqueo-plan
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-13-stripe-webhook`.

### Paso 15 · `E4-T4` — Página de venta estática y páginas legales

**Epic:** `04-identidad-cobro` · **Depende de:** `E4-T2` · **Prioridad:** `p1`

**Archivos**

- `web/index.html`
- `web/precios.html`
- `web/privacidad.html`
- `web/terminos.html`
- `web/borrado-de-datos.html`
- `web/estilos.css`
- `the_profe-server/tests/web/tokens-web.test.ts`
- `the_profe-server/tests/web/enlaces.test.ts`
- `docs/despliegue-web.md`

**Aceptación**

1. CUANDO se sirve `web/` EL SISTEMA DEBERÁ hacerlo como HTML y CSS estáticos sin paso de compilación, sin framework y sin un tercer gestor de paquetes en el repositorio.
2. CUANDO se inspeccionan los colores de `web/estilos.css` EL SISTEMA DEBERÁ encontrar únicamente los valores hexadecimales declarados en `the_profe-app/constants/theme.ts`, y ningún otro.
3. CUANDO el visitante pulsa el botón de suscripción EL SISTEMA DEBERÁ redirigirlo a una sesión de Stripe Checkout creada por el backend, y nunca construir la URL de pago en el navegador.
4. CUANDO se publican las páginas legales EL SISTEMA DEBERÁ servir privacidad, términos y política de borrado de datos, cada una enlazada desde el pie de la página de venta.
5. CUANDO se registra el tratamiento de datos EL SISTEMA DEBERÁ declarar en la política de privacidad que se procesa voz, con qué subencargados y durante cuánto tiempo se conserva.
6. CUANDO se analiza el código del cliente móvil EL SISTEMA DEBERÁ no contener ninguna mención ni enlace de compra, pago, precio o suscripción, porque la venta ocurre sólo en la web.

**Verify** — en orden, desde la raíz del proyecto:

```bash
test -f web/index.html && test -f web/precios.html && test -f web/privacidad.html && test -f web/terminos.html && test -f web/borrado-de-datos.html
test ! -f web/package.json
pnpm --dir the_profe-server run test tests/web/tokens-web.test.ts
pnpm --dir the_profe-server run test tests/web/enlaces.test.ts
test -d the_profe-app/app && test -d the_profe-app/components && test -d the_profe-app/features
test -z "$(grep -rniE 'stripe|checkout|suscríbete|comprar|precio|€' the_profe-app/app the_profe-app/components the_profe-app/features || true)"
```

**Checkpoint**

```bash
git add -A && git commit -m "E4-T4: Página de venta estática y páginas legales"
git tag step-15-web-venta-legales
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-14-portal-bloqueo-plan`.

## Epic 05 — Voz: Afinar

> Detalle completo y autocontenido en **`epics/05-voz-afinar.md`**.

### Paso 16 · `E5-T1` — Pipeline de TTS con caché compartida en Storage

**Epic:** `05-voz-afinar` · **Depende de:** `E4-T3`, `E3-T1` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/voice/tts.ts`
- `the_profe-server/src/voice/storage.ts`
- `the_profe-server/src/routes/tts.ts`
- `the_profe-server/tests/voice/tts-cache.test.ts`
- `the_profe-server/tests/voice/tts-hash.test.ts`
- `the_profe-server/scripts/check-azure-voice.ts`

**Aceptación**

1. CUANDO se pide sintetizar un texto por primera vez EL SISTEMA DEBERÁ llamar a Azure TTS, guardar el audio en el almacén, insertar una fila en `audio_assets` con `kind` igual a `tts_cache`, `text_hash` y `voice`, y escribir una fila en `traces` con los caracteres facturados.
2. CUANDO se pide el mismo texto con la misma voz una segunda vez EL SISTEMA DEBERÁ servirlo desde la caché sin llamar a Azure y escribir una traza con `cost_micros` igual a 0.
3. CUANDO dos perfiles distintos piden el mismo texto con la misma voz EL SISTEMA DEBERÁ servir a los dos desde la misma fila de caché, porque `tts_cache` es legible por todos los perfiles autenticados.
4. CUANDO se calcula `text_hash` EL SISTEMA DEBERÁ hacerlo sobre el texto normalizado, de modo que dos textos que sólo difieren en espacios o en mayúsculas iniciales produzcan el mismo acierto de caché.
5. CUANDO se consulta el endpoint de lista de voces de la región configurada EL SISTEMA DEBERÁ encontrar en la respuesta el nombre corto de la voz configurada, validando el supuesto en lugar de confiar en la documentación.
6. CUANDO falta la clave de Azure EL SISTEMA DEBERÁ fallar al arrancar con un error que la nombre, y no intentar la llamada.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/tts-cache.test.ts
pnpm --dir the_profe-server run test tests/voice/tts-hash.test.ts
pnpm --dir the_profe-server run check:azure-voice
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E5-T1: Pipeline de TTS con caché compartida en Storage"
git tag step-16-tts-cache
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-15-web-venta-legales`.

### Paso 17 · `E5-T2` — Captura de audio en el cliente y relé WebSocket

**Epic:** `05-voz-afinar` · **Depende de:** `E5-T1` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/ws/afinar.ts`
- `the_profe-server/tests/ws/afinar.test.ts`
- `the_profe-app/features/voice/useRecorder.ts`
- `the_profe-app/features/voice/MicRing.tsx`
- `the_profe-app/tests/recorder.test.tsx`

**Aceptación**

1. CUANDO el cliente pide una sesión de voz EL SISTEMA DEBERÁ abrir el micrófono sólo después de una reserva confirmada, y CUANDO la respuesta es 402 NO DEBERÁ abrirlo en absoluto.
2. CUANDO el WebSocket está abierto EL SISTEMA DEBERÁ enviar un ping de mantenimiento cada 20 segundos en ambos sentidos, para que el proxy no corte la conexión en silencio.
3. CUANDO el cliente envía tramas de audio EL SISTEMA DEBERÁ reenviarlas al proveedor sin esperar al final del turno, de modo que ninguna etapa de la ruta bufferice la entrada completa.
4. CUANDO el socket se cierra sin haber liquidado la sesión EL SISTEMA DEBERÁ insertar una fila `release` y devolver los segundos reservados al saldo.
5. CUANDO el anillo del micrófono se anima EL SISTEMA DEBERÁ usar la amplitud real de entrada, y CUANDO la preferencia de reducir movimiento está activa DEBERÁ mostrar una barra de nivel estática en lugar de eliminar la señal.
6. CUANDO un módulo del cliente importa el SDK de Azure Speech EL SISTEMA DEBERÁ fallar el test de frontera, porque ese SDK no funciona dentro de React Native.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/ws/afinar.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E5-T2: Captura de audio en el cliente y relé WebSocket"
git tag step-17-rele-audio
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-16-tts-cache`.

### Paso 18 · `E5-T3` — Azure STT con evaluación de pronunciación y medidor de fonemas

**Epic:** `05-voz-afinar` · **Depende de:** `E5-T2` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/voice/azure-stt.ts`
- `the_profe-server/src/voice/score.ts`
- `the_profe-app/features/voice/PhonemeMeter.tsx`
- `the_profe-server/tests/voice/pronunciation.test.ts`
- `the_profe-server/tests/voice/no-prosody-in-converse.test.ts`

**Aceptación**

1. CUANDO una sesión en modo Afinar reconoce voz EL SISTEMA DEBERÁ pedir la evaluación de pronunciación con granularidad de fonema e insertar una fila en `pronunciation_scores` con `accuracy`, `fluency`, `completeness`, `words` y `phonemes`.
2. CUANDO se persiste una puntuación EL SISTEMA DEBERÁ no escribir ninguna columna de prosodia, porque la prosodia es exclusiva de en-US y una columna siempre nula es peor que su ausencia.
3. CUANDO una sesión está en modo Conversar EL SISTEMA DEBERÁ emitir cero llamadas con evaluación de pronunciación activada, para no pagar el recargo por hora que sólo corresponde a Afinar.
4. CUANDO un fonema puntúa 80 o más EL SISTEMA DEBERÁ mostrarlo en la banda oliva, entre 60 y 79 en ámbar y por debajo de 60 en terracota, y en los tres casos DEBERÁ acompañar el color con una etiqueta textual y una forma distinta.
5. CUANDO la puntuación produce errores de fonema EL SISTEMA DEBERÁ insertarlos o actualizarlos en `error_items` con tipo `phoneme`, de modo que la repetición espaciada los recoja.
6. CUANDO se guarda una grabación del usuario EL SISTEMA DEBERÁ fijar su `retention_until` y marcarla como privada de su dueño, nunca legible por otro perfil.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/pronunciation.test.ts
pnpm --dir the_profe-server run test tests/voice/no-prosody-in-converse.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-app run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E5-T3: Azure STT con evaluación de pronunciación y medidor de fonemas"
git tag step-18-azure-pronunciacion
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-17-rele-audio`.

## Epic 06 — Voz: Conversar

> Detalle completo y autocontenido en **`epics/06-voz-conversar.md`**.

### Paso 19 · `E6-T1` — Relé de Gemini Live en pt-PT con barge-in

**Epic:** `06-voz-conversar` · **Depende de:** `E5-T3` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/voice/gemini-live.ts`
- `the_profe-server/src/ws/conversar.ts`
- `the_profe-app/features/voice/ConverseScreen.tsx`
- `the_profe-server/tests/voice/barge-in.test.ts`
- `the_profe-server/tests/voice/gemini-config.test.ts`

**Aceptación**

1. CUANDO se abre una sesión de Conversar EL SISTEMA DEBERÁ conectar con un modelo de semi-cascada y fijar el código de idioma de `speech_config` a `pt-PT`, nunca con un modelo de audio nativo, que no admite fijar el idioma.
2. CUANDO se escribe el identificador del modelo en la configuración EL SISTEMA DEBERÁ haberlo resuelto antes contra la documentación en vivo y haber registrado la fuente, porque la lista de modelos que admiten fijar el idioma quedó sin verificar.
3. CUANDO el usuario interrumpe al tutor EL SISTEMA DEBERÁ parar la reproducción en 200 ms o menos Y truncar el historial de la conversación a las palabras que realmente se reprodujeron.
4. CUANDO se persiste un turno interrumpido EL SISTEMA DEBERÁ marcar `barge_in` en verdadero y guardar como `transcript` sólo lo que el usuario oyó, no lo que el modelo generó.
5. CUANDO la sesión termina EL SISTEMA DEBERÁ liquidar la reserva con los segundos reales y escribir una fila en `traces` con `provider` igual a `gemini_live` y los tokens de audio de entrada y salida.
6. CUANDO el proveedor se cae en mitad de la sesión EL SISTEMA DEBERÁ cerrar limpiamente, liberar la reserva y devolver `code` igual a `UPSTREAM_FAILED`, sin dejar la sesión colgada en `running`.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/barge-in.test.ts
pnpm --dir the_profe-server run test tests/voice/gemini-config.test.ts
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E6-T1: Relé de Gemini Live en pt-PT con barge-in"
git tag step-19-gemini-conversar
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-18-azure-pronunciacion`.

### Paso 20 · `E6-T2` — Instrumentación de latencia por segmento y panel

**Epic:** `06-voz-conversar` · **Depende de:** `E6-T1` · **Prioridad:** `p1`

**Archivos**

- `the_profe-server/src/voice/latency.ts`
- `the_profe-server/src/routes/latency.ts`
- `the_profe-app/features/diagnostics/LatencyPanel.tsx`
- `the_profe-server/tests/voice/latency.test.ts`

**Aceptación**

1. CUANDO un turno de voz se completa EL SISTEMA DEBERÁ persistir en la fila de `turns` los cinco campos de latencia por segmento —captura, reconocimiento, primer token del modelo, primer audio sintetizado y total— cada uno por separado y nunca sólo el total.
2. CUANDO se consulta el resumen de latencia EL SISTEMA DEBERÁ devolver p50 y p95 por segmento y nombrar el segmento más lento, para que se pueda atribuir el retraso.
3. CUANDO la suma de los segmentos no cuadra con la latencia total dentro de un margen de 50 ms EL SISTEMA DEBERÁ registrar una advertencia, porque significa que hay una etapa sin instrumentar.
4. CUANDO un turno excede 800 ms desde la última sílaba del usuario hasta el primer audio del tutor EL SISTEMA DEBERÁ marcarlo en el resumen como fuera de presupuesto.
5. CUANDO el panel de latencia se renderiza sin turnos EL SISTEMA DEBERÁ mostrar su estado vacío en lugar de una gráfica de ceros.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/voice/latency.test.ts
pnpm --dir the_profe-app run test
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E6-T2: Instrumentación de latencia por segmento y panel"
git tag step-20-latencia
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-19-gemini-conversar`.

## Epic 07 — Endurecimiento y entrega

> Detalle completo y autocontenido en **`epics/07-endurecimiento-entrega.md`**.

### Paso 21 · `E7-T1` — Arnés de evaluación con casos dorados y CI

**Epic:** `07-endurecimiento-entrega` · **Depende de:** `E3-T4`, `E6-T2` · **Prioridad:** `p1`

**Archivos**

- `the_profe-server/src/eval/runner.ts`
- `the_profe-server/eval/cases/text.json`
- `the_profe-server/eval/baseline.json`
- `the_profe-server/tests/eval/runner.test.ts`
- `.github/workflows/ci.yml`

**Aceptación**

1. CUANDO el arnés se ejecuta EL SISTEMA DEBERÁ puntuar todos los casos del archivo de casos de texto y devolver una tasa de acierto por etiqueta, nunca un único número agregado.
2. CUANDO la tasa de acierto de cualquier suite queda por debajo del umbral de la línea base comprometida EL SISTEMA DEBERÁ salir con código 1 y nombrar la suite y la etiqueta que bajó.
3. CUANDO la tasa de acierto iguala o supera el umbral EL SISTEMA DEBERÁ salir con 0 e imprimir la tasa por etiqueta.
4. CUANDO el arnés corre dos veces sobre los mismos casos y el mismo doble de proveedor EL SISTEMA DEBERÁ producir la misma tasa, porque la puntuación no depende del orden de ejecución.
5. CUANDO el flujo de integración continua se ejecuta EL SISTEMA DEBERÁ correr typecheck, lint, pruebas y el arnés de los dos paquetes, y fallar el trabajo si cualquiera de ellos falla.
6. CUANDO los casos de audio no se pueden ejecutar sin grabaciones reales EL SISTEMA DEBERÁ omitir esa suite declarándolo explícitamente en la salida, en lugar de darla por pasada.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run db:local:reset
pnpm --dir the_profe-server run test tests/eval/runner.test.ts
pnpm --dir the_profe-server run build
pnpm --dir the_profe-server run eval
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E7-T1: Arnés de evaluación con casos dorados y CI"
git tag step-21-arnes-eval
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-20-latencia`.

### Paso 22 · `E7-T2` — Límite de tasa y endurecimiento frente a abuso

**Epic:** `07-endurecimiento-entrega` · **Depende de:** `E2-T2`, `E4-T3` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/http/rate-limit.ts`
- `the_profe-server/src/routes/auth.ts`
- `the_profe-server/tests/http/limite-tasa.test.ts`
- `the_profe-server/tests/http/limite-altas.test.ts`
- `docs/limites.md`
- `the_profe-server/src/envelope.ts`
- `the_profe-server/src/app.ts`

**Aceptación**

1. CUANDO un mismo usuario supera el límite de peticiones de un endpoint de modelo en la ventana configurada EL SISTEMA DEBERÁ responder 429 con cabecera `Retry-After` y no llamar al proveedor.
2. CUANDO una misma dirección IP supera el límite de altas de cuenta en una hora EL SISTEMA DEBERÁ responder 429, para que el plan gratuito no se multiplique con cuentas desechables.
3. CUANDO el contador de un endpoint se consulta EL SISTEMA DEBERÁ resolverlo en memoria del proceso, y la limitación DEBERÁ quedar declarada en `docs/limites.md` como válida sólo para una instancia.
4. CUANDO el proceso se reinicia EL SISTEMA DEBERÁ empezar con los contadores a cero, y esa pérdida DEBERÁ estar declarada como aceptada en el registro de decisiones.
5. CUANDO `pnpm --dir the_profe-server run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run test tests/http/limite-tasa.test.ts
pnpm --dir the_profe-server run test tests/http/limite-altas.test.ts
test -f docs/limites.md
grep -q 'una sola instancia' docs/limites.md
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E7-T2: Límite de tasa y endurecimiento frente a abuso"
git tag step-22-limite-tasa
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-21-arnes-eval`.

### Paso 23 · `E7-T3` — Borrado RGPD verificado y ensayo de restauración de copia

**Epic:** `07-endurecimiento-entrega` · **Depende de:** `E1-T4`, `E4-T2`, `E5-T3` · **Prioridad:** `p0`

**Archivos**

- `the_profe-server/src/db/account-deletion.ts`
- `the_profe-server/scripts/restore-drill.sh`
- `the_profe-server/tests/db/borrado-cuenta.test.ts`
- `the_profe-server/tests/db/ledger-sobrevive.test.ts`
- `docs/retencion.md`

**Aceptación**

1. CUANDO un usuario borra su cuenta EL SISTEMA DEBERÁ dejar 0 filas con su identificador en `profiles`, `voice_sessions`, `error_items`, `email_log` y `subscriptions`, y 0 objetos suyos en el bucket de audio.
2. CUANDO un usuario borra su cuenta EL SISTEMA DEBERÁ conservar sus filas de `traces` y de `budget_ledger` con el identificador disociado, porque el ledger es de sólo anexado y la contabilidad debe sobrevivir al borrado.
3. CUANDO se ejecuta el ensayo de restauración EL SISTEMA DEBERÁ cargar un volcado en una base vacía, aplicar todas las migraciones y salir con 0, demostrando que la copia es restaurable y no sólo que existe.
4. CUANDO se consulta la política de retención EL SISTEMA DEBERÁ encontrarla declarada en `docs/retencion.md` con un plazo por tipo de dato, y el audio de pronunciación DEBERÁ tener el plazo más corto de todos.
5. CUANDO `pnpm --dir the_profe-server run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

```bash
pnpm --dir the_profe-server run test tests/db/borrado-cuenta.test.ts
pnpm --dir the_profe-server run test tests/db/ledger-sobrevive.test.ts
pnpm --dir the_profe-server run db:restore:drill
test -f docs/retencion.md
pnpm --dir the_profe-server run typecheck
pnpm --dir the_profe-server run lint
```

**Checkpoint**

```bash
git add -A && git commit -m "E7-T3: Borrado RGPD verificado y ensayo de restauración de copia"
git tag step-23-rgpd-restauracion
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-22-limite-tasa`.

### Paso 24 · `E7-T4` — Telemetría, imagen de despliegue y distribución interna

**Epic:** `07-endurecimiento-entrega` · **Depende de:** `E7-T1`, `E7-T2`, `E7-T3`, `E4-T4` · **Prioridad:** `p1`

**Archivos**

- `the_profe-server/src/obs/logger.ts`
- `the_profe-app/lib/reporting.ts`
- `.github/workflows/release.yml`
- `docs/LANZAMIENTO.md`
- `the_profe-server/tests/obs/logger.test.ts`

**Aceptación**

1. CUANDO el backend registra un evento EL SISTEMA DEBERÁ emitir JSON estructurado en una sola línea con un identificador de petición, y NO DEBERÁ incluir ninguna clave de proveedor, token de sesión ni transcripción completa.
2. CUANDO se construye la imagen del backend y se arranca el contenedor EL SISTEMA DEBERÁ responder 200 en `GET /healthz`, probando que la ruta que emite el build es la que arranca el contenedor.
3. CUANDO el cliente captura un error no manejado EL SISTEMA DEBERÁ pasarlo al reportero configurado, y CUANDO no hay destino de reporte configurado DEBERÁ registrarlo localmente sin fallar.
4. CUANDO se inspecciona `the_profe-app/eas.json` EL SISTEMA DEBERÁ encontrar los tres perfiles `development`, `preview` y `production`, cada uno con su canal y su variante de identificador.
5. CUANDO el flujo de release se ejecuta EL SISTEMA DEBERÁ construir la imagen del backend y validar la configuración de EAS sin publicar nada, dejando la subida a tiendas fuera del build.
6. CUANDO `pnpm --dir the_profe-server run test` se ejecuta EL SISTEMA DEBERÁ salir con 0, 0 fallos y 0 omitidos.

**Verify** — en orden, desde la raíz del proyecto:

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

**Checkpoint**

```bash
git add -A && git commit -m "E7-T4: Telemetría, imagen de despliegue y distribución interna"
git tag step-24-telemetria-entrega
```

Si este paso sale mal, el objetivo de retroceso es `git reset --hard step-23-rgpd-restauracion`.

### 9.1 Parity and cutover

**NO APLICABLE — proyecto nuevo (greenfield).** No hay sistema anterior en producción, ni usuarios
que migrar, ni datos que trasvasar, así que no existe una superficie con la que alcanzar paridad ni
un momento de conmutación que planificar. Si en el futuro se migrara a otro proveedor de voz, esa
sí sería una migración con paridad y conmutación, y necesitaría su propio blueprint.

---
## 10. Environment Setup

### Prerequisites

| Requisito | Versión | Comprobación |
|---|---|---|
| Node.js | **24.21.0** (pinado en `.nvmrc`) | `node -v` |
| **pnpm** | **12.8.1** — requisito duro, no preferencia | `pnpm -v` **debe** decir `12.x`. Con una instalación independiente: `pnpm self-update 12.8.1`. Sin pnpm previo: `corepack enable && corepack prepare pnpm@12.8.1 --activate` |
| Docker | Corriendo, no sólo instalado | `docker info` |
| `rsync`, `unzip`, `curl` | Los del sistema | `command -v rsync unzip curl` |
| Git | Cualquiera reciente | Los checkpoints son tags: sin repositorio no hay retroceso |
| Xcode / Android Studio | Sólo desde el paso 17 | La captura de audio necesita un development build en hardware |

**Docker debe estar corriendo antes del bootstrap.** Es el fallo más probable en una máquina limpia, y
el bloque de abajo lo comprueba primero para fallar con un mensaje accionable en vez de colgarse.

**pnpm 12 no es una preferencia, es un requisito.** `allowBuilds` y `minimumReleaseAge` son claves de
la 11 en adelante: una pnpm 10 **las ignora en silencio** e instala sin ninguna de las dos
protecciones. Es el peor resultado posible porque parece que funcionó. Por eso el bootstrap lo afirma
y aborta, en lugar de limitarse a imprimir la versión.

**Dos trampas reales al llegar a la 12**, ambas vistas el 2026-09-30 en una máquina de desarrollo:

- **Corepack no gana si ya hay un pnpm independiente antes en el `PATH`** (Homebrew, el instalador
  standalone, `~/Library/pnpm`). `corepack prepare` anuncia «Preparing pnpm@12.8.1» y a continuación
  `pnpm -v` sigue devolviendo la versión vieja: el shim de corepack queda tapado. En ese caso la vía
  es `pnpm self-update`, no corepack.
- **`EACCES` sobre `~/Library/pnpm/.tools`** al auto-actualizarse. Ese directorio suele acabar siendo
  de `root` por un `sudo` antiguo, y es justo donde pnpm guarda las versiones que gestiona.
  Se arregla devolviéndolo a tu usuario: `sudo chown -R "$(whoami)" ~/Library/pnpm`.

### Accounts to create first

Empezar el día uno: los cuatro primeros tienen cola o verificación ajena, y el primero **bloquea el
lanzamiento, no el desarrollo**.

| Cuenta | Para qué | Cuándo se necesita |
|---|---|---|
| **Entidad legal** (autónomo o sociedad) | **Stripe no abre cuenta de cobro a nadie sin alta.** Es la primera tarea no-código del proyecto | Día uno — es la de plazo más largo y la única que no depende de ti |
| **Apple Developer Program** | TestFlight y después la tienda | Día uno — la verificación de identidad tarda |
| **Google Play Console** | Pruebas internas y después la tienda | Día uno — una cuenta nueva puede tardar días |
| **Dominio propio** | Remitente de correo y `web/`. SPF, DKIM y DMARC se publican sobre él | Día uno — la reputación del dominio se construye con el tiempo |
| **Supabase** | Base, auth, storage. **Plan Pro:** el gratuito pausa el proyecto por inactividad, y un producto de pago no puede dormirse | Paso 3 |
| **Anthropic** | Claude Opus 5 | Paso 6 |
| **Resend** | Correo transaccional, y SMTP de Supabase Auth | Paso 12 |
| **Stripe** (con **Stripe Tax** activado) | Cobro y IVA por país vía OSS | Paso 13 |
| **Cloudflare** | Pages para `web/`, y DNS del dominio | Paso 15 |
| **Azure** (recurso Speech, región `westeurope`) | STT, evaluación, TTS | Paso 16 |
| **Google AI Studio** | Gemini Live | Paso 19 |
| **Railway** | Backend | Paso 24 |

### Environment variables

**Una variable es obligatoria sólo desde el paso que la consume.** `the_profe-server/src/env.ts` valida por
capas, para que añadir una variable nueva no rompa el gate de un paso anterior.

| Variable | Obligatoria desde | La lee |
|---|---|---|
| `PORT`, `TEST_DATABASE_URL` | paso 5 | `the_profe-server/src/env.ts` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | paso 5 | `the_profe-server/src/db/` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | paso 6 | `the_profe-server/src/gateway/anthropic.ts` |
| `VOICE_QUOTA_SECONDS_PER_PERIOD`, `COST_MICROS_CAP_PER_PERIOD` | paso 7 | `the_profe-server/src/budget/` |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_DOMAIN` | paso 12 | `the_profe-server/src/email/`, `the_profe-server/scripts/check-mail-dns.ts` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | paso 13 | `the_profe-server/src/billing/` |
| `STRIPE_PORTAL_RETURN_URL`, `WEB_BASE_URL` | paso 14 | `the_profe-server/src/billing/`, `the_profe-server/src/routes/billing.ts` |
| `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_MAX_PER_USER`, `RATE_LIMIT_MAX_SIGNUPS_PER_IP` | paso 22 | `the_profe-server/src/http/rate-limit.ts` |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_TTS_VOICE` | paso 16 | `the_profe-server/src/voice/` |
| `GEMINI_API_KEY`, `GEMINI_LIVE_MODEL` | paso 19 | `the_profe-server/src/voice/gemini-live.ts` |
| `EXPO_PUBLIC_*` | según `the_profe-app/.env.example` | el cliente |
| `SKIP_DB_CHECK` | nunca en local ni en producción | `the_profe-server/src/env.ts`. Sólo la comprueba el gate del paso 24, que arranca la imagen del contenedor **sin base de datos** para probar que la ruta que emite el build es la que arranca el `CMD`. Puesta en cualquier otro sitio, convierte `/healthz` en una mentira: devolvería 200 sin haber tocado Postgres |
| `PROFE_STEP` | nunca obligatoria | `the_profe-server/scripts/check-env.ts`. **Contrato:** sin ella se valida la capa base (paso 5), que es lo que necesitan el bootstrap y el gate del paso 5; `PROFE_STEP=6`, `=12`, `=13`, `=16` o `=19` añaden las capas de Anthropic, correo, Stripe, Azure y Gemini; `PROFE_STEP=99` exige todo y es el gate de release, nunca el de un paso. Exigir todo por defecto obligaría a inventarse secretos de proveedores cuyo código aún no existe |

**`SUPABASE_SERVICE_ROLE_KEY` salta RLS por completo.** Vive sólo en el backend, nunca en una
variable `EXPO_PUBLIC_*`, nunca en el bundle del cliente. **Lo mismo vale para
`STRIPE_SECRET_KEY` y `RESEND_API_KEY`:** cualquiera de las tres en una variable `EXPO_PUBLIC_*` es
pública, porque el bundle de JavaScript es legible en el dispositivo.

**`STRIPE_WEBHOOK_SECRET` no es la clave de API.** Es un secreto distinto, por endpoint, que Stripe
muestra al crear el webhook, y empieza por `whsec_`. Confundirlos da un 400 permanente en la
verificación de firma que se lee como «Stripe no me llega», cuando en realidad llega y se rechaza.

**Herramientas autónomas cargan su propio entorno.** `scripts/apply-migrations.sh` y
`scripts/check-env.ts` se ejecutan fuera del proceso del servidor, así que nada les carga `.env`:
lo hacen ellos explícitamente. Un script que asume un entorno que nadie cargó falla con un error que
parece de base de datos.

### Files that must be committed

| Archivo | Por qué |
|---|---|
| `the_profe-server/.env.example`, `the_profe-app/.env.example` | Todos los nombres de variable que el código lee, con valores locales literales. Sin ellos el bootstrap no puede crear un `.env` que funcione |
| `docker-compose.yml` | La base local de los gates |
| `supabase/migrations/**` | Fuente única del esquema |
| `supabase/seed/curriculum_a1_a2.sql` | El temario **es** contenido versionado |
| `.claude/**` | Lo lee cada sesión del constructor |
| `blueprints/profe/**` | Este bundle es la fuente del build |
| `.nvmrc` | Reproducibilidad del toolchain |
| `the_profe-app/pnpm-workspace.yaml`, `the_profe-server/pnpm-workspace.yaml` | Los ajustes reales de instalación de pnpm. Sin ellos la instalación se comporta distinto en cada máquina |
| `the_profe-app/pnpm-lock.yaml`, `the_profe-server/pnpm-lock.yaml` | El lockfile **es** el registro de lo que se auditó. Commitearlo es la mitad del valor de usar pnpm |

Nunca: `.env` con valores reales, `node_modules/`, `the_profe-server/dist/`, `the_profe-app/ios/`, `the_profe-app/android/`.

### Assets to obtain before step 1

Las tres fuentes. El gate de `E1-T1` afirma que los tres archivos existen, y **eso es correcto**: sin
Charis SIL el medidor de fonemas muestra cuadros vacíos en vez de símbolos del AFI.

| Archivo destino | Origen | Verificado |
|---|---|---|
| `the_profe-app/assets/fonts/SourceSerif4-Regular.ttf` | `raw.githubusercontent.com/google/fonts` — `ofl/sourceserif4`, fuente variable | 2026-09-30, HTTP 200, 1.209.508 bytes |
| `the_profe-app/assets/fonts/Inter-Regular.ttf` | `raw.githubusercontent.com/google/fonts` — `ofl/inter`, fuente variable | 2026-09-30, HTTP 200, 876.576 bytes |
| `the_profe-app/assets/fonts/CharisSIL-Regular.ttf` | `github.com/silnrsi/font-charis`, release `v7.000`, dentro de `Charis-7.000.zip` como `Charis-7.000/Charis-Regular.ttf` | 2026-09-30, HTTP 200, 10.497.481 bytes |

Dos notas que ahorran una hora de depuración:

- **En la v7 la familia se renombró de «Charis SIL» a «Charis»**, y el archivo dentro del zip se llama
  `Charis-Regular.ttf`. El bootstrap lo **renombra** a `CharisSIL-Regular.ttf` porque ése es el nombre
  que esperan `tasks.json` y los epics. No cambies los 42 archivos por un nombre de fuente.
- Source Serif 4 e Inter son **fuentes variables**. `expo-font` las carga, y se registran bajo el
  nombre de familia que fija `E1-T1`. Si más adelante hacen falta pesos distintos del predeterminado,
  se descargan las estáticas del mismo repositorio; no cambia nada más.

La cobertura del AFI de Charis se verificó el 2026-09-30 parseando la tabla `cmap` del propio archivo:
ɐ U+0250, ʃ U+0283, ʎ U+028E, ɲ U+0272, ɨ U+0268, ɾ U+027E y el tilde combinante U+0303 están todos
presentes, sobre 2.660 glifos mapeados.

### Bootstrap

**Se ejecuta verbatim, en orden, y debe salir 0 las dos veces.** Cada comando es no interactivo,
seguro sobre un árbol que ya lo tiene todo, y sale 0 en su propio camino de no-operación.

```bash
# ---------------------------------------------------------------------------
# 0. Requisitos. Fallar aquí, claro, en vez de a mitad de la instalación.
# ---------------------------------------------------------------------------
node -v                                  # espera v24.x
command -v rsync unzip curl              # espera tres rutas
docker info > /dev/null 2>&1 || { echo "ERROR: Docker no está corriendo. Arráncalo y repite." >&2; exit 1; }

# pnpm 12 es requisito duro: `allowBuilds` y `minimumReleaseAge` son claves de
# la 11 en adelante. Una pnpm 10 las IGNORA EN SILENCIO y te instala sin ninguna
# de las dos protecciones — que es el peor resultado posible, porque parece que
# funcionó.
#
# Esto es una ASERCIÓN, no un `pnpm -v` informativo. Imprimir la versión y
# seguir adelante es un gate que no cierra: verificado el 2026-09-30 en una
# máquina donde corepack anunció «Preparing pnpm@12.8.1» y acto seguido
# `pnpm -v` devolvió 10.28.1, sin que nada fallara.
#
# COREPACK NO SIRVE SI YA HAY UN pnpm INDEPENDIENTE ANTES EN EL PATH (Homebrew,
# el instalador standalone, ~/Library/pnpm): su shim queda tapado y la versión
# vieja sigue mandando. Por eso aquí no se invoca corepack a ciegas: se
# comprueba el resultado y se dice cómo llegar a él según lo que ya tengas.
PNPM_MAJOR="$(pnpm -v 2>/dev/null | cut -d. -f1 || echo 0)"
if [ "${PNPM_MAJOR:-0}" -lt 12 ] 2>/dev/null; then
  echo "ERROR: se requiere pnpm 12+; encontrado: $(pnpm -v 2>/dev/null || echo 'ninguno')." >&2
  echo "  Si ya tienes pnpm instalado aparte:  pnpm self-update 12.8.1" >&2
  echo "  Si no tienes pnpm:                   corepack enable && corepack prepare pnpm@12.8.1 --activate" >&2
  echo "" >&2
  echo "  Si eso falla con EACCES sobre ~/Library/pnpm/.tools, ese directorio es" >&2
  echo "  de root (suele venir de un sudo antiguo). Devuélvelo a tu usuario:" >&2
  echo "    sudo chown -R \"\$(whoami)\" ~/Library/pnpm" >&2
  exit 1
fi
pnpm -v                                  # ya garantizado 12.x

# ---------------------------------------------------------------------------
# 1. Repositorio. Los checkpoints de §9 son tags: sin repo no hay retroceso.
#    `git init` sobre un repo existente es seguro, pero el guard evita el ruido.
# ---------------------------------------------------------------------------
git rev-parse --git-dir > /dev/null 2>&1 || git init -q

# ---------------------------------------------------------------------------
# 2. Cliente Expo. Lo crea EL SCAFFOLDER, no el blueprint: por eso no existe
#    ningún the_profe-app/package.json bajo workspace/. Sin instalar todavía — las
#    configuraciones del paso 3 tienen que estar en su sitio antes.
#
#    Las banderas y la redirección son obligatorias, cada una por su razón:
#    --no-install     las configuraciones del paso 3 deben estar antes de instalar.
#    --no-agents-md   si no, escribe su propio the_profe-app/AGENTS.md y
#                     the_profe-app/.claude/settings.json, que competirían con los
#                     nuestros de la raíz. Dos configuraciones, ningún árbitro.
#    --yes            toma los valores por defecto del resto de opciones.
#    < /dev/null      ESTO NO ES OPCIONAL, y `--yes` NO lo sustituye. Como el
#                     paso 1 ya creó el repositorio, el scaffolder pregunta
#                     «¿saltar la creación de un repo git?» AUNQUE se le pase
#                     --yes. Verificado el 2026-09-30: la pregunta se imprime
#                     igual. Sin terminal se resuelve sola a «sí», pero eso es
#                     accidental: en una terminal real se queda esperando. Cerrar
#                     la entrada estándar hace que el comportamiento sea el mismo
#                     en todas partes, que es lo que necesita un build desatendido.
# ---------------------------------------------------------------------------
#    `pnpm create expo` y no `pnpm dlx create-expo-app`: el scaffolder elige el
#    gestor de paquetes SEGÚN CÓMO SE LE INVOCA. Llamado con pnpm, escribe un
#    proyecto que espera pnpm; llamado de otra forma, deja rastros de npm que
#    luego chocan con el lockfile.
[ -d the_profe-app ] || pnpm create expo@latest the_profe-app \
  --template blank-typescript --yes --no-install --no-agents-md < /dev/null

# La plantilla blank-typescript trae un punto de entrada de App.tsx que
# expo-router no usa: `main` pasa a ser "expo-router/entry" más abajo. Estos
# tres archivos quedarían muertos, y App.tsx además rompe el lint por no estar
# referenciado desde ninguna ruta.
rm -f the_profe-app/app.json                    # usamos app.config.ts, con variantes por entorno
rm -f the_profe-app/App.tsx the_profe-app/index.ts

# ---------------------------------------------------------------------------
# 3. workspace/ a la raíz del proyecto. UNA sola copia y ya está todo en su
#    sitio: CLAUDE.md, AGENTS.md, .claude/ y cada configuración de §19.6.
#
#    El marcador es lo que hace correcta la SEGUNDA pasada. La primera vez se
#    sobrescribe (nuestro the_profe-app/tsconfig.json debe ganar al del scaffolder);
#    a partir de ahí se omite, para no revertir lo que escribieron los pasos.
#    NUNCA `cp -n`: en macOS sale 1 cuando se salta un archivo existente y en
#    GNU sale 0, así que el mismo comando aborta la recuperación en un Mac.
# ---------------------------------------------------------------------------
if [ ! -f .workspace-applied ]; then
  rsync -a blueprints/profe/workspace/ ./
  date -u +%Y-%m-%dT%H:%M:%SZ > .workspace-applied
else
  echo "workspace/ ya aplicado; se omite (correcto en la segunda pasada)."
fi

# ---------------------------------------------------------------------------
# 4. Fuentes. Guard por archivo: la segunda pasada no descarga nada.
# ---------------------------------------------------------------------------
mkdir -p the_profe-app/assets/fonts
[ -f the_profe-app/assets/fonts/SourceSerif4-Regular.ttf ] || curl -fsSL \
  -o the_profe-app/assets/fonts/SourceSerif4-Regular.ttf \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf"
[ -f the_profe-app/assets/fonts/Inter-Regular.ttf ] || curl -fsSL \
  -o the_profe-app/assets/fonts/Inter-Regular.ttf \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
[ -f the_profe-app/assets/fonts/CharisSIL-Regular.ttf ] || { \
  curl -fsSL -o /tmp/charis-7.000.zip \
    "https://github.com/silnrsi/font-charis/releases/download/v7.000/Charis-7.000.zip" && \
  unzip -o -j /tmp/charis-7.000.zip "Charis-7.000/Charis-Regular.ttf" -d the_profe-app/assets/fonts && \
  mv the_profe-app/assets/fonts/Charis-Regular.ttf the_profe-app/assets/fonts/CharisSIL-Regular.ttf; }

# ---------------------------------------------------------------------------
# 5. Dependencias del cliente. `pnpm dlx expo install` respeta el conjunto emparejado
#    del SDK 57; `pnpm add` traería el `latest` del registro y rompería la
#    compilación nativa. Los paquetes SIN código nativo sí van por `pnpm add`.
# ---------------------------------------------------------------------------
pnpm --dir the_profe-app install
cd the_profe-app

# react-dom PRIMERO, y por `expo install`, no por `pnpm add`. No es opcional y no es
# para la web: sin fijarlo, el `pnpm add` de más abajo resuelve react-dom a
# la última del registro (19.3.0), que exige `react@^19.3.0`, mientras Expo fija
# react 19.2.3 — y los dos `pnpm add` siguientes ABORTAN con ERESOLVE sin
# instalar nada. Expo lo trae como peer opcional, así que sólo aparece cuando el
# resolutor lo busca. `expo install` lo fija en 19.2.3, la versión que dicta el
# SDK, y el conflicto desaparece. Verificado el 2026-09-30.
pnpm dlx expo install react-dom

pnpm dlx expo install expo-router expo-font expo-splash-screen expo-audio expo-speech \
  expo-secure-store expo-sqlite expo-file-system expo-notifications expo-dev-client \
  react-native-reanimated react-native-worklets react-native-gesture-handler \
  react-native-screens react-native-safe-area-context react-native-svg
pnpm add nativewind@^4.2.7 @tanstack/react-query@^5.104.0 @supabase/supabase-js@^2.117.2
pnpm add -D tailwindcss@~3.4.17 jest-expo@~57.0.5 eslint-config-expo@~57.0.2 \
  eslint@^9 typescript@~6.0.3 @types/react@~19.2.2
# Scripts del cliente, TODAVÍA dentro de the_profe-app/. `pnpm pkg set` es idempotente:
# fijar el mismo valor dos veces sale 0. Esto es la EDICIÓN del blueprint sobre
# el manifiesto que creó el scaffolder, que es la única forma en que lo toca.
# Se ejecutan aquí y no con `--dir` porque `pkg` opera sobre el manifiesto del
# directorio actual: depender de una bandera para lo que un `cd` ya resuelve es
# una forma barata de que falle en una versión futura.
pnpm pkg set main="expo-router/entry"
pnpm pkg set packageManager="pnpm@12.8.1"
pnpm pkg set scripts.start="expo start --dev-client"
pnpm pkg set scripts.typecheck="tsc --noEmit"
pnpm pkg set scripts.lint="eslint ."
pnpm pkg set scripts.test="jest --ci --passWithNoTests"

cd ..

# ---------------------------------------------------------------------------
# 6. Backend. Su package.json SÍ lo emite el blueprint (§19.6): aquí no hay
#    scaffolder, así que el archivo llegó con workspace/ en el paso 3.
# ---------------------------------------------------------------------------
pnpm --dir the_profe-server install

# ---------------------------------------------------------------------------
# 7. Entorno. Los .env.example se commitean; los .env con valores reales no.
# ---------------------------------------------------------------------------
[ -f the_profe-server/.env ] || cp the_profe-server/.env.example the_profe-server/.env
[ -f the_profe-app/.env ] || cp the_profe-app/.env.example the_profe-app/.env

# AQUÍ NO SE VALIDA EL ENTORNO, y es deliberado. `pnpm run check:env` ejecuta
# `scripts/check-env.ts`, que importa `src/env.ts` — un archivo que escribe el
# PASO 5, no el bootstrap. Llamarlo aquí falla con ERR_MODULE_NOT_FOUND sobre un
# módulo que todavía no tiene por qué existir, y ese error se lee como una
# instalación rota cuando en realidad el bootstrap hizo su trabajo bien.
# El bootstrap instala el toolchain y coloca el árbol; los pasos escriben
# archivos. La validación de entorno es el `Verify` del paso 5.
# Verificado el 2026-09-30: con esta línea presente, el bootstrap no completa.

# ---------------------------------------------------------------------------
# 8. Base de datos local. `up -d --wait` sólo devuelve 0 cuando el healthcheck
#    pasa, así que ningún gate corre contra una base que aún no acepta
#    conexiones. Es idempotente: sobre un contenedor ya arriba sale 0.
# ---------------------------------------------------------------------------
pnpm --dir the_profe-server run db:local:up

echo "Bootstrap completo. Siguiente: /architect-next"
```

**La primera instalación puede fallar a propósito, y eso es el mecanismo funcionando.** pnpm no
ejecuta scripts de instalación de dependencias que no estén en `allowBuilds`, y con `strictDepBuilds`
—activo por defecto— la instalación **falla** en vez de avisar. Los `pnpm-workspace.yaml` emitidos
traen una lista de partida corta a propósito; no pretende ser completa, porque el conjunto exacto de
paquetes con scripts depende del árbol resuelto.

Lo que verás en la primera pasada: pnpm añade a `pnpm-workspace.yaml` cada dependencia con scripts sin
revisar, con un valor provisional, y aborta. **Ese es el momento de revisión, y es el motivo de usar
pnpm.** Mira qué pide ejecutar scripts, decide una por una, y ponlas a `true` o `false`:

```bash
pnpm --dir the_profe-app approve-builds        # interactivo: aprueba o rechaza cada una
pnpm --dir the_profe-server approve-builds
```

Después, repite el bloque desde el principio. El resultado de esa revisión —la lista `allowBuilds`
final— **se commitea**: es parte del registro de lo que se auditó, igual que el lockfile.

Si prefieres no aprobar nada y seguir, `strictDepBuilds: false` degrada el fallo a aviso. No lo
recomiendo: convierte una puerta en un mensaje que nadie lee.

**Por qué no hay `typecheck` ni `lint` al final de este bloque.** El bootstrap instala el toolchain y
coloca el árbol; **el paso 1 es quien escribe archivos**. `the_profe-server/src/` todavía no existe, y `tsc`
sobre un proyecto sin entradas falla. Los gates de compilación pertenecen a §9, donde hay código que
comprobar, y a §20.1 como puerta global.

**Ni el linter del cliente ni el del backend caminan `blueprints/`.** `eslint .` se ejecuta desde
`the_profe-app/` y `biome check .` desde `the_profe-server/`, así que ninguno de los dos puede encontrar la segunda
copia de su propia configuración que vive bajo `blueprints/profe/workspace/`. Esto no es casualidad:
es la razón de que no exista una configuración de linter en la raíz del repositorio.

---

## 11. Dependencies

### Version provenance

Todo verificado contra registros y artefactos en vivo: el stack original el **2026-09-30**, y las
dependencias de cobro, correo y variante el **2026-10-03**. Un hueco honesto vale más que un pin
equivocado: lo no verificado se marca, no se rellena.

| Paquete / servicio | Versión | Origen | Estado |
|---|---|---|---|
| `expo` | `~57.0.26` | `registry.npmjs.org/-/package/expo/dist-tags` | VERIFICADO |
| `react` / `react-dom` | `19.2.3` | `expo@57.0.26/bundledNativeModules.json` | VERIFICADO |
| `react-native` | `0.86.3` | dictado por SDK 57. El `latest` del registro es 0.87.1 (línea SDK 58) | VERIFICADO |
| `expo-router` | `~57.0.24` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `expo-audio` | `~57.0.5` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `expo-speech` | `~57.0.3` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `expo-secure-store` | `~57.0.4` | `bundledNativeModules.json` | VERIFICADO |
| `expo-sqlite` | `~57.0.3` | `bundledNativeModules.json` | VERIFICADO |
| `expo-file-system` | `~57.0.7` | `bundledNativeModules.json` | VERIFICADO |
| `expo-notifications` | `~57.0.21` | `bundledNativeModules.json` | VERIFICADO |
| `expo-dev-client` | `~57.0.19` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `react-native-reanimated` | `4.5.1` | `bundledNativeModules.json` | VERIFICADO |
| `react-native-worklets` | `0.10.1` | `bundledNativeModules.json` | VERIFICADO |
| `react-native-gesture-handler` | `~2.32.0` | `bundledNativeModules.json`. El `latest` es 3.x, una reescritura | VERIFICADO |
| `react-native-screens` | `~4.26.0` | `bundledNativeModules.json` | VERIFICADO |
| `react-native-safe-area-context` | `~5.7.0` | `bundledNativeModules.json` | VERIFICADO |
| `react-native-svg` | `15.15.4` | `bundledNativeModules.json` | VERIFICADO |
| `jest-expo` | `~57.0.5` | `bundledNativeModules.json` | VERIFICADO |
| `eslint-config-expo` | `~57.0.2` | `bundledNativeModules.json` | VERIFICADO |
| `typescript` | `~6.0.3` | `expo-template-default@57.0.28` devDependencies | VERIFICADO |
| `@types/react` | `~19.2.2` | `expo-template-default@57.0.28` | VERIFICADO |
| `nativewind` | `^4.2.7` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `tailwindcss` | `~3.4.17` | Documentación de NativeWind: la 4.2.x soporta **sólo** Tailwind 3.4.x | VERIFICADO |
| `stripe` | `22.6.2` | `registry.npmjs.org/stripe`. Última estable de la línea 22, publicada 2026-09-09. **La `23.0.0` existe (2026-10-01) y se rechaza a propósito:** major de dos días en la ruta de pago | VERIFICADO |
| Stripe API | `2026-08-26.dahlia` | `unpkg.com/stripe@22.6.2/cjs/apiVersion.js` — es el valor por defecto de esa versión del SDK, y se fija explícito para que una actualización no lo cambie en silencio | VERIFICADO |
| `resend` | `6.32.0` | `registry.npmjs.org/resend/latest`, publicada 2026-10-01. `engines.node >= 20` | VERIFICADO |
| Evaluación de pronunciación, locales | `pt-PT` y `pt-BR` entre 33 | `MicrosoftDocs/azure-ai-docs`, `includes/language-support/pronunciation-assessment.md`. **Prosodia y contenido siguen siendo sólo `en-US`** | VERIFICADO |
| Voces TTS pt-PT | 3 (`Duarte`, `Fernanda`, `Raquel`) | `includes/language-support/tts.md`. pt-BR tiene 18; el contraste queda anotado para el día que se evalúe la segunda variante | VERIFICADO |
| Comisión App Store | 15% bajo $1M de ingresos | Newsroom de Apple, Small Business Program. **No aplica a este diseño** — el cobro es web — y se registra para poder comparar si alguna vez se plantea IAP | VERIFICADO |
| `eas-cli` | `^24.8.0` | `registry.npmjs.org` dist-tags | VERIFICADO |
| Node.js | `24.21.0` LTS | `nodejs.org/dist/index.json` | VERIFICADO |
| **pnpm** | `12.8.1` | `registry.npmjs.org/-/package/pnpm/dist-tags`. Fijado con `packageManager` y activado con corepack | VERIFICADO |
| `hono` | `^4.13.11` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `@hono/node-server` | `^2.1.3` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `ws` | `^8.22.0` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `zod` | `^4.6.5` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `pg` | `^8.16.3` | `registry.npmjs.org` dist-tags. El driver del pooler de Supabase | VERIFICADO |
| `react-dom` | `19.2.3` | `expo@57.0.26/bundledNativeModules.json`. **Se instala con `expo install`, no con `pnpm add`**: la última del registro exige `react@^19.3.0` y aborta el install — ver §10 | VERIFICADO |
| `@supabase/supabase-js` | `^2.117.2` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `@tanstack/react-query` | `^5.104.0` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `@anthropic-ai/sdk` | `^0.129.0` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `@google/genai` | `^2.24.0` | `registry.npmjs.org` dist-tags. Sustituye a `@google/generative-ai`, **deprecado** | VERIFICADO |
| `microsoft-cognitiveservices-speech-sdk` | `^1.52.0` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `vitest` | `^5.0.2` | `registry.npmjs.org` dist-tags | VERIFICADO |
| `supabase` (CLI) | `2.118.0` | `registry.npmjs.org/-/package/supabase/dist-tags` | VERIFICADO |
| `@biomejs/biome` | `2.5.5` | pin del track `ts-node` | VERIFICADO |
| Azure `S1 Speech To Text` | **$1,00 / hora** | API de Precios Minoristas de Microsoft, `westeurope` | VERIFICADO |
| Azure `S1 Speech to Text Enhanced Feature Audio` | **$0,30 / hora** | ídem — recargo de evaluación de pronunciación | VERIFICADO |
| Azure `S1 Neural Text To Speech Characters` | **$15,00 / 1M** | ídem | VERIFICADO |
| Claude Opus 5 | `claude-opus-5`, $5,00 / $25,00 por MTok | Skill `claude-api` | VERIFICADO |
| Voces `pt-PT-{Duarte,Fernanda,Raquel}Neural` | 3 voces | `MicrosoftDocs/azure-ai-docs`, `includes/language-support/tts.md`, leído el 2026-10-03. **Son exactamente esas tres y no hay más en pt-PT**; pt-BR tiene 18 | VERIFICADO |
| Gemini Live — IDs de modelo con `language_code` | — | Campo `speech_config.language_code` confirmado; la lista literal de IDs, no | **VERIFICAR ANTES DE INSTALAR** |
| Gemini Live — precio por minuto | ~$0,005 entrada / ~$0,018 salida | Resumen automatizado de la página de precios, no cita directa | **CONFIANZA BAJA** — ver §20.2 R3 |
| `microsoft-cognitiveservices-speech-sdk` en React Native | **No funciona** | Objetivo publicado: navegador y Node. La página de npm devolvió 403 a la comprobación directa | ALTA CONFIANZA, no confirmado en vivo |

**Queda un solo «VERIFICAR ANTES DE INSTALAR», y se resuelve dentro del build, no a mano.** El paso 19
resuelve el ID de modelo de Gemini Live contra la documentación en vivo antes de escribirlo, y el
precio de R3 se recalcula ahí mismo. Así el build valida su propio supuesto en lugar de confiar en
este documento.

El aviso de las voces pt-PT **se cerró el 2026-10-03** leyendo la tabla de locales de Microsoft:
`Duarte`, `Fernanda` y `Raquel`, y ninguna más. El paso 16 sigue afirmándolo contra el endpoint
`voices/list` de la región con `pnpm --dir the_profe-server run check:azure-voice` — porque un catálogo
verificado hoy puede cambiar, y un gate que lo comprueba cuesta menos que un despliegue con una voz
que ya no existe.

### Runtime

**Cliente:** `expo`, `expo-router`, `expo-font`, `expo-splash-screen`, `expo-audio`, `expo-speech`,
`expo-secure-store`, `expo-sqlite`, `expo-file-system`, `expo-notifications`, `react-native`, `react`,
`react-native-{reanimated,worklets,gesture-handler,screens,safe-area-context,svg}`, `nativewind`,
`@tanstack/react-query`, `@supabase/supabase-js`.

**Backend:** `hono`, `@hono/node-server`, `ws`, `zod`, `pg`, `@supabase/supabase-js`,
`@anthropic-ai/sdk`, `@google/genai`, `microsoft-cognitiveservices-speech-sdk`, `stripe`, `resend`.

**`web/` no tiene dependencias.** Ni runtime ni desarrollo: es HTML y CSS servidos tal cual. El
`Verify` del paso 15 comprueba que no exista `web/package.json`, porque la forma de que esto deje de
ser cierto es que alguien añada «sólo una cosita» y con ella un tercer árbol de dependencias que
auditar.

**No se añade biblioteca de límite de tasa.** La cubeta de tokens en memoria son unas treinta líneas
y no necesita Redis a esta escala; una dependencia para eso sería más superficie que función. Ver
`docs/limites.md` y §20.3.

### Development

`typescript`, `@types/{react,node,pg,ws}`, `jest-expo`, `eslint` + `eslint-config-expo`, `vitest`,
`@biomejs/biome`, `supabase`, `expo-dev-client`, `eas-cli`.

### Deliberately not used

| No usado | Por qué |
|---|---|
| **Un ORM** | Dos sistemas de migración sobre una base es una combinación conocida-mala |
| **Una herramienta de monorepo** | Dos paquetes, no doce. `pnpm --dir` basta |
| **Una librería de store global** | La caché de servidor ya tiene el estado de servidor. Un store paralelo son dos fuentes de verdad |
| **Un vector store / librería de embeddings** | El currículo cabe en contexto con caché |
| **Una librería de cola de trabajos** | No hay trabajo durable. Ausencia deliberada |
| `expo-av` | Legado. `expo-audio` es el reemplazo |
| `@google/generative-ai` | Deprecado por Google |
| `@supabase/ssr` | Sesión por cookie en SSR; irrelevante en React Native |
| **Tailwind 4** | NativeWind 4.2 soporta sólo la 3.4. La 4 vive en NativeWind v5, en release candidate |

---

## 12. Deployment Strategy

### Hosting

| Pieza | Dónde | Por qué |
|---|---|---|
| Backend | **Railway**, contenedor de larga vida | WebSockets exentos de tiempos de inactividad, con proxy TCP nativo como salida. **Nunca serverless**: un arranque en frío es audible |
| Base, auth, storage | **Supabase** gestionado | — |
| App | **EAS Build** + **EAS Update** | Credenciales, firma y actualizaciones en el aire son la parte difícil, y viven ahí |
| Audio cacheado | **Supabase Storage**, URLs firmadas | Nunca público: la caché es compartida entre usuarios autenticados, no con internet |
| `web/` | **Cloudflare Pages** | Estático, gratis, y el DNS del dominio ya está ahí para SPF, DKIM y DMARC. **El despliegue lo hace una persona**, no un agente: está denegado en `.claude/settings.json` por ser una acción hacia fuera |
| Cobro | **Stripe**, páginas alojadas | Checkout y Customer Portal son redirecciones a Stripe: ningún dato de tarjeta toca este sistema, y el alcance de cumplimiento se queda fuera |

**El proxy TCP nativo de Railway es obligatorio para `/ws/conversar`.** Hay cortes silenciosos
documentados alrededor de los 50 minutos a través del proxy HTTP. Además, ping de mantenimiento cada
20 s en ambos sentidos.

### Environments

| Entorno | Backend | Base | App |
|---|---|---|---|
| Local | `pnpm --dir the_profe-server run dev` | Postgres en Docker, `profe_test` | Development build en simulador |
| Preview | Servicio de Railway `preview` | Proyecto Supabase de staging | Perfil `preview` de EAS |
| Producción | Servicio de Railway `production` | Proyecto Supabase de producción | Perfil `production` de EAS |

Tres perfiles de EAS, siempre: `development` (dev client, distribución interna), `preview` (build en
modo release para probar), `production` (TestFlight y pruebas internas de Play).

### CI/CD

| Disparador | Qué corre |
|---|---|
| Push a cualquier rama | typecheck, lint y tests de ambos paquetes, más el arnés de evaluación contra su línea base |
| Merge a `main` | Lo anterior, más build y despliegue del backend a `preview` |
| Tag `v*` | Despliegue del backend a producción y build de EAS con perfil `production` |

**El arnés de evaluación falla CI por debajo de la línea base comprometida.** Sin eso, un cambio de
prompt degrada la corrección en silencio y lo descubre el usuario.

### Release and rollback

- **Backend:** imagen inmutable por despliegue. Retroceso = redesplegar la anterior.
- **App, JS y estilos:** `eas update` al canal correspondiente. Llega en un reinicio.
- **App, código nativo:** build nueva y redistribución. No hay atajo.
- **Base de datos:** las migraciones avanzan; un retroceso es una migración nueva, nunca editar una ya
  aplicada.
- **Durante el build:** cada paso deja un tag. El retroceso es `git reset --hard <checkpoint anterior>`.

**Lo que `eas update` NO puede cambiar:** código nativo, permisos, la versión del SDK. Y la regla que
importa: **nunca usar una actualización para cambiar lo que la app es.** Iteración sí; una app
distinta después de aprobada, no.

### Domain, DNS, TLS

Un subdominio para el backend, con TLS gestionado por Railway. Sin enlaces universales en v1 — no hay
contenido compartible que los justifique, y traen verificación de dominio y archivos de asociación.

---

## 13. Testing Strategy

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unidad, backend | Vitest | Presupuesto, precios, repetición espaciada, normalización de texto para el hash de caché |
| Integración, backend | Vitest + Postgres real | RLS en ambas direcciones, transacciones de cuota, cascada de borrado |
| Unidad, cliente | Jest (`jest-expo`) | Tokens, resolución de tema, bandas del medidor de fonemas |
| Instantánea | Jest | Cada pantalla en tamaño de texto mínimo y máximo |
| Evaluaciones | Arnés propio | Corrección de ejercicios y audio dorado, contra línea base en CI |

**Las políticas RLS se prueban contra Postgres real, nunca contra un doble.** Un doble no tiene
políticas: el test pasaría con RLS desactivada, que es exactamente el fallo que debe detectar. Y se
prueban **en las dos direcciones**: que el dueño ve lo suyo y que un segundo perfil **no** lo ve.

### Critical flows to cover E2E

1. Entrar por enlace mágico → forzar cierre → reabrir sin volver a entrar.
2. Completar un ejercicio de escritura → el error queda registrado en `error_items` → aparece en el
   repaso del día siguiente.
3. Pedir sesión de voz **sin cuota** → `402`, sin fila en `voice_sessions`, micrófono sin abrir.
3b. Pedir sesión de voz **sin plan** → `402 PLAN_REQUIRED`, **sin reserva de cuota** y sin fila de
    sesión. Es el caso que distingue «no tienes derecho» de «gastaste el tuyo», y el que demuestra que
    el middleware corre en el orden declarado.
3c. Suscribirse en `web/` → el webhook proyecta `entitlements` → la app refleja el plan nuevo **sin
    que el usuario reinstale ni vuelva a entrar**.
4. Grabar en Afinar → puntuación por fonema en pantalla, con etiqueta y forma además de color.
5. Interrumpir al tutor en Conversar → el audio para **y** el historial queda truncado a lo oído.
6. Borrar la cuenta → los datos del perfil desaparecen, **la caché TTS compartida sobrevive**, y
   `traces` y `budget_ledger` quedan con el identificador **disociado**, no borrados.
7. Entregar el **mismo evento de Stripe dos veces** → una fila en `stripe_events`, derechos idénticos
   tras la segunda, y `200` en ambas.
8. Analizar `the_profe-app/` → **cero** menciones de compra, pago, precio o suscripción. Es el gate de
   cumplimiento de la App Store y vive en CI, no en la memoria de nadie.

### Test data

Un perfil semilla y un segundo perfil adversario — este último existe sólo para probar que **no** ve
nada del primero. Audio dorado: grabaciones reales con acento, ruido de fondo e interrupciones. Audio
sintético limpio no contiene nada de lo que desafina el umbral de fin de turno.

### What is deliberately not tested

| No probado | Por qué |
|---|---|
| Entrega real de audio a través de PSTN o altavoz | No hay telefonía, y el usuario confirmó auriculares. §20.2 R8 |
| Calidad subjetiva de la voz sintetizada | No hay métrica. Va a la lista de lanzamiento como escucha semanal |
| Tiendas de aplicaciones | No hay publicación pública en v1 |
| El SDK de los proveedores | Se prueba nuestra integración, no su código |

---

## 14. Security & Secrets

| Regla | Detalle |
|---|---|
| **Ninguna clave de proveedor en el cliente** | El bundle de JS es legible. Azure, Anthropic y Gemini se hablan **sólo** desde el backend. Es además la razón técnica de que el audio pase por el backend |
| **`SUPABASE_SERVICE_ROLE_KEY` salta RLS** | Sólo backend. Nunca en una variable `EXPO_PUBLIC_*` |
| **Tokens en el almacén seguro del sistema** | `expo-secure-store`, nunca `AsyncStorage` |
| **La identidad sale del JWT** | Nunca del cuerpo de la petición. Un `profile_id` en el cuerpo es un defecto de seguridad |
| **Validación en el borde** | Toda ruta parsea con `zod` antes de tocar lógica |
| **Autorización en la base** | RLS, no comprobaciones dispersas. Una comprobación se olvida en la ruta once; una política no |
| **`budget_ledger` sólo por función `security definer`** | Ningún cliente inserta en el ledger directamente |
| **URLs firmadas y caducas para el audio** | El bucket nunca es público |
| **Nunca commitear `.env`** | Los `.env.example` sí, con valores locales |
| **Scripts de instalación bloqueados por defecto** | pnpm no ejecuta el `postinstall` de una dependencia que no esté en `allowBuilds`, y con `strictDepBuilds` la instalación **falla** en vez de avisar. Un paquete comprometido no puede ejecutar nada sin que alguien lo haya aprobado antes, por nombre |
| **24 h de cuarentena antes de adoptar una versión** | `minimumReleaseAge: 1440`. La mayoría de las publicaciones maliciosas se detectan y se retiran en las primeras horas; esperar un día evita casi toda esa ventana y no cuesta nada en un proyecto que no persigue el último parche |
| **`node_modules` aislado en el backend** | Un paquete sólo puede importar lo que declaró. El cliente usa `hoisted` porque Metro lo exige, pero el backend —el que maneja las claves— conserva el aislamiento |
| **Los lockfiles se commitean** | `pnpm-lock.yaml` es el registro de lo que se auditó. Sin él, «funcionaba ayer» no significa nada |
| **El texto del modelo es no confiable** | Lo que devuelve Claude se trata como dato, no como instrucción. Ninguna salida del modelo decide una llamada a proveedor ni un gasto |
| **`STRIPE_SECRET_KEY` y `RESEND_API_KEY`, sólo backend** | Nunca en una `EXPO_PUBLIC_*`. Con la primera se cobra y se reembolsa; con la segunda se envía correo desde tu dominio, que es suplantación lista para usar |
| **`STRIPE_WEBHOOK_SECRET` es un secreto distinto de la clave de API** | Por endpoint, empieza por `whsec_`. Confundirlos da un 400 permanente en la firma que se lee como «Stripe no me llega», cuando llega y se rechaza |
| **Firma del webhook sobre el cuerpo crudo** | La ruta se monta antes de cualquier middleware de JSON. Un parseo previo reserializa y la firma no vuelve a validar: un webhook sin verificar es un endpoint que cualquiera usa para regalarse el plan de pago |
| **Los derechos sólo los escribe el servidor** | `entitlements` y `subscriptions` son de solo-lectura para el cliente vía RLS. Si un cliente pudiera escribir su propio derecho, el cobro es decorativo |
| **Límite de tasa en endpoints de modelo y en el alta** | No es rendimiento, es contención de gasto: sin él un script vacía el presupuesto de voz en una noche. **En memoria de un solo proceso** — ver `docs/limites.md` y §20.2 R10 |
| **Verificación de correo antes del primer minuto de voz** | Sin ella cada dirección inventada regala 3 min/día. Es la mitad de la mitigación de R9; la otra es el límite de altas por IP |
| **El audio de voz es dato personal sensible** | Plazo de retención **más corto de todo el sistema**, borrado programado, y subencargados declarados en la política de privacidad. Con usuarios de pago desconocidos esto deja de ser cortesía |
| **Una copia que nunca restauraste no es una copia** | El paso 23 carga un volcado en una base vacía y aplica migraciones. Que exista el respaldo no demuestra nada |

**Datos personales.** Las grabaciones y transcripciones de cuatro personas reales son datos
personales: `retention_until` por fila, trabajo programado que borra lo vencido, cascada desde el
perfil, y borrado de cuenta desde dentro de la app. Cifrado en reposo por parte de Supabase.

**Gasto como superficie de abuso.** Aquí el equivalente a una vulnerabilidad es una llamada de voz sin
reservar. Por eso `POST /voice/sessions` es el único camino al micrófono y la reserva ocurre dentro de
la transacción que crea la sesión.

---

## 15. Accessibility

### Baseline requirements

| Requisito | Cómo |
|---|---|
| Contraste AA en **ambos** temas | Comprobado por test sobre los tokens semánticos, no a ojo |
| Escalado de texto del sistema | Toda la escala de §7 escala. Test de instantánea en mínimo y máximo: cero truncados, cero solapes |
| Objetivos táctiles ≥ 44×44 | Incluidos los chips del medidor de fonemas |
| Etiquetas de lector de pantalla | Toda entrada y todo control. El medidor anuncia **sílaba, puntuación y banda en palabras** |
| Áreas seguras | Cada pantalla. Android 15+ impone borde a borde |
| **Reducir movimiento** | Todo instantáneo; el anillo del micrófono pasa a barra estática. Se cambia de medio, no se quita la señal |

### WCAG 2.2 additions — las que más se olvidan

| Criterio | Aquí |
|---|---|
| **1.4.1 El color no es el único medio** | **El criterio central de este producto.** Las bandas del medidor llevan etiqueta textual y forma distinta. Oliva contra terracota es el eje rojo-verde |
| 2.4.11 Foco no oculto | El teclado no tapa el campo enfocado en ninguna pantalla |
| 2.5.7 Movimientos de arrastre | Nada depende sólo de arrastrar; toda acción tiene equivalente por toque |
| 2.5.8 Tamaño de objetivo mínimo | 24×24 es el mínimo de la norma; aquí 44×44 |
| 3.3.7 Entrada redundante | Nada se pide dos veces en un flujo |

**El audio nunca es el único canal.** Todo lo que el tutor dice está también escrito. Un usuario con
pérdida auditiva no puede hacer Conversar, y eso es honesto — pero leer, escribir y el temario entero
le quedan disponibles.

### Verification

Escáner de accesibilidad en CI sobre las pantallas principales, más el test de contraste de tokens y
el de instantánea en ambos extremos de la escala. Lo que una máquina no decide — si el anuncio del
lector de pantalla *tiene sentido* — va a la lista de lanzamiento.

---

## 16. Observability & Cost

### Instrumentation

**Una fila en `traces` por cada llamada a proveedor, escrita antes de devolver.** Sin excepciones y
sin muestreo: con cuatro usuarios, el volumen es trivial y la pregunta «¿a dónde se fue el dinero?»
tiene que tener respuesta exacta.

| Campo | Por qué |
|---|---|
| `provider`, `operation`, `model_or_voice` | Atribución |
| `input_tokens`, `output_tokens`, `cached_tokens` | **Reportados por el proveedor**, nunca estimados contando caracteres |
| `audio_seconds`, `chars` | Unidades de facturación de voz |
| `cost_micros` | Calculado con `pricing.ts`, en enteros |
| `latency_ms` | Por llamada |

`cached_tokens` es el que prueba que la economía del diseño funciona. Si es cero en peticiones
repetidas, hay un invalidador silencioso y el coste se multiplica por diez sin avisar.

### The metrics that matter for this project

| Métrica | Umbral | Qué significa que se rompa |
|---|---|---|
| Coste acumulado del periodo, por perfil | Alerta al 80% del tope | El tope llega antes que la factura |
| `cache_read_input_tokens` en la segunda petición | > 0 | Si es 0, el prefijo se invalida y el coste se dispara |
| Acierto de caché TTS | > 50% desde el segundo mes | La palanca económica principal no está funcionando |
| Fin de habla → primer audio, **p50 y p95** | p95 < 1200 ms | Por encima, la gente habla encima del tutor |
| Latencia **por segmento** | El más lento, identificado por nombre | No se afina lo que no se atribuye |
| Reservas liberadas por el barrendero | Cerca de 0 | Si sube, hay sesiones que no cierran y se comen cuota |
| Tasa de barge-in correctos | Audio parado **y** historial truncado | Truncar mal hace que el modelo responda a lo que nadie oyó |

### Health check

`GET /healthz` — comprueba proceso, base de datos y que las variables de la capa actual están cargadas.
Sin auth. Lo usa el contenedor y el gate del paso 5.

### Cost model

**Este modelo cambió de naturaleza.** Antes era un techo de gasto propio; ahora es **coste unitario
contra ingreso unitario**, y el número que decide si el producto vive no es la factura sino el
margen.

#### Unidad: un suscriptor del plan de pago

Base: **15 min/día de voz** ≈ 450 min/mes. Dos supuestos declarados, que no son números de
proveedor: reparto **50/50** entre el usuario hablando y el tutor hablando, y **900 caracteres por
minuto** de habla sintetizada.

| Línea | Cálculo | Coste/mes |
|---|---|---|
| Azure STT + evaluación, Afinar, 3,75 h | 3,75 × $1,30 | $4,88 |
| Azure TTS, 3,75 h → 202.500 caracteres | 0,2025 × $15 | $3,04 |
| …con 60% de acierto de caché desde el 2.º mes | 0,4 × $3,04 | $1,22 |
| Gemini Live, Conversar, 3,75 h | 112 min × $0,005 + 113 min × $0,018 | $2,59 |
| Claude Opus 5, texto con prefijo cacheado | residual | ~$1,50 |
| **Coste de proveedor, caché templada** | | **≈$10,2 ≈ €9,4** |

Y el ingreso:

| Línea | |
|---|---|
| Precio al público | €12,99/mes (o €89/año) |
| menos IVA (≈21% medio UE, liquidado por OSS vía Stripe Tax) | €10,74 |
| menos Stripe (≈1,5% + €0,25) y Stripe Tax (0,5%) | **≈€10,25 netos** |

**Aquí está el problema, y no se disimula: a 15 min/día de uso REAL el margen es negativo** —€9,4 de
coste contra €10,25 de ingreso deja €0,85, que no paga infraestructura ni soporte. El modelo cierra
porque **el uso medio no es el uso máximo**: el límite diario es un techo, no un consumo. Con un
consumo medio realista del 40% del tope (6 min/día), el coste cae a ≈€3,8 y el margen sube a **≈€6,4**.

> **Esa es la hipótesis económica del producto, y es la que hay que medir primero.** Si el consumo
> medio se acerca al tope, el plan está mal tarifado y la respuesta es bajar el tope o subir el
> precio, no absorber la diferencia. El paso 24 instrumenta exactamente esto: coste por usuario
> contra ingreso por usuario, en SQL, desde el primer suscriptor.

#### El umbral que importa

| | |
|---|---|
| Infraestructura fija | Supabase Pro $25 · Railway $10–20 · Cloudflare Pages $0 · Resend $0 · Sentry $0 ≈ **$75/mes** |
| Margen por suscriptor al consumo medio esperado | ≈€6,4 |
| **Suscriptores para cubrir la infraestructura** | **≈15** |

$6.000 contra $75/mes son 80 meses de infraestructura. **La infra no es la restricción de este
proyecto: lo son el contenido y el minuto de voz.**

#### El plan gratuito tiene que ser casi gratis de servir

3 min/día son 90 min/mes ≈ **€0,8 de coste**, y eso ya es demasiado si no convierte: cien usuarios
gratuitos inactivos cuestan lo mismo que la infraestructura entera. Por eso el plan gratuito es
**texto completo** —que con prefijo cacheado es residual— y la voz es la muestra, no la función.

#### Tres palancas que son decisiones de arquitectura, no optimizaciones

1. **La caché de TTS compartida, y es la única que mejora con la escala.** Todos los usuarios estudian
   el mismo temario, así que el acierto *sube* con el número de usuarios. Con RLS que la hace legible
   por todo usuario autenticado, el TTS tiende a gratis. Es el motivo por el que la clave única es
   `(text_hash, voice)` y no incluye el usuario.
2. **El recargo de evaluación de pronunciación se paga sólo en Afinar.** $0,30/hora sobre el STT, y en
   Conversar no se puntúa, así que no se activa. **Se aplica en la pasarela por código**, y un test
   afirma que una sesión de Conversar no emite ninguna llamada con evaluación activada.
3. **El resto no cachea y es el suelo irreducible.** STT, evaluación fonémica y Gemini Live son por
   minuto y por usuario. Ninguna arquitectura los abarata: sólo el tope del plan los limita. **Por eso
   los minutos son la unidad del producto y aparecen en la etiqueta de precio**, como en Speak o
   Duolingo Max. Un plan «ilimitado» con estos proveedores es una promesa que la factura rompe.

La capa gratuita de Azure (5 horas de STT y 0,5M caracteres de TTS al mes) **no está en este modelo**:
es un recurso F0 aparte que no se mezcla con S1. Es una palanca opcional, no un descuento asumido.

---

## 17. Model Routing

### Routing table

| Trabajo | Modelo | Esfuerzo | Por qué |
|---|---|---|---|
| Corregir un ejercicio de escritura | `claude-opus-5` | `low` | Rutinario y frecuente. El esfuerzo bajo es la primera palanca de coste después de la caché |
| Generar el siguiente ejercicio desde los errores | `claude-opus-5` | `high` | Decisión pedagógica; es donde está el valor |
| Interpretar un informe fonémico de Azure | `claude-opus-5` | `high` | Convertir puntuaciones en un consejo accionable |
| Turno de conversación en Conversar | Gemini Live semi-cascada | — | Latencia por encima de todo |
| Juez de las evaluaciones | `claude-opus-5` | `medium` | Rúbrica estable |

Un solo modelo para el texto, y es deliberado: **las cachés tienen ámbito de modelo**, así que una
cascada de modelos renuncia a reutilizar el prefijo entre ellos. Con un currículo cacheado, eso cuesta
más de lo que ahorra.

**Parámetros que este modelo exige** — escribirlos mal devuelve 400:

- `thinking: {type: "adaptive"}`. **`budget_tokens` está eliminado y devuelve 400.**
- El esfuerzo va **dentro de `output_config`**: `output_config: {effort: "low"|"high"|…}`.
- **Sin prefill de mensaje de asistente**: devuelve 400. Para forzar formato, `output_config.format`.
- Salidas estructuradas con `output_config.format`, no el parámetro `output_format`, que está obsoleto.

### Prompt and context strategy

**Contexto largo con caché, no RAG.** El currículo y el prompt de sistema van en el prefijo estable con
un punto de corte explícito; la conversación va después. Es más barato y más exacto que trocear y
embeber, y borra del mapa el troceado, la deriva de los embeddings y un vector store que operar.

Orden de render: `tools` → `system` → `messages`. **Cualquier cambio de un byte en el prefijo invalida
todo lo que va después**, así que nada volátil — ni marca de tiempo, ni identificador por petición, ni
JSON con claves desordenadas — entra antes del último punto de corte.

**TTL de 5 minutos**, no de 1 hora: con tráfico continuo cada petición refresca la entrada y sale
estrictamente más barato; la escritura a 1 hora cuesta el doble y aquí no compra nada.

**El prompt de voz se reescribe para el oído.** Dos frases y parar. El lenguaje hablado es más corto,
más interrumpible y mucho menos tolerante con respuestas largas. Tratar la voz como una piel sobre el
chat de texto es el error clásico.

### Cost controls

| Control | Dónde |
|---|---|
| Cuota comprobada **antes** de la llamada | `POST /voice/sessions`, dentro de la transacción |
| Historial acotado | Política de truncado o resumen en la pasarela. Sin ella, coste y latencia crecen cada turno hasta que las peticiones fallan |
| Esfuerzo por ruta | `low` en lo rutinario, `high` donde está el valor |
| Caché de prompt verificada | Un `Verify` afirma `cache_read_input_tokens > 0` en la segunda petición |
| Caché de TTS | Antes de sintetizar, siempre |
| Evaluación de pronunciación sólo en Afinar | Aplicado en la pasarela, con test |

### Failure handling

| Fallo | Respuesta |
|---|---|
| Proveedor caído o con límite de tasa | Error tipado y reintentable desde la pasarela. En voz, **se habla una disculpa** en vez de cortar |
| Reconocimiento fallido | Se pide repetir, no se adivina |
| WebSocket caído | Reconexión con la reserva **intacta**; se liquida por duración real |
| Trabajador caído a mitad de sesión | El barrendero libera la reserva pasado `expires_at` |
| Cuota agotada a mitad | Se termina el turno en curso y se cierra con mensaje. Nunca un corte mudo |

### Evaluation

Conjunto dorado versionado con línea base comprometida, **en CI, fallando por debajo de la línea**.
Dos suites: corrección de texto, y audio dorado con acento, ruido e interrupciones.

Los tests de texto no cubren voz. Se mide el medio: tasa de error de palabra sobre *este* vocabulario,
p50 y p95 de fin de habla a primer audio, y manejo de interrupciones. Y una costumbre que ninguna
métrica sustituye: **escuchar cada semana una muestra real**, porque no hay número para «sonó raro».

---

## 18. Skills to Use During Build

Instalados y directamente aplicables. Ninguno es obligatorio: si falta uno, se recurre a la
documentación en vivo y se sigue.

| Skill | Cuándo |
|---|---|
| **`supabase:supabase-postgres-best-practices`** | **Antes** de escribir o cambiar cualquier cosa que viva en Postgres: tablas, tipos de columna, políticas RLS y sus tests, índices, triggers, funciones, trabajos programados. También para diagnosticar consultas lentas, timeouts, bloqueos, o filas visibles para el perfil equivocado. Carga en los pasos 3, 4, 7, 8, 11, 13 y 23 |
| **`supabase:supabase`** | Cualquier tarea de Supabase: auth, RLS, migraciones, Storage, depuración de errores y lectura de logs |
| **`claude-api`** | **Antes de escribir cualquier ID de modelo, precio o parámetro** de la API de Claude. Nunca mantener a mano una tabla de modelos. Pasos 6, 10 y 17 |
| **`dataviz`** | Antes de la primera línea del medidor de fonemas y del panel de latencia y coste. Pasos 18 y 20 |

`ui-ux-pro-max` y `emil-design-eng` **no** están instalados. Por eso §7 trae el sistema visual decidido
con valores hex reales: no queda nada visual al criterio del constructor.

---

## 19. Agent Workspace

Todo lo de esta sección **ya existe como archivo real** bajo `blueprints/profe/workspace/`. El paso 3
del bootstrap lo copia entero a la raíz del proyecto. Nada de aquí hay que escribirlo de nuevo.

### 19.1 `CLAUDE.md`

`workspace/CLAUDE.md` — comandos, stack, la ruta de audio, la tabla de qué capa puede importar de
cuál, las fuentes únicas, las ocho reglas de código, el sistema de diseño con sus hex, la tabla de
entorno por paso, y ocho reglas no negociables.

### 19.2 `AGENTS.md`

`workspace/AGENTS.md` — el equivalente neutro respecto de la herramienta, para agentes que no leen
`CLAUDE.md`.

### 19.3 `.claude/settings.json`

`workspace/.claude/settings.json` — lista de permitidos que cubre **cada** comando `Verify` de §9 y
cada comando de §10.

La lista de denegados es la parte interesante, y es deliberada:

| Denegado | Por qué |
|---|---|
| `Bash(supabase:*)` | Bloquea el CLI **global**. En esta máquina es v1 y contra un proyecto v2 falla de una forma que se lee como esquema roto en vez de como herramienta equivocada. Sólo pasa `pnpm dlx supabase@2.118.0` |
| `db push`, `db reset` | Escriben en la base **real**. Un build autónomo no toca producción |
| `eas submit`, `eas update` | Publican. Son decisiones humanas |
| `git push` | Ídem |
| `Read(./**/.env)` | Secretos reales fuera del contexto del agente |

### 19.4 Project skills

| Skill | Para qué |
|---|---|
| `.claude/skills/nueva-migracion/SKILL.md` | Crear, aplicar y verificar una migración sin romper la fuente única |
| `.claude/skills/nueva-llamada-proveedor/SKILL.md` | Añadir una llamada a proveedor con su traza, su precio y su cuota desde el principio |
| `.claude/skills/auditar-coste-voz/SKILL.md` | Auditar a dónde se fue el dinero del periodo |

**`.claude/commands/` no se emite, en ningún modo.** Un comando de barra sólo se dispara cuando lo
teclea una persona, y un constructor autónomo no teclea nada: sería peso muerto que no se invoca ni
una vez.

### 19.5 `.claude/rules/*.md`

| Archivo | Ámbito |
|---|---|
| `datos-postgres.md` | `supabase/**`, `the_profe-server/src/db/**`, `the_profe-server/tests/{sql,db}/**` |
| `voz-y-coste.md` | `the_profe-server/src/{voice,gateway,budget,ws}/**`, `the_profe-app/features/voice/**` |
| `cliente-expo.md` | `the_profe-app/**` |
| `pagos-y-correo.md` | `the_profe-server/src/{billing,email}/**`, `web/**` |

### 19.6 Verify-critical config and local infrastructure

Emitidos como archivos reales, cada uno en la ruta que ocupa en el repositorio destino.

| Archivo | Qué gate lo necesita |
|---|---|
| `docker-compose.yml` | Postgres local de todos los gates de base de datos. Imagen `postgres:17-alpine` fijada, healthcheck, puerto **55432** para no chocar con un Postgres ya instalado, y `./` montado en `/repo` **en solo lectura** para que un `psql -f` no pueda escribir en el repositorio |
| `the_profe-server/package.json` | El manifiesto del backend. Lo emite el blueprint: aquí no hay scaffolder. Fija `packageManager: pnpm@12.8.1` |
| `the_profe-server/pnpm-workspace.yaml` | **Todo gate que instale.** pnpm moderno lee de `.npmrc` sólo autenticación y registro; `allowBuilds` y `minimumReleaseAge` viven aquí. El `Dockerfile` lo copia dentro de la imagen |
| `the_profe-app/pnpm-workspace.yaml` | Ídem en el cliente, y además `nodeLinker: hoisted`, **sin el cual Metro no resuelve los módulos nativos** |
| `the_profe-server/tsconfig.json`, `the_profe-server/tsconfig.build.json` | `typecheck` y `build`. El segundo fija `dist/server.js`, que es la ruta que usan el `Dockerfile` y `pnpm run start` |
| `the_profe-server/vitest.config.ts` | Todos los tests del backend |
| `the_profe-server/tests/setup.ts` | Carga `.env` y valores de prueba **antes** de cualquier import |
| `the_profe-server/tests/sql/00_auth_stub.sql` | Esqueleto de `auth` para que RLS se pueda probar en local |
| `the_profe-server/scripts/apply-migrations.sh` | Prepara la base de los gates. **Carga su propio entorno**: es una herramienta autónoma y nada lo hace por ella |
| `the_profe-server/scripts/check-env.ts` | Gate de entorno del paso 5 y del bootstrap |
| `the_profe-server/scripts/check-mail-dns.ts` | Gate del paso 12. Resuelve SPF, DKIM y DMARC por DNS y sale distinto de 0 nombrando el que falte |
| `the_profe-server/scripts/check-azure-voice.ts` | Gate del paso 16. Consulta `voices/list` de la región y afirma que `AZURE_TTS_VOICE` aparece. **Es un script y no una línea de shell en el `Verify` a propósito:** necesita cargar `.env` antes de llamar, y un comando compuesto con `set -a; . ./the_profe-server/.env; …` queda fuera de la lista de permitidos y detiene el build pidiendo autorización a mitad del gate |
| `the_profe-server/scripts/restore-drill.sh` | Gate del paso 23. Carga un volcado en una base vacía y aplica migraciones |
| `the_profe-server/biome.json` | `lint` y `format` del backend |
| `the_profe-server/Dockerfile`, `the_profe-server/.dockerignore` | Gate de imagen del paso 24 |
| `the_profe-app/jest.config.js`, `the_profe-app/jest.setup.ts` | Todos los tests del cliente |
| `the_profe-app/tsconfig.json` | `typecheck` y el alias `@/` |
| `the_profe-app/eslint.config.js` | `lint` del cliente |
| `the_profe-app/babel.config.js` | **El plugin de worklets es la última entrada.** En otra posición, Reanimated falla en tiempo de ejecución |
| `the_profe-app/metro.config.js` | Envoltorio de NativeWind |
| `the_profe-app/tailwind.config.js`, `the_profe-app/global.css` | La capa semántica de color |
| `the_profe-app/app.config.ts` | `.ts` y no `.json`: identificadores por variante |
| `the_profe-app/eas.json` | Los tres perfiles |
| `the_profe-server/.env.example`, `the_profe-app/.env.example` | El bootstrap crea los `.env` a partir de ellos |
| `.nvmrc`, `.gitignore` | Toolchain, y qué se commitea |

**`web/` no aparece en esta tabla y es deliberado.** No lleva configuración: es HTML y CSS que el paso
15 escribe directamente. Lo que sí es verify-critical es su **ausencia** de `package.json`, y eso lo
comprueba un `test ! -f` en el `Verify` de ese paso, no un archivo emitido aquí.

**No se emite `the_profe-app/package.json`**, y es la decisión deliberada de §10: lo crea el scaffolder, y el
blueprint sólo lo **edita** con `pnpm pkg set` después. Un archivo con dos autores y ningún árbitro es
exactamente el fallo que esta regla evita.

#### Tabla de reconciliación de valores entre artefactos

Un valor escrito en dos archivos que discrepan es la clase de defecto que pasa siete gates en verde y
mata el octavo. Cada fila tiene **una** fuente y una lista de quién más la repite; si cambia la fuente,
cambian todos.

| Valor | Es | Fuente única | Quién más lo dice, y debe coincidir | Comparado |
|---|---|---|---|---|
| Ruta de salida del backend | `dist/server.js` | `the_profe-server/tsconfig.build.json` (`rootDir: src` + `outDir: dist`) | `the_profe-server/package.json` → `main` y `scripts.start` · `the_profe-server/Dockerfile` → `CMD` · §9 pasos 5 y 24 · §20.1 | sí |
| Puerto del backend | `8787` | `the_profe-server/.env.example` → `PORT` | `the_profe-server/Dockerfile` → `EXPOSE` · `the_profe-app/app.config.ts` → `apiUrl` y `audioWsUrl` por defecto · §9 pasos 5 y 24 · §20.1 | sí |
| Puerto del contenedor en CI | `8788` en el host → `8787` dentro | §9 paso 24 | Sólo ahí. Es distinto **a propósito**, para no chocar con el servidor de desarrollo | sí |
| Ruta de salud | `/healthz` | §5 Routes | §8 (exenta del gate de sesión) · §16 · §20.1 · §9 pasos 5 y 24 · `epics/02` y `epics/07` | sí |
| Puerto de Postgres local | `55432` en el host → `5432` dentro | `docker-compose.yml` | `the_profe-server/.env.example` → `TEST_DATABASE_URL` | sí |
| Base de datos local | `profe_test` | `docker-compose.yml` → `POSTGRES_DB` | `the_profe-server/scripts/apply-migrations.sh` · `the_profe-server/package.json` → `db:local:assert` · `TEST_DATABASE_URL` | sí |
| Servicio y contenedor de la base | servicio `db`, contenedor `profe-db` | `docker-compose.yml` | `apply-migrations.sh` y los scripts `db:local:*` | sí |
| Imagen del backend en CI | `profe-server:ci` | §9 paso 24 | Sólo ahí, en `docker build` y `docker run` | sí |
| Ruta del bundle dentro del proyecto | `blueprints/profe/` | §10 Bootstrap paso 3 | Excluida en `the_profe-server/biome.json`, `the_profe-server/tsconfig*.json`, `the_profe-server/vitest.config.ts`, `the_profe-app/eslint.config.js`, `the_profe-app/jest.config.js`, `the_profe-app/tsconfig.json`, y bloqueada en `the_profe-app/metro.config.js` | sí |
| Nombres de las tres fuentes | `SourceSerif4-Regular.ttf`, `Inter-Regular.ttf`, `CharisSIL-Regular.ttf` | §10, tabla de activos | `tasks.json` `E1-T1` → `verify` · `epics/01` · `the_profe-app/constants/theme.ts` (paso 1) | sí |

#### Matriz de convenio de resolución

**Los dos paquetes resuelven imports de forma distinta, y mezclarlos rompe la compilación de una
manera que no señala la causa.**

| Paquete | Convenio | Quién lo hace cumplir |
|---|---|---|
| `the_profe-server/` | Imports relativos **con la extensión `.ts` literal** | Node 24 resuelve los especificadores literalmente; `the_profe-server/tsconfig.json` lo permite con `allowImportingTsExtensions` y lo reescribe a `.js` al emitir con `rewriteRelativeImportExtensions`; `vitest.config.ts` usa el mismo convenio |
| `the_profe-app/` | Alias **`@/` sin extensión** | `the_profe-app/tsconfig.json` → `paths`; la base de Expo dentro de Metro; `the_profe-app/jest.config.js` → `moduleNameMapper` |

La consecuencia práctica: `node scripts/check-env.ts` funciona **porque** el import lleva `.ts`. Si
alguien lo "arregla" quitándolo, el script deja de resolver y el error habla de un módulo que no
existe, no del convenio.

#### Tabla de carga de entorno

**Toda herramienta que lee variables de entorno necesita cargarlas.** Un script autónomo que asume un
entorno que nadie cargó falla con un error que parece de base de datos y no lo es.

| Quién lee el entorno | Cómo se le carga |
|---|---|
| `the_profe-server/src/server.ts` y todo el backend en marcha | Importa `src/env.ts`, que valida al importarse. **Nadie más lee `process.env`** |
| `the_profe-server/scripts/check-env.ts` | Herramienta autónoma. Importa `src/env.ts`, que carga `.env` por su cuenta |
| `the_profe-server/scripts/apply-migrations.sh` | Herramienta autónoma, y no es Node: carga `.env` explícitamente con `set -a; . ./.env` |
| `the_profe-server/tests/**` | `the_profe-server/tests/setup.ts`, declarado en `setupFiles` de `vitest.config.ts`, **antes de cualquier import** de `src/` |
| `the_profe-app/**` | Sólo variables `EXPO_PUBLIC_*`, expuestas por `app.config.ts` → `extra` |

---

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Global acceptance gate

Debe pasar entero antes de considerar el proyecto construido, y también antes de marcar cualquier paso
como hecho. Desde la raíz del proyecto:

```bash
pnpm --dir the_profe-app run typecheck        # 0 errores
pnpm --dir the_profe-app run lint             # 0 errores, 0 advertencias
pnpm --dir the_profe-app run test             # 0 fallos, 0 omitidos
pnpm --dir the_profe-server run typecheck        # 0 errores
pnpm --dir the_profe-server run lint             # 0 errores
pnpm --dir the_profe-server run db:local:up      # healthcheck en verde
pnpm --dir the_profe-server run db:local:apply   # esquema aplicado
pnpm --dir the_profe-server run db:local:assert  # una línea ::regclass por tabla
pnpm --dir the_profe-server run test             # 0 fallos
pnpm --dir the_profe-server run build            # produce dist/server.js
pnpm --dir the_profe-server run start &          # arranca el artefacto, no sólo lo compila
curl -fsS localhost:8787/healthz          # 200
pnpm --dir the_profe-server run eval             # por encima de la línea base
```

**Y estas nueve afirmaciones de producto**, que son las que distinguen este proyecto de un CRUD:

1. Una sesión de voz **sin cuota** devuelve `402` y **no** crea fila en `voice_sessions`.
2. La segunda petición de una conversación reporta `cache_read_input_tokens > 0`.
3. Una sesión de **Conversar** no emite **ninguna** llamada con evaluación de pronunciación activada.
4. Un barge-in para el audio **y** deja el transcrito persistido con **sólo** lo que se reprodujo.
5. Borrar una cuenta elimina los datos del perfil, **conserva** los `audio_assets` de `tts_cache`, y
   deja `traces` y `budget_ledger` **disociados** en vez de borrados.
6. Una sesión de voz **sin plan** devuelve `402 PLAN_REQUIRED` y **no** escribe en `budget_ledger`.
7. El **mismo evento de Stripe entregado dos veces** deja una sola fila en `stripe_events` y los
   derechos sin cambiar.
8. Un webhook con firma inválida devuelve `400` y **no escribe en ninguna tabla**.
9. `grep` sobre `the_profe-app/app`, `the_profe-app/components` y `the_profe-app/features` no encuentra **ninguna** mención
   de compra, pago, precio ni suscripción.

### 20.2 Risk register

| # | Riesgo | Disparador | Mitigación | Paso |
|---|---|---|---|---|
| **R1** | **Sin prosodia en pt-PT**, y el ritmo es justo lo que delata a un hispanohablante | Desde el día uno | Los fonemas cubren nasales, /ʃ/ final, /ʎ/ y /ɲ/. Para el ritmo, imitación contra audio de referencia y Claude comparando con la forma reducida esperada. **Mitigación parcial, declarada como tal.** Verificado el 2026-10-03: pt-BR tampoco la tiene, así que la limitación no se escapa cambiando de variante | 18 |
| **R2** | **La hipótesis económica es que el consumo medio queda muy por debajo del tope.** A 15 min/día reales el margen es ≈€0,85 y no paga nada | Desde el primer suscriptor activo | Medir coste por usuario contra ingreso por usuario en SQL desde el día uno. Si el consumo medio pasa del 60% del tope, **la respuesta es bajar el tope o subir el precio, no absorber la diferencia**. Es el riesgo número uno del producto | 7, 14, 24 |
| **R3** | **Precio de Gemini Live con confianza baja** — vino de un resumen, no de una cita directa | Al fijar el tope del plan | Recalcular contra la página de precios en vivo **antes de publicar un precio al público**, no después | 19 |
| **R4** | **Practice Portuguese ya existe** y es específicamente de portugués europeo | Mes dos | El hueco real es la puntuación fonémica y la adaptación a errores propios, que no tienen. **ACEPTADO, sin adornos: si el producto no consigue suscriptores que renueven, lo correcto es cerrarlo, no bajar el precio** | — |
| **R5** | Lo más difícil (tiempo real, fin de turno, barge-in) podría comerse el proyecto antes de que haya algo usable | Si se construye en orden equivocado | El orden pone texto primero, cobro después, Afinar luego y Conversar al final. **No negociable** | orden completo |
| **R6** | **El audio de pronunciación es dato personal de categoría sensible**, y ahora de desconocidos que pagan, no de tres amigos | Desde la primera grabación | `retention_until` por fila con el plazo **más corto de todo el sistema**, borrado programado, cascada desde el perfil, borrado de cuenta en la app, subencargados declarados en la política de privacidad | 3, 4, 15, 23 |
| **R7** | **Cortes silenciosos del WebSocket** alrededor de los 50 min por el proxy HTTP de Railway | Sesión larga de Conversar | Proxy TCP nativo más ping de mantenimiento cada 20 s en ambos sentidos | 17, 24 |
| **R8** | La cancelación de eco no se prueba | Si se usa altavoz | Con usuarios desconocidos **ya no se puede suponer que llevan auriculares**. Se degrada de supuesto a aviso en la interfaz antes de la primera sesión de Conversar, y el barge-in queda desactivable. **Sigue siendo una mitigación parcial** | 19 |
| **R9** | **Abuso del plan gratuito con cuentas desechables**: cada alta regala 3 min/día de voz | En cuanto el producto sea visible | Límite de altas por IP, verificación de correo obligatoria antes del primer minuto de voz, y el derecho resuelto antes de la reserva de cuota | 22 |
| **R10** | **Un `429` o un `402` mal puestos convierten un día malo en una fuga de dinero.** El límite de tasa vive en memoria de un solo proceso | Al añadir una segunda instancia | Declarado en `docs/limites.md` y aquí: **con dos réplicas el límite real se duplica**. Es lo primero que se mueve a almacenamiento compartido al escalar, y hasta entonces el despliegue es de una instancia **a propósito** | 22 |
| **R11** | **Reentrega de webhooks de Stripe aplicada dos veces** → derechos duplicados o periodo mal cerrado | Cualquier reintento de Stripe, que son rutinarios | `stripe_events.id` es clave primaria: la idempotencia es estructural, no un `if`. Proyección de derechos en la misma transacción. Probado con doble entrega del mismo evento | 13 |
| **R12** | **Rechazo en la revisión de la App Store** por enlazar o mencionar el pago desde la app | Primer envío a revisión | La app no menciona compra: el paso 15 lo verifica con un `grep` que falla el gate. Patrón multiplataforma, permitido | 15 |
| **R13** | **El temario deriva a pt-BR sin que nadie lo note.** Un modelo escribiendo portugués tiende al brasileño por volumen de entrenamiento, y eso destruye el único diferenciador | Durante toda la siembra del currículo | `variant` explícita en cada fila, casos dorados con construcciones pt-PT frente a sus equivalentes pt-BR en el arnés de evaluación, y **validación por un tutor nativo de Portugal como puerta antes de cualquier gasto en marketing** | 8, 21, hito externo |
| **R14** | **Entregabilidad de correo**: arrancar sin SPF, DKIM y DMARC deja el dominio en spam y la reputación tarda semanas en recuperarse | Primer correo enviado | Los tres se publican y se verifican por DNS en el paso 12, con un `Verify` que sale distinto de 0 nombrando el que falte. **Es el riesgo más barato de evitar y el más caro de arreglar tarde** | 12 |

### 20.3 Decision log

| Decisión | Alternativa rechazada | Por qué |
|---|---|---|
| Voz por el backend | Teléfono → proveedor | El SDK de Azure no corre en RN; una clave en el bundle es pública; la ruta de medios necesita un proceso vivo |
| Contenedor en Railway | Serverless | Un arranque en frío es **audible** |
| Railway | Fly.io | Fly es más barato, pero su política de inactividad para WebSockets no se pudo confirmar |
| Gemini Live semi-cascada | Audio nativo, u OpenAI Realtime | Sólo la semi-cascada deja fijar `pt-PT`. OpenAI mezcla acentos y cuesta el doble |
| Dos modos de voz | Un solo modo conversacional | Voz a voz sola no dice **cómo** pronunciaste, y ahí está todo el valor |
| **pt-PT como único curso** | pt-PT y pt-BR desde el principio | pt-PT es un nicho desatendido y es el foso; pt-BR es un mercado donde se compite con Duolingo y Babbel siendo uno de cincuenta. Y el curso pt-BR es contenido nuevo, no una bandera |
| **Esquema consciente de la variante desde el paso 3** | Añadir la variante cuando haga falta | Es una columna hoy y una migración con datos de clientes dentro después. **Se decidió antes de ejecutar el paso 3 a propósito: era el momento más barato posible** |
| **Enum `content_variant`** | `is_european boolean` | Un booleano es irreversible el día que exista pt-AO. Un enum se amplía con `alter type` |
| **Sin selector de variante en la interfaz** | Dejarlo listo «ya que el esquema lo soporta» | Un interruptor que lleva a un curso vacío es peor que no tenerlo |
| **Alumno hispanohablante, interfaz en español** | Angloparlante, o ambos | Cambia el temario de verdad: falsos amigos, transferencia fonológica y los errores que se persiguen. Para un español *«estou a falar»* es fácil y la /ɨ/ imposible; para un inglés es al revés. Servir a los dos es dos cursos |
| **Cobro por web con Stripe** | RevenueCat con IAP | Sin comisión de tienda, y **una sola fuente de verdad** de la suscripción. El coste es que la conversión en móvil es peor y la app no puede ni mencionar el pago |
| **`stripe@22.6.2`** | `23.0.0`, la última | Major publicado dos días antes de fijar el blueprint, en la ruta de pago. Contradice el motivo por el que se eligió pnpm |
| **`apiVersion` fijada explícita** | El valor por defecto del SDK | Una actualización de SDK cambiaría el comportamiento de la API en silencio, y el síntoma aparecería en producción al cobrar |
| **`entitlements` como proyección local** | Consultar Stripe en la ruta de lectura | Una llamada de red en el camino crítico de cada petición medida es latencia y un fallo externo por algo que ya se sabe |
| **Derecho antes de cuota, cuota antes de proveedor** | Comprobar el plan junto con la cuota | Reservar segundos a quien no tiene plan escribe en el ledger una fila que habrá que liberar. Y el ledger es de sólo anexado |
| **Límite de tasa en memoria, una instancia** | Redis desde el principio | A cero usuarios Redis es infraestructura que no gana nada. La limitación está declarada y es lo primero que cambia al escalar |
| **`web/` sin framework ni `package.json`** | Astro o Next | Cinco páginas y un botón. Un framework añade build, dependencias y despliegue para nada que se note |
| **Correo desde dominio propio el primer día** | El remitente por defecto de Supabase | El de serie está limitado a unos pocos por hora y sirve para probar. Y la reputación de dominio no se arregla rápido |
| **Destinatario en hash en `email_log`** | La dirección en claro | Ya está en `auth.users`. Duplicarla multiplica lo que hay que borrar y lo que hay que declarar |
| **El borrado disocia `traces` y `budget_ledger`** | Borrarlos también | El ledger es de sólo anexado y la contabilidad debe sobrevivir al borrado. Todo lo demás se borra de verdad, incluido el audio |
| Currículo estructurado A1→A2 | Emergente desde cero | Desde A0 absoluto no se puede conversar: no sabes decir nada todavía |
| Migraciones SQL, sin ORM | Drizzle | Dos sistemas de migración sobre una base |
| Un solo modelo de texto | Cascada barato/caro | Las cachés tienen ámbito de modelo; una cascada renuncia a reutilizar el prefijo |
| Contexto largo con caché | RAG | El currículo cabe. Más barato, más exacto, y borra el troceado y el vector store |
| Sin runs durables | Cola y worker | Nada tarda minutos. Sería complejidad muerta |
| Caché TTS compartida entre usuarios | Caché por usuario | Todos estudian el mismo temario, así que el acierto **sube** con los usuarios. Es el único coste que mejora con la escala |
| Evaluación de pronunciación sólo en Afinar | Siempre activa | $0,30/hora que en Conversar no compra nada |
| Charis SIL para el AFI | Inter o IBM Plex Mono | Requisito funcional: ninguna otra cubre ɐ̃ ʃ ʎ ɲ ɨ. Verificado sobre el archivo |
| **pnpm** | npm | Petición explícita del usuario, por seguridad en la cadena de dependencias. Aporta aislamiento estricto, permiso explícito de scripts de instalación y cuarentena de versiones nuevas — ninguna de las tres la da npm por defecto |
| Dos `pnpm-workspace.yaml`, uno por paquete | Uno compartido en la raíz | Uno solo habría impuesto `nodeLinker: hoisted` también al backend, degradando justo el paquete que maneja las claves. Metro obliga al cliente; el servidor no tiene por qué heredarlo |
| Sin roles ni organizaciones | Sistema de permisos | Es B2C: cuentas planas. RLS por `auth.uid()` aísla a miles de usuarios sin inventar un inquilino |

### 20.4 What to build next

Después de los 24 pasos, y **sólo con datos reales de uso**, en este orden:

1. **Validación del temario por un tutor nativo de Portugal.** Va *antes* de cualquier gasto en
   marketing, y es la partida de mayor retorno del presupuesto de lanzamiento: un modelo escribiendo
   portugués deriva a pt-BR y eso destruye el único diferenciador. Es un hito, no un paso de build.
2. **Recalcular el modelo de coste y el margen** con lo que diga `traces` tras el primer mes de
   suscriptores. Es lo que convierte R2 y R3 de riesgos en números, y lo que decide si el tope del
   plan baja o el precio sube.
3. **Afinar el umbral de fin de turno** contra grabaciones reales. El audio sintético no tiene las
   pausas ni el ruido que lo desafinan.
4. **Niveles B1+ con temario emergente**, una vez A2 esté completo y revisado.
5. **Curso pt-BR**, sólo si la demanda de pt-PT está validada y pagada. El esquema ya lo admite; lo
   que falta es el contenido y una segunda rúbrica de fonemas.
6. **Límite de tasa en almacenamiento compartido**, el día que haya una segunda instancia. Es la
   deuda declarada en R10.
7. **Notificaciones push** si el correo resulta insuficiente para mantener la costumbre.

Y la decisión honesta que va con R4: si el producto no consigue suscriptores que renueven, la
respuesta correcta es cerrarlo, no bajar el precio hasta que el margen desaparezca.

---

## See also

- `tasks.json` — el grafo de 18 tareas que lee `/architect-next`
- `epics/*.md` — seis archivos autocontenidos; cada uno trae repetido lo que su epic necesita
- `workspace/` — se copia entero a la raíz del proyecto en el paso 3 del bootstrap
- `workspace/CLAUDE.md` — las reglas que rigen cada sesión del constructor

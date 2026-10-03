---
description: Convenciones de cobro con Stripe, correo transaccional y la web de venta de profe
paths:
  - "the_profe-server/src/billing/**"
  - "the_profe-server/src/email/**"
  - "web/**"
---

# Pagos, correo y web de venta

## La regla que condiciona el producto

**La aplicación móvil no menciona ni enlaza compra, pago, precio ni suscripción.**
Se vende sólo en `web/`. La app **refleja** el plan vigente leyéndolo de `/plan`, y
cuando falta derecho devuelve `402` sin ofrecer dónde pagar.

No es estética. Es la regla de la App Store que permite cobrar fuera de la tienda
sin el *entitlement* de enlace externo — el patrón de Spotify y Netflix. Un botón
de compra, o incluso el texto «desde 12,99 €», es motivo de rechazo en revisión.
El `Verify` del paso 15 lo comprueba con un `grep` sobre `the_profe-app/app`,
`the_profe-app/components` y `the_profe-app/features`, y **falla el gate**. No lo relajes: si te
estorba, lo que está mal es el texto, no el gate.

## Stripe

**Versión fijada exacta: `stripe@22.6.2`, sin caret.** En la ruta de pago un minor
automático no es una mejora, es un cambio no probado. La `23.0.0` existe y se
rechaza a propósito — ver §2 del blueprint.

**`apiVersion: "2026-08-26.dahlia"` se pasa explícito al construir el cliente.**
Es el valor por defecto de la 22.6.2, pero dejarlo implícito significa que una
actualización de SDK cambiaría el comportamiento de la API en silencio, y el
síntoma aparecería en producción al cobrar.

### El webhook

Tres cosas, y ninguna es opcional:

1. **Cuerpo crudo.** La ruta se monta **antes** de cualquier middleware que parsee
   JSON. El `Content-Type` del webhook es JSON, así que un parseo previo consume
   el cuerpo y lo reserializa; la firma se calcula sobre bytes y **no vuelve a
   validar nunca**. El síntoma es un 400 constante que se lee como secreto mal
   copiado. Es la trampa clásica de esta integración.
2. **Firma verificada contra `STRIPE_WEBHOOK_SECRET`**, que **no es** la clave de
   API: es un secreto por endpoint, empieza por `whsec_`, y Stripe lo muestra al
   crear el webhook.
3. **Idempotencia estructural.** `stripe_events.id` es la clave primaria y guarda
   el id del evento de Stripe. Un `insert` que choca es la señal de «ya aplicado»
   y el manejador sale con 200 sin tocar nada más. Resolverlo con un `select`
   previo deja una carrera entre dos entregas simultáneas; la restricción no.
   **Stripe reentrega eventos de rutina**, no por avería.

**El webhook es la única ruta que no usa el sobre estándar.** Stripe espera un
`200` con cuerpo vacío y reentrega ante cualquier otra cosa. Está declarado como
excepción en §5; no lo «arregles».

### Derechos

**La verdad vive en Stripe. `subscriptions` y `entitlements` son una proyección**
que escribe el webhook, en una sola transacción. La ruta de lectura **nunca llama
a la API de Stripe**: una llamada de red en el camino crítico de cada petición
medida es latencia y un punto de fallo externo por algo que ya se sabe.

**Escritura sólo con la clave de servicio.** Un cliente que pudiera escribir su
propio `entitlements` se regalaría el plan de pago. RLS lo deja en solo-lectura
del propio perfil, y se prueba en ambos sentidos.

**El plan no es un rol.** Un suscriptor y un usuario gratuito son la misma clase
de cuenta con distinto número de segundos. Modelarlo como rol metería la
facturación en la capa de autorización, y son dos cosas que cambian por razones
distintas.

### Orden del middleware

```
auth → derecho → cuota → proveedor
```

**El derecho va antes de la cuota** porque reservar segundos a quien no tiene plan
escribe en `budget_ledger` —que es de **sólo anexado**— una fila que habrá que
liberar. **La cuota va antes del proveedor** porque es la regla fundacional del
proyecto. Invertir cualquiera de los dos pares convierte una sesión rechazada en
dinero gastado.

Los dos `402` se distinguen y el cliente los muestra distinto:

| Código | Significa | Lleva en `details` |
|---|---|---|
| `PLAN_REQUIRED` | «hazte suscriptor», se resuelve en la web | — |
| `PLAN_LIMIT_REACHED` | «vuelve mañana» | segundos hasta el reinicio |

Un solo código para los dos haría que la app pidiera pagar a quien ya paga.

## Correo

**Dominio propio con SPF, DKIM y DMARC, desde el primer envío.** Arrancar sin los
tres deja el dominio en spam y **la reputación tarda semanas en recuperarse**: es
el riesgo más barato de evitar y el más caro de arreglar tarde.
`pnpm --dir the_profe-server run check:mail-dns` los resuelve por DNS y sale distinto de 0
nombrando el que falte.

**El SMTP de Supabase Auth apunta a Resend.** El remitente por defecto de Supabase
está limitado a unos pocos por hora y sirve para probar, no para un producto.

**El destinatario se guarda en hash en `email_log`, no en claro.** La dirección ya
está en `auth.users`; duplicarla multiplica lo que hay que borrar en el paso 23 y
lo que hay que declarar en la política de privacidad.

Cinco plantillas: confirmación, restablecimiento, fin de prueba, cancelación y
borrado. **Cada una con versión de texto plano además de HTML**, y **ninguna con
un enlace de compra dirigido a la app** — la misma regla de arriba.

## `web/`

**Sin framework, sin paso de compilación y sin `package.json`.** Cinco páginas
estáticas y un botón; Stripe Checkout es una redirección alojada. El `Verify` del
paso 15 comprueba que `web/package.json` **no** exista, porque la forma de que
esto deje de ser cierto es que alguien añada «sólo una cosita» y con ella un
tercer árbol de dependencias que auditar.

**Los colores de `web/estilos.css` son literalmente los de
`the_profe-app/constants/theme.ts`, y ningún otro.** Un test lo comprueba. La web y la
app son el mismo producto: dos paletas que divergen se notan y abaratan las dos.

**La URL de pago la crea el backend**, nunca el navegador: la página llama a
`POST /billing/checkout` y redirige a lo que devuelve. Construir la URL en el
cliente expone el identificador de precio a manipulación.

**La política de privacidad declara que se procesa voz**, con qué subencargados
—Azure, Google, Anthropic, Supabase— y durante cuánto tiempo se conserva. El audio
de pronunciación lleva **el plazo de retención más corto de todo el sistema**; está
en `docs/retencion.md`.

## Dinero y tiempo

**Enteros, nunca coma flotante.** Igual que en el resto del proyecto: segundos en
`integer`, dinero en `bigint` de micro-euros. La deriva de redondeo aparece como un
saldo que no llega a cero, meses después, y es imposible de reconstruir.

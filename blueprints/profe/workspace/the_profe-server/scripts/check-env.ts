// ---------------------------------------------------------------------------
// profe — script autónomo que valida el entorno del backend sin arrancar el
// servidor. Se invoca con el runtime desnudo:
//
//     node the_profe-server/scripts/check-env.ts
//
// Node 24 elimina los tipos pero resuelve los especificadores LITERALMENTE, así
// que el import lleva la extensión `.ts` real. Ése es el convenio único del
// backend; `the_profe-server/tsconfig.json` lo permite con `allowImportingTsExtensions` y
// lo reescribe a `.js` al emitir con `rewriteRelativeImportExtensions`.
// Ver §19.6, matriz de convenio de resolución.
// ---------------------------------------------------------------------------
import { describeEnv, loadEnv } from "../src/env.ts";

// CONTRATO DE `PROFE_STEP` — ver §10 del blueprint.
//
// Una variable es obligatoria sólo desde el paso que la consume, así que este
// script necesita saber en qué paso está. Sin `PROFE_STEP` valida la CAPA BASE
// (paso 5): puerto, base de datos de pruebas y claves de Supabase.
//
// El valor por defecto NO puede ser "todo": el bootstrap ejecuta este script
// justo después de copiar `.env.example`, y exigir ahí `ANTHROPIC_API_KEY`,
// `AZURE_SPEECH_KEY` y `GEMINI_API_KEY` obligaría a inventarse secretos de
// proveedores cuyo código aún no existe — que es exactamente lo que la
// validación por capas evita.
//
//   sin PROFE_STEP   → capa base (paso 5). Bootstrap y el gate del paso 5.
//   PROFE_STEP=6     → añade la capa de Anthropic.
//   PROFE_STEP=12    → añade la capa de correo (Resend, MAIL_*).
//   PROFE_STEP=13    → añade la capa de Stripe.
//   PROFE_STEP=16    → añade la capa de Azure.
//   PROFE_STEP=19    → añade la capa de Gemini.
//   PROFE_STEP=99    → todo. Es el gate de release, nunca el de un paso.
const result = loadEnv({ step: Number(process.env.PROFE_STEP ?? "5") });

if (!result.ok) {
  console.error("Entorno inválido:");
  for (const problem of result.problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log(describeEnv(result.env));
console.log("OK: entorno válido.");

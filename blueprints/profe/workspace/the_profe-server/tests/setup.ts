// ---------------------------------------------------------------------------
// profe — arranque de entorno para las pruebas del backend.
//
// vitest NO es la aplicación: nada carga `.env` por él. Este archivo lo hace
// con `process.loadEnvFile`, que es nativo de Node 24 — así el backend no
// necesita ninguna dependencia de carga de entorno, y el mecanismo está escrito
// en un solo sitio en vez de repetido en cada punto de llamada.
// Ver §19.6, "Toda herramienta que lee variables de entorno necesita cargarlas".
//
// Se ejecuta antes que cualquier import de test, así que `src/env.ts` —que
// valida al importarse— siempre encuentra lo que necesita.
// ---------------------------------------------------------------------------

try {
  // cwd de vitest = the_profe-server/
  process.loadEnvFile(".env");
} catch {
  // En CI las variables llegan del entorno del runner y no hay archivo .env.
  // No es un error: lo es que falte una variable, y eso lo dice `src/env.ts`.
}

// Valores por defecto del entorno de PRUEBAS. Sólo se aplican si no vienen ya
// definidos, para que CI pueda sobreescribirlos.
const defaults: Record<string, string> = {
  NODE_ENV: "test",
  PORT: "8787",
  TEST_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55432/profe_test",
  // Claves falsas: ningún test de esta suite sale a la red. Los adaptadores de
  // proveedor se sustituyen por dobles en los tests que los tocan, y un test
  // que necesitara una clave real sería un test que no puede pasar en el build.
  ANTHROPIC_API_KEY: "test-anthropic-key",
  ANTHROPIC_MODEL: "claude-opus-5",
  AZURE_SPEECH_KEY: "test-azure-key",
  AZURE_SPEECH_REGION: "westeurope",
  AZURE_TTS_VOICE: "pt-PT-DuarteNeural",
  GEMINI_API_KEY: "test-gemini-key",
  VOICE_QUOTA_SECONDS_PER_PERIOD: "36000",
  COST_MICROS_CAP_PER_PERIOD: "12500000",
  VOICE_SESSION_TTL_SECONDS: "5400",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// La base de datos que los tests usan NUNCA es la de desarrollo ni la de
// producción. Si alguien apunta TEST_DATABASE_URL a Supabase, esto lo para.
if (/supabase\.(co|com)/.test(process.env.TEST_DATABASE_URL ?? "")) {
  throw new Error(
    "TEST_DATABASE_URL apunta a Supabase. Las pruebas sólo corren contra la base local profe_test.",
  );
}

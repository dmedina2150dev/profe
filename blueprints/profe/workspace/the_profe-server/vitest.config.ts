/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

// ---------------------------------------------------------------------------
// profe — configuración del runner de pruebas del backend.
//
// Tres cosas que no son opcionales:
//
// 1. `setupFiles` carga el entorno ANTES de que cualquier test importe
//    `src/env.ts`, que valida al importarse. Sin esto, todo test que toque el
//    módulo de entorno muere en el import y el error nombra el módulo, no la
//    configuración que falta.
// 2. `microsoft-cognitiveservices-speech-sdk` publica artefactos distintos para
//    navegador y para Node. `server.deps.inline` obliga a vitest a resolverlo a
//    través de Node en vez de tratarlo como dependencia externa preconstruida,
//    que es lo que rompe la carga bajo el runner.
// 3. `exclude` nombra `blueprints/**` literalmente: el bundle del blueprint vive
//    dentro del proyecto y contiene una copia de este mismo archivo. Sin la
//    exclusión, vitest podría recogerla como suite.
// ---------------------------------------------------------------------------
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**", "**/blueprints/**"],
    setupFiles: ["./tests/setup.ts"],
    // Los tests de RLS y de cuota comparten una sola base de datos y usan
    // `for update`. Ejecutarlos en paralelo produce interbloqueos que parecen
    // fallos de lógica. Un solo hilo, a propósito.
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    testTimeout: 20000,
    hookTimeout: 30000,
    server: {
      deps: {
        inline: ["microsoft-cognitiveservices-speech-sdk"],
      },
    },
  },
});

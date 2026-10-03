// ---------------------------------------------------------------------------
// profe — lint del cliente, `pnpm dlx expo lint`.
//
// `ignores` nombra `blueprints/` literalmente. ESLint camina el árbol desde el
// directorio de trabajo, que aquí es `the_profe-app/`; `blueprints/` es un hermano y por
// tanto inalcanzable, pero la línea queda explícita para que mover el bundle no
// rompa el gate.
// ---------------------------------------------------------------------------
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "node_modules/*",
      "**/blueprints/**",
    ],
  },
  {
    // EL ÁMBITO ES LA MITAD DE LA REGLA, y omitirlo la vuelve inútil: sin
    // `files`, la regla se aplica también a `tailwind.config.js` y a
    // `constants/theme.ts`, que son precisamente los DOS archivos donde los
    // valores hexadecimales deben estar. Sin acotar, el gate del paso 1 falla
    // con 24 errores sobre el propio sistema de diseño.
    // Verificado el 2026-09-30 durante el smoke test.
    files: ["app/**", "components/**", "features/**", "lib/**", "hooks/**"],
    rules: {
      // Un hex crudo dentro de un componente es un defecto del sistema de diseño:
      // los tokens son la única capa que leen los componentes. Esta regla lo
      // convierte en un fallo del linter en vez de en una nota de revisión.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            "Sin hex en componentes. Usa un token semántico de constants/theme.ts o una clase de utilidad.",
        },
      ],
    },
  },
]);

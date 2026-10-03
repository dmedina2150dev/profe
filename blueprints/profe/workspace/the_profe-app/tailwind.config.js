// ---------------------------------------------------------------------------
// profe — Tailwind 3.4, NO Tailwind 4. NativeWind 4.2.x sólo soporta
// oficialmente la línea 3.4.x; el soporte de Tailwind 4 vive en nativewind v5,
// que está en release candidate y por tanto excluido.
//
// Los colores de aquí son la capa SEMÁNTICA del sistema de diseño. La capa
// primitiva vive en the_profe-app/constants/theme.ts y es la fuente única; este archivo
// la expone a las clases de utilidad. Un hex dentro de un componente es un
// defecto.
//
// `content` no incluye rutas fuera de the_profe-app/, así que este archivo nunca camina
// hasta blueprints/. La exclusión va igualmente explícita por si alguien amplía
// `content` más adelante.
// ---------------------------------------------------------------------------
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "!./**/blueprints/**",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semánticos: claro por defecto, la variante oscura la aplica la clase
        // `dark` que el proveedor de tema fija ANTES del primer pintado.
        bg: { DEFAULT: "#FBF7F0", dark: "#1E1B17" },
        surface: { DEFAULT: "#FFFFFF", dark: "#2A2621" },
        "surface-raised": { DEFAULT: "#F4EDE1", dark: "#3A342C" },
        border: { DEFAULT: "#E8DECD", dark: "#3A342C" },
        text: { DEFAULT: "#1F1B16", dark: "#F0EADF" },
        "text-muted": { DEFAULT: "#6B6153", dark: "#A89C8B" },
        primary: { DEFAULT: "#2A5C8A", dark: "#8FB4D4" },
        "on-primary": { DEFAULT: "#FFFFFF", dark: "#14120F" },
        success: { DEFAULT: "#5E7248", dark: "#8FA872" },
        warn: { DEFAULT: "#B07D2B", dark: "#D9A852" },
        attention: { DEFAULT: "#B5543A", dark: "#D98467" },
        danger: { DEFAULT: "#A32E38", dark: "#E0707A" },
      },
      fontFamily: {
        // La serif es el portugués. La sans es la app hablándote. Nunca se cruzan.
        serif: ["SourceSerif4", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        ipa: ["CharisSIL", "serif"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "38px" }],
        title: ["24px", { lineHeight: "30px" }],
        heading: ["20px", { lineHeight: "26px" }],
        "body-pt": ["17px", { lineHeight: "26px" }],
        body: ["15px", { lineHeight: "22px" }],
        label: ["13px", { lineHeight: "18px" }],
        caption: ["11px", { lineHeight: "16px" }],
        ipa: ["13px", { lineHeight: "18px" }],
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        14: "56px",
        18: "72px",
      },
      borderRadius: {
        field: "6px",
        card: "12px",
        sheet: "20px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

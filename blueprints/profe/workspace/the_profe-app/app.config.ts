// ---------------------------------------------------------------------------
// profe — configuración de la app en TypeScript, no app.json, para poder derivar
// identificadores por variante desde el entorno.
//
// NINGÚN SECRETO VIVE AQUÍ. Todo lo que entra en `extra` acaba en el bundle de
// JS, que es legible. Por eso las claves de Azure, Anthropic y Gemini están sólo
// en el backend, y el audio viaja teléfono → backend → proveedor.
//
// No hay ninguna opción `newArchEnabled`: desde RN 0.82 la Nueva Arquitectura es
// la única y la bandera se ignora. Una configuración que la active o desactive
// es anterior a 0.82 y está obsoleta.
// ---------------------------------------------------------------------------
import type { ExpoConfig, ConfigContext } from "expo/config";

type Variant = "development" | "preview" | "production";

const variant = (process.env.APP_VARIANT ?? "development") as Variant;

const idSuffix: Record<Variant, string> = {
  development: ".dev",
  preview: ".preview",
  production: "",
};

const nameSuffix: Record<Variant, string> = {
  development: " (dev)",
  preview: " (preview)",
  production: "",
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `profe${nameSuffix[variant]}`,
  slug: "profe",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "profe",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: `com.profe.app${idSuffix[variant]}`,
    supportsTablet: false,
    infoPlist: {
      // Cadena de propósito concreta: "esta app necesita el micrófono" es motivo
      // de rechazo por la directriz 5.1.1.
      NSMicrophoneUsageDescription:
        "profe graba tu voz para puntuar tu pronunciación en portugués y para conversar contigo. Las grabaciones son privadas de tu perfil.",
    },
  },
  android: {
    package: `com.profe.app${idSuffix[variant]}`,
    edgeToEdgeEnabled: true,
    permissions: ["android.permission.RECORD_AUDIO"],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-audio",
    "expo-notifications",
    "expo-font",
    // `app.config.ts` es configuración DINÁMICA, así que `pnpm dlx expo install`
    // no puede escribir en él: imprime el plugin que haría falta y sigue con
    // exit 0. Por eso cada plugin se declara aquí a mano. Si falta el del
    // splash, el gate de `E1-T1` falla al mantenerlo visible mientras cargan
    // las fuentes. Verificado el 2026-09-30 durante el smoke test.
    "expo-splash-screen",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    variant,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8787",
    audioWsUrl: process.env.EXPO_PUBLIC_AUDIO_WS_URL ?? "ws://127.0.0.1:8787",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "",
    },
  },
});

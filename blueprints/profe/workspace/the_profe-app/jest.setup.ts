// ---------------------------------------------------------------------------
// profe — arranque de las pruebas del cliente.
//
// Sustituye los módulos nativos que no existen dentro de jest. Sin estos dobles,
// cualquier test que importe la sesión, el audio o el almacenamiento seguro muere
// en el import con un error que nombra el módulo nativo y no la configuración.
// ---------------------------------------------------------------------------

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    isAvailableAsync: jest.fn(async () => true),
  };
});

jest.mock("expo-audio", () => ({
  useAudioRecorder: jest.fn(() => ({
    record: jest.fn(),
    stop: jest.fn(),
    uri: "file:///tmp/profe-test.m4a",
    isRecording: false,
  })),
  setAudioModeAsync: jest.fn(async () => undefined),
  RecordingPresets: { HIGH_QUALITY: {} },
}));

jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true, null]),
  isLoaded: jest.fn(() => true),
}));

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(async () => "notification-id"),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationHandler: jest.fn(),
}));

// La preferencia de tema del sistema. Los tests que comprueban el tema oscuro la
// sobreescriben; el valor por defecto es "light" para que el test del tema claro
// no dependa de la máquina.
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));

// Ningún test del cliente sale a la red. Un test que necesitara red sería un
// test que no puede pasar en un build desatendido.
global.fetch = jest.fn(async () => {
  throw new Error(
    "Los tests del cliente no hacen red. Usa un doble del cliente de API (lib/api.ts).",
  );
}) as unknown as typeof fetch;

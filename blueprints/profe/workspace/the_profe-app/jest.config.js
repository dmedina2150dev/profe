// ---------------------------------------------------------------------------
// profe — runner de pruebas del cliente. El preset `jest-expo` es obligatorio:
// transforma los módulos nativos y los assets que un jest a secas no entiende, y
// su major debe coincidir con el del SDK.
//
// `moduleNameMapper` es lo que hace resolver el alias `@/` bajo jest. Metro y
// TypeScript lo resuelven por su cuenta (tsconfig `paths` y la base de Expo),
// pero jest no hereda ninguno de los dos: sin esta línea el primer test muere en
// un import, no en una aserción. Ver §19.6, matriz de convenio de resolución.
//
// `testPathIgnorePatterns` nombra `blueprints/` literalmente: el bundle vive
// dentro del proyecto y contiene una copia de este archivo.
// ---------------------------------------------------------------------------
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/blueprints/", "/.expo/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop)",
  ],
  collectCoverage: false,
};

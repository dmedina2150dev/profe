// ---------------------------------------------------------------------------
// profe — cliente Expo.
//
// `react-native-worklets/plugin` debe ser la ÚLTIMA entrada del array de
// plugins. No es `react-native-reanimated/plugin`: ese nombre es de Reanimated
// 3 y con Reanimated 4 no existe. Si se pone en otra posición, las animaciones
// fallan en tiempo de ejecución sin error de compilación.
// ---------------------------------------------------------------------------
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-worklets/plugin"],
  };
};

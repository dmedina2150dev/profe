// ---------------------------------------------------------------------------
// profe — cliente Expo. El envoltorio de NativeWind es lo que compila
// global.css a estilos nativos; sin él, las clases de utilidad no producen nada
// y la pantalla sale sin estilo, sin ningún error.
//
// EXCLUSIÓN DEL BUNDLE: Metro camina el árbol desde `projectRoot`, que aquí es
// `the_profe-app/`. `blueprints/` es un hermano de `the_profe-app/`, no un descendiente, así
// que Metro no puede alcanzarlo. La exclusión es estructural, no una regla que
// se pueda olvidar. La línea de `blockList` de abajo la hace además explícita
// por si alguien mueve el bundle dentro de `the_profe-app/`.
// ---------------------------------------------------------------------------
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/.*[/\\]blueprints[/\\].*/];

module.exports = withNativeWind(config, { input: "./global.css" });

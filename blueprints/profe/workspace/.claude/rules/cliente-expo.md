---
description: Convenciones del cliente Expo de profe — instalación de paquetes, tema, tipografía y accesibilidad
paths:
  - "the_profe-app/**"
---

# Cliente Expo

## Instalación de paquetes

**Se instala con `pnpm dlx expo install <pkg>`, nunca con `pnpm add <pkg>`.** El SDK
es un conjunto emparejado de unos 40 módulos nativos: `pnpm add` traería la
versión `latest` del registro y rompe la compilación nativa con errores opacos de
Gradle o CocoaPods. Tres trampas vivas ahora mismo:

- `react-native`: el `latest` del registro es de la línea del SDK 58. Instalarlo rompe Expo.
- `react-native-gesture-handler`: el `latest` es 3.x, una reescritura con API nueva.
- `expo-router`: va en paso con el SDK. Documentación que muestre `expo-router@5`
  o `@6` describe SDK 53/54 — no es una versión más nueva.

Las excepciones son los paquetes que no están en la lista emparejada del SDK
(`nativewind`, `tailwindcss`, `@supabase/supabase-js`, `@tanstack/react-query`):
esos van con `pnpm add` al pin exacto, porque `expo install` los resolvería a
`latest`. Tras cualquier cambio de dependencias: `pnpm dlx expo-doctor@latest`.

**`expo-audio`, no `expo-av`.** `expo-av` es el módulo legado; no empieces nada
nuevo sobre él.

**Development build desde el día uno. Expo Go nunca.** Hay módulos nativos
propios; Expo Go es un cliente genérico preconstruido y no los contiene.

## Nunca crees `ios/` ni `android/` en git

Se sigue en CNG. Los cambios nativos van por config plugin o
`expo-build-properties`, nunca editando el proyecto nativo.

## Tema y tipografía

- **La serif es el portugués. La sans es la app hablándote. Nunca se cruzan.**
  Cualquier texto en portugués —frases, vocabulario, lecturas, lo que dice el
  tutor— va en `font-serif`. Toda la interfaz va en `font-sans`.
- **La transcripción fonética va en `font-ipa` (Charis SIL).** Inter e IBM Plex
  Mono no cubren ɐ̃ ʃ ʎ ɲ ɨ ɾ, y sin Charis SIL el medidor de fonemas muestra
  cuadros vacíos. Es un requisito funcional disfrazado de fuente.
- **Un hex dentro de un archivo de componente es un defecto**, y el linter lo
  falla. Los componentes leen sólo la capa semántica.
- **El tema se aplica antes del primer pintado.** Leerlo en un efecto garantiza un
  destello blanco. La preferencia del sistema es el valor inicial; la elección
  explícita del usuario la sobrescribe y persiste.
- En oscuro, las superficies elevadas son **más claras**, nunca más oscuras, y no
  hay sombras. Nada de `#000` ni `#FFF` como fondo o texto: producen halación.
- Todo tamaño de texto escala con el ajuste del sistema. Nada de `allowFontScaling={false}`.

## Movimiento

Cambio de estado 150 ms · entrada/salida 250 ms · hojas 400 ms · curva
`cubic-bezier(0.2, 0, 0, 1)`.

- El texto en streaming entra **por frase con un fundido**, no carácter a carácter:
  lo segundo tiembla en un teléfono y se lee como un fallo.
- El anillo del micrófono pulsa con la **amplitud real de entrada**, no con una
  animación falsa. Es la única señal fiable de «te estoy oyendo» mientras el
  reconocimiento no ha devuelto nada.
- Con «Reducir movimiento» activado, todo lo anterior es instantáneo y el anillo
  pasa a ser una barra de nivel estática. **No se elimina la señal, se cambia de
  medio.**

## Color no es la única señal

Las bandas de puntuación del medidor de fonemas llevan **etiqueta textual y forma
distinta** además de color. Oliva contra terracota es el eje rojo-verde y un cuarto
de los hombres tiene alguna deficiencia ahí.

## Tokens y almacenamiento

Tokens de sesión en `expo-secure-store`, **nunca** en AsyncStorage. El adaptador de
almacenamiento de `@supabase/supabase-js` se respalda en `expo-secure-store`.
Lecciones ya vistas en `expo-sqlite`. `@supabase/ssr` no aplica a este stack:
apunta a sesión por cookie en SSR.

## Estructura

Una pantalla = una ruta. La lógica de datos baja a `features/<dominio>/` para que
los archivos de `app/` queden por debajo de ~150 líneas. Los componentes de
`components/` son presentacionales: no hacen fetch.

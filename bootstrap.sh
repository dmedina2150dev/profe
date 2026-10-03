#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Requisitos. Fallar aquí, claro, en vez de a mitad de la instalación.
# ---------------------------------------------------------------------------
node -v                                  # espera v24.x
command -v rsync unzip curl              # espera tres rutas
docker info > /dev/null 2>&1 || { echo "ERROR: Docker no está corriendo. Arráncalo y repite." >&2; exit 1; }

# pnpm 12 es requisito duro: `allowBuilds` y `minimumReleaseAge` son claves de
# la 11 en adelante. Una pnpm 10 las IGNORA EN SILENCIO y te instala sin ninguna
# de las dos protecciones — que es el peor resultado posible, porque parece que
# funcionó.
#
# Esto es una ASERCIÓN, no un `pnpm -v` informativo. Imprimir la versión y
# seguir adelante es un gate que no cierra: verificado el 2026-09-30 en una
# máquina donde corepack anunció «Preparing pnpm@12.8.1» y acto seguido
# `pnpm -v` devolvió 10.28.1, sin que nada fallara.
#
# COREPACK NO SIRVE SI YA HAY UN pnpm INDEPENDIENTE ANTES EN EL PATH (Homebrew,
# el instalador standalone, ~/Library/pnpm): su shim queda tapado y la versión
# vieja sigue mandando. Por eso aquí no se invoca corepack a ciegas: se
# comprueba el resultado y se dice cómo llegar a él según lo que ya tengas.
PNPM_MAJOR="$(pnpm -v 2>/dev/null | cut -d. -f1 || echo 0)"
if [ "${PNPM_MAJOR:-0}" -lt 12 ] 2>/dev/null; then
  echo "ERROR: se requiere pnpm 12+; encontrado: $(pnpm -v 2>/dev/null || echo 'ninguno')." >&2
  echo "  Si ya tienes pnpm instalado aparte:  pnpm self-update 12.8.1" >&2
  echo "  Si no tienes pnpm:                   corepack enable && corepack prepare pnpm@12.8.1 --activate" >&2
  echo "" >&2
  echo "  Si eso falla con EACCES sobre ~/Library/pnpm/.tools, ese directorio es" >&2
  echo "  de root (suele venir de un sudo antiguo). Devuélvelo a tu usuario:" >&2
  echo "    sudo chown -R \"\$(whoami)\" ~/Library/pnpm" >&2
  exit 1
fi
pnpm -v                                  # ya garantizado 12.x

# ---------------------------------------------------------------------------
# 1. Repositorio. Los checkpoints de §9 son tags: sin repo no hay retroceso.
#    `git init` sobre un repo existente es seguro, pero el guard evita el ruido.
# ---------------------------------------------------------------------------
git rev-parse --git-dir > /dev/null 2>&1 || git init -q

# ---------------------------------------------------------------------------
# 2. Cliente Expo. Lo crea EL SCAFFOLDER, no el blueprint: por eso no existe
#    ningún the_profe-app/package.json bajo workspace/. Sin instalar todavía — las
#    configuraciones del paso 3 tienen que estar en su sitio antes.
#
#    Las banderas y la redirección son obligatorias, cada una por su razón:
#    --no-install     las configuraciones del paso 3 deben estar antes de instalar.
#    --no-agents-md   si no, escribe su propio the_profe-app/AGENTS.md y
#                     the_profe-app/.claude/settings.json, que competirían con los
#                     nuestros de la raíz. Dos configuraciones, ningún árbitro.
#    --yes            toma los valores por defecto del resto de opciones.
#    < /dev/null      ESTO NO ES OPCIONAL, y `--yes` NO lo sustituye. Como el
#                     paso 1 ya creó el repositorio, el scaffolder pregunta
#                     «¿saltar la creación de un repo git?» AUNQUE se le pase
#                     --yes. Verificado el 2026-09-30: la pregunta se imprime
#                     igual. Sin terminal se resuelve sola a «sí», pero eso es
#                     accidental: en una terminal real se queda esperando. Cerrar
#                     la entrada estándar hace que el comportamiento sea el mismo
#                     en todas partes, que es lo que necesita un build desatendido.
# ---------------------------------------------------------------------------
#    `pnpm create expo` y no `pnpm dlx create-expo-app`: el scaffolder elige el
#    gestor de paquetes SEGÚN CÓMO SE LE INVOCA. Llamado con pnpm, escribe un
#    proyecto que espera pnpm; llamado de otra forma, deja rastros de npm que
#    luego chocan con el lockfile.
[ -d the_profe-app ] || pnpm create expo@latest the_profe-app \
  --template blank-typescript --yes --no-install --no-agents-md < /dev/null

# La plantilla blank-typescript trae un punto de entrada de App.tsx que
# expo-router no usa: `main` pasa a ser "expo-router/entry" más abajo. Estos
# tres archivos quedarían muertos, y App.tsx además rompe el lint por no estar
# referenciado desde ninguna ruta.
rm -f the_profe-app/app.json                    # usamos app.config.ts, con variantes por entorno
rm -f the_profe-app/App.tsx the_profe-app/index.ts

# ---------------------------------------------------------------------------
# 3. workspace/ a la raíz del proyecto. UNA sola copia y ya está todo en su
#    sitio: CLAUDE.md, AGENTS.md, .claude/ y cada configuración de §19.6.
#
#    El marcador es lo que hace correcta la SEGUNDA pasada. La primera vez se
#    sobrescribe (nuestro the_profe-app/tsconfig.json debe ganar al del scaffolder);
#    a partir de ahí se omite, para no revertir lo que escribieron los pasos.
#    NUNCA `cp -n`: en macOS sale 1 cuando se salta un archivo existente y en
#    GNU sale 0, así que el mismo comando aborta la recuperación en un Mac.
# ---------------------------------------------------------------------------
if [ ! -f .workspace-applied ]; then
  rsync -a blueprints/profe/workspace/ ./
  date -u +%Y-%m-%dT%H:%M:%SZ > .workspace-applied
else
  echo "workspace/ ya aplicado; se omite (correcto en la segunda pasada)."
fi

# ---------------------------------------------------------------------------
# 4. Fuentes. Guard por archivo: la segunda pasada no descarga nada.
# ---------------------------------------------------------------------------
mkdir -p the_profe-app/assets/fonts
[ -f the_profe-app/assets/fonts/SourceSerif4-Regular.ttf ] || curl -fsSL \
  -o the_profe-app/assets/fonts/SourceSerif4-Regular.ttf \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf"
[ -f the_profe-app/assets/fonts/Inter-Regular.ttf ] || curl -fsSL \
  -o the_profe-app/assets/fonts/Inter-Regular.ttf \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
[ -f the_profe-app/assets/fonts/CharisSIL-Regular.ttf ] || { \
  curl -fsSL -o /tmp/charis-7.000.zip \
    "https://github.com/silnrsi/font-charis/releases/download/v7.000/Charis-7.000.zip" && \
  unzip -o -j /tmp/charis-7.000.zip "Charis-7.000/Charis-Regular.ttf" -d the_profe-app/assets/fonts && \
  mv the_profe-app/assets/fonts/Charis-Regular.ttf the_profe-app/assets/fonts/CharisSIL-Regular.ttf; }

# ---------------------------------------------------------------------------
# 5. Dependencias del cliente. `pnpm dlx expo install` respeta el conjunto emparejado
#    del SDK 57; `pnpm add` traería el `latest` del registro y rompería la
#    compilación nativa. Los paquetes SIN código nativo sí van por `pnpm add`.
# ---------------------------------------------------------------------------
pnpm --dir the_profe-app install
cd the_profe-app

# react-dom PRIMERO, y por `expo install`, no por `pnpm add`. No es opcional y no es
# para la web: sin fijarlo, el `pnpm add` de más abajo resuelve react-dom a
# la última del registro (19.3.0), que exige `react@^19.3.0`, mientras Expo fija
# react 19.2.3 — y los dos `pnpm add` siguientes ABORTAN con ERESOLVE sin
# instalar nada. Expo lo trae como peer opcional, así que sólo aparece cuando el
# resolutor lo busca. `expo install` lo fija en 19.2.3, la versión que dicta el
# SDK, y el conflicto desaparece. Verificado el 2026-09-30.
pnpm dlx expo install react-dom

pnpm dlx expo install expo-router expo-font expo-splash-screen expo-audio expo-speech \
  expo-secure-store expo-sqlite expo-file-system expo-notifications expo-dev-client \
  react-native-reanimated react-native-worklets react-native-gesture-handler \
  react-native-screens react-native-safe-area-context react-native-svg
pnpm add nativewind@^4.2.7 @tanstack/react-query@^5.104.0 @supabase/supabase-js@^2.117.2
pnpm add -D tailwindcss@~3.4.17 jest-expo@~57.0.5 eslint-config-expo@~57.0.2 \
  eslint@^9 typescript@~6.0.3 @types/react@~19.2.2
# Scripts del cliente, TODAVÍA dentro de the_profe-app/. `pnpm pkg set` es idempotente:
# fijar el mismo valor dos veces sale 0. Esto es la EDICIÓN del blueprint sobre
# el manifiesto que creó el scaffolder, que es la única forma en que lo toca.
# Se ejecutan aquí y no con `--dir` porque `pkg` opera sobre el manifiesto del
# directorio actual: depender de una bandera para lo que un `cd` ya resuelve es
# una forma barata de que falle en una versión futura.
pnpm pkg set main="expo-router/entry"
pnpm pkg set packageManager="pnpm@12.8.1"
pnpm pkg set scripts.start="expo start --dev-client"
pnpm pkg set scripts.typecheck="tsc --noEmit"
pnpm pkg set scripts.lint="eslint ."
pnpm pkg set scripts.test="jest --ci --passWithNoTests"

cd ..

# ---------------------------------------------------------------------------
# 6. Backend. Su package.json SÍ lo emite el blueprint (§19.6): aquí no hay
#    scaffolder, así que el archivo llegó con workspace/ en el paso 3.
# ---------------------------------------------------------------------------
pnpm --dir the_profe-server install

# ---------------------------------------------------------------------------
# 7. Entorno. Los .env.example se commitean; los .env con valores reales no.
# ---------------------------------------------------------------------------
[ -f the_profe-server/.env ] || cp the_profe-server/.env.example the_profe-server/.env
[ -f the_profe-app/.env ] || cp the_profe-app/.env.example the_profe-app/.env

# AQUÍ NO SE VALIDA EL ENTORNO, y es deliberado. `pnpm run check:env` ejecuta
# `scripts/check-env.ts`, que importa `src/env.ts` — un archivo que escribe el
# PASO 5, no el bootstrap. Llamarlo aquí falla con ERR_MODULE_NOT_FOUND sobre un
# módulo que todavía no tiene por qué existir, y ese error se lee como una
# instalación rota cuando en realidad el bootstrap hizo su trabajo bien.
# El bootstrap instala el toolchain y coloca el árbol; los pasos escriben
# archivos. La validación de entorno es el `Verify` del paso 5.
# Verificado el 2026-09-30: con esta línea presente, el bootstrap no completa.

# ---------------------------------------------------------------------------
# 8. Base de datos local. `up -d --wait` sólo devuelve 0 cuando el healthcheck
#    pasa, así que ningún gate corre contra una base que aún no acepta
#    conexiones. Es idempotente: sobre un contenedor ya arriba sale 0.
# ---------------------------------------------------------------------------
pnpm --dir the_profe-server run db:local:up

echo "Bootstrap completo. Siguiente: /architect-next"

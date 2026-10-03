# ---------------------------------------------------------------------------
# profe — backend. Proceso de larga vida, NUNCA serverless: un arranque en frío
# en la ruta de audio es audible. Se despliega en Railway como contenedor, y el
# relé de audio va por el proxy TCP nativo de Railway, no por el proxy HTTP.
#
# `dist/server.js` es la salida que declara the_profe-server/tsconfig.build.json
# (rootDir=src, outDir=dist). Es el mismo literal que `main` en package.json,
# que `pnpm run start`, y que el CMD de abajo. Fuente única: tsconfig.build.json.
#
# GESTOR DE PAQUETES: pnpm, activado con corepack. La imagen de Node no lo trae,
# y `corepack prepare` lo fija a la misma versión que el campo `packageManager`
# del package.json. Si las dos discrepan, corepack aborta — que es lo correcto:
# una imagen construida con otro gestor no es el artefacto que se probó.
#
# `pnpm-workspace.yaml` SE COPIA, y no es opcional: lleva `allowBuilds` y el
# resto de ajustes de instalación. Sin él, pnpm no reconoce ningún script de
# instalación aprobado y, con `strictDepBuilds` activo por defecto, la
# instalación falla dentro de la imagen y no en tu máquina.
# ---------------------------------------------------------------------------

# La etiqueta de imagen es un pin: ver §11 y su fila de procedencia.
FROM node:24.21.0-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm run build

FROM node:24.21.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# `--prod` es la bandera de pnpm; `--omit=dev` es de npm y aquí se ignora en
# silencio, dejando las dependencias de desarrollo dentro de la imagen final.
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY --from=build /app/dist ./dist

# Mismo puerto que PORT en .env.example, que el default de src/env.ts y que los
# curl de los Verify.
EXPOSE 8787

# Sin shell: así SIGTERM llega al proceso de Node y una conexión WebSocket abierta
# se cierra limpiamente en vez de morir de golpe en el redespliegue.
CMD ["node", "dist/server.js"]

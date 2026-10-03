#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# profe — aplica el esqueleto de `auth` y todas las migraciones SQL a la base
# de datos LOCAL de pruebas, en orden lexicográfico de nombre de archivo.
#
# Esta es la única forma en que los gates de §9 preparan su base de datos.
# Contra Supabase real se usa `pnpm dlx supabase@2.118.0 db push`, nunca este script.
#
# CARGA DE ENTORNO: este script es una herramienta autónoma. Nada carga `.env`
# por él, así que lo hace explícitamente aquí (§19.6, tabla de carga de env).
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."          # cwd = the_profe-server/
REPO_ROOT="$(cd .. && pwd)"

set -a
[ -f .env ] && . ./.env
set +a

: "${TEST_DATABASE_URL:?TEST_DATABASE_URL no está definida. Copia the_profe-server/.env.example a the_profe-server/.env}"

# Un único ejecutor de SQL: psql dentro del contenedor. Así el host no necesita
# tener psql instalado, y /repo es el repositorio montado en solo lectura.
run_sql_file() {
  local rel="$1"
  echo "  -> ${rel}"
  docker compose -f "${REPO_ROOT}/docker-compose.yml" exec -T db \
    psql -v ON_ERROR_STOP=1 -U postgres -d profe_test -f "/repo/${rel}"
}

# IDEMPOTENCIA: el bootstrap ejecuta este script dos veces seguidas y
# `create table` no es idempotente. Se reconstruyen los esquemas en cada
# aplicación. Es seguro porque `profe_test` es SÓLO la base local de pruebas;
# este script nunca apunta a Supabase.
echo "[0/2] Reconstruyendo esquemas public y auth en profe_test"
docker compose -f "${REPO_ROOT}/docker-compose.yml" exec -T db \
  psql -v ON_ERROR_STOP=1 -U postgres -d profe_test -c \
  "drop schema if exists public cascade; drop schema if exists auth cascade; create schema public;"

echo "[1/2] Esqueleto de auth (solo local — en Supabase ya existe)"
run_sql_file "the_profe-server/tests/sql/00_auth_stub.sql"

echo "[2/2] Migraciones de supabase/migrations/ en orden"
shopt -s nullglob
migrations=("${REPO_ROOT}"/supabase/migrations/*.sql)
if [ ${#migrations[@]} -eq 0 ]; then
  echo "ERROR: supabase/migrations/ está vacío. El paso 3 del blueprint escribe la primera migración." >&2
  exit 1
fi
for f in "${migrations[@]}"; do
  run_sql_file "supabase/migrations/$(basename "$f")"
done

# La semilla del currículo aparece en el paso 8. Si ya existe, se aplica.
if [ -f "${REPO_ROOT}/supabase/seed/curriculum_a1_a2.sql" ]; then
  echo "[extra] Semilla del currículo"
  run_sql_file "supabase/seed/curriculum_a1_a2.sql"
fi

echo "OK: esquema local aplicado."

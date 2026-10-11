#!/bin/sh
# Deploy de la API de Omia. Se ejecuta DENTRO del contenedor omia-api
# (desde el Terminal del servidor: docker exec omia-api sh -c ...).
#
# Antes: respaldo de la base (ver DEPLOY.md, "Respaldo").
# Uso:   sh deploy-api.sh [rama]        (por defecto main)
set -eu

BRANCH="${1:-main}"
SRC=/tmp/omia-src
STAMP="$(date +%Y%m%d-%H%M)"

echo "→ Respaldo del código actual en /app/dist.bak-$STAMP"
cp -r /app/dist "/app/dist.bak-$STAMP"

echo "→ Bajando $BRANCH desde GitHub"
rm -rf "$SRC" && mkdir -p "$SRC"
wget -qO- "https://codeload.github.com/baynextech/omia/tar.gz/refs/heads/$BRANCH" | tar xz -C "$SRC" --strip-components=1

echo "→ Instalando herramientas de compilación (en /tmp, no toca /app/node_modules)"
cd "$SRC"
npm ci --no-audit --no-fund --ignore-scripts >/dev/null

echo "→ Migraciones de la base (se pueden repetir sin problema)"
node scripts/migrate.mjs

echo "→ Compilando la API"
npm run build:api >/dev/null

# Variables nuevas: se guardan en /app/.env (dotenv no pisa las que ya define el proyecto).
touch /app/.env
add() { grep -q "^$1=" /app/.env || echo "$1=$2" >> /app/.env; }
add SITE_URL "https://omia.site"
add API_URL "https://api.omia.site"
add CONTACT_EMAIL "hola@omia.site"
add GOOGLE_CLIENT_ID "202185901271-37543lcun06v1bdb7ifbiago9ju4r6sq.apps.googleusercontent.com"

echo "→ Publicando"
cp dist/server.cjs /app/dist/server.cjs
cp dist/server.cjs.map /app/dist/server.cjs.map 2>/dev/null || true

echo ""
echo "✔ Listo. Falta reiniciar la API: docker restart omia-api (desde el Terminal del servidor)."
echo "  Para volver atrás: cp -r /app/dist.bak-$STAMP/. /app/dist/ y reiniciar."

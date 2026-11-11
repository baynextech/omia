#!/bin/sh
# Levanta una API de Omia SOLO LOCAL para las simulaciones: base propia (omia_sim), pagos simulados, sin mails.
# Uso: sh scripts/sim/start-local.sh          (deja la API en http://localhost:4100 hasta Ctrl+C)
#      RESET=1 sh scripts/sim/start-local.sh  (borra y recrea la base antes de arrancar)
set -e
cd "$(dirname "$0")/../.."

DB=omia_sim
export DATABASE_URL="postgres://localhost:5432/$DB"
export NODE_ENV=development            # activa el simulador de pagos (en producción no existe)
export PORT=4100
export SITE_URL="http://localhost:4100"
export ADMIN_EMAIL="admin@sim.test"
export ADMIN_PASSWORD="sim-admin-local-1234"
export MERCADOPAGO_ACCESS_TOKEN=""     # sin token => simulador
export RESEND_API_KEY=""               # sin clave => los mails se escriben en el log
unset GEMINI_API_KEY_SERVER

[ "$RESET" = "1" ] && dropdb --if-exists "$DB"
psql -lqt | cut -d'|' -f1 | grep -qw "$DB" || { createdb "$DB"; echo "base $DB creada"; FRESH=1; }

[ -f schema-vps.sql ] && [ "$FRESH" = "1" ] && psql -q "$DB" -f schema-vps.sql >/dev/null 2>&1 || true
node scripts/migrate.mjs
psql -q "$DB" -f seeds/demo-products.sql >/dev/null 2>&1 || true

echo "API local de simulación en $SITE_URL (base $DB). Admin: $ADMIN_EMAIL / $ADMIN_PASSWORD"
exec npx tsx server.ts

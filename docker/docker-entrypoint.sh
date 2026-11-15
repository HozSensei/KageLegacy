#!/bin/sh
set -e

cd /app/backend

echo "⏳ Attente MySQL…"
node scripts/waitForDb.js

echo "📦 Migrations SQL…"
node src/db/migrate.js

# Catalogues V2 (cartes, talents, battle pass) — idempotents, sans compte démo.
# Échappatoire : SKIP_V2_SEEDS=1 pour sauter (debug / maintenance).
if [ "${SKIP_V2_SEEDS:-0}" = "1" ]; then
  echo "⏭  Seeds catalogues V2 ignorés (SKIP_V2_SEEDS=1)"
else
  echo "🌱 Seeds catalogues V2 (idempotents)…"
  npm run db:seed-v2
fi

if [ -n "$CYCLE_START_AT" ] && [ "$CYCLE_START_AT_APPLY" = "true" ]; then
  echo "⏱  Application CYCLE_START_AT…"
  node scripts/applyCycleAnchor.js
fi

echo "🦅 Démarrage API (port ${PORT:-3000})…"
node src/index.js &

echo "🌐 Démarrage Nginx (port 80)…"
exec nginx -g 'daemon off;'

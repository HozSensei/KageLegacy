#!/bin/sh
set -e

cd /app/backend

echo "⏳ Attente MySQL…"
node scripts/waitForDb.js

echo "📦 Migrations SQL…"
node src/db/migrate.js

if [ -n "$CYCLE_START_AT" ] && [ "$CYCLE_START_AT_APPLY" = "true" ]; then
  echo "⏱  Application CYCLE_START_AT…"
  node scripts/applyCycleAnchor.js
fi

echo "🦅 Démarrage API (port ${PORT:-3000})…"
node src/index.js &

echo "🌐 Démarrage Nginx (port 80)…"
exec nginx -g 'daemon off;'

#!/bin/sh
set -e

cd /app/backend

echo "⏳ Attente MySQL…"
node scripts/waitForDb.js

echo "📦 Migrations SQL…"
node src/db/migrate.js

echo "🦅 Démarrage API (port ${PORT:-3000})…"
node src/index.js &

echo "🌐 Démarrage Nginx (port 80)…"
exec nginx -g 'daemon off;'

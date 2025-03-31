#!/bin/sh

set -e

echo "Checking for existing SQLite DB..."

if [ ! -f /app/data/guage.db ]; then
  echo "No database found — creating and pushing schema..."
  NODE_ENV=production npx --yes drizzle-kit push --config=drizzle.config.ts
else
  echo "Existing database found. Skipping schema push."
fi

echo "Starting app..."
exec node server.js

#!/bin/sh

set -e

# Generate AUTH_SECRET if missing
KEY_FILE=/app/data/auth_secret.key
if [ -z "$AUTH_SECRET" ]; then
  echo "AUTH_SECRET not provided — generating one..."
  if [ ! -f "$KEY_FILE" ]; then
    head -c 32 /dev/urandom | base64 >"$KEY_FILE"
  fi
  export AUTH_SECRET=$(cat "$KEY_FILE")
fi

echo "Checking for existing SQLite DB..."

if [ ! -f /app/data/guage.db ]; then
  echo "No database found — creating and pushing schema..."
  NODE_ENV=production npx --yes drizzle-kit push --config=drizzle.config.ts
else
  echo "Existing database found. Skipping schema push."
fi

echo "Starting app..."
exec node server.js

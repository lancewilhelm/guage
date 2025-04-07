#!/bin/sh

set -e

# Paths
DB_PATH=/app/data/guage.db
KEY_FILE=/app/data/auth_secret.key

# Generate BETTER_AUTH_SECRET if not provided
if [ -z "$BETTER_AUTH_SECRET" ]; then
  echo "BETTER_AUTH_SECRET not provided — generating one..."
  if [ ! -f "$KEY_FILE" ]; then
    head -c 32 /dev/urandom | base64 >"$KEY_FILE"
  fi
  export BETTER_AUTH_SECRET=$(cat "$KEY_FILE")
fi

# Set DATABASE_URL for Drizzle
export DATABASE_URL="file:$DB_PATH"

echo "Checking for existing SQLite DB..."

if [ ! -f "$DB_PATH" ]; then
  echo "No database found — pushing schema to create it..."
  NODE_ENV=production npx --yes drizzle-kit push --config=drizzle.config.ts
else
  echo "Database exists — skipping schema push."
fi

echo "Starting Nuxt app..."
exec "$@"

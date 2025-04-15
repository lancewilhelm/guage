#!/bin/sh

set -e

# Paths
DB_PATH=/app/data/guage.db
KEY_FILE=/app/data/auth_secret.key

# Generate BETTER_AUTH_SECRET if not provided
if [ -z "$BETTER_AUTH_SECRET" ]; then
  if [ ! -f "$KEY_FILE" ]; then
    echo "BETTER_AUTH_SECRET not provided — generating one..."
    head -c 32 /dev/urandom | base64 >"$KEY_FILE"
  fi
  echo "Loading BETTER_AUTH_SECRET from $KEY_FILE..."
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

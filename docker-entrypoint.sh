#!/bin/sh
set -e

SEED_VERSION="4"
VERSION_FILE="$(dirname $DATABASE_PATH)/.seed-version"

# Re-seed if database doesn't exist or seed version changed
if [ ! -f "$DATABASE_PATH" ] || [ ! -f "$VERSION_FILE" ] || [ "$(cat $VERSION_FILE)" != "$SEED_VERSION" ]; then
  echo "Seeding database (version $SEED_VERSION)..."
  rm -f "$DATABASE_PATH"
  node dist/seed.cjs
  echo "$SEED_VERSION" > "$VERSION_FILE"
  echo "Seed complete."
else
  echo "Database up to date (version $SEED_VERSION) — skipping seed."
fi

# Start the production server
echo "Starting Route Runner on port $PORT..."
exec node dist/index.cjs

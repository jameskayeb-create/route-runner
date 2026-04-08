#!/bin/sh
set -e

# If the database doesn't exist yet, seed it with initial data
if [ ! -f "$DATABASE_PATH" ]; then
  echo "No database found at $DATABASE_PATH — seeding with initial data..."
  node dist/seed.cjs
  echo "Seed complete."
else
  echo "Database found at $DATABASE_PATH — skipping seed."
fi

# Start the production server
echo "Starting Route Runner on port $PORT..."
exec node dist/index.cjs

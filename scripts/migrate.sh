#!/bin/bash
set -e

ENV=${1:-""}

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "Usage: ./scripts/migrate.sh <dev|prod>"
  exit 1
fi

if [ "$ENV" = "prod" ]; then
  read -p "⚠️  Deploy migrations to PRODUCTION? Type YES to confirm: " confirm
  if [ "$confirm" != "YES" ]; then
    echo "Aborted."
    exit 1
  fi
fi

export $(grep -v "^#" env/.supabase.$ENV | xargs)

echo "🚀 Running migrations on $ENV..."
bunx supabase db push --db-url "$SUPABASE_DB_URL" --include-all
echo "✅ Migrations done!"

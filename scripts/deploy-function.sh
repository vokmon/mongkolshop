#!/bin/bash
set -e

ENV=${1:-""}
FUNCTION=${2:-""}

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "Usage: ./scripts/deploy-function.sh <dev|prod> <function-name>"
  exit 1
fi

if [ -z "$FUNCTION" ]; then
  echo "Usage: ./scripts/deploy-function.sh <dev|prod> <function-name>"
  exit 1
fi

if [ "$ENV" = "prod" ]; then
  read -p "⚠️  Deploy '$FUNCTION' to PRODUCTION? Type YES to confirm: " confirm
  if [ "$confirm" != "YES" ]; then
    echo "Aborted."
    exit 1
  fi
fi

export $(grep -v "^#" env/.supabase.$ENV | xargs)
export $(grep -v "^#" env/.env.$ENV | xargs)

echo "🚀 Deploying '$FUNCTION' to $ENV (project: $SUPABASE_PROJECT_REF)..."

bunx supabase functions deploy $FUNCTION \
  --project-ref $SUPABASE_PROJECT_REF \
  --no-verify-jwt

echo "🔑 Setting secrets..."
bunx supabase secrets set \
  --project-ref $SUPABASE_PROJECT_REF \
  --env-file env/.env.$ENV

echo "✅ Done! Function '$FUNCTION' deployed to $ENV."

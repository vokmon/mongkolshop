#!/bin/bash
set -e

ENV=${1:-""}
FUNCTION=${2:-""}

FUNCTIONS_DIR="$(dirname "$0")/../supabase/functions"
ALL_FUNCTIONS=($(ls "$FUNCTIONS_DIR" | grep -v "^_"))

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "Usage: ./scripts/deploy-function.sh <dev|prod> <function-name|all>"
  exit 1
fi

if [ -z "$FUNCTION" ]; then
  echo "Usage: ./scripts/deploy-function.sh <dev|prod> <function-name|all>"
  exit 1
fi

if [ "$ENV" = "prod" ]; then
  if [ "$FUNCTION" = "all" ]; then
    read -p "⚠️  Deploy ALL functions to PRODUCTION? Type YES to confirm: " confirm
  else
    read -p "⚠️  Deploy '$FUNCTION' to PRODUCTION? Type YES to confirm: " confirm
  fi
  if [ "$confirm" != "YES" ]; then
    echo "Aborted."
    exit 1
  fi
fi

export $(grep -v "^#" env/.supabase.$ENV | xargs)
export $(grep -v "^#" env/.env.$ENV | xargs)

if [ "$FUNCTION" = "all" ]; then
  echo "🚀 Deploying all functions to $ENV (project: $SUPABASE_PROJECT_REF)..."
  for fn in "${ALL_FUNCTIONS[@]}"; do
    echo "  → deploying $fn..."
    bunx supabase functions deploy $fn \
      --project-ref $SUPABASE_PROJECT_REF \
      --no-verify-jwt
  done
else
  echo "🚀 Deploying '$FUNCTION' to $ENV (project: $SUPABASE_PROJECT_REF)..."
  bunx supabase functions deploy $FUNCTION \
    --project-ref $SUPABASE_PROJECT_REF \
    --no-verify-jwt
fi

echo "🔑 Setting secrets..."
bunx supabase secrets set \
  --project-ref $SUPABASE_PROJECT_REF \
  --env-file env/.env.$ENV

if [ "$FUNCTION" = "all" ]; then
  echo "✅ Done! All functions deployed to $ENV."
else
  echo "✅ Done! Function '$FUNCTION' deployed to $ENV."
fi

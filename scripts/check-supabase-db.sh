#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [ ! -f .env ]; then
  echo "❌ Fichier .env introuvable." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL manquant dans .env" >&2
  exit 1
fi

echo "🔌 Test connexion Supabase (pooler)…"
if docker run --rm --env-file .env -e PGSSLMODE=require postgres:17-alpine \
  psql "$DATABASE_URL" -c "SELECT 1 AS ok;" >/dev/null 2>&1; then
  echo "✅ Connexion OK — redémarrez le backend :"
  echo "   docker compose -f docker-compose.supabase.yml up -d backend --force-recreate"
  exit 0
fi

echo "❌ Échec d'authentification PostgreSQL." >&2
echo "" >&2
echo "Vérifiez dans Supabase Dashboard :" >&2
echo "  1. Settings → Database → Reset database password" >&2
echo "  2. Connection string → URI → mode « Transaction » (port 6543)" >&2
echo "  3. Collez la URI complète dans DATABASE_URL (.env)" >&2
echo "" >&2
echo "⚠️  Le mot de passe DB ≠ SUPABASE_SERVICE_ROLE_KEY (Storage/API)." >&2
exit 1

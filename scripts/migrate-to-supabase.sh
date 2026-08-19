#!/bin/bash
set -euo pipefail

# =====================================================================
# Migration PostgreSQL local → Supabase
# =====================================================================
# Prérequis :
#   1. Projet Supabase créé (https://supabase.com/dashboard)
#   2. DATABASE_URL Supabase dans .env (Settings → Database → Connection string → URI)
#      Utiliser le pooler « Transaction » (port 6543) pour SQLAlchemy en prod.
#   3. Docker local avec postgres en cours (source des données)
#
# Usage :
#   ./scripts/migrate-to-supabase.sh              # dump local + import Supabase
#   ./scripts/migrate-to-supabase.sh --dump-only  # export SQL uniquement
#   ./scripts/migrate-to-supabase.sh --restore-only backups/xxx/database_dump.sql
# =====================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

DUMP_ONLY=false
RESTORE_ONLY=false
RESTORE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump-only)
      DUMP_ONLY=true
      shift
      ;;
    --restore-only)
      RESTORE_ONLY=true
      RESTORE_FILE="${2:-}"
      shift 2
      ;;
    --help|-h)
      sed -n '1,20p' "$0"
      exit 0
      ;;
    *)
      echo "Option inconnue : $1" >&2
      exit 1
      ;;
  esac
done

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DB_USER="${POSTGRES_USER:-studio_user}"
DB_NAME="${POSTGRES_DB:-studio_photo}"
DB_PASSWORD="${POSTGRES_PASSWORD:-studio_password}"
SUPABASE_URL="${DATABASE_URL:-${SUPABASE_DATABASE_URL:-}}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${ROOT_DIR}/backups/supabase_${TIMESTAMP}"
DUMP_PATH="${BACKUP_DIR}/database_dump.sql"

run_psql_supabase() {
  # Toujours Docker : le psql macOS parse mal les utilisateurs Supabase (postgres.ref).
  docker run --rm -i \
    -v "${ROOT_DIR}:${ROOT_DIR}" \
    --env-file "${ROOT_DIR}/.env" \
    -e PGSSLMODE=require \
    postgres:17-alpine \
    psql "$SUPABASE_URL" "$@"
}

if [ "$RESTORE_ONLY" = true ]; then
  if [ -z "$RESTORE_FILE" ] || [ ! -f "$RESTORE_FILE" ]; then
    echo "❌ Fichier SQL introuvable : ${RESTORE_FILE}" >&2
    exit 1
  fi
  if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Définissez DATABASE_URL (connection string Supabase) dans .env" >&2
    exit 1
  fi
  RESTORE_ABS="$(cd "$(dirname "$RESTORE_FILE")" && pwd)/$(basename "$RESTORE_FILE")"
  echo "📤 Restauration vers Supabase depuis ${RESTORE_ABS}…"
  run_psql_supabase -v ON_ERROR_STOP=1 -f "${RESTORE_ABS}"
  echo "✅ Restauration terminée."
  exit 0
fi

if [ "$DUMP_ONLY" = false ] && [ -z "$SUPABASE_URL" ]; then
  echo "❌ DATABASE_URL (Supabase) manquant dans .env" >&2
  echo "   Exemple : DATABASE_URL=postgresql://postgres.[ref]:[pwd]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "📦 [1/3] Export PostgreSQL local (${DB_NAME})…"
if ! docker compose ps postgres --status running >/dev/null 2>&1; then
  echo "❌ Le conteneur postgres n'est pas démarré. Lancez : docker compose up -d postgres" >&2
  exit 1
fi

if ! docker compose exec -T -e PGPASSWORD="${DB_PASSWORD}" postgres \
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl --clean --if-exists \
  > "${DUMP_PATH}"; then
  echo "❌ Échec du dump PostgreSQL local." >&2
  exit 1
fi

if [ ! -s "${DUMP_PATH}" ]; then
  echo "❌ Le dump SQL est vide." >&2
  exit 1
fi

echo "✅ Dump sauvegardé : ${DUMP_PATH}"

if [ "$DUMP_ONLY" = true ]; then
  echo "ℹ️  Mode --dump-only : import Supabase ignoré."
  exit 0
fi

echo "🔌 [2/3] Test connexion Supabase…"
if [[ "${DATABASE_URL:-}" == *"db."* && "${DATABASE_URL:-}" == *".supabase.co"* ]]; then
  echo "⚠️  DATABASE_URL utilise db.*.supabase.co (connexion directe IPv6)." >&2
  echo "   Sur Mac / réseaux sans IPv6, utilisez le pooler Supabase :" >&2
  echo "   Dashboard → Database → Connection string → URI → mode « Transaction » (port 6543)" >&2
fi
if ! run_psql_supabase -c "SELECT version();" >/dev/null 2>&1; then
  echo "❌ Impossible de se connecter à Supabase." >&2
  echo "   Vérifiez DATABASE_URL (pooler port 6543) et le mot de passe DB." >&2
  echo "   Dump local conservé : ${DUMP_PATH}" >&2
  exit 1
fi
echo "✅ Connexion Supabase OK"

echo "📤 [3/3] Import des données vers Supabase…"
echo "⚠️  Cette opération remplace le schéma et les données existantes sur Supabase."
read -r -p "Continuer ? [o/N] " confirm
if [[ ! "$confirm" =~ ^[oOyY]$ ]]; then
  echo "Annulé. Dump conservé : ${DUMP_PATH}"
  exit 0
fi

run_psql_supabase -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/${DUMP_PATH#${ROOT_DIR}/}"

echo ""
echo "✅ Migration terminée."
echo "   Dump local : ${DUMP_PATH}"
echo ""
echo "Prochaines étapes :"
echo "  1. Ajoutez DATABASE_URL dans .env (si pas déjà fait)"
echo "  2. Lancez avec Supabase : docker compose -f docker-compose.supabase.yml up -d"
echo "  3. Vérifiez : curl http://localhost:8050/api/v1/health"

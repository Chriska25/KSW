#!/bin/bash
set -euo pipefail

# =====================================================================
# Script de Sauvegarde - KSW Studio
# =====================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DB_USER="${POSTGRES_USER:-studio_user}"
DB_NAME="${POSTGRES_DB:-studio_photo}"
DB_PASSWORD="${POSTGRES_PASSWORD:-studio_password}"
UPLOADS_DIR="${ROOT_DIR}/backend/uploads"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${ROOT_DIR}/backups/${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

echo "📦 [1/3] Export PostgreSQL (${DB_NAME})…"
if ! docker compose exec -T -e PGPASSWORD="${DB_PASSWORD}" postgres \
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl \
  > "${BACKUP_DIR}/database_dump.sql"; then
  echo "❌ Échec du dump PostgreSQL." >&2
  exit 1
fi

if [ ! -s "${BACKUP_DIR}/database_dump.sql" ]; then
  echo "❌ Le dump SQL est vide." >&2
  exit 1
fi

echo "🖼️ [2/3] Sauvegarde des médias (uploads)…"
if [ -d "${UPLOADS_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/uploads.tar.gz" -C "${ROOT_DIR}/backend" uploads
else
  echo "⚠️  Dossier uploads introuvable, archive médias ignorée."
fi

echo "📋 [3/3] Métadonnées de sauvegarde…"
cat > "${BACKUP_DIR}/README.txt" <<EOF
KSW Studio — sauvegarde du ${TIMESTAMP}
Base : ${DB_NAME} (utilisateur ${DB_USER})
Médias : backend/uploads
Restauration DB :
  docker compose exec -T -e PGPASSWORD=${DB_PASSWORD} postgres \\
    psql -U ${DB_USER} -d ${DB_NAME} < database_dump.sql
Restauration médias :
  tar -xzf uploads.tar.gz -C ../../backend
EOF

echo "✅ Sauvegarde complétée : ${BACKUP_DIR}"
ls -lh "${BACKUP_DIR}"

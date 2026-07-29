#!/bin/bash

# =====================================================================
# Script de Sauvegarde Automatique - Studio Lumière
# =====================================================================

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

echo "📦 [1/2] Exportation de la Base de Données PostgreSQL 17..."
docker compose exec -T postgres pg_dump -U postgres studio_lumiere_db > "${BACKUP_DIR}/database_dump.sql"

echo "🖼️ [2/2] Sauvegarde des Médias & Galeries Photos..."
tar -czf "${BACKUP_DIR}/media_galleries.tar.gz" -C backend/storage/app/public galleries

echo "✅ Sauvegarde complétée avec succès sous : ${BACKUP_DIR}"

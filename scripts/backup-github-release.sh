#!/bin/bash
set -euo pipefail

# =====================================================================
# Sauvegarde locale + publication sur GitHub Releases (repo privé)
# Prérequis : gh auth login  (ou variable GH_TOKEN)
# Usage :
#   bash scripts/backup-github-release.sh          # nouvelle sauvegarde + release
#   bash scripts/backup-github-release.sh --latest # publier la dernière sauvegarde locale
# =====================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

USE_LATEST=false
for arg in "$@"; do
  case "$arg" in
    --latest) USE_LATEST=true ;;
    -h|--help)
      echo "Usage: $0 [--latest]"
      exit 0
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ GitHub CLI (gh) requis : https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ Non connecté à GitHub. Exécute : gh auth login" >&2
  exit 1
fi

if [ "$USE_LATEST" = true ]; then
  BACKUP_DIR="$(find "${ROOT_DIR}/backups" -mindepth 1 -maxdepth 1 -type d ! -name '.*' 2>/dev/null | sort -r | head -1)"
  if [ -z "${BACKUP_DIR}" ] || [ ! -d "${BACKUP_DIR}" ]; then
    echo "❌ Aucune sauvegarde locale trouvée dans backups/" >&2
    exit 1
  fi
  echo "📂 Utilisation de la sauvegarde existante : ${BACKUP_DIR}"
else
  bash "${ROOT_DIR}/scripts/backup.sh"
  BACKUP_DIR="$(find "${ROOT_DIR}/backups" -mindepth 1 -maxdepth 1 -type d ! -name '.*' 2>/dev/null | sort -r | head -1)"
fi

TIMESTAMP="$(basename "${BACKUP_DIR}")"
TAG="backup-${TIMESTAMP}"
ARCHIVE="${ROOT_DIR}/backups/ksw-backup-${TIMESTAMP}.zip"

if [ ! -s "${BACKUP_DIR}/database_dump.sql" ]; then
  echo "❌ Dump SQL manquant ou vide dans ${BACKUP_DIR}" >&2
  exit 1
fi

echo "🗜️  Création de l'archive ${ARCHIVE}…"
rm -f "${ARCHIVE}"
(
  cd "${ROOT_DIR}/backups"
  zip -rq "ksw-backup-${TIMESTAMP}.zip" "${TIMESTAMP}"
)

NOTES="$(cat <<EOF
Sauvegarde automatique KSW Studio — \`${TIMESTAMP}\`

## Contenu
- \`database_dump.sql\` — base PostgreSQL
- \`uploads.tar.gz\` — médias (\`backend/uploads\`)
- \`README.txt\` — instructions de restauration

## Restauration rapide
\`\`\`bash
# Extraire l'archive, puis :
docker compose exec -T -e PGPASSWORD=*** postgres psql -U studio_user -d studio_photo < database_dump.sql
tar -xzf uploads.tar.gz -C backend
\`\`\`
EOF
)"

if gh release view "${TAG}" >/dev/null 2>&1; then
  echo "♻️  Release ${TAG} existante — mise à jour des assets…"
  gh release upload "${TAG}" "${ARCHIVE}" --clobber
else
  echo "🚀 Création de la release ${TAG}…"
  gh release create "${TAG}" "${ARCHIVE}" \
    --title "Sauvegarde KSW Studio ${TIMESTAMP}" \
    --notes "${NOTES}"
fi

RELEASE_URL="$(gh release view "${TAG}" --json url -q .url)"
echo "✅ Sauvegarde publiée sur GitHub Releases (privée si le repo est privé)."
echo "   ${RELEASE_URL}"

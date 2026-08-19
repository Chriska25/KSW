#!/bin/bash
# Vérifie qu'aucun secret (.env) n'est versionné ou sur le point d'être commité.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

FAIL=0

echo "🔒 Vérification des secrets…"

# 1. .env ne doit pas être tracké par git
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo "❌ .env est versionné dans git — retirez-le immédiatement :" >&2
    echo "   git rm --cached .env" >&2
    FAIL=1
  fi

  TRACKED_ENV=$(git ls-files '.env*' 2>/dev/null | grep -v '.env.example' || true)
  if [ -n "${TRACKED_ENV}" ]; then
    echo "❌ Fichiers env sensibles versionnés :" >&2
    echo "${TRACKED_ENV}" >&2
    FAIL=1
  fi

  STAGED_ENV=$(git diff --cached --name-only 2>/dev/null | grep -E '^\.env' | grep -v '.env.example' || true)
  if [ -n "${STAGED_ENV}" ]; then
    echo "❌ .env sur le point d'être commité :" >&2
    echo "${STAGED_ENV}" >&2
    FAIL=1
  fi
fi

# 2. .env doit être dans .gitignore
if ! grep -qE '^\.env$' .gitignore 2>/dev/null; then
  echo "❌ .env manquant dans .gitignore" >&2
  FAIL=1
fi

# 3. .cursorignore doit exister pour protéger les secrets de l'IA
if [ ! -f .cursorignore ]; then
  echo "⚠️  .cursorignore absent — créez-le pour exclure .env de l'index Cursor" >&2
fi

if [ "$FAIL" -eq 0 ]; then
  echo "✅ Aucun secret .env détecté dans git."
  exit 0
fi

echo "" >&2
echo "⚠️  Ne commitez JAMAIS .env — seul .env.example (sans vraies clés) peut être versionné." >&2
exit 1

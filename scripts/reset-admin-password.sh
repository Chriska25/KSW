#!/usr/bin/env bash
# Réinitialise le mot de passe du compte admin principal (admin@kswstudio.fr).
# Usage : ./scripts/reset-admin-password.sh [nouveau_mot_de_passe]
set -euo pipefail

NEW_PASSWORD="${1:-Password123!}"

docker exec studio_photography_backend python - <<PY
from database import SessionLocal
from models import User
from security import hash_password

db = SessionLocal()
user = db.query(User).filter(User.email == "admin@kswstudio.fr").first()
if not user:
    print("Compte admin@kswstudio.fr introuvable.")
    raise SystemExit(1)

user.password = hash_password("${NEW_PASSWORD}")
user.status = "active"
user.role = "admin"
db.commit()
print("Mot de passe admin réinitialisé pour admin@kswstudio.fr")
db.close()
PY

echo "Connectez-vous avec le nouveau mot de passe. En dev local, utilisez le code 2FA : 123456"

#!/usr/bin/env python3
"""Réinitialise le mot de passe d'un utilisateur (usage local / Docker)."""
from __future__ import annotations

import argparse
import sys

from database import SessionLocal
from models import User
from security import hash_password, validate_password_policy


def main() -> int:
    parser = argparse.ArgumentParser(description="Réinitialiser le mot de passe d'un compte.")
    parser.add_argument("email", help="Email du compte (ex. admin@kswstudio.fr)")
    parser.add_argument(
        "--password",
        default="Password123!",
        help="Nouveau mot de passe (défaut: Password123!)",
    )
    args = parser.parse_args()

    email = args.email.strip().lower()
    try:
        validate_password_policy(args.password)
    except Exception as exc:
        print(f"Mot de passe refusé : {exc}", file=sys.stderr)
        return 1

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Aucun compte pour {email}", file=sys.stderr)
            return 1
        user.password = hash_password(args.password)
        db.commit()
        print(f"Mot de passe mis à jour pour {email} (rôle: {user.role})")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

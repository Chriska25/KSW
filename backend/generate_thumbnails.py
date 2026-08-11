#!/usr/bin/env python3
"""Génère les miniatures manquantes pour toutes les photos de galeries.

Usage (depuis backend/) :
  python generate_thumbnails.py
  python generate_thumbnails.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from gallery_thumbnails import generate_all_gallery_thumbnails

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")


def main() -> None:
    parser = argparse.ArgumentParser(description="Génère les miniatures _thumb.webp des galeries")
    parser.add_argument("--dry-run", action="store_true", help="Simule sans écrire en BDD ni sur disque")
    args = parser.parse_args()

    if not os.path.isdir(UPLOAD_DIR):
        print(f"Dossier uploads introuvable: {UPLOAD_DIR}")
        sys.exit(1)

    mode = "DRY-RUN" if args.dry_run else "GÉNÉRATION"
    print(f"\n[{mode}] Miniatures galeries — {UPLOAD_DIR}\n")

    db = SessionLocal()
    try:
        stats = generate_all_gallery_thumbnails(db, UPLOAD_DIR, dry_run=args.dry_run)
    finally:
        db.close()

    print(f"Galeries traitées     : {stats['galleries']}")
    print(f"Photos analysées      : {stats['photosSeen']}")
    print(f"Miniatures générées   : {stats['generated']}")
    print(f"Déjà présentes        : {stats['alreadyOk']}")
    print(f"Ignorées (externes)   : {stats['skipped']}")
    print(f"Galeries mises à jour : {stats['updatedGalleries']}")
    print(f"Erreurs               : {stats['errors']}\n")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Copie backend/uploads/ vers Supabase Storage (bucket public)."""

from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(ROOT, "backend")
ENV_PATH = os.path.join(ROOT, ".env")
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")


def _load_env_file() -> None:
    if not os.path.isfile(ENV_PATH):
        return
    with open(ENV_PATH, encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), value)


_load_env_file()
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from storage_backend import UPLOAD_PREFIX, get_media_storage, use_supabase_storage  # noqa: E402


def main() -> int:
    if not use_supabase_storage():
        print("❌ Activez STORAGE_BACKEND=supabase + SUPABASE_SERVICE_ROLE_KEY dans .env")
        return 1

    if not os.path.isdir(UPLOAD_DIR):
        print(f"❌ Dossier introuvable : {UPLOAD_DIR}")
        return 1

    storage = get_media_storage(UPLOAD_DIR)
    files = [f for f in os.listdir(UPLOAD_DIR) if os.path.isfile(os.path.join(UPLOAD_DIR, f))]
    if not files:
        print("ℹ️  Aucun fichier dans backend/uploads/")
        return 0

    print(f"📤 Migration de {len(files)} fichier(s) vers Supabase Storage…")
    ok = 0
    for name in sorted(files):
        path = os.path.join(UPLOAD_DIR, name)
        with open(path, "rb") as handle:
            data = handle.read()
        try:
            url = storage.put_bytes(name, data)
            print(f"  ✓ {name} → {url[:80]}…")
            ok += 1
        except Exception as exc:
            print(f"  ✗ {name} : {exc}")

    print(f"\n✅ {ok}/{len(files)} fichier(s) migrés (préfixe {UPLOAD_PREFIX}/).")
    print("ℹ️  Les URLs en base /uploads/… restent valides via le proxy local ou une mise à jour JSON optionnelle.")
    return 0 if ok == len(files) else 2


if __name__ == "__main__":
    raise SystemExit(main())

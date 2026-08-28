#!/usr/bin/env python3
"""
Configuration OAuth Gmail pour magickasai@gmail.com (API HTTPS, port 443).

Prérequis :
  1. Activer l'API Gmail : https://console.cloud.google.com/apis/library/gmail.googleapis.com
  2. Créer un client OAuth « Application de bureau » (PAS « Application Web »)
  3. Ajouter magickasai@gmail.com comme utilisateur test (écran de consentement)

Usage :
  # Depuis la racine du projet (lit automatiquement .env) :
  python3 backend/scripts/gmail_oauth_setup.py

  # Ou avec variables exportées :
  export GMAIL_CLIENT_ID="xxx.apps.googleusercontent.com"
  export GMAIL_CLIENT_SECRET="GOCSPX-..."
  python3 backend/scripts/gmail_oauth_setup.py

Si client « Application Web », ajoutez cette URI de redirection autorisée :
  http://127.0.0.1:8765/oauth2callback
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

REDIRECT_URI = os.environ.get("GMAIL_OAUTH_REDIRECT_URI", "http://127.0.0.1:8765/oauth2callback")
OAUTH_PORT = int(os.environ.get("GMAIL_OAUTH_PORT", "8765"))
SCOPE = "https://mail.google.com/"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def _load_project_env() -> None:
    """Charge le fichier .env à la racine du repo (sans écraser l'environnement existant)."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
    env_path = os.path.join(project_root, ".env")
    if not os.path.isfile(env_path):
        return
    with open(env_path, encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if not key or key in os.environ:
                continue
            cleaned = value.strip()
            if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in "\"'":
                cleaned = cleaned[1:-1]
            os.environ[key] = cleaned


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    auth_code: str | None = None

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/oauth2callback":
            self.send_error(404)
            return
        params = urllib.parse.parse_qs(parsed.query)
        code = (params.get("code") or [None])[0]
        error = (params.get("error") or [None])[0]
        if error:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(f"Erreur OAuth : {error}".encode())
            return
        if not code:
            self.send_error(400, "Code manquant")
            return
        OAuthCallbackHandler.auth_code = code
        self.send_response(200)
        self.end_headers()
        self.wfile.write(
            b"<html><body><h1>Autorisation reussie</h1>"
            b"<p>Vous pouvez fermer cette fenetre et revenir au terminal.</p></body></html>"
        )

    def log_message(self, format: str, *args: object) -> None:
        return


def _print_unauthorized_help() -> None:
    print(
        "\nErreur 401 unauthorized_client — causes frequentes :\n"
        "  1. CLIENT_ID et CLIENT_SECRET ne viennent PAS du meme client OAuth\n"
        "  2. Type de client incorrect : creez « Application de bureau » (Desktop), pas « Web »\n"
        "  3. Si client Web : ajoutez cette URI dans Google Cloud → Identifiants → URI de redirection :\n"
        f"     {REDIRECT_URI}\n"
        "  4. Secret regenere : recopiez le nouveau GOCSPX-... depuis la console\n"
        "  5. Alternative : https://developers.google.com/oauthplayground (voir doc projet)\n",
        file=sys.stderr,
    )


def exchange_code(client_id: str, client_secret: str, code: str) -> dict:
    data = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        TOKEN_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 401 and "unauthorized_client" in body.lower():
            _print_unauthorized_help()
        raise RuntimeError(f"OAuth Google (HTTP {exc.code}) : {body}") from exc


def main() -> int:
    _load_project_env()
    client_id = os.environ.get("GMAIL_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GMAIL_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print(
            "GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET introuvables.\n"
            "Ajoutez-les dans le fichier .env à la racine du projet, ou exportez-les :\n"
            "  GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com\n"
            "  GMAIL_CLIENT_SECRET=GOCSPX-...\n\n"
            "Google Cloud → Identifiants → Créer → ID client OAuth → Application de bureau",
            file=sys.stderr,
        )
        return 1

    params = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    auth_link = f"{AUTH_URL}?{params}"

    print("Configuration OAuth Gmail")
    print(f"  Redirect URI : {REDIRECT_URI}")
    print(f"  Client ID    : {client_id[:20]}...")
    print()
    print("IMPORTANT — Erreur 403 access_denied :")
    print("  Ecran de consentement → Utilisateurs test → magickasai@gmail.com")
    print()
    print("IMPORTANT — Erreur 401 unauthorized_client :")
    print("  Utilisez un client « Application de bureau » (Desktop app)")
    print("  ID client et secret doivent provenir du MEME client OAuth")
    print()
    print("Ouverture du navigateur …")
    print(f"Si rien ne s'ouvre : {auth_link}\n")
    webbrowser.open(auth_link)

    server = HTTPServer(("127.0.0.1", OAUTH_PORT), OAuthCallbackHandler)
    print(f"En attente de l'autorisation sur {REDIRECT_URI} …")
    while OAuthCallbackHandler.auth_code is None:
        server.handle_request()

    code = OAuthCallbackHandler.auth_code
    assert code is not None
    try:
        tokens = exchange_code(client_id, client_secret, code)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print(
            "Pas de refresh_token dans la reponse. Reessayez avec prompt=consent "
            "ou revoquez l'acces de l'app dans votre compte Google.",
            file=sys.stderr,
        )
        print(json.dumps(tokens, indent=2))
        return 1

    print("\n--- Ajoutez ces lignes dans votre fichier .env ---\n")
    print("EMAIL_PROVIDER=gmail")
    print("GMAIL_USE_API=true")
    print(f"GMAIL_CLIENT_ID={client_id}")
    print(f"GMAIL_CLIENT_SECRET={client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={refresh_token}")
    print("SMTP_HOST=smtp.gmail.com")
    print("SMTP_USER=magickasai@gmail.com")
    print("SMTP_FROM=magickasai@gmail.com")
    print("\n--- Puis redemarrez le backend ---\n")
    print("docker compose up -d backend")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

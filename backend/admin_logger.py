import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from geoip import extract_client_ip, is_private_ip, lookup_geo
from models import Setting

LOGS_KEY = "admin_activity_logs"
MAX_STORED = 2000
LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
LOG_FILE = os.path.join(LOG_DIR, "admin-activity.log")

SKIP_LOG_PATHS = {
    ("GET", "/api/v1/admin/notifications"),
    ("GET", "/api/v1/admin/logs"),
    ("GET", "/api/v1/admin/logs/export"),
    ("GET", "/api/v1/admin/bookings"),
    ("GET", "/api/v1/admin/galleries"),
    ("GET", "/api/v1/admin/contact-messages"),
    ("GET", "/api/v1/admin/analytics/visits"),
}

os.makedirs(LOG_DIR, exist_ok=True)


def _describe_admin_action(method: str, path: str) -> str:
    rel = path.replace("/api/v1/admin/", "")
    labels = {
        ("GET", "bookings"): "Consultation des réservations",
        ("GET", "contact-messages"): "Consultation des messages contact",
        ("GET", "users"): "Consultation des utilisateurs",
        ("GET", "galleries"): "Consultation des galeries",
        ("GET", "blog"): "Consultation du blog",
        ("GET", "faq"): "Consultation de la FAQ",
        ("GET", "analytics/visits"): "Consultation analytics visites",
        ("GET", "search"): "Recherche admin",
        ("GET", "backup/export"): "Export sauvegarde",
        ("POST", "settings"): "Modification des paramètres studio",
        ("POST", "sync-from-local"): "Synchronisation locale → serveur",
        ("POST", "purge-reset"): "Réinitialisation système",
        ("POST", "users"): "Création utilisateur",
        ("POST", "services"): "Création / modification prestation",
        ("POST", "testimonials/save-all"): "Sauvegarde témoignages",
        ("POST", "blog/save-all"): "Sauvegarde articles blog",
        ("POST", "faq/save-all"): "Sauvegarde FAQ",
        ("POST", "galleries/save-all"): "Sauvegarde galeries",
        ("POST", "notifications/test"): "Test notification admin",
        ("POST", "email/test"): "Test email SMTP",
        ("POST", "notifications/mark-read"): "Marquage notifications lues",
    }
    key = (method.upper(), rel)
    if key in labels:
        return labels[key]
    if method.upper() == "DELETE" and rel.startswith("users/"):
        return "Suppression utilisateur"
    if method.upper() == "PATCH" and rel.startswith("bookings/"):
        return "Mise à jour réservation"
    if method.upper() == "PATCH" and rel.startswith("testimonials/"):
        return "Modération témoignage"
    verb = {
        "GET": "Consultation",
        "POST": "Action",
        "PATCH": "Mise à jour",
        "PUT": "Mise à jour",
        "DELETE": "Suppression",
    }.get(method.upper(), method.upper())
    return f"{verb} — {rel or path}"


def _load_logs(db: Session) -> List[Dict[str, Any]]:
    row = db.query(Setting).filter(Setting.key == LOGS_KEY).first()
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def _read_logs_from_file(limit: int) -> List[Dict[str, Any]]:
    if not os.path.isfile(LOG_FILE):
        return []
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
        logs: List[Dict[str, Any]] = []
        for line in reversed(lines[-limit:]):
            clean = line.strip()
            if not clean:
                continue
            try:
                logs.append(json.loads(clean))
            except Exception:
                continue
        return logs
    except Exception:
        return []


def _append_log_file(entry: Dict[str, Any]) -> None:
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


def log_admin_request(
    db: Optional[Session],
    *,
    request,
    status_code: int,
    actor_email: str = "",
    actor_id: str = "",
    actor_name: str = "",
) -> None:
    method = request.method.upper()
    path = request.url.path

    if (method, path) in SKIP_LOG_PATHS:
        return

    ip = extract_client_ip(request)
    geo = {"city": None, "country": None}
    if ip and not is_private_ip(ip):
        geo = lookup_geo(ip)
    now = datetime.utcnow()
    action = _describe_admin_action(method, path)

    entry = {
        "id": str(uuid.uuid4()),
        "level": "success" if status_code < 400 else "error",
        "source": "admin",
        "title": action,
        "message": f"{method} {path} — HTTP {status_code}",
        "actorEmail": actor_email or None,
        "actorId": actor_id or None,
        "actorName": actor_name or None,
        "method": method,
        "path": path,
        "statusCode": status_code,
        "ip": ip,
        "city": geo.get("city"),
        "country": geo.get("country"),
        "createdAt": now.strftime("%d/%m/%Y %H:%M"),
        "createdAtIso": now.isoformat() + "Z",
    }

    _append_log_file(entry)


def get_admin_activity_logs(db: Session, *, limit: int = 500) -> List[Dict[str, Any]]:
    file_logs = _read_logs_from_file(limit)
    if file_logs:
        return file_logs
    return _load_logs(db)[:limit]


def get_admin_log_file_path() -> str:
    return LOG_FILE

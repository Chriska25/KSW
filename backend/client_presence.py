"""Présence clients connectés et journal d'activité (Setting JSON)."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from models import Setting, User

PRESENCE_KEY = "client_presence_data"
ONLINE_THRESHOLD_MINUTES = 5
MAX_ACTIVITY_ENTRIES = 500
MAX_SESSIONS = 200


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _display_now() -> str:
    return datetime.utcnow().strftime("%d/%m/%Y %H:%M")


def _load(db: Session) -> Dict[str, Any]:
    row = db.query(Setting).filter(Setting.key == PRESENCE_KEY).first()
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {"sessions": {}, "activityLog": []}


def _save(db: Session, data: Dict[str, Any]) -> None:
    val = json.dumps(data)
    row = db.query(Setting).filter(Setting.key == PRESENCE_KEY).first()
    if row:
        row.value = val
    else:
        db.add(Setting(key=PRESENCE_KEY, value=val, group="crm"))
    db.commit()


def _user_display_name(user: User) -> str:
    return user.name or user.email or "Client"


def append_activity(
    db: Session,
    *,
    user_id: str,
    email: str,
    name: str,
    action: str,
    detail: str = "",
    path: str = "",
    ip: str = "",
    city: str = "",
    country: str = "",
) -> None:
    data = _load(db)
    log: List[Dict[str, Any]] = data.setdefault("activityLog", [])
    log.insert(
        0,
        {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "email": email,
            "name": name,
            "action": action,
            "detail": detail,
            "path": path,
            "ip": ip,
            "city": city,
            "country": country,
            "createdAt": _now_iso(),
            "displayAt": _display_now(),
        },
    )
    data["activityLog"] = log[:MAX_ACTIVITY_ENTRIES]
    _save(db, data)


def touch_presence(
    db: Session,
    user: User,
    *,
    session_id: str,
    path: str = "",
    ip: str = "",
    city: str = "",
    country: str = "",
    country_code: str = "",
    region: str = "",
    user_agent: str = "",
    is_login: bool = False,
) -> None:
    if (user.role or "client") != "client":
        return

    now = _now_iso()
    sid = (session_id or f"s-{user.id}")[:64]
    data = _load(db)
    sessions: Dict[str, Any] = data.setdefault("sessions", {})

    entry = sessions.get(sid) or {}
    prev_seen = _parse_dt(entry.get("lastSeenAt"))
    skip_activity = (
        not is_login
        and prev_seen is not None
        and datetime.utcnow() - prev_seen < timedelta(seconds=60)
    )

    sessions[sid] = {
        "sessionId": sid,
        "userId": user.id,
        "email": user.email,
        "name": _user_display_name(user),
        "phone": getattr(user, "phone", None) or "",
        "ip": ip or entry.get("ip") or "",
        "city": city or entry.get("city") or "Inconnue",
        "country": country or entry.get("country") or "Inconnu",
        "countryCode": country_code or entry.get("countryCode") or "??",
        "region": region or entry.get("region") or "",
        "userAgent": (user_agent or entry.get("userAgent") or "")[:300],
        "currentPath": path or entry.get("currentPath") or "",
        "loggedInAt": entry.get("loggedInAt") or now,
        "lastSeenAt": now,
    }

    if len(sessions) > MAX_SESSIONS:
        sorted_items = sorted(
            sessions.items(),
            key=lambda item: str(item[1].get("lastSeenAt") or ""),
            reverse=True,
        )
        data["sessions"] = dict(sorted_items[:MAX_SESSIONS])

    if not skip_activity:
        action = "Connexion" if is_login else "Navigation"
        detail = path or ("Connexion à l'espace client" if is_login else "Activité")
        log: List[Dict[str, Any]] = data.setdefault("activityLog", [])
        log.insert(
            0,
            {
                "id": str(uuid.uuid4()),
                "userId": user.id,
                "email": user.email,
                "name": _user_display_name(user),
                "action": action,
                "detail": detail,
                "path": path,
                "ip": ip,
                "city": city or "Inconnue",
                "country": country or "Inconnu",
                "createdAt": now,
                "displayAt": _display_now(),
            },
        )
        data["activityLog"] = log[:MAX_ACTIVITY_ENTRIES]

    if hasattr(user, "last_seen_at"):
        user.last_seen_at = datetime.utcnow()
    if ip and hasattr(user, "last_login_ip"):
        user.last_login_ip = ip
    if city and hasattr(user, "last_login_city"):
        user.last_login_city = city
    if country and hasattr(user, "last_login_country"):
        user.last_login_country = country
    if is_login and hasattr(user, "last_login_at"):
        user.last_login_at = datetime.utcnow()

    db.commit()
    _save(db, data)


def record_client_login(
    db: Session,
    user: User,
    *,
    session_id: str,
    ip: str,
    city: str,
    country: str,
    country_code: str = "",
    region: str = "",
    user_agent: str = "",
) -> None:
    touch_presence(
        db,
        user,
        session_id=session_id,
        path="/login",
        ip=ip,
        city=city,
        country=country,
        country_code=country_code,
        region=region,
        user_agent=user_agent,
        is_login=True,
    )


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    raw = str(value).replace("Z", "")
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def _is_online(last_seen: Optional[str], threshold_minutes: int = ONLINE_THRESHOLD_MINUTES) -> bool:
    dt = _parse_dt(last_seen)
    if not dt:
        return False
    return datetime.utcnow() - dt <= timedelta(minutes=threshold_minutes)


def list_online_sessions(db: Session) -> List[Dict[str, Any]]:
    data = _load(db)
    sessions = list((data.get("sessions") or {}).values())
    online = []
    for session in sessions:
        if _is_online(session.get("lastSeenAt")):
            online.append({**session, "isOnline": True})
    online.sort(key=lambda s: str(s.get("lastSeenAt") or ""), reverse=True)
    return online


def list_clients_overview(db: Session) -> List[Dict[str, Any]]:
    clients = db.query(User).filter(User.role == "client").order_by(User.updated_at.desc()).all()
    data = _load(db)
    sessions_by_user: Dict[str, Dict[str, Any]] = {}
    for session in (data.get("sessions") or {}).values():
        uid = str(session.get("userId") or "")
        prev = sessions_by_user.get(uid)
        if not prev or str(session.get("lastSeenAt") or "") > str(prev.get("lastSeenAt") or ""):
            sessions_by_user[uid] = session

    activity_log: List[Dict[str, Any]] = data.get("activityLog") or []
    last_action_by_user: Dict[str, Dict[str, Any]] = {}
    for entry in activity_log:
        uid = str(entry.get("userId") or "")
        if uid and uid not in last_action_by_user:
            last_action_by_user[uid] = entry

    overview: List[Dict[str, Any]] = []
    for user in clients:
        session = sessions_by_user.get(user.id, {})
        last_action = last_action_by_user.get(user.id, {})
        last_seen = getattr(user, "last_seen_at", None)
        last_login = getattr(user, "last_login_at", None)
        overview.append(
            {
                "id": user.id,
                "name": _user_display_name(user),
                "firstName": user.first_name or "",
                "lastName": user.last_name or "",
                "email": user.email,
                "phone": getattr(user, "phone", None) or "",
                "status": user.status or "active",
                "createdAt": user.created_at.isoformat() + "Z" if user.created_at else None,
                "lastLoginAt": last_login.isoformat() + "Z" if last_login else session.get("loggedInAt"),
                "lastSeenAt": (
                    last_seen.isoformat() + "Z"
                    if last_seen
                    else session.get("lastSeenAt")
                ),
                "isOnline": _is_online(session.get("lastSeenAt")) or (
                    bool(last_seen) and (datetime.utcnow() - last_seen) <= timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
                ),
                "currentPath": session.get("currentPath") or "",
                "location": {
                    "city": getattr(user, "last_login_city", None) or session.get("city") or "—",
                    "country": getattr(user, "last_login_country", None) or session.get("country") or "—",
                    "ip": getattr(user, "last_login_ip", None) or session.get("ip") or "—",
                },
                "lastAction": {
                    "action": last_action.get("action") or "—",
                    "detail": last_action.get("detail") or "",
                    "at": last_action.get("createdAt") or last_action.get("displayAt") or "—",
                    "path": last_action.get("path") or "",
                },
            }
        )

    overview.sort(key=lambda row: (0 if row.get("isOnline") else 1, str(row.get("lastSeenAt") or "")), reverse=True)
    return overview


def get_recent_activity_for_user(db: Session, user_id: str, limit: int = 80) -> List[Dict[str, Any]]:
    data = _load(db)
    log: List[Dict[str, Any]] = data.get("activityLog") or []
    return [entry for entry in log if str(entry.get("userId")) == str(user_id)][:limit]


def list_all_connection_events(db: Session) -> List[Dict[str, Any]]:
    """Tous les événements de connexion / navigation client enregistrés."""
    data = _load(db)
    log: List[Dict[str, Any]] = data.get("activityLog") or []
    events: List[Dict[str, Any]] = []
    for entry in log:
        if not isinstance(entry, dict):
            continue
        events.append(
            {
                "id": entry.get("id") or str(uuid.uuid4()),
                "kind": "client",
                "label": entry.get("action") or "Connexion client",
                "path": entry.get("path") or entry.get("detail") or "",
                "ip": entry.get("ip") or "",
                "city": entry.get("city") or "Inconnue",
                "country": entry.get("country") or "Inconnu",
                "region": "",
                "userName": entry.get("name") or "",
                "email": entry.get("email") or "",
                "createdAt": entry.get("displayAt") or entry.get("createdAt") or "",
                "createdAtIso": entry.get("createdAt") or "",
            }
        )
    return events

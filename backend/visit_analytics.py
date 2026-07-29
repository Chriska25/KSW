import json
from datetime import datetime, timedelta
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from models import Setting

VISITS_KEY = "site_visit_analytics"
MAX_SESSIONS_PER_DAY = 3000
MAX_DAYS_STORED = 120
TOP_PATHS_LIMIT = 15

DEFAULT_DATA: Dict[str, Any] = {
    "totalPageViews": 0,
    "byDay": {},
    "byPath": {},
}


def _load(db: Session) -> Dict[str, Any]:
    row = db.query(Setting).filter(Setting.key == VISITS_KEY).first()
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return json.loads(json.dumps(DEFAULT_DATA))


def _save(db: Session, data: Dict[str, Any]) -> None:
    val = json.dumps(data)
    row = db.query(Setting).filter(Setting.key == VISITS_KEY).first()
    if row:
        row.value = val
    else:
        db.add(Setting(key=VISITS_KEY, value=val, group="analytics"))
    db.commit()


def _normalize_path(path: str) -> str:
    clean = (path or "/").strip()
    if not clean.startswith("/"):
        clean = f"/{clean}"
    if "?" in clean:
        clean = clean.split("?", 1)[0]
    if len(clean) > 200:
        clean = clean[:200]
    return clean or "/"


def _should_skip_path(path: str) -> bool:
    blocked_prefixes = (
        "/admin",
        "/client",
        "/api/",
        "/login",
        "/register",
        "/verify-2fa",
        "/forgot-password",
        "/reset-password",
        "/debug",
    )
    return any(path.startswith(prefix) for prefix in blocked_prefixes)


def _trim_old_days(data: Dict[str, Any]) -> None:
    by_day: Dict[str, Any] = data.get("byDay") or {}
    if len(by_day) <= MAX_DAYS_STORED:
        return
    sorted_days = sorted(by_day.keys())
    for old_day in sorted_days[: len(sorted_days) - MAX_DAYS_STORED]:
        by_day.pop(old_day, None)


def track_visit(db: Session, *, path: str, session_id: str, referrer: str = "") -> None:
    clean_path = _normalize_path(path)
    if _should_skip_path(clean_path):
        return

    sid = (session_id or "anonymous")[:64]
    today = datetime.utcnow().strftime("%Y-%m-%d")

    data = _load(db)
    data["totalPageViews"] = int(data.get("totalPageViews") or 0) + 1

    by_day: Dict[str, Any] = data.setdefault("byDay", {})
    day_entry = by_day.setdefault(today, {"views": 0, "uniqueSessions": []})
    day_entry["views"] = int(day_entry.get("views") or 0) + 1

    sessions: List[str] = day_entry.setdefault("uniqueSessions", [])
    if sid not in sessions and len(sessions) < MAX_SESSIONS_PER_DAY:
        sessions.append(sid)

    by_path: Dict[str, int] = data.setdefault("byPath", {})
    by_path[clean_path] = int(by_path.get(clean_path) or 0) + 1

    if referrer:
        ref_path = _normalize_path(referrer) if referrer.startswith("/") else referrer[:200]
        by_ref: Dict[str, int] = data.setdefault("byReferrer", {})
        by_ref[ref_path] = int(by_ref.get(ref_path) or 0) + 1

    data["lastTrackedAt"] = datetime.utcnow().strftime("%d/%m/%Y %H:%M")
    _trim_old_days(data)
    _save(db, data)


def _build_daily_chart(by_day: Dict[str, Any], days: int = 30) -> List[Dict[str, Any]]:
    chart: List[Dict[str, Any]] = []
    today = datetime.utcnow().date()
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        key = day.strftime("%Y-%m-%d")
        entry = by_day.get(key) or {}
        views = int(entry.get("views") or 0)
        unique = len(entry.get("uniqueSessions") or [])
        chart.append(
            {
                "date": key,
                "label": day.strftime("%d/%m"),
                "views": views,
                "uniqueVisitors": unique,
            }
        )
    return chart


def get_visit_analytics_summary(db: Session) -> Dict[str, Any]:
    data = _load(db)
    by_day: Dict[str, Any] = data.get("byDay") or {}
    today_key = datetime.utcnow().strftime("%Y-%m-%d")

    today_entry = by_day.get(today_key) or {}
    today_views = int(today_entry.get("views") or 0)
    today_unique = len(today_entry.get("uniqueSessions") or [])

    week_views = 0
    week_unique_sessions: set[str] = set()
    month_views = 0
    month_unique_sessions: set[str] = set()

    today_date = datetime.utcnow().date()
    for day_str, entry in by_day.items():
        try:
            day_date = datetime.strptime(day_str, "%Y-%m-%d").date()
        except ValueError:
            continue
        delta = (today_date - day_date).days
        views = int(entry.get("views") or 0)
        sessions = entry.get("uniqueSessions") or []
        if delta < 7:
            week_views += views
            week_unique_sessions.update(sessions)
        if delta < 30:
            month_views += views
            month_unique_sessions.update(sessions)

    by_path: Dict[str, int] = data.get("byPath") or {}
    top_pages = sorted(
        [{"path": path, "views": count} for path, count in by_path.items()],
        key=lambda x: x["views"],
        reverse=True,
    )[:TOP_PATHS_LIMIT]

    total_unique = sum(len((entry or {}).get("uniqueSessions") or []) for entry in by_day.values())

    return {
        "totalPageViews": int(data.get("totalPageViews") or 0),
        "totalUniqueVisitors": total_unique,
        "todayViews": today_views,
        "todayUniqueVisitors": today_unique,
        "weekViews": week_views,
        "weekUniqueVisitors": len(week_unique_sessions),
        "monthViews": month_views,
        "monthUniqueVisitors": len(month_unique_sessions),
        "dailyChart": _build_daily_chart(by_day, 30),
        "topPages": top_pages,
        "lastTrackedAt": data.get("lastTrackedAt"),
    }

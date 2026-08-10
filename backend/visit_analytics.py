import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from models import Setting

VISITS_KEY = "site_visit_analytics"
MAX_SESSIONS_PER_DAY = 3000
MAX_DAYS_STORED = 120
TOP_PATHS_LIMIT = 15
TOP_GEO_LIMIT = 12
MAX_RECENT_VISITS = 2000

DEFAULT_DATA: Dict[str, Any] = {
    "totalPageViews": 0,
    "byDay": {},
    "byPath": {},
    "byCity": {},
    "byCountry": {},
    "recentVisits": [],
    "ipGeoCache": {},
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


def _geo_location_key(city: str, country: str) -> str:
    city_clean = (city or "Inconnue").strip()
    country_clean = (country or "Inconnu").strip()
    return f"{city_clean}, {country_clean}"


def track_visit(
    db: Session,
    *,
    path: str,
    session_id: str,
    referrer: str = "",
    ip: str = "",
    city: str = "",
    country: str = "",
    country_code: str = "",
    region: str = "",
) -> None:
    clean_path = _normalize_path(path)
    if _should_skip_path(clean_path):
        return

    sid = (session_id or "anonymous")[:64]
    today = datetime.utcnow().strftime("%Y-%m-%d")
    tracked_at = datetime.utcnow().strftime("%d/%m/%Y %H:%M")

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

    if ip:
        ip_geo_cache: Dict[str, Any] = data.setdefault("ipGeoCache", {})
        if ip not in ip_geo_cache:
            ip_geo_cache[ip] = {
                "city": city or "Inconnue",
                "country": country or "Inconnu",
                "countryCode": country_code or "??",
                "region": region or "",
            }
        geo = ip_geo_cache[ip]
        city = str(geo.get("city") or city or "Inconnue")
        country = str(geo.get("country") or country or "Inconnu")
        region = str(geo.get("region") or region or "")

        location_key = _geo_location_key(city, country)
        by_city: Dict[str, int] = data.setdefault("byCity", {})
        by_city[location_key] = int(by_city.get(location_key) or 0) + 1

        by_country: Dict[str, int] = data.setdefault("byCountry", {})
        by_country[country] = int(by_country.get(country) or 0) + 1

        recent: List[Dict[str, Any]] = data.setdefault("recentVisits", [])
        recent.insert(
            0,
            {
                "id": f"{sid}-{int(datetime.utcnow().timestamp() * 1000)}",
                "path": clean_path,
                "ip": ip,
                "city": city,
                "country": country,
                "countryCode": country_code or geo.get("countryCode") or "??",
                "region": region,
                "sessionId": sid,
                "referrer": referrer[:200] if referrer else "",
                "createdAt": tracked_at,
            },
        )
        data["recentVisits"] = recent[:MAX_RECENT_VISITS]

    if referrer:
        ref_path = _normalize_path(referrer) if referrer.startswith("/") else referrer[:200]
        by_ref: Dict[str, int] = data.setdefault("byReferrer", {})
        by_ref[ref_path] = int(by_ref.get(ref_path) or 0) + 1

    data["lastTrackedAt"] = tracked_at
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


def _parse_connection_datetime(value: Optional[str]) -> datetime:
    if not value:
        return datetime.min
    raw = str(value).strip()
    if raw.endswith("Z"):
        raw = raw[:-1]
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y %H:%M"):
        try:
            return datetime.strptime(raw[:26] if "T" in raw else raw, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return datetime.min


def build_all_connections(db: Session) -> List[Dict[str, Any]]:
    """Fusionne visites publiques + connexions clients en une liste chronologique."""
    from client_presence import list_all_connection_events

    connections: List[Dict[str, Any]] = []
    visit_data = _load(db)

    for visit in visit_data.get("recentVisits") or []:
        if not isinstance(visit, dict):
            continue
        created = visit.get("createdAt") or ""
        connections.append(
            {
                "id": visit.get("id") or f"visit-{created}",
                "kind": "public",
                "label": "Visite site public",
                "path": visit.get("path") or "/",
                "ip": visit.get("ip") or "—",
                "city": visit.get("city") or "Inconnue",
                "country": visit.get("country") or "Inconnu",
                "region": visit.get("region") or "",
                "countryCode": visit.get("countryCode") or "??",
                "userName": "",
                "email": "",
                "sessionId": visit.get("sessionId") or "",
                "referrer": visit.get("referrer") or "",
                "createdAt": created,
                "_sortAt": _parse_connection_datetime(created),
            }
        )

    for event in list_all_connection_events(db):
        created = event.get("createdAt") or ""
        iso_created = event.get("createdAtIso") or created
        connections.append(
            {
                "id": event.get("id"),
                "kind": "client",
                "label": event.get("label") or "Connexion client",
                "path": event.get("path") or "",
                "ip": event.get("ip") or "—",
                "city": event.get("city") or "Inconnue",
                "country": event.get("country") or "Inconnu",
                "region": event.get("region") or "",
                "countryCode": "??",
                "userName": event.get("userName") or "",
                "email": event.get("email") or "",
                "sessionId": "",
                "referrer": "",
                "createdAt": created,
                "_sortAt": _parse_connection_datetime(iso_created or created),
            }
        )

    connections.sort(key=lambda row: row.get("_sortAt") or datetime.min, reverse=True)
    for row in connections:
        row.pop("_sortAt", None)
    return connections


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

    by_city: Dict[str, int] = data.get("byCity") or {}
    top_cities = sorted(
        [{"location": key, "views": count} for key, count in by_city.items()],
        key=lambda x: x["views"],
        reverse=True,
    )[:TOP_GEO_LIMIT]

    by_country: Dict[str, int] = data.get("byCountry") or {}
    top_countries = sorted(
        [{"country": key, "views": count} for key, count in by_country.items()],
        key=lambda x: x["views"],
        reverse=True,
    )[:TOP_GEO_LIMIT]

    recent_visits = list(data.get("recentVisits") or [])
    all_connections = build_all_connections(db)

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
        "topCities": top_cities,
        "topCountries": top_countries,
        "recentVisits": recent_visits,
        "allConnections": all_connections,
        "connectionsCount": len(all_connections),
        "lastTrackedAt": data.get("lastTrackedAt"),
    }

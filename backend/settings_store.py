import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from models import Setting


def get_setting_value(db: Session, key: str, default: Any = None) -> Any:
    row = db.query(Setting).filter(Setting.key == key).first()
    if not row or row.value is None:
        return default
    try:
        return json.loads(row.value)
    except Exception:
        return row.value


def get_setting_bool(db: Session, key: str, default: bool = False) -> bool:
    value = get_setting_value(db, key, default)
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def get_setting_int(db: Session, key: str, default: int = 0) -> int:
    value = get_setting_value(db, key, default)
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def get_json_setting_list(db: Session, key: str) -> List[Dict[str, Any]]:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def get_json_settings_batch(db: Session, keys: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    if not keys:
        return {}
    unique_keys = list(dict.fromkeys(keys))
    result: Dict[str, List[Dict[str, Any]]] = {key: [] for key in unique_keys}
    rows = db.query(Setting).filter(Setting.key.in_(unique_keys)).all()
    for row in rows:
        if row.key not in result or not row.value:
            continue
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, list):
                result[row.key] = parsed
        except Exception:
            pass
    return result

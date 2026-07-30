import json
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from models import Setting


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

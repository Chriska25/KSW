"""Rate limiting — Redis si disponible, sinon mémoire process."""
from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Dict, Optional
from urllib.parse import urlparse

from fastapi import HTTPException

_memory_buckets: Dict[str, list[float]] = defaultdict(list)
_redis_client = None
_redis_checked = False


def _redis_url() -> str:
    explicit = (os.getenv("REDIS_URL") or "").strip()
    if explicit:
        return explicit
    host = os.getenv("REDIS_HOST", "redis")
    port = os.getenv("REDIS_PORT", "6379")
    password = (os.getenv("REDIS_PASSWORD") or "").strip()
    if password:
        return f"redis://:{password}@{host}:{port}/0"
    return f"redis://{host}:{port}/0"


def _get_redis():
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    if os.getenv("RATE_LIMIT_BACKEND", "auto").lower() == "memory":
        return None
    try:
        import redis

        client = redis.Redis.from_url(_redis_url(), decode_responses=True, socket_connect_timeout=1)
        client.ping()
        _redis_client = client
    except Exception as exc:
        print(f"[RATE-LIMIT] Redis indisponible, fallback mémoire : {exc}")
        _redis_client = None
    return _redis_client


def check_rate_limit(key: str, *, max_attempts: int = 10, window_seconds: int = 900) -> None:
    client = _get_redis()
    if client is not None:
        redis_key = f"rl:{key}"
        try:
            count = client.incr(redis_key)
            if count == 1:
                client.expire(redis_key, window_seconds)
            if count > max_attempts:
                raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez plus tard.")
            return
        except HTTPException:
            raise
        except Exception as exc:
            print(f"[RATE-LIMIT] Erreur Redis, fallback mémoire : {exc}")

    now = time.time()
    bucket = [t for t in _memory_buckets[key] if now - t < window_seconds]
    if len(bucket) >= max_attempts:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez plus tard.")
    bucket.append(now)
    _memory_buckets[key] = bucket
    if len(_memory_buckets) > 5000:
        stale_keys = [
            stale_key
            for stale_key, timestamps in _memory_buckets.items()
            if not timestamps or now - timestamps[-1] > window_seconds
        ]
        for stale_key in stale_keys[:1000]:
            _memory_buckets.pop(stale_key, None)

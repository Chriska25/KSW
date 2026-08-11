import ipaddress
import time
from typing import Any, Dict

import requests

_geo_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 3600


def extract_client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip") or request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "0.0.0.0"


def is_private_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return addr.is_private or addr.is_loopback or addr.is_link_local
    except ValueError:
        return True


def lookup_geo(ip: str) -> Dict[str, Any]:
    clean_ip = (ip or "").strip() or "0.0.0.0"
    fallback = {
        "ip": clean_ip,
        "city": "Inconnue",
        "country": "Inconnu",
        "countryCode": "??",
        "region": "",
    }

    if is_private_ip(clean_ip):
        return {
            **fallback,
            "city": "Réseau local",
            "country": "Local",
            "countryCode": "LO",
            "region": "Dev / LAN",
        }

    cached = _geo_cache.get(clean_ip)
    if cached and time.time() - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    try:
        resp = requests.get(
            f"http://ip-api.com/json/{clean_ip}",
            params={"fields": "status,country,countryCode,regionName,city,query"},
            timeout=2.5,
        )
        data = resp.json()
        if data.get("status") == "success":
            result = {
                "ip": data.get("query") or clean_ip,
                "city": data.get("city") or "Inconnue",
                "country": data.get("country") or "Inconnu",
                "countryCode": data.get("countryCode") or "??",
                "region": data.get("regionName") or "",
            }
            _geo_cache[clean_ip] = (time.time(), result)
            return result
    except Exception:
        pass

    return fallback

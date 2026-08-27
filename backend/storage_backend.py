"""Stockage médias : disque local ou Supabase Storage."""

from __future__ import annotations

import json
import mimetypes
import os
import urllib.error
import urllib.request
from typing import Optional
from urllib.parse import quote, urlparse

from app.core.config import settings

UPLOAD_PREFIX = "uploads"

_STORAGE_INSTANCES: dict[str, MediaStorage] = {}
_STORAGE_BUCKETS_ENSURED: set[str] = set()


def _guess_content_type(filename: str) -> str:
    ctype, _ = mimetypes.guess_type(filename)
    return ctype or "application/octet-stream"


class MediaStorage:
    """Backend de stockage des fichiers médias."""

    def put_bytes(self, filename: str, data: bytes, content_type: Optional[str] = None) -> str:
        raise NotImplementedError

    def get_bytes(self, url: str) -> Optional[bytes]:
        raise NotImplementedError

    def exists(self, url: str) -> bool:
        raise NotImplementedError

    def local_path(self, url: str) -> Optional[str]:
        """Chemin disque si disponible (local ou miroir)."""
        return None


class LocalMediaStorage(MediaStorage):
    def __init__(self, upload_dir: str) -> None:
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)

    def _path(self, filename: str) -> str:
        return os.path.join(self.upload_dir, os.path.basename(filename))

    def put_bytes(self, filename: str, data: bytes, content_type: Optional[str] = None) -> str:
        path = self._path(filename)
        with open(path, "wb") as handle:
            handle.write(data)
        return f"/uploads/{os.path.basename(filename)}"

    def get_bytes(self, url: str) -> Optional[bytes]:
        path = self.local_path(url)
        if not path:
            return None
        try:
            with open(path, "rb") as handle:
                return handle.read()
        except OSError:
            return None

    def exists(self, url: str) -> bool:
        path = self.local_path(url)
        return bool(path and os.path.isfile(path))

    def local_path(self, url: str) -> Optional[str]:
        if not url or not str(url).startswith("/uploads/"):
            return None
        path = self._path(str(url).replace("/uploads/", "", 1))
        return path if os.path.isfile(path) else None


class SupabaseMediaStorage(MediaStorage):
    def __init__(self, upload_dir: str) -> None:
        self.upload_dir = upload_dir
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        os.makedirs(upload_dir, exist_ok=True)

    def _object_path(self, filename: str) -> str:
        return f"{UPLOAD_PREFIX}/{os.path.basename(filename)}"

    def public_url(self, filename: str) -> str:
        object_path = self._object_path(filename)
        encoded = "/".join(quote(part, safe="") for part in object_path.split("/"))
        return f"{self.base_url}/storage/v1/object/public/{self.bucket}/{encoded}"

    def _is_our_public_url(self, url: str) -> bool:
        raw = str(url or "").strip()
        return raw.startswith(f"{self.base_url}/storage/v1/object/public/{self.bucket}/")

    def _filename_from_url(self, url: str) -> Optional[str]:
        raw = str(url or "").strip()
        if raw.startswith("/uploads/"):
            return os.path.basename(raw.replace("/uploads/", "", 1))
        if self._is_our_public_url(raw):
            suffix = f"/storage/v1/object/public/{self.bucket}/"
            idx = raw.find(suffix)
            if idx == -1:
                return None
            object_path = raw[idx + len(suffix) :]
            if object_path.startswith(f"{UPLOAD_PREFIX}/"):
                return os.path.basename(object_path)
        return None

    def _api_request(
        self,
        method: str,
        path: str,
        *,
        data: Optional[bytes] = None,
        headers: Optional[dict[str, str]] = None,
    ) -> tuple[int, bytes]:
        url = f"{self.base_url}/storage/v1{path}"
        req_headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }
        if headers:
            req_headers.update(headers)
        request = urllib.request.Request(url, data=data, method=method, headers=req_headers)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as exc:
            body = exc.read()
            raise RuntimeError(f"Supabase Storage {method} {path} → {exc.code}: {body[:300]!r}") from exc

    def ensure_bucket(self) -> None:
        try:
            self._api_request("GET", f"/bucket/{self.bucket}")
        except RuntimeError:
            payload = json.dumps({"name": self.bucket, "public": True}).encode("utf-8")
            self._api_request(
                "POST",
                "/bucket",
                data=payload,
                headers={"Content-Type": "application/json"},
            )

    def put_bytes(self, filename: str, data: bytes, content_type: Optional[str] = None) -> str:
        object_path = self._object_path(filename)
        encoded = "/".join(quote(part, safe="") for part in object_path.split("/"))
        ctype = content_type or _guess_content_type(filename)
        self._api_request(
            "POST",
            f"/object/{self.bucket}/{encoded}",
            data=data,
            headers={"Content-Type": ctype, "x-upsert": "true"},
        )
        if settings.STORAGE_LOCAL_MIRROR:
            local_path = os.path.join(self.upload_dir, os.path.basename(filename))
            with open(local_path, "wb") as handle:
                handle.write(data)
        return self.public_url(filename)

    def get_bytes(self, url: str) -> Optional[bytes]:
        local = self.local_path(url)
        if local:
            try:
                with open(local, "rb") as handle:
                    return handle.read()
            except OSError:
                pass

        raw = str(url or "").strip()
        fetch_url = raw
        if raw.startswith("/uploads/"):
            fetch_url = self.public_url(raw.replace("/uploads/", "", 1))

        if not fetch_url.startswith(("http://", "https://")):
            return None

        try:
            request = urllib.request.Request(fetch_url, headers={"User-Agent": "KSWStudio-Storage/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except Exception as exc:
            print(f"Storage get_bytes error {url}: {exc}")
            return None

    def exists(self, url: str) -> bool:
        if self.local_path(url):
            return True
        filename = self._filename_from_url(url)
        if not filename:
            return False
        public = self.public_url(filename)
        try:
            request = urllib.request.Request(public, method="HEAD", headers={"User-Agent": "KSWStudio-Storage/1.0"})
            with urllib.request.urlopen(request, timeout=15) as response:
                return response.status == 200
        except Exception:
            return False

    def local_path(self, url: str) -> Optional[str]:
        filename = self._filename_from_url(url)
        if not filename:
            return None
        path = os.path.join(self.upload_dir, filename)
        return path if os.path.isfile(path) else None


def use_supabase_storage() -> bool:
    return (
        settings.STORAGE_BACKEND.lower() == "supabase"
        and bool(settings.SUPABASE_URL.strip())
        and bool(settings.SUPABASE_SERVICE_ROLE_KEY.strip())
        and bool(settings.SUPABASE_STORAGE_BUCKET.strip())
    )


def get_media_storage(upload_dir: str) -> MediaStorage:
    cached = _STORAGE_INSTANCES.get(upload_dir)
    if cached is not None:
        return cached

    if use_supabase_storage():
        storage = SupabaseMediaStorage(upload_dir)
        if upload_dir not in _STORAGE_BUCKETS_ENSURED:
            try:
                storage.ensure_bucket()
                _STORAGE_BUCKETS_ENSURED.add(upload_dir)
            except Exception as exc:
                print(f"[STORAGE] Bucket Supabase: {exc}")
        _STORAGE_INSTANCES[upload_dir] = storage
        return storage

    storage = LocalMediaStorage(upload_dir)
    _STORAGE_INSTANCES[upload_dir] = storage
    return storage


def resolve_storage_path(url: str, upload_dir: str) -> Optional[str]:
    return get_media_storage(upload_dir).local_path(url)

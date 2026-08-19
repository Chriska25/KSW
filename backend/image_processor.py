"""Traitement images : filigrane texte + export WebP selon paramètres studio."""

from __future__ import annotations

import base64
import io
import json
import os
import uuid
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = 40_000_000
from storage_backend import get_media_storage

DEFAULT_MEDIA_SETTINGS: Dict[str, Any] = {
    "studioNameFirstPart": "KSW",
    "studioNameSecondPart": "STUDIO",
    "watermarkText": "Épreuve sécurisée",
    "watermarkPosition": "bottom_center",
    "watermarkOpacity": 40,
    "watermarkShowText": True,
    "watermarkLogoEnabled": False,
    "watermarkLogoUrl": "",
    "watermarkLogoPosition": "bottom_right",
    "watermarkLogoSize": 18,
    "watermarkLogoOpacity": 40,
    "invoiceLogoUrl": "",
    "webpQuality": 85,
    "hdWebpQuality": 98,
}

MEDIA_SETTING_KEYS = frozenset(DEFAULT_MEDIA_SETTINGS.keys())

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
]


def load_media_settings(db) -> Dict[str, Any]:
    from models import Setting

    settings = dict(DEFAULT_MEDIA_SETTINGS)
    rows = db.query(Setting).filter(Setting.key.in_(MEDIA_SETTING_KEYS)).all()
    for row in rows:
        try:
            settings[row.key] = json.loads(row.value)
        except Exception:
            settings[row.key] = row.value
    return normalize_media_settings(settings)


def normalize_media_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise types — aligné sur les paramètres admin (filigrane)."""
    out = dict(DEFAULT_MEDIA_SETTINGS)
    for key in MEDIA_SETTING_KEYS:
        if key in settings and settings[key] not in (None, ""):
            out[key] = settings[key]

    out["studioNameFirstPart"] = str(out.get("studioNameFirstPart") or "KSW").strip()
    out["studioNameSecondPart"] = str(out.get("studioNameSecondPart") or "STUDIO").strip()
    out["watermarkText"] = str(out.get("watermarkText") or "Épreuve sécurisée").strip()
    out["watermarkPosition"] = str(out.get("watermarkPosition") or "bottom_center").strip()
    out["watermarkLogoUrl"] = str(out.get("watermarkLogoUrl") or "").strip()
    out["watermarkLogoPosition"] = str(out.get("watermarkLogoPosition") or "bottom_right").strip()
    out["invoiceLogoUrl"] = str(out.get("invoiceLogoUrl") or "").strip()
    out["watermarkShowText"] = _truthy(out.get("watermarkShowText", True))
    out["watermarkLogoEnabled"] = _truthy(out.get("watermarkLogoEnabled"))
    out["watermarkOpacity"] = _safe_int(out.get("watermarkOpacity"), 40)
    out["watermarkLogoOpacity"] = _safe_int(out.get("watermarkLogoOpacity"), 40)
    out["watermarkLogoSize"] = _safe_int(out.get("watermarkLogoSize"), 18)
    out["webpQuality"] = _safe_int(out.get("webpQuality"), 85)
    out["hdWebpQuality"] = _safe_int(out.get("hdWebpQuality"), 98)
    return out


def build_watermark_label(settings: Dict[str, Any]) -> str:
    first = str(settings.get("studioNameFirstPart") or "KSW").strip()
    second = str(settings.get("studioNameSecondPart") or "STUDIO").strip()
    studio = f"{first} {second}".strip().upper()

    suffix = str(settings.get("watermarkText") or "Épreuve sécurisée").strip()
    suffix = suffix.lstrip("©").strip()

    if "•" in suffix:
        return suffix.upper() if suffix.startswith("©") else f"© {suffix.upper()}"

    if " - " in suffix:
        suffix = suffix.split(" - ", 1)[-1].strip()

    return f"© {studio} • {suffix.upper()}"


def _safe_int(value: Any, default: int) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _text_size(draw: ImageDraw.ImageDraw, text: str, font) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _draw_pill(
    draw: ImageDraw.ImageDraw,
    xy: Tuple[int, int, int, int],
    text: str,
    font,
    text_alpha: int,
    bg_alpha: int,
) -> None:
    x1, y1, x2, y2 = xy
    radius = (y2 - y1) // 2
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=(0, 0, 0, bg_alpha))
    tw, th = _text_size(draw, text, font)
    tx = x1 + ((x2 - x1) - tw) // 2
    ty = y1 + ((y2 - y1) - th) // 2 - 1
    draw.text((tx, ty), text, font=font, fill=(255, 255, 255, text_alpha))


def _apply_pill_watermark(
    overlay: Image.Image,
    text: str,
    font,
    text_alpha: int,
    position: str,
) -> None:
    draw = ImageDraw.Draw(overlay)
    tw, th = _text_size(draw, text, font)
    pad_x, pad_y = max(12, overlay.width // 80), max(6, overlay.height // 120)
    pill_w = tw + pad_x * 2
    pill_h = th + pad_y * 2
    w, h = overlay.size
    margin = max(16, min(w, h) // 40)
    bg_alpha = min(255, max(text_alpha, int(text_alpha * 1.35)))

    if position == "center":
        x1 = (w - pill_w) // 2
        y1 = (h - pill_h) // 2
    elif position == "bottom_right":
        x1 = w - pill_w - margin
        y1 = h - pill_h - margin
    elif position == "bottom_left":
        x1 = margin
        y1 = h - pill_h - margin
    elif position == "top_left":
        x1 = margin
        y1 = margin
    elif position == "top_center":
        x1 = (w - pill_w) // 2
        y1 = margin
    elif position == "top_right":
        x1 = w - pill_w - margin
        y1 = margin
    else:  # bottom_center (défaut)
        x1 = (w - pill_w) // 2
        y1 = h - pill_h - margin

    _draw_pill(draw, (x1, y1, x1 + pill_w, y1 + pill_h), text, font, text_alpha, bg_alpha)


def _apply_diagonal_text(overlay: Image.Image, text: str, font, alpha: int) -> None:
    w, h = overlay.size
    draw = ImageDraw.Draw(overlay)
    tw, th = _text_size(draw, text, font)

    tile_w = max(tw + 80, 220)
    tile_h = max(th + 60, 120)
    tile = Image.new("RGBA", (tile_w, tile_h), (0, 0, 0, 0))
    tile_draw = ImageDraw.Draw(tile)
    tile_draw.text((20, 20), text, font=font, fill=(255, 255, 255, alpha))
    rotated = tile.rotate(45, expand=True, resample=Image.Resampling.BICUBIC)

    step_x = max(rotated.width // 2, 180)
    step_y = max(rotated.height // 2, 140)
    for y in range(-rotated.height, h + rotated.height, step_y):
        for x in range(-rotated.width, w + rotated.width, step_x):
            overlay.paste(rotated, (x, y), rotated)


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _resolve_logo_url(settings: Dict[str, Any]) -> str:
    logo_url = str(settings.get("watermarkLogoUrl") or "").strip()
    if logo_url:
        return logo_url
    return str(settings.get("invoiceLogoUrl") or "").strip()


def _load_logo_image(logo_url: str, upload_dir: str) -> Optional[Image.Image]:
    if not logo_url:
        return None

    try:
        if logo_url.startswith("/uploads/"):
            file_path = os.path.join(upload_dir, os.path.basename(logo_url))
            if not os.path.isfile(file_path):
                return None
            with Image.open(file_path) as img:
                return img.convert("RGBA")

        parsed = urlparse(logo_url)
        if parsed.scheme in {"http", "https"}:
            with urlopen(logo_url, timeout=8) as response:
                data = response.read()
            with Image.open(io.BytesIO(data)) as img:
                return img.convert("RGBA")
    except Exception as exc:
        print(f"Erreur chargement logo filigrane: {exc}")
    return None


def _compute_logo_position(
    canvas_w: int,
    canvas_h: int,
    logo_w: int,
    logo_h: int,
    position: str,
    margin: int,
) -> Tuple[int, int]:
    if position == "top_left":
        return margin, margin
    if position == "top_center":
        return (canvas_w - logo_w) // 2, margin
    if position == "top_right":
        return canvas_w - logo_w - margin, margin
    if position == "center":
        return (canvas_w - logo_w) // 2, (canvas_h - logo_h) // 2
    if position == "bottom_left":
        return margin, canvas_h - logo_h - margin
    if position == "bottom_right":
        return canvas_w - logo_w - margin, canvas_h - logo_h - margin
    return (canvas_w - logo_w) // 2, canvas_h - logo_h - margin


def _apply_logo_watermark(
    overlay: Image.Image,
    settings: Dict[str, Any],
    upload_dir: str,
) -> None:
    if not _truthy(settings.get("watermarkLogoEnabled")):
        return

    logo_url = _resolve_logo_url(settings)
    logo = _load_logo_image(logo_url, upload_dir)
    if logo is None:
        return

    canvas_w, canvas_h = overlay.size
    size_pct = max(5, min(50, _safe_int(settings.get("watermarkLogoSize"), 18)))
    target_w = max(24, int(canvas_w * size_pct / 100))
    ratio = target_w / max(logo.width, 1)
    target_h = max(1, int(logo.height * ratio))
    logo = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)

    opacity = _safe_int(settings.get("watermarkLogoOpacity"), 40)
    alpha_value = max(0, min(255, int(255 * opacity / 100)))
    if logo.mode != "RGBA":
        logo = logo.convert("RGBA")
    red, green, blue, alpha = logo.split()
    alpha = alpha.point(lambda pixel: int(pixel * alpha_value / 255))
    logo = Image.merge("RGBA", (red, green, blue, alpha))

    position = str(settings.get("watermarkLogoPosition") or "bottom_right")
    margin = max(16, min(canvas_w, canvas_h) // 40)
    x, y = _compute_logo_position(canvas_w, canvas_h, target_w, target_h, position, margin)
    overlay.paste(logo, (x, y), logo)


def apply_watermark(image: Image.Image, settings: Dict[str, Any], upload_dir: str = "") -> Image.Image:
    media = normalize_media_settings(settings)
    show_text = media.get("watermarkShowText", True)
    if isinstance(show_text, str):
        show_text = _truthy(show_text)

    text = build_watermark_label(media) if show_text else ""
    logo_enabled = _truthy(media.get("watermarkLogoEnabled")) and bool(_resolve_logo_url(media))

    if not text.strip() and not logo_enabled:
        return image.convert("RGB") if image.mode != "RGB" else image

    rgba = image.convert("RGBA")
    overlay = Image.new("RGBA", rgba.size, (0, 0, 0, 0))

    if text.strip():
        position = str(media.get("watermarkPosition") or "bottom_center")
        opacity = _safe_int(media.get("watermarkOpacity"), 40)
        text_alpha = max(0, min(255, int(255 * opacity / 100)))
        font_size = max(12, min(rgba.width, rgba.height) // 48)
        font = _load_font(font_size)

        if position == "diagonal":
            _apply_diagonal_text(overlay, text, font, text_alpha)
        else:
            _apply_pill_watermark(overlay, text, font, text_alpha, position)

    if logo_enabled and upload_dir:
        _apply_logo_watermark(overlay, media, upload_dir)

    merged = Image.alpha_composite(rgba, overlay)
    return merged.convert("RGB")


THUMB_MAX_WIDTH = 640


def thumb_filename_for(filename: str) -> str:
    base, ext = os.path.splitext(filename)
    if base.endswith("_thumb"):
        return filename
    return f"{base}_thumb{ext or '.webp'}"


def thumb_url_for(url: str) -> Optional[str]:
    if not url or not str(url).startswith("/uploads/"):
        return None
    filename = str(url).replace("/uploads/", "", 1)
    return f"/uploads/{thumb_filename_for(filename)}"


def save_thumbnail_from_image(image: Image.Image, upload_dir: str, source_filename: str) -> str:
    thumb = image.copy()
    if thumb.mode not in {"RGB", "RGBA"}:
        thumb = thumb.convert("RGB")
    if thumb.width > THUMB_MAX_WIDTH:
        ratio = THUMB_MAX_WIDTH / thumb.width
        new_h = max(1, int(thumb.height * ratio))
        thumb = thumb.resize((THUMB_MAX_WIDTH, new_h), Image.Resampling.LANCZOS)
    if thumb.mode == "RGBA":
        thumb = thumb.convert("RGB")

    thumb_name = thumb_filename_for(source_filename)
    buf = io.BytesIO()
    thumb.save(buf, "WEBP", quality=72, method=4)
    storage = get_media_storage(upload_dir)
    return storage.put_bytes(thumb_name, buf.getvalue(), "image/webp")


def _filename_from_media_url(url: str) -> Optional[str]:
    raw = str(url or "").strip()
    if not raw:
        return None
    if raw.startswith("/uploads/"):
        return os.path.basename(raw.replace("/uploads/", "", 1))
    if raw.startswith(("http://", "https://")):
        return os.path.basename(urlparse(raw).path)
    return None


def _thumb_url_for_storage(url: str, upload_dir: str) -> Optional[str]:
    filename = _filename_from_media_url(url)
    if not filename:
        return None
    thumb_name = thumb_filename_for(filename)
    storage = get_media_storage(upload_dir)
    if hasattr(storage, "public_url"):
        return storage.public_url(thumb_name)
    return f"/uploads/{thumb_name}"


def ensure_thumbnail_file(url: str, upload_dir: str) -> Optional[str]:
    """Génère la miniature si absente ; retourne l'URL thumb ou None."""
    if not url:
        return None
    storage = get_media_storage(upload_dir)
    filename = _filename_from_media_url(url)
    if not filename:
        return None

    predicted = _thumb_url_for_storage(url, upload_dir)
    if predicted and storage.exists(predicted):
        return predicted

    source_bytes = storage.get_bytes(url)
    if not source_bytes:
        return None

    try:
        with Image.open(io.BytesIO(source_bytes)) as img:
            img.load()
            return save_thumbnail_from_image(img, upload_dir, filename)
    except Exception as exc:
        print(f"Erreur miniature {url}: {exc}")
        return None


def resolve_photo_thumb_url(
    url: Optional[str],
    thumb_url: Optional[str] = None,
    upload_dir: str = "",
) -> Optional[str]:
    """Retourne thumbUrl si le fichier existe (sans génération synchrone)."""
    if not upload_dir:
        return thumb_url or thumb_url_for(str(url or ""))

    storage = get_media_storage(upload_dir)
    candidates: list[str] = []
    if thumb_url:
        candidates.append(str(thumb_url))
    predicted = _thumb_url_for_storage(str(url or ""), upload_dir) or thumb_url_for(str(url or ""))
    if predicted:
        candidates.append(predicted)

    for candidate in candidates:
        if candidate and storage.exists(candidate):
            return candidate
    return None


def save_raw_image_bytes(data: bytes, upload_dir: str) -> Tuple[str, int]:
    """Enregistre une image sans filigrane (logo filigrane, assets admin)."""
    storage = get_media_storage(upload_dir)
    with Image.open(io.BytesIO(data)) as img:
        img.load()
        has_alpha = img.mode in {"RGBA", "LA"} or "transparency" in img.info
        if has_alpha:
            img = img.convert("RGBA")
            filename = f"{uuid.uuid4()}.png"
            buf = io.BytesIO()
            img.save(buf, "PNG")
            file_bytes = buf.getvalue()
            content_type = "image/png"
        else:
            img = img.convert("RGB")
            filename = f"{uuid.uuid4()}.webp"
            buf = io.BytesIO()
            img.save(buf, "WEBP", quality=92, method=4)
            file_bytes = buf.getvalue()
            content_type = "image/webp"

    url = storage.put_bytes(filename, file_bytes, content_type)
    return url, len(file_bytes)


def process_image_bytes(
    data: bytes,
    settings: Dict[str, Any],
    upload_dir: str,
) -> Tuple[str, int, str, str]:
    """Enregistre original HD + version filigranée + miniature."""
    storage = get_media_storage(upload_dir)
    media = normalize_media_settings(settings)
    hd_quality = max(1, min(100, _safe_int(media.get("hdWebpQuality"), 98)))

    with Image.open(io.BytesIO(data)) as img:
        img.load()
        file_id = str(uuid.uuid4())

        rgb = img.convert("RGBA") if img.mode in {"RGBA", "LA"} else img.convert("RGB")
        if rgb.mode == "RGBA":
            flat = Image.new("RGB", rgb.size, (255, 255, 255))
            flat.paste(rgb, mask=rgb.split()[3])
            rgb = flat

        original_filename = f"{file_id}_original.webp"
        original_buf = io.BytesIO()
        rgb.save(original_buf, "WEBP", quality=hd_quality, method=6)
        original_bytes = original_buf.getvalue()
        original_url = storage.put_bytes(original_filename, original_bytes, "image/webp")

        processed = apply_watermark(img, media, upload_dir)
        filename = f"{file_id}.webp"
        output_buf = io.BytesIO()
        processed.save(output_buf, "WEBP", quality=hd_quality, method=6)
        output_bytes = output_buf.getvalue()
        url = storage.put_bytes(filename, output_bytes, "image/webp")
        thumb_url = save_thumbnail_from_image(processed, upload_dir, filename)

    return url, len(output_bytes), thumb_url, original_url


def apply_watermark_to_bytes(
    data: bytes,
    settings: Dict[str, Any],
    upload_dir: str,
    *,
    output_format: str = "WEBP",
    quality: Optional[int] = None,
) -> bytes:
    """Applique le filigrane studio (paramètres admin) sur des bytes image."""
    media = normalize_media_settings(settings)
    hd_quality = quality if quality is not None else _safe_int(media.get("hdWebpQuality"), 98)

    with Image.open(io.BytesIO(data)) as img:
        img.load()
        processed = apply_watermark(img, media, upload_dir)
        buf = io.BytesIO()
        fmt = (output_format or "WEBP").upper()
        if fmt == "JPEG":
            processed.save(buf, "JPEG", quality=hd_quality, optimize=True)
        else:
            processed.save(buf, "WEBP", quality=hd_quality, method=6)
        return buf.getvalue()


def delivery_source_url(photo: Optional[Dict[str, Any]]) -> str:
    """Source sans filigrane si disponible — pour appliquer les paramètres courants."""
    if not photo:
        return ""
    return str(photo.get("originalUrl") or photo.get("hdUrl") or photo.get("url") or "")


def should_apply_watermark_at_delivery(photo: Optional[Dict[str, Any]], source_url: str) -> bool:
    """Ré-applique le filigrane avec les paramètres admin actuels."""
    if photo and str(photo.get("originalUrl") or "").strip():
        return True
    raw = str(source_url or "").strip()
    if raw.startswith(("http://", "https://")):
        return True
    return False


def infer_original_url_from_hd(url: str, upload_dir: str) -> Optional[str]:
    """Retrouve `{uuid}_original.webp` à partir de `{uuid}.webp`."""
    filename = _filename_from_media_url(url)
    if not filename or "_original" in filename:
        return url if filename else None
    stem, ext = os.path.splitext(filename)
    candidate_name = f"{stem}_original{ext or '.webp'}"
    storage = get_media_storage(upload_dir)
    candidate_url = (
        storage.public_url(candidate_name)
        if hasattr(storage, "public_url")
        else f"/uploads/{candidate_name}"
    )
    if storage.exists(candidate_url):
        return candidate_url
    return None


def process_base64_data_url(
    data_url: str,
    settings: Dict[str, Any],
    upload_dir: str,
) -> str:
    if not data_url or not isinstance(data_url, str) or not data_url.startswith("data:image"):
        return data_url
    try:
        _, encoded = data_url.split(",", 1)
        raw = base64.b64decode(encoded)
        url, _, _, _ = process_image_bytes(raw, settings, upload_dir)
        return url
    except Exception as exc:
        print(f"Erreur traitement base64: {exc}")
        return data_url


def maybe_process_image_url(
    url: Optional[str],
    settings: Dict[str, Any],
    upload_dir: str,
) -> Optional[str]:
    if not url or not isinstance(url, str):
        return url
    if url.startswith("data:image"):
        return process_base64_data_url(url, settings, upload_dir)
    return url


def is_image_upload(content_type: Optional[str], filename: str) -> bool:
    if content_type and content_type.startswith("image/"):
        return True
    ext = os.path.splitext(filename or "")[1].lower()
    return ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".heic", ".heif"}

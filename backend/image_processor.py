"""Traitement images : filigrane texte + export WebP selon paramètres studio."""

from __future__ import annotations

import base64
import io
import json
import os
import uuid
from typing import Any, Dict, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont

DEFAULT_MEDIA_SETTINGS: Dict[str, Any] = {
    "studioNameFirstPart": "KSW",
    "studioNameSecondPart": "STUDIO",
    "watermarkText": "Épreuve sécurisée",
    "watermarkPosition": "bottom_center",
    "watermarkOpacity": 40,
    "webpQuality": 85,
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
    rows = db.query(Setting).all()
    for row in rows:
        if row.key not in MEDIA_SETTING_KEYS:
            continue
        try:
            settings[row.key] = json.loads(row.value)
        except Exception:
            settings[row.key] = row.value
    return settings


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


def apply_watermark(image: Image.Image, settings: Dict[str, Any]) -> Image.Image:
    text = build_watermark_label(settings)
    if not text.strip():
        return image.convert("RGB") if image.mode != "RGB" else image

    position = str(settings.get("watermarkPosition") or "bottom_center")
    opacity = _safe_int(settings.get("watermarkOpacity"), 40)
    text_alpha = max(0, min(255, int(255 * opacity / 100)))

    rgba = image.convert("RGBA")
    overlay = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    font_size = max(12, min(rgba.width, rgba.height) // 48)
    font = _load_font(font_size)

    if position == "diagonal":
        _apply_diagonal_text(overlay, text, font, text_alpha)
    else:
        _apply_pill_watermark(overlay, text, font, text_alpha, position)

    merged = Image.alpha_composite(rgba, overlay)
    return merged.convert("RGB")


def process_image_bytes(
    data: bytes,
    settings: Dict[str, Any],
    upload_dir: str,
) -> Tuple[str, int]:
    quality = max(1, min(100, _safe_int(settings.get("webpQuality"), 85)))

    with Image.open(io.BytesIO(data)) as img:
        img.load()
        processed = apply_watermark(img, settings)

        filename = f"{uuid.uuid4()}.webp"
        output_path = os.path.join(upload_dir, filename)
        processed.save(output_path, "WEBP", quality=quality, method=4)

    return f"/uploads/{filename}", os.path.getsize(output_path)


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
        url, _ = process_image_bytes(raw, settings, upload_dir)
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

"""Génération PDF d'invitation avec QR code (système ou modèle uploadé)."""
from __future__ import annotations

import io
import os
from datetime import datetime
from typing import Literal, Optional, Tuple

import qrcode
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image as RlImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from pypdf import PdfReader, PdfWriter

from models import ElectronicInvitation

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
QR_POSITION = Literal["bottom-right", "bottom-left", "top-right", "top-left", "center"]


def public_invitation_url(token: str) -> str:
    base = (os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "http://localhost:3000").rstrip("/")
    return f"{base}/invitation/{token}"


def _resolve_local_path(url: Optional[str]) -> Optional[str]:
    if not url or not str(url).startswith("/uploads/"):
        return None
    path = os.path.join(UPLOAD_DIR, str(url).replace("/uploads/", "", 1))
    return path if os.path.isfile(path) else None


def generate_qr_png_bytes(data: str, box_size: int = 8) -> bytes:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=box_size, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def _qr_position_points(
    page_width: float,
    page_height: float,
    qr_size: float,
    margin: float,
    position: QR_POSITION,
) -> Tuple[float, float]:
    if position == "bottom-left":
        return margin, margin
    if position == "top-right":
        return page_width - margin - qr_size, page_height - margin - qr_size
    if position == "top-left":
        return margin, page_height - margin - qr_size
    if position == "center":
        return (page_width - qr_size) / 2, (page_height - qr_size) / 2
    return page_width - margin - qr_size, margin


def overlay_qr_on_pdf(
    pdf_bytes: bytes,
    public_url: str,
    *,
    page_index: int = 0,
    position: QR_POSITION = "bottom-right",
    qr_size_mm: float = 35,
    margin_mm: float = 15,
) -> bytes:
    from reportlab.pdfgen import canvas

    qr_bytes = generate_qr_png_bytes(public_url)
    reader = PdfReader(io.BytesIO(pdf_bytes))
    if not reader.pages:
        raise ValueError("PDF vide.")

    page_index = max(0, min(page_index, len(reader.pages) - 1))
    target_page = reader.pages[page_index]
    page_width = float(target_page.mediabox.width)
    page_height = float(target_page.mediabox.height)
    qr_size = qr_size_mm * mm
    margin = margin_mm * mm
    x, y = _qr_position_points(page_width, page_height, qr_size, margin, position)

    overlay_buffer = io.BytesIO()
    overlay = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    overlay.drawImage(io.BytesIO(qr_bytes), x, y, width=qr_size, height=qr_size, mask="auto")
    overlay.setFont("Helvetica", 7)
    overlay.setFillColor(colors.HexColor("#444444"))
    overlay.drawCentredString(x + qr_size / 2, max(4 * mm, y - 4 * mm), "Scannez pour l'invitation")
    overlay.save()

    overlay_reader = PdfReader(overlay_buffer)
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        if i == page_index:
            page.merge_page(overlay_reader.pages[0])
        writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def build_system_invitation_pdf(inv: ElectronicInvitation, public_url: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=22 * mm,
        leftMargin=22 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=colors.HexColor("#1a1a1a"),
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    subtitle_style = ParagraphStyle(
        "InvSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        textColor=colors.HexColor("#555555"),
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "InvBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#333333"),
        alignment=TA_CENTER,
        spaceAfter=4,
    )

    story = []
    cover_path = _resolve_local_path(inv.cover_url)
    if cover_path:
        try:
            with Image.open(cover_path) as img:
                w, h = img.size
                max_w = 160 * mm
                ratio = max_w / w
                story.append(RlImage(cover_path, width=max_w, height=h * ratio))
                story.append(Spacer(1, 10 * mm))
        except Exception:
            pass

    event_labels = {
        "mariage": "Mariage",
        "anniversaire": "Anniversaire",
        "bapteme": "Baptême",
        "communion": "Communion",
        "professionnel": "Événement professionnel",
        "autre": "Événement",
    }
    event_label = event_labels.get(inv.event_type or "", "Événement")

    story.append(Paragraph(inv.organizer_names or "Invitation", title_style))
    story.append(Paragraph(event_label, subtitle_style))
    if inv.event_date:
        date_line = inv.event_date
        if inv.event_time:
            date_line = f"{date_line} · {inv.event_time}"
        story.append(Paragraph(date_line, body_style))
    if inv.venue:
        story.append(Paragraph(inv.venue, body_style))
    if inv.address:
        story.append(Paragraph(inv.address.replace("\n", "<br/>"), body_style))
    if inv.dress_code:
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph(f"Tenue : {inv.dress_code}", body_style))
    if inv.description:
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph(inv.description.replace("\n", "<br/>"), body_style))

    program = inv.program or []
    if program:
        story.append(Spacer(1, 8 * mm))
        story.append(Paragraph("<b>Programme</b>", body_style))
        for item in program[:12]:
            if not isinstance(item, dict):
                continue
            time = (item.get("time") or "").strip()
            label = (item.get("label") or "").strip()
            if time or label:
                line = " — ".join(p for p in (time, label) if p)
                story.append(Paragraph(line, body_style))

    customization = inv.customization if isinstance(inv.customization, dict) else {}
    practical = customization.get("practicalInfo") if isinstance(customization.get("practicalInfo"), dict) else {}
    deadline = (practical.get("rsvpDeadline") or "").strip()
    if deadline:
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph(f"Merci de confirmer votre présence avant le {deadline[:10]}", body_style))

    story.append(Spacer(1, 12 * mm))
    qr_path = io.BytesIO(generate_qr_png_bytes(public_url))
    qr_img = RlImage(qr_path, width=38 * mm, height=38 * mm)
    qr_img.hAlign = "CENTER"
    story.append(qr_img)
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Scannez ce QR code avec votre téléphone<br/>pour voir l'invitation et confirmer votre présence.", body_style))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(f'<font size="8" color="#888888">{public_url}</font>', body_style))

    doc.build(story)
    return buffer.getvalue()


def pdf_filename(inv: ElectronicInvitation, suffix: str = "invitation") -> str:
    token = inv.public_token or inv.id[:8]
    stamp = datetime.utcnow().strftime("%Y%m%d")
    safe = "".join(c if c.isalnum() else "-" for c in (inv.organizer_names or "event")[:30]).strip("-") or "event"
    return f"{suffix}-{safe}-{token}-{stamp}.pdf"

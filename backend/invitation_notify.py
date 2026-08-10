"""Tâches email en arrière-plan pour les invitations."""
from __future__ import annotations

from database import SessionLocal
from models import ElectronicInvitation
from email_service import (
    notify_invitation_subscribed,
    notify_invitation_validated,
    notify_invitation_rejected,
    notify_invitation_ready,
    notify_invitation_rsvp,
)


def _load_invitation(invitation_id: str) -> ElectronicInvitation | None:
    db = SessionLocal()
    try:
        return db.query(ElectronicInvitation).filter(ElectronicInvitation.id == invitation_id).first()
    finally:
        db.close()


def bg_invitation_subscribed(invitation_id: str) -> None:
    db = SessionLocal()
    try:
        inv = db.query(ElectronicInvitation).filter(ElectronicInvitation.id == invitation_id).first()
        if inv:
            notify_invitation_subscribed(db, inv)
    finally:
        db.close()


def bg_invitation_validated(invitation_id: str) -> None:
    db = SessionLocal()
    try:
        inv = db.query(ElectronicInvitation).filter(ElectronicInvitation.id == invitation_id).first()
        if inv:
            notify_invitation_validated(db, inv)
    finally:
        db.close()


def bg_invitation_rejected(invitation_id: str, reason: str = "") -> None:
    db = SessionLocal()
    try:
        inv = db.query(ElectronicInvitation).filter(ElectronicInvitation.id == invitation_id).first()
        if inv:
            notify_invitation_rejected(db, inv, reason)
    finally:
        db.close()


def bg_invitation_ready(invitation_id: str) -> None:
    db = SessionLocal()
    try:
        inv = db.query(ElectronicInvitation).filter(ElectronicInvitation.id == invitation_id).first()
        if inv:
            notify_invitation_ready(db, inv)
    finally:
        db.close()


def bg_invitation_rsvp(invitation_id: str, guest_name: str, response: str, guest_count: int) -> None:
    db = SessionLocal()
    try:
        inv = db.query(ElectronicInvitation).filter(ElectronicInvitation.id == invitation_id).first()
        if inv:
            notify_invitation_rsvp(db, inv, guest_name, response, guest_count)
    finally:
        db.close()

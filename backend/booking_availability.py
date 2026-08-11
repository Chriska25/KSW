"""Disponibilité des créneaux de réservation."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

DEFAULT_TIME_SLOTS = ["09:00", "10:30", "14:00", "16:00", "18:00"]


def normalize_time(time_str: str) -> str:
    raw = (time_str or "").strip()
    if len(raw) >= 5 and raw[2] == ":":
        return raw[:5]
    return raw


def normalize_date(date_str: str) -> str:
    return (date_str or "").strip()[:10]


def is_wedding_service(
    service_id: str = "",
    service_title: str = "",
    service_category: Optional[str] = None,
) -> bool:
    combined = " ".join(
        [
            service_category or "",
            service_title or "",
            service_id or "",
        ]
    ).lower()
    return "mariage" in combined or "wedding" in combined


def booking_blocks_slot(booking: Dict[str, Any]) -> bool:
    status = (booking.get("status") or "pending").strip().lower()
    return status != "cancelled"


def get_booked_times_for_date(bookings: List[Dict[str, Any]], target_date: str) -> List[str]:
    day = normalize_date(target_date)
    booked: List[str] = []
    for item in bookings:
        if not booking_blocks_slot(item):
            continue
        if normalize_date(str(item.get("date") or "")) != day:
            continue
        slot = normalize_time(str(item.get("time") or ""))
        if slot and slot not in booked:
            booked.append(slot)
    return booked


def get_available_slots(booked_times: List[str]) -> List[str]:
    booked_set = set(booked_times)
    return [slot for slot in DEFAULT_TIME_SLOTS if slot not in booked_set]


def suggest_alternative_slot(
    bookings: List[Dict[str, Any]],
    date_str: str,
    time_str: str,
    *,
    is_wedding: bool,
    max_days_ahead: int = 90,
) -> Optional[Dict[str, str]]:
    target_date = normalize_date(date_str)
    selected_time = normalize_time(time_str)

    if is_wedding:
        try:
            cursor = date.fromisoformat(target_date) + timedelta(days=1)
        except ValueError:
            return None
        for _ in range(max_days_ahead):
            day_str = cursor.isoformat()
            available = get_available_slots(get_booked_times_for_date(bookings, day_str))
            if available:
                pick = selected_time if selected_time in available else available[0]
                return {"date": day_str, "time": pick}
            cursor += timedelta(days=1)
        return None

    available = get_available_slots(get_booked_times_for_date(bookings, target_date))
    alternatives = [slot for slot in available if slot != selected_time]
    if alternatives:
        return {"date": target_date, "time": alternatives[0]}
    return None


def build_slot_conflict_message(
    date_str: str,
    time_str: str,
    *,
    is_wedding: bool,
    suggestion: Optional[Dict[str, str]],
) -> str:
    day = normalize_date(date_str)
    slot = normalize_time(time_str)
    if not suggestion:
        if is_wedding:
            return (
                f"Le créneau {slot} du {day} est déjà réservé et aucun jour disponible "
                "n'a été trouvé prochainement. Contactez le studio."
            )
        return (
            f"Le créneau {slot} du {day} est déjà réservé et ce jour est complet. "
            "Choisissez une autre date."
        )

    sug_date = suggestion["date"]
    sug_time = suggestion["time"]
    if is_wedding:
        return (
            f"Le créneau {slot} du {day} est déjà réservé. "
            f"Pour un mariage, nous vous proposons le {sug_date} à {sug_time}."
        )
    if sug_date == day:
        return (
            f"Le créneau {slot} est déjà réservé ce jour-là. "
            f"Nous vous proposons {sug_time} le même jour ({day})."
        )
    return f"Le créneau {slot} du {day} est indisponible. Créneau proposé : {sug_date} à {sug_time}."


def evaluate_slot_availability(
    bookings: List[Dict[str, Any]],
    date_str: str,
    time_str: str,
    *,
    is_wedding: bool,
) -> Dict[str, Any]:
    day = normalize_date(date_str)
    slot = normalize_time(time_str)
    booked = get_booked_times_for_date(bookings, day)
    available = get_available_slots(booked)
    taken = slot in booked
    suggestion = None
    message = None

    if taken:
        suggestion = suggest_alternative_slot(
            bookings,
            day,
            slot,
            is_wedding=is_wedding,
        )
        message = build_slot_conflict_message(day, slot, is_wedding=is_wedding, suggestion=suggestion)

    return {
        "date": day,
        "time": slot,
        "bookedSlots": booked,
        "availableSlots": available,
        "allSlots": list(DEFAULT_TIME_SLOTS),
        "isWedding": is_wedding,
        "selectedSlotTaken": taken,
        "suggestion": suggestion,
        "message": message,
    }

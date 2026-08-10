"""Calculs financiers et facturation à partir des réservations."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from studio_defaults import resolve_studio_currency

ALLOWED_BALANCE_PAYMENT_METHODS = {
    "Stripe (Carte)",
    "Mobile Money",
    "PayPal",
    "Virement",
    "Espèces",
    "Chèque",
}


def compute_booking_financials(booking: Dict[str, Any]) -> Dict[str, Any]:
    total = float(booking.get("totalPrice") or 0)
    deposit_due = float(booking.get("depositAmount") or 0)
    deposit_paid = deposit_due if booking.get("paymentStatus") == "paid" else 0.0
    balance_paid = float(booking.get("balancePaidAmount") or 0)
    total_paid = round(deposit_paid + balance_paid, 2)
    remaining = round(max(0.0, total - total_paid), 2)

    if total_paid <= 0:
        status = "unpaid"
    elif total > 0 and remaining <= 0.01:
        status = "paid"
    elif total_paid > 0:
        status = "partially_paid"
    else:
        status = "unpaid"

    payment_lines: List[Dict[str, Any]] = []
    if deposit_paid > 0:
        deposit_method = booking.get("paymentMethod") or "Stripe (Carte)"
        deposit_ref = (
            booking.get("mobileMoneyConfirmedReference")
            or booking.get("mobileMoneyReference")
            or booking.get("stripeSessionId")
            or ""
        )
        payment_lines.append(
            {
                "label": "Acompte",
                "amount": deposit_paid,
                "method": deposit_method,
                "paidAt": booking.get("paidAt") or "",
                "reference": str(deposit_ref) if deposit_ref else "",
            }
        )

    if balance_paid > 0:
        payment_lines.append(
            {
                "label": "Solde",
                "amount": balance_paid,
                "method": booking.get("balancePaymentMethod") or "Virement",
                "paidAt": booking.get("balancePaidAt") or "",
                "reference": str(booking.get("balancePaymentReference") or ""),
            }
        )

    methods = [str(line.get("method") or "") for line in payment_lines if line.get("method")]
    unique_methods = list(dict.fromkeys(methods))
    if len(unique_methods) > 1:
        payment_method = "Mixte"
        payment_summary = " · ".join(f'{line["label"]}: {line["method"]}' for line in payment_lines)
    elif unique_methods:
        payment_method = unique_methods[0]
        payment_summary = unique_methods[0]
    else:
        payment_method = "Virement"
        payment_summary = "En attente"

    return {
        "totalAmount": total,
        "depositAmount": deposit_due,
        "paidAmount": total_paid,
        "remainingAmount": remaining,
        "status": status,
        "paymentMethod": payment_method,
        "paymentSummary": payment_summary,
        "paymentLines": payment_lines,
    }


def booking_to_invoice(booking: Dict[str, Any], default_currency: Optional[str] = None) -> Dict[str, Any]:
    from datetime import datetime

    financials = compute_booking_financials(booking)
    bid = str(booking.get("id", ""))
    invoice_number = booking.get("invoiceNumber") or f"FAC-{datetime.utcnow().year}-{bid[:6].upper()}"
    name = f"{booking.get('firstName', '')} {booking.get('lastName', '')}".strip()

    return {
        "id": bid,
        "number": invoice_number,
        "clientName": name or booking.get("email", "Client"),
        "serviceTitle": booking.get("serviceTitle", "Prestation"),
        "issueDate": booking.get("createdAt") or booking.get("date", ""),
        "dueDate": booking.get("date", ""),
        "totalAmount": financials["totalAmount"],
        "depositAmount": financials["depositAmount"],
        "paidAmount": financials["paidAmount"],
        "remainingAmount": financials["remainingAmount"],
        "status": financials["status"],
        "paymentMethod": financials["paymentMethod"],
        "paymentSummary": financials["paymentSummary"],
        "paymentLines": financials["paymentLines"],
        "reference": booking.get("reference", bid[:8]),
        "clientEmail": booking.get("email", ""),
        "sessionDate": booking.get("date", ""),
        "sessionTime": booking.get("time", ""),
        "location": booking.get("location", ""),
        "currency": resolve_studio_currency(booking.get("currency"), default_currency),
    }

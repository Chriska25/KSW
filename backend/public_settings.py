"""Clés de paramètres autorisées sur l'endpoint public GET /settings."""

PUBLIC_SETTING_KEYS = frozenset(
    {
        "studioName",
        "studioNameFirstPart",
        "studioNameSecondPart",
        "studioSubtitle",
        "studioDescription",
        "siteTitle",
        "contactEmail",
        "phone",
        "address",
        "studioMapLat",
        "studioMapLng",
        "studioMapZoom",
        "currency",
        "timezone",
        "depositRate",
        "socialLinks",
        "stripePublicKey",
        "stripeTestMode",
        "payPalEnabled",
        "mobileMoneyEnabled",
        "mobileMoneyProvider",
        "mobileMoneyInstructions",
        "mobileMoneyNumber",
        "cancellationNoticeDays",
        "autoApproveBookings",
        "homePageContent",
        "portfolioContent",
        "prestationsContent",
        "legalPagesContent",
    }
)


def filter_public_settings(data: dict) -> dict:
    return {k: v for k, v in data.items() if k in PUBLIC_SETTING_KEYS}

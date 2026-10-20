
import math
import unicodedata
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from backend.app.models import Asset, Complaint


# Assets farther away than this receive no proximity bonus.
GPS_MATCH_RADIUS_KM = 2.0

# Maximum bonus added to the existing text score.
MAX_GPS_BONUS = 15.0


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    text = "".join(
        char if char.isalnum() else " "
        for char in text
    )
    return " ".join(text.split())


def haversine_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate the great-circle distance between two GPS coordinates."""
    earth_radius_km = 6371.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    # Protect against floating-point rounding outside [0, 1].
    a = max(0.0, min(1.0, a))

    return 2 * earth_radius_km * math.asin(math.sqrt(a))


def match_assets(db: Session, complaint_id: int) -> dict:
    complaint = db.get(Complaint, complaint_id)

    if complaint is None:
        raise ValueError("Complaint not found")

    if complaint.asset_id is not None:
        linked_asset = db.get(Asset, complaint.asset_id)
        if linked_asset is not None:
            return {
                "complaint_id": complaint.id,
                "already_linked": True,
                "message": "This complaint already has an asset linked.",
                "candidates": [],
            }

    complaint_text = " ".join(
        filter(
            None,
            [
                complaint.title,
                complaint.description,
                complaint.translated_description,
                complaint.category,
            ],
        )
    )

    analysis = complaint.ai_analysis
    if isinstance(analysis, dict):
        extracted = analysis.get("result", analysis)
        if isinstance(extracted, dict):
            complaint_text += " " + " ".join(
                str(value)
                for value in [
                    extracted.get("issue_summary"),
                    extracted.get("issue_type"),
                    extracted.get("duration"),
                    *(
                        extracted.get("location_clues", [])
                        if isinstance(
                            extracted.get("location_clues"), list
                        )
                        else []
                    ),
                ]
                if value
            )

    normalized_complaint = normalize(complaint_text)
    complaint_words = set(normalized_complaint.split())

    assets = (
        db.query(Asset)
        .filter(Asset.is_active.is_(True))
        .order_by(Asset.id)
        .all()
    )

    candidates = []

    complaint_has_gps = (
        complaint.latitude is not None
        and complaint.longitude is not None
    )

    for asset in assets:
        asset_text = normalize(
            " ".join(
                filter(
                    None,
                    [
                        asset.name,
                        asset.asset_type,
                        asset.location,
                        asset.description,
                    ],
                )
            )
        )
        asset_words = set(asset_text.split())

        if not asset_words or not complaint_words:
            continue

        overlap = (
            len(complaint_words & asset_words) / len(asset_words)
        )
        similarity = SequenceMatcher(
            None,
            normalized_complaint,
            asset_text,
        ).ratio()

        text_score = round(
            100 * (0.7 * overlap + 0.3 * similarity),
            1,
        )

        distance_km = None
        gps_bonus = 0.0

        asset_has_gps = (
            asset.latitude is not None
            and asset.longitude is not None
        )

        if complaint_has_gps and asset_has_gps:
            distance_km = haversine_distance_km(
                complaint.latitude,
                complaint.longitude,
                asset.latitude,
                asset.longitude,
            )

            if distance_km <= GPS_MATCH_RADIUS_KM:
                gps_bonus = MAX_GPS_BONUS * (
                    1 - distance_km / GPS_MATCH_RADIUS_KM
                )

        if text_score <= 0 and gps_bonus <= 0:
            continue

        # Preserve the original text score and expose the combined
        # ranking score separately. Neither score is a probability.
        ranking_score = round(
            min(100.0, text_score + gps_bonus),
            1,
        )

        reasons = ["Text similarity"]
        if distance_km is not None:
            reasons.append(f"GPS distance: {distance_km:.2f} km")
            if distance_km <= GPS_MATCH_RADIUS_KM:
                reasons.append("Nearby asset proximity bonus")

        candidates.append(
            {
                "asset_id": asset.id,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "location": asset.location,
                "score": text_score,
                "distance_km": (
                    round(distance_km, 3)
                    if distance_km is not None
                    else None
                ),
                "ranking_score": ranking_score,
                "reason": (
                    "Ranked using complaint text, available "
                    "AI-extracted details, and asset information. "
                    + "; ".join(reasons)
                    + ". Scores are ranking signals, not probabilities."
                ),
            }
        )

    candidates.sort(
        key=lambda item: (
            -item["ranking_score"],
            -item["score"],
            item["asset_id"],
        )
    )

    return {
        "complaint_id": complaint.id,
        "already_linked": False,
        "analysis_used": isinstance(analysis, dict),
        "gps_used": complaint_has_gps,
        "message": (
            "Candidates are suggestions only. Confirm the correct asset "
            "before linking the complaint."
            if candidates
            else "No matching active assets were found."
        ),
        "candidates": candidates[:5],
    }

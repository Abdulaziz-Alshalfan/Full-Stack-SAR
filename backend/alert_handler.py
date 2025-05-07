from datetime import datetime, timedelta


def classify_alert_data(result, filename, gps_coords):
    confidence = result["confidence"]
    label = result["label"]

    if confidence >= 0.85:
        alert_type = "critical"
    elif confidence >= 0.6:
        alert_type = "alert"
    elif confidence >= 0.2:
        alert_type = "false_positive"
    else:
        return None  # Don't create alert for confidence < 0.20


    alert_doc = {
        "type": alert_type,
        "label": label,
        "confidence": confidence,
        "image": f"/uploads/{filename}",
        "gps": gps_coords,
        "gps_url": f"https://www.google.com/maps?q={gps_coords}",
        "timestamp": (datetime.utcnow() + timedelta(hours=3)).isoformat(),
    }

    return alert_doc

async def classify_alert(result, filename, gps_coords):
    alert_doc = classify_alert_data(result, filename, gps_coords)

    if not alert_doc:
        return None

    alert_doc.pop("_id", None)
    return alert_doc


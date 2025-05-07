# backend/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from bson import ObjectId
from datetime import datetime

client = None
db = None

def connect_mongo():
    global client, db
    load_dotenv()
    client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = client["ai_webapp"]

def get_alerts_collection():
    return db.alerts

async def save_alert(alert_doc):
    alert_doc["seen"] = False  # default
    return await get_alerts_collection().insert_one(alert_doc)

async def get_all_alerts():
    cursor = get_alerts_collection().find().sort("timestamp", -1)
    alerts = []
    async for alert in cursor:
        alert["_id"] = str(alert["_id"])
        alerts.append(alert)
    return alerts

async def mark_alert_seen(alert_id):
    result = await get_alerts_collection().update_one(
        {"_id": ObjectId(alert_id)}, {"$set": {"seen": True}}
    )
    return result.modified_count

async def mark_all_alerts_seen():
    result = await get_alerts_collection().update_many({"seen": False}, {"$set": {"seen": True}})
    return result.modified_count


async def delete_alert_by_id(alert_id):
    result = await db["alerts"].delete_one({"_id": ObjectId(alert_id)})
    return result.deleted_count

async def delete_alerts_by_filter(filter, upload_dir):
    query = {}

    if filter.get("type"):
        query["type"] = filter["type"]

    if filter.get("minConfidence", 0) > 0 or filter.get("maxConfidence", 100) < 100:
        query["confidence"] = {
            "$gte": filter.get("minConfidence", 0) / 100,
            "$lte": filter.get("maxConfidence", 100) / 100
        }

    if filter.get("from") and filter.get("to"):
        try:
            from_dt = datetime.fromisoformat(filter["from"])
            to_dt = datetime.fromisoformat(filter["to"])
            query["timestamp"] = {"$gte": from_dt.isoformat(), "$lte": to_dt.isoformat()}
        except Exception as e:
            print(f"[FILTER ERROR] {e}")

    alerts = await db["alerts"].find(query).to_list(length=None)

    deleted_files = []
    for alert in alerts:
        image_file = os.path.join(upload_dir, os.path.basename(alert["image"]))
        if os.path.exists(image_file):
            os.remove(image_file)
            deleted_files.append(alert["image"])

        await db["alerts"].delete_one({"_id": alert["_id"]})

    return len(alerts), deleted_files
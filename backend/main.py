# Updated main.py with 10-sec interval buffer logic for best alert frame (safe version)
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import shutil, uuid, os, threading, time, asyncio
from pydantic import BaseModel

from backend.database import get_all_alerts, save_alert, connect_mongo, delete_alert_by_id, delete_alerts_by_filter
from backend.detector import run_inference
from backend.alert_handler import classify_alert
from backend.database import mark_alert_seen, mark_all_alerts_seen

UPLOAD_DIR = "/mnt/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()
connect_mongo()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://ai-sar-frontend-react.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Standard alert upload API (used by UploadPage)
@app.post("/api/alert")
async def create_alert(
    file: UploadFile = File(...),
    lat: float = Form(default=None),
    lon: float = Form(default=None)
):
    try:
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = run_inference(file_path)

        gps_coords = f"{lat},{lon}" if lat is not None and lon is not None else "24.7136,46.6753"

        alert_doc = await classify_alert(result, filename, gps_coords)

        if alert_doc is None:
            return JSONResponse(content={"message": "No alert generated"}, status_code=200)

        insert_result = await save_alert(alert_doc)
        alert_doc["_id"] = str(insert_result.inserted_id)
        return JSONResponse(content={"message": "Alert saved", "alert": alert_doc})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/alerts")
async def get_alerts():
    alerts = await get_all_alerts()
    return alerts

@app.patch("/api/alerts/{alert_id}/seen")
async def mark_seen(alert_id: str = Path(...)):
    updated = await mark_alert_seen(alert_id)
    return {"updated": updated}

@app.patch("/api/alerts/seen")
async def mark_all_seen():
    updated = await mark_all_alerts_seen()
    return {"updated": updated}

@app.get("/")
def root():
    return {"message": "AI-SAR backend is live"}

# ================================
# New Webcam API - Best Detection Every 10 Seconds
# ================================
frame_buffer = []
buffer_lock = threading.Lock()
ready_frames = []
ready_lock = threading.Lock()


def inference_worker(file_path, filename, gps_coords):
    try:
        result = run_inference(file_path)
        if result["confidence"] >= 0.2:
            with ready_lock:
                ready_frames.append({
                    "result": result,
                    "filename": filename,
                    "gps": gps_coords,
                    "confidence": result["confidence"]
                })
    except Exception as e:
        print(f"[ERROR] Inference failed for {filename}: {e}")


async def process_alert(best):
    alert_doc = await classify_alert(best["result"], best["filename"], best["gps"])
    if alert_doc:
        insert_result = await save_alert(alert_doc)
        alert_doc["_id"] = str(insert_result.inserted_id)
        print(f"[ALERT] Saved: {alert_doc['_id']}")

def alert_processor():
    while True:
        time.sleep(10)
        with ready_lock:
            if ready_frames:
                best = max(ready_frames, key=lambda x: x["confidence"])
                try:
                    asyncio.run(process_alert(best))
                except Exception as e:
                    print(f"[ERROR] Failed to save alert: {e}")
            ready_frames.clear()

threading.Thread(target=alert_processor, daemon=True).start()

@app.post("/api/webcam")
async def handle_webcam_frame(
    file: UploadFile = File(...),
    lat: float = Form(default=None),
    lon: float = Form(default=None)
):
    try:
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        gps_coords = f"{lat},{lon}" if lat is not None and lon is not None else "24.7136,46.6753"

        thread = threading.Thread(target=inference_worker, args=(file_path, filename, gps_coords))
        thread.daemon = True
        thread.start()

        return {"message": "Frame accepted for processing"}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
    
class DeleteRequest(BaseModel):
    image_path: str

@app.delete("/api/alerts/{alert_id}")
async def delete_alert_route(alert_id: str = Path(...), payload: DeleteRequest = Body(...)):
    try:
        image_path = payload.image_path
        image_file = os.path.join(UPLOAD_DIR, os.path.basename(image_path))
        if os.path.exists(image_file):
            os.remove(image_file)

        deleted = await delete_alert_by_id(alert_id)
        return {"deleted": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/alerts/delete_by_filter")
async def delete_alerts_filter(filter: dict = Body(...)):
    try:
        deleted_count, deleted_files = await delete_alerts_by_filter(filter, UPLOAD_DIR)
        return {"deleted": deleted_count, "files_deleted": deleted_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
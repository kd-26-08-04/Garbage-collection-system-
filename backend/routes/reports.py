from fastapi import APIRouter, UploadFile, File, Form, Depends
from database import db
from models import WasteReport
from services.ml_service import ml_service
from datetime import datetime
import uuid
import os

router = APIRouter(prefix="/reports", tags=["reports"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/")
async def create_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile = File(...)
):
    # 1. Read image bytes
    image_bytes = await image.read()
    
    # 2. Perform ML Inference
    detections = ml_service.predict(image_bytes)
    
    if not detections:
        return {"status": "no_waste_detected", "detections": []}

    # 3. Save image locally (or cloud storage)
    file_ext = image.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as f:
        f.write(image_bytes)

    # 4. Prepare metadata
    # For simplicity, we take the highest confidence score if multiple detections
    max_conf = max([d["confidence"] for d in detections])
    
    report_data = {
        "image_url": f"/uploads/{file_name}",
        "latitude": latitude,
        "longitude": longitude,
        "confidence_score": max_conf,
        "timestamp": datetime.utcnow(),
        "status": "detected"
    }
    
    # 5. Save to MongoDB
    result = await db.reports.insert_one(report_data)
    
    return {
        "id": str(result.inserted_id),
        "status": "success",
        "detections": detections
    }

@router.get("/")
async def get_reports():
    cursor = db.reports.find().sort("timestamp", -1)
    reports = await cursor.to_list(length=100)
    for report in reports:
        report["_id"] = str(report["_id"])
    return reports

@router.put("/{report_id}/status")
async def update_report_status(report_id: str, status: str):
    from bson import ObjectId
    result = await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": status}}
    )
    if result.modified_count:
        return {"status": "success", "message": f"Report marked as {status}"}
    return {"status": "error", "message": "Report not found or no change made"}

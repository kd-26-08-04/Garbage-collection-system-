import torch
from ultralytics import YOLO
import os
from PIL import Image
import io

class MLService:
    def __init__(self, model_path: str = "yolov8n.pt"):
        # Using yolov8n.pt as a placeholder, can be replaced with custom trained model
        self.model = YOLO(model_path)
        self.confidence_threshold = 0.6

    def predict(self, image_bytes: bytes):
        image = Image.open(io.BytesIO(image_bytes))
        results = self.model.predict(source=image, conf=self.confidence_threshold)
        
        detections = []
        for result in results:
            for box in result.boxes:
                # In a real scenario, we would check the class name for plastic
                # For now, we return the detections found by YOLO
                name = self.model.names[int(box.cls[0])]
                detections.append({
                    "class": name,
                    "confidence": float(box.conf[0]),
                    "box": box.xyxy[0].tolist()
                })
        
        return detections

ml_service = MLService()

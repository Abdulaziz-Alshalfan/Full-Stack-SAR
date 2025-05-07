from ultralytics import YOLO

# Load models only once
detection_model = YOLO("backend/models/detector.pt")
classification_model = YOLO("backend/models/classifier.pt")

def run_inference(image_path):
    detection_result = detection_model(image_path)[0]
    confidence = float(detection_result.boxes.conf.max().item()) if detection_result.boxes else 0.0

    # Classification
    classification_result = classification_model(image_path)[0]
    label_idx = int(classification_result.probs.top1)
    label_name = classification_result.names[label_idx]

    return {
        "confidence": confidence,
        "label": label_name
    }

from fastapi import APIRouter
from app.services.anomaly_detector import anomaly_detector

router = APIRouter()

@router.get("/health", tags=["System"])
def health_check():
    """
    A basic health check to verify latency, container status, 
    and that the .pkl Machine Learning artifacts successfully loaded!
    """
    is_model_loaded = anomaly_detector.model is not None
    is_scaler_loaded = anomaly_detector.scaler is not None
    
    return {
        "status": "ok" if is_model_loaded and is_scaler_loaded else "degraded",
        "message": "Fraud Intelligence API is running",
        "models_ready": is_model_loaded,
        "scaler_ready": is_scaler_loaded
    }

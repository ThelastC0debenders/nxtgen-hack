from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from app.services.anomaly_detector import anomaly_detector

# Setup basic bearer token auth to protect our AI endpoints from public abuse.
# In production, the Node.js backend would secure requests with a JWT.
# For the hackathon, we use a simple static API key or mock auth.

security = HTTPBearer()
API_SECRET_KEY = os.environ.get("AI_SERVICE_SECRET_KEY", "hackathon-secret-api-key-2026")

def verify_backend_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency that checks if the incoming request has the correct Authorization Bearer token.
    """
    token = credentials.credentials
    if token != API_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

def get_anomaly_detector():
    """
    Dependency to ensure the AnomalyDetector is alive and models are loaded before scoring.
    """
    if anomaly_detector.model is None or anomaly_detector.scaler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Machine learning models are not currently loaded into memory. Risk scoring unavailable."
        )
    return anomaly_detector

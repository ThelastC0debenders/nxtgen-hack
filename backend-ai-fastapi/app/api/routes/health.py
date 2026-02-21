from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["System"])
def health_check():
    """
    A basic health check to ensure the API is running.
    In the future, we will add model readiness checks here.
    """
    return {
        "status": "ok",
        "message": "Fraud Intelligence Service is healthy"
    }

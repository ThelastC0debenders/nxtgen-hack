from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Fraud Intelligence Service"
    API_V1_STR: str = "/api/v1"
    
    # Global default thresholds for rules/ML
    ANOMALY_THRESHOLD: float = 0.7
    SIMILARITY_THRESHOLD: float = 0.85
    
    # Model paths
    MODEL_DIR: str = "app/models"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

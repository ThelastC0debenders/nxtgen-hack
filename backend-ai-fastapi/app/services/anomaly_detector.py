import joblib
import os
from app.core.logger import logger
from app.core.config import settings
from app.schemas.invoice_input import InvoiceInput
from app.services.feature_builder import FeatureBuilder

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.scaler = None
        self._load_models()
        
    def _load_models(self):
        """Loads the pre-trained IsolationForest and StandardScaler lazily."""
        try:
            model_path = os.path.join(settings.MODEL_DIR, "isolation_forest.pkl")
            scaler_path = os.path.join(settings.MODEL_DIR, "scaler.pkl")
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                logger.info("✅ ML Scaler and Isolation Forest loaded successfully into memory.")
            else:
                logger.warning(f"⚠️ ML Models not found in {settings.MODEL_DIR}. AI scoring will degrade gracefully.")
        except Exception as e:
            logger.error(f"❌ Failed to load ML models: {e}")
            
    def predict(self, invoice: InvoiceInput) -> dict:
        """
        Executes real-time, low-latency machine learning inference on a single invoice.
        Passes the invoice to FeatureBuilder to extract the 21 columns, scales them, and predicts.
        """
        if not self.model or not self.scaler:
            return {"is_anomaly": False, "anomaly_score": 0.0, "error": "Models unavailable"}
            
        try:
            # 1. Transform raw JSON to 1D structural NumPy array
            features = FeatureBuilder.build_model_vector(invoice)
            
            # 2. Scale features to mathematical mean=0 variance=1 using the loaded scaler
            scaled_features = self.scaler.transform(features)
            
            # 3. Model Prediction (-1 for Outlier/Fraud, 1 for Inlier/Normal)
            prediction = self.model.predict(scaled_features)[0]
            is_anomaly = bool(prediction == -1)
            
            # 4. Extract continuous distance score to measure *how* weird it is
            # Decision function returns average anomaly score, lower is more abnormal
            raw_score = float(self.model.decision_function(scaled_features)[0])
            
            # 5. Normalize this raw score to a nice 0.0 -> 1.0 (Highest Risk)
            # This mapping is an artistic approximation based on typical IsolationForest outputs
            normalized_score = 1.0 if is_anomaly else max(0.0, 0.5 - raw_score)
            normalized_score = min(normalized_score, 1.0)
            
            return {
                "is_anomaly": is_anomaly,
                "anomaly_score": round(normalized_score, 4)
            }
        except Exception as e:
            logger.error(f"❌ Real-time Prediction error: {e}")
            return {"is_anomaly": False, "anomaly_score": 0.0, "error": str(e)}

# Instantiate singleton so models are loaded into RAM once when FastAPI boots
anomaly_detector = AnomalyDetector()

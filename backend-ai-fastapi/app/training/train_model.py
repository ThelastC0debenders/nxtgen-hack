import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
import os
from datetime import datetime

# Import the preprocessing pipeline we just built
from app.training.preprocess import preprocess_data, FEATURES

def train_isolation_forest(
    model_output_path: str = "app/models/isolation_forest.pkl",
    metadata_output_path: str = "app/models/metadata.json"
):
    """
    Trains an Isolation Forest anomaly detection model on the scaled features 
    and saves both the model and its metadata for the FastAPI application.
    """
    print("Step 1: Running the preprocessing pipeline to get scaled features (X)...")
    X_scaled, y_true, scaler = preprocess_data()
    
    # We define our expected contamination (fraud) rate. 
    # In reality, this is an estimate. Our synthetic dataset has ~5% fraud.
    CONTAMINATION_RATE = 0.05
    
    print(f"\nStep 2: Initializing Isolation Forest (contamination={CONTAMINATION_RATE})...")
    
    # Isolation Forest is an unsupervised algorithm. It isolates anomalies by randomly 
    # selecting a feature and randomly selecting a split value. Outliers (fraud) are
    # isolated much faster (fewer splits) than normal points.
    model = IsolationForest(
        n_estimators=100,      # Number of trees
        max_samples='auto',    # Automatically determine how many samples to use per tree
        contamination=CONTAMINATION_RATE, 
        random_state=42        # For reproducibility
    )
    
    print("Step 3: Training the model on the scaled features. This uses purely unsupervised math...")
    # NOTE: We do NOT pass `y_true` to `fit()`! 
    # The whole point is to discover anomalies organically without an answer key.
    model.fit(X_scaled)
    
    print("\nStep 4: Evaluating the model's unsupervised predictions against our synthetic labels...")
    # Predict returns 1 for inliers (normal) and -1 for outliers (anomalies).
    # We need to map -1 to 1 (Fraud) and 1 to 0 (Normal) to match our `is_fraud` labels.
    y_pred_model = model.predict(X_scaled)
    y_pred_mapped = [1 if pred == -1 else 0 for pred in y_pred_model]
    
    print("\nConfusion Matrix (Normal=0, Anomaly=1):")
    print(confusion_matrix(y_true, y_pred_mapped))
    
    print("\nClassification Report:")
    # We want to minimize False Negatives (Missing fraud is bad) 
    # while controlling False Positives (Flagging normal invoices is annoying)
    print(classification_report(y_true, y_pred_mapped))
    
    # Now that we're happy with the math, we save the model for FastAPI
    print("\nStep 5: Saving artifacts...")
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    
    # 5a. Save the trained Isolation Forest Object
    joblib.dump(model, model_output_path)
    print(f"✅ Model successfully saved to {model_output_path}")
    
    # 5b. Save a metadata JSON so the FastAPI application knows what to expect
    metadata = {
        "model_type": "IsolationForest",
        "trained_at": datetime.now().isoformat(),
        "n_estimators": model.n_estimators,
        "contamination": CONTAMINATION_RATE,
        "features_expected": FEATURES,
        "metrics": {
            "samples_trained_on": len(X_scaled)
        },
        "version": "1.0.0"
    }
    
    with open(metadata_output_path, "w") as f:
        json.dump(metadata, f, indent=4)
        
    print(f"✅ Metadata successfully saved to {metadata_output_path}")
    
if __name__ == "__main__":
    train_isolation_forest()

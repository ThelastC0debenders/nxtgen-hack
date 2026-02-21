import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
import os

# Define the exact features we want our Isolation Forest to train on.
# These must match exactly what `FeatureBuilder.build_model_vector()` produces in the API later!
FEATURES = [
    "amount",
    "tax_amount",
    "discount_amount",
    "total_line_items",
    "avg_item_price",
    "submission_time",
    "vendor_account_age_days",
    "time_since_last_invoice",
    "invoices_last_24h",
    "invoices_last_7d",
    "vendor_lender_count",
    "vendor_buyer_count",
    "repeat_vendor_buyer_pair",
    "unique_lenders_used",
    "is_round_amount",
    "amount_deviation",
    "high_value_invoice",
    "weekend_submission",
    "night_submission",
    "line_item_similarity_score",
    "description_similarity"
]

def preprocess_data(input_path: str = "data/synthetic_invoices.csv", scaler_output_path: str = "app/models/scaler.pkl"):
    """
    Loads the raw CSV data, selects the full set of numerical features we care about (dropping IDs/dates),
    standardizes the numerical data, and saves the scaler so the API can use it at runtime.
    """
    print(f"Loading raw data from {input_path}...")
    df = pd.read_csv(input_path)
    
    # Extract just the features we want to train the model on
    X = df[FEATURES]
    y = df["is_fraud"]  # We keep the labels just to evaluate our unsupervised model later
    
    # Print some stats before scaling
    print(f"Dataset shape: {X.shape}")
    print("Pre-scaling sample:\n", X.head(2))
    
    # Machine Learning models perform much better if all numerical features are on the same scale (mean=0, variance=1)
    print("\nFitting StandardScaler (mean=0, variance=1) to the training data...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Ensure the models directory exists
    os.makedirs(os.path.dirname(scaler_output_path), exist_ok=True)
    
    # Save the fitted scaler to a .pkl file!
    joblib.dump(scaler, scaler_output_path)
    print(f"✅ Scaler successfully saved to {scaler_output_path}")
    
    return X_scaled, y, scaler

if __name__ == "__main__":
    X_scaled, y, _ = preprocess_data()
    print("\nPost-scaling sample (first row):")
    print(X_scaled[0])

from app.schemas.invoice_input import InvoiceInput
import numpy as np

class FeatureBuilder:
    """
    Transforms raw JSON invoice schemas into structured dictionaries
    or mathematical vectors (NumPy arrays) for the ML model to consume.
    """
    
    @staticmethod
    def extract_features(invoice: InvoiceInput) -> dict:
        """
        Calculates human-readable, domain-specific features from the raw invoice.
        These are also useful for the Rule Engine.
        """
        num_line_items = len(invoice.line_items)
        
        # Avoid division by zero
        avg_unit_price = (
            sum(item.unit_price for item in invoice.line_items) / num_line_items
        ) if num_line_items > 0 else 0.0
        
        # Calculate days until due
        days_to_due = -1  # Default if no due date
        if invoice.due_date:
            delta = invoice.due_date - invoice.invoice_date
            days_to_due = delta.days
            
        return {
            "amount": invoice.amount,
            "num_line_items": float(num_line_items),
            "avg_unit_price": avg_unit_price,
            "days_to_due": float(days_to_due),
        }

    @staticmethod
    def build_model_vector(invoice: InvoiceInput) -> np.ndarray:
        """
        Transforms invoice features into a 1D numerical array for model scoring.
        NOTE: Must perfectly match the feature column order used during model training!
        """
        # Let's say our Isolation Forest was trained on these 4 features:
        # [amount, num_line_items, avg_unit_price, days_to_due]
        features = FeatureBuilder.extract_features(invoice)
        
        feature_list = [
            features["amount"],
            features["num_line_items"],
            features["avg_unit_price"],
            features["days_to_due"]
        ]
        
        return np.array(feature_list).reshape(1, -1)

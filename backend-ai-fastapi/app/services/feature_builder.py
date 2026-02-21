from app.schemas.invoice_input import InvoiceInput
import numpy as np
from datetime import datetime

class FeatureBuilder:
    """
    Transforms raw JSON invoice schemas into 21 structured numerical features
    to perfectly match what the IsolationForest model was trained on!
    """

    @staticmethod
    def extract_features(invoice: InvoiceInput) -> dict:
        num_line_items = len(invoice.line_items)
        amount = float(invoice.amount)
        
        avg_unit_price = (
            sum(item.unit_price for item in invoice.line_items) / num_line_items
        ) if num_line_items > 0 else 0.0

        invoice_date_dt = invoice.invoice_date # Pydantic parses this to a date object automatically
        weekend_submission = 1 if invoice_date_dt.weekday() >= 5 else 0
        
        is_round_amount = 1 if amount % 1000 == 0 else 0
        high_value_invoice = 1 if amount > 50000 else 0

        # In a real production system, most of these fields would be pulled from a database
        # via the core Node.js backend. For this AI layer, we will mock the missing historical
        # fields (or default them safely) so the model still receives its required 21 features!
        return {
            "amount": amount,
            "tax_amount": amount * 0.10,          # Mock: Assume 10% tax
            "discount_amount": 0.0,               # Default
            "total_line_items": float(num_line_items),
            "avg_item_price": avg_unit_price,
            "submission_time": 12.0,              # Mock: Noon submission
            "vendor_account_age_days": 180.0,     # Mock
            "time_since_last_invoice": 30.0,      # Mock
            "invoices_last_24h": 0.5,             # Mock 
            "invoices_last_7d": 1.0,              # Mock
            "vendor_lender_count": 1.0,           # Mock
            "vendor_buyer_count": 1.0,            # Mock
            "repeat_vendor_buyer_pair": 1.0,      # Mock
            "unique_lenders_used": 1.0,           # Mock
            "is_round_amount": float(is_round_amount),
            "amount_deviation": 0.0,              # Mock: Perfectly average amount
            "high_value_invoice": float(high_value_invoice),
            "weekend_submission": float(weekend_submission),
            "night_submission": 0.0,              # Default
            "line_item_similarity_score": 0.0,    # Mock: Computed by similarity engine later
            "description_similarity": 0.0         # Mock
        }

    @staticmethod
    def build_model_vector(invoice: InvoiceInput) -> np.ndarray:
        """
        Structures the dictionary into a 1D NumPy array.
        MUST match exactly with app/training/preprocess.py FEATURES list!
        """
        features = FeatureBuilder.extract_features(invoice)
        
        feature_list = [
            features["amount"],
            features["tax_amount"],
            features["discount_amount"],
            features["total_line_items"],
            features["avg_item_price"],
            features["submission_time"],
            features["vendor_account_age_days"],
            features["time_since_last_invoice"],
            features["invoices_last_24h"],
            features["invoices_last_7d"],
            features["vendor_lender_count"],
            features["vendor_buyer_count"],
            features["repeat_vendor_buyer_pair"],
            features["unique_lenders_used"],
            features["is_round_amount"],
            features["amount_deviation"],
            features["high_value_invoice"],
            features["weekend_submission"],
            features["night_submission"],
            features["line_item_similarity_score"],
            features["description_similarity"]
        ]
        
        return np.array(feature_list).reshape(1, -1)

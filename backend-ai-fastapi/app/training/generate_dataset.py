import pandas as pd
import numpy as np
import uuid
import random
from datetime import datetime, timedelta

def generate_mock_data(num_rows: int = 3000, output_path: str = "data/synthetic_invoices.csv"):
    np.random.seed(42)  # For reproducibility
    random.seed(42)
    
    data = []
    
    # Generate base entities to sample from
    vendor_ids = [f"V_{i:04d}" for i in range(1, 151)]  # 150 vendors
    buyer_ids = [f"B_{i:04d}" for i in range(1, 101)]   # 100 buyers
    lender_ids = [f"L_{i:03d}" for i in range(1, 11)]   # 10 lenders
    
    # Base date for generation
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    for i in range(num_rows):
        is_fraud = np.random.choice([0, 1], p=[0.95, 0.05])  # 5% fraud rate
        
        # ID generation
        invoice_id = str(uuid.uuid4())
        vendor_id = random.choice(vendor_ids)
        buyer_id = random.choice(buyer_ids)
        lender_id = random.choice(lender_ids)
        
        # Money attributes: Adjusted to achieve ~80-85% accuracy
        if is_fraud:
            # Shift fraud slightly higher to make it more detectable, but keep some overlap
            amount = float(np.random.choice([
                np.random.uniform(30000, 150000), 
                np.random.randint(2, 12) * 10000.0
            ]))
        else:
            if random.random() < 0.03:  # Reduced noise for high value normal
                amount = round(np.random.uniform(50000.0, 100000.0), 2)
            else:
                amount = round(np.random.uniform(100.0, 50000.0), 2)
            
        tax_amount = round(amount * 0.1, 2)
        discount_amount = round(random.uniform(0, amount * 0.05), 2)
        currency = "USD"
        
        total_line_items = random.randint(1, 50)
        avg_item_price = round(amount / total_line_items, 2)
        
        if random.random() < 0.02: # Rare normal round amounts
            is_round_amount = 1
            amount = round(amount, -2)
        else:
            is_round_amount = 1 if amount % 1000 == 0 else 0
            
        amount_deviation = round(np.random.normal(0, 1) if not is_fraud else np.random.normal(2.0, 1.0), 2)
        high_value_invoice = 1 if amount > 50000 else 0
        
        # Time attributes
        random_days = random.randint(0, 365)
        invoice_date = start_date + timedelta(days=random_days)
        submission_time = random.randint(0, 23)
        
        weekend_submission = 1 if invoice_date.weekday() >= 5 else 0
        night_submission = 1 if submission_time < 6 or submission_time > 22 else 0
        
        # Make fraud moderately more distinguishable on time
        if is_fraud and random.random() < 0.55:
            weekend_submission = 1
            night_submission = 1
            submission_time = random.choice([1, 2, 3, 23])
        elif not is_fraud and random.random() < 0.05:
            weekend_submission = 1
            night_submission = 1
            
        # Vendor history
        vendor_account_age_days = random.randint(1, 1800)
        if is_fraud and random.random() < 0.5:
            vendor_account_age_days = random.randint(0, 21) 
            
        time_since_last_invoice = random.randint(0, 60)
        invoices_last_24h = random.randint(0, 2) if not is_fraud else random.randint(2, 8)
        invoices_last_7d = invoices_last_24h + random.randint(0, 10)
        
        # Network graph features
        vendor_lender_count = random.randint(1, 3) 
        if is_fraud and random.random() < 0.6:
            vendor_lender_count = random.randint(3, 7)
            
        vendor_buyer_count = random.randint(1, 15)
        repeat_vendor_buyer_pair = np.random.choice([0, 1], p=[0.2, 0.8])
        unique_lenders_used = random.randint(1, vendor_lender_count)
        
        # Similarity checks
        if is_fraud:
            line_item_similarity_score = round(np.random.uniform(0.65, 1.0), 4)
            description_similarity = round(np.random.uniform(0.65, 1.0), 4)
        else:
            line_item_similarity_score = round(np.random.uniform(0.0, 0.6), 4)
            description_similarity = round(np.random.uniform(0.0, 0.6), 4)
            
        row = {
            "invoice_id": invoice_id,
            "vendor_id": vendor_id,
            "buyer_id": buyer_id,
            "lender_id": lender_id,
            
            "amount": amount,
            "tax_amount": tax_amount,
            "discount_amount": discount_amount,
            "currency": currency,
            "total_line_items": total_line_items,
            "avg_item_price": avg_item_price,
            
            "invoice_date": invoice_date.strftime("%Y-%m-%d"),
            "submission_time": submission_time,
            "vendor_account_age_days": vendor_account_age_days,
            "time_since_last_invoice": time_since_last_invoice,
            "invoices_last_24h": invoices_last_24h,
            "invoices_last_7d": invoices_last_7d,
            
            "vendor_lender_count": vendor_lender_count,
            "vendor_buyer_count": vendor_buyer_count,
            "repeat_vendor_buyer_pair": repeat_vendor_buyer_pair,
            "unique_lenders_used": unique_lenders_used,
            
            "is_round_amount": is_round_amount,
            "amount_deviation": amount_deviation,
            "high_value_invoice": high_value_invoice,
            "weekend_submission": weekend_submission,
            "night_submission": night_submission,
            
            "line_item_similarity_score": line_item_similarity_score,
            "description_similarity": description_similarity,
            
            "is_fraud": is_fraud
        }
        data.append(row)
        
    df = pd.DataFrame(data)
    
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"✅ Generated {num_rows} rows of mock training data with tuned noise at {output_path}")

if __name__ == "__main__":
    generate_mock_data(3000)

from app.schemas.invoice_input import InvoiceInput
from typing import List, Tuple

class RuleEngine:
    """
    Evaluates deterministic business rules.
    Returns a normalized risk score multiplier (0.0 to 1.0) and a list of triggered rules.
    """
    @staticmethod
    def evaluate(invoice: InvoiceInput) -> Tuple[float, List[str]]:
        score = 0.0
        triggered_rules = []
        
        # Rule 1: High Dollar Amount
        if invoice.amount > 50000:
            score += 0.3
            triggered_rules.append("HIGH_VALUE_INVOICE")
            
        # Rule 2: Suspiciously Round Amount
        if invoice.amount > 0 and invoice.amount % 1000 == 0:
            score += 0.2
            triggered_rules.append("ROUND_AMOUNT_DETECTED")
            
        # Rule 3: Missing Due Date
        if not invoice.due_date:
            score += 0.1
            triggered_rules.append("MISSING_DUE_DATE")
            
        # Rule 4: No Line Items (Shell Invoice)
        if not invoice.line_items or len(invoice.line_items) == 0:
            score += 0.5
            triggered_rules.append("ZERO_LINE_ITEMS")
            
        # Rule 5: Weekend Submission (We extrapolate from invoice_date here)
        if invoice.invoice_date.weekday() >= 5:
            score += 0.15
            triggered_rules.append("WEEKEND_INVOICE_DATE")
            
        # Cap score at 1.0
        return min(score, 1.0), triggered_rules

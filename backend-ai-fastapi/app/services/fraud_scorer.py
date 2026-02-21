from app.schemas.invoice_input import InvoiceInput
from app.schemas.fraud_output import FraudOutput
from app.services.rule_engine import RuleEngine
from app.services.anomaly_detector import anomaly_detector
from app.services.similarity_checker import SimilarityChecker

class FraudScorer:
    """
    The orchestrator service. Synthesizes inputs from the deterministic Rule Engine,
    the Isolation Forest ML model, and the Similarity checks to generate a single 
    Fraud Intelligence verdict (FraudOutput) to return to the Node backend!
    """
    
    @staticmethod
    def score_invoice(invoice: InvoiceInput) -> FraudOutput:
        # Phase 1: Sub-System evaluations
        # -----------------------------
        # A. Run Similarity Checks (Detect exact duplicates or highly similar text)
        similarity_res = SimilarityChecker.check_similarity(invoice)
        
        # B. Run deterministic Rule Checks (Detect shell invoices, impossible dates, missing due_dates)
        rule_score, triggered_rules = RuleEngine.evaluate(invoice)
        
        # C. Run AI Anomaly Inference (Detect mathematical anomalies and multivariate feature deviance)
        ml_res = anomaly_detector.predict(invoice)
        
        # Phase 2: Synthesis & Scoring Algorithm
        # -----------------------------
        # 100% Risk if it's an exact SHA-256 duplicate! No AI needed.
        if similarity_res.exact_duplicate_found:
            final_score = 1.0
            triggered_rules.append("EXACT_DUPLICATE_FOUND_SYSTEM_REJECTION")
            is_anomaly = True
            
        else:
            # Otherwise, blend ML and Rules using a predefined weighting system.
            # In production, these weights would be optimized using historical fraud data.
            WEIGHT_RULE_ENGINE = 0.40
            WEIGHT_ML_ANOMALY = 0.60
            
            final_score = (rule_score * WEIGHT_RULE_ENGINE) + (ml_res.get("anomaly_score", 0.0) * WEIGHT_ML_ANOMALY)
            is_anomaly = ml_res.get("is_anomaly", False)
            
        # Phase 3: Risk Level Categorization
        # -----------------------------
        if final_score >= 0.75:
            risk_level = "HIGH"
        elif final_score >= 0.40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
            
        # Return structured contract to the client
        return FraudOutput(
            invoice_id=invoice.invoice_id,
            fraud_score=round(final_score, 4),
            risk_level=risk_level,
            is_anomaly=is_anomaly,
            triggered_rules=triggered_rules,
            metadata={
                "ml_score": ml_res.get("anomaly_score", 0.0),
                "rule_score": rule_score,
                "highest_similarity": similarity_res.highest_similarity,
                "ml_error": ml_res.get("error", None)
            }
        )

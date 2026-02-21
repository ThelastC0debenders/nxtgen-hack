from pydantic import BaseModel, Field
from typing import List, Optional

class FraudOutput(BaseModel):
    invoice_id: str = Field(..., description="The ID of the checked invoice")
    fraud_score: float = Field(..., description="Continuous risk score between 0.0 and 1.0. Higher is more risky.")
    risk_level: str = Field(..., description="Categorical risk level: LOW, MEDIUM, HIGH")
    is_anomaly: bool = Field(..., description="True if the isolation forest flagged it as an anomaly")
    triggered_rules: List[str] = Field(default_factory=list, description="List of rule IDs triggered by the rule engine")
    metadata: Optional[dict] = Field(default=None, description="Any additional context (e.g., feature importances)")

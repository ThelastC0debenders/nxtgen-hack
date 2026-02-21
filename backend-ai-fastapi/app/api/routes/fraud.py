from fastapi import APIRouter, Depends
from app.schemas.invoice_input import InvoiceInput
from app.schemas.fraud_output import FraudOutput
from app.services.fraud_scorer import FraudScorer
from app.api.deps import verify_backend_token, get_anomaly_detector

router = APIRouter()

# The POST route depends on `verify_backend_token` so it requires an Authorization header.
# It also depends on `get_anomaly_detector` so it won't run if the model failed to load.

@router.post("/score", response_model=FraudOutput, status_code=200)
def score_invoice(
    invoice: InvoiceInput,
    _token=Depends(verify_backend_token),
    _model=Depends(get_anomaly_detector)
):
    """
    Primary orchestrator endpoint for the AI Layer.
    
    1. Node backend sends an incoming `InvoiceInput` via an authenticated HTTP POST.
    2. The entire payload is routed through `FraudScorer.score_invoice()`, where it is
       analyzed concurrently by deterministic Rules, ML models, and Similarity algorithms.
    3. The unified result (`FraudOutput`) is instantly returned to the Node backend to 
       update immutable audit records or immediately block duplicate financing.
    """
    result: FraudOutput = FraudScorer.score_invoice(invoice)
    return result

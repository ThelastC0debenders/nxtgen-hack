from fastapi import APIRouter, Depends
from app.schemas.invoice_input import InvoiceInput
from app.schemas.similarity_output import SimilarityOutput
from app.services.similarity_checker import SimilarityChecker
from app.api.deps import verify_backend_token

router = APIRouter()

# Exposing similarity as a standalone endpoint in case the Node backend
# just wants to quickly find exact duplicates *without* running the full AI model suite.

@router.post("/check-duplicate", response_model=SimilarityOutput, status_code=200)
def analyze_document_similarity(
    invoice: InvoiceInput,
    _=Depends(verify_backend_token)
):
    """
    Checks the incoming invoice hash for exact database duplicates,
    as well as mathematical (Jaccard/Cosine) comparisons against past vectors
    to prevent "copy-pasted" duplicated financing.
    """
    return SimilarityChecker.check_similarity(invoice)

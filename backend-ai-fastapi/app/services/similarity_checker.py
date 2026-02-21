from app.schemas.invoice_input import InvoiceInput
from app.schemas.similarity_output import SimilarityOutput
from app.utils.hashing import generate_invoice_hash
# In production, this would use Redis/Postgres. We'll mock the deterministic duplicate test.

class SimilarityChecker:
    """
    Responsible for deterministic exact-duplicate checks (using SHA-256 Hashes)
    and calculating NLP/vector-based near matches (Cosine/Jaccard scoring) against a corpus.
    """
    @staticmethod
    def check_similarity(invoice: InvoiceInput) -> SimilarityOutput:
        # 1. Deterministic hashing: if the Backend didn't send a hash, we generate it right now
        # so that it uses the exact same `json.dumps` stringification properties.
        invoice_hash = invoice.invoice_hash or generate_invoice_hash(invoice.dict())
        
        # 2. Database query: Check if this invoice_hash already exists
        # [MOCK] We assume false for now, since we have no DB connection.
        exact_duplicate = False 
        
        # 3. Near-duplicate search: Run Jaccard/Cosine metrics on past 30 days of vendor data
        # [MOCK]
        similar_invoices = []
        highest_similarity = 0.0
        
        return SimilarityOutput(
            invoice_id=invoice.invoice_id,
            exact_duplicate_found=exact_duplicate,
            similar_invoices=similar_invoices,
            highest_similarity=highest_similarity
        )

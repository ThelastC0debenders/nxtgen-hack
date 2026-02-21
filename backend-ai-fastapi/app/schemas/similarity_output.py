from pydantic import BaseModel, Field
from typing import List

class SimilarInvoice(BaseModel):
    invoice_id: str = Field(..., description="The ID of a potentially similar invoice in the system")
    similarity_score: float = Field(..., description="Score between 0.0 and 1.0 representing similarity")
    matched_features: List[str] = Field(default_factory=list, description="Which features contributed to the match")

class SimilarityOutput(BaseModel):
    invoice_id: str = Field(..., description="The incoming invoice ID checked")
    exact_duplicate_found: bool = Field(..., description="True if an exact hash match exists in the corpus")
    similar_invoices: List[SimilarInvoice] = Field(default_factory=list, description="List of similar invoices found above the threshold")
    highest_similarity: float = Field(default=0.0, description="The maximum similarity score found (0.0 if empty list)")

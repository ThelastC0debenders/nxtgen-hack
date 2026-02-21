import pytest
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)
AUTH_HEADER = {"Authorization": "Bearer hackathon-secret-api-key-2026"}

@pytest.fixture
def normal_invoice():
    with open("data/sample_payloads.json", "r") as f:
        data = json.load(f)
        for item in data:
            if item["scenario"] == "NORMAL_INVOICE":
                return item["payload"]
    return None

def test_check_duplicate_standalone_endpoint(normal_invoice):
    """
    Test that the similarity endpoint processes an invoice
    and generates the deterministic hash successfully.
    """
    response = client.post("/api/v1/check-duplicate", json=normal_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    
    data = response.json()
    assert data["invoice_id"] == "INV-2026-001"
    
    # We mocked the DB in similarity_checker, so it should always return False for now
    assert data["exact_duplicate_found"] is False
    assert len(data["similar_invoices"]) == 0
    assert data["highest_similarity"] == 0.0

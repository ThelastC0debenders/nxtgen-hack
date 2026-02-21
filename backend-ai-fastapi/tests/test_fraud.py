import pytest
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

# The mock secret token we setup in deps.py
AUTH_HEADER = {"Authorization": "Bearer hackathon-secret-api-key-2026"}

@pytest.fixture
def normal_invoice():
    with open("data/sample_payloads.json", "r") as f:
        data = json.load(f)
        # Find the NORMAL_INVOICE scenario
        for item in data:
            if item["scenario"] == "NORMAL_INVOICE":
                return item["payload"]
    return None
    
@pytest.fixture
def shell_invoice():
    with open("data/sample_payloads.json", "r") as f:
        data = json.load(f)
        # Find the SUSPICIOUS_SHELL_INVOICE scenario
        for item in data:
            if item["scenario"] == "SUSPICIOUS_SHELL_INVOICE":
                return item["payload"]
    return None

def test_unauthorized_access(normal_invoice):
    """Ensure the endpoint rejects requests without a valid Bearer token."""
    response = client.post("/api/v1/score", json=normal_invoice)
    assert response.status_code == 403 or response.status_code == 401

def test_normal_invoice_scoring(normal_invoice):
    """
    Test that a standard, healthy invoice gets scored LOW risk.
    """
    response = client.post("/api/v1/score", json=normal_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    
    data = response.json()
    assert data["invoice_id"] == "INV-2026-001"
    assert data["risk_level"] == "LOW"
    assert data["is_anomaly"] is False
    assert data["fraud_score"] < 0.40
    
def test_suspicious_shell_invoice_scoring(shell_invoice):
    """
    Test that a shell invoice perfectly triggers the Rule Engine 
    and is caught by the Isolation Forest.
    """
    response = client.post("/api/v1/score", json=shell_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    
    data = response.json()
    assert data["invoice_id"] == "INV-2026-002"
    assert data["risk_level"] == "HIGH"
    assert data["is_anomaly"] is True
    
    # Check that our rule engine properly flagged the missing data
    rules = data["triggered_rules"]
    assert "MISSING_DUE_DATE" in rules
    assert "ZERO_LINE_ITEMS" in rules
    assert "HIGH_VALUE_INVOICE" in rules

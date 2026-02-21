"""
Comprehensive edge-case and scenario tests for the Fraud Intelligence Service.

Scenarios covered:
  1.  Authentication edge cases (wrong token, missing Authorization header)
  2.  Input validation (missing required fields, bad date format, non-numeric amount)
  3.  Rule engine — each of the 5 rules triggered in isolation
  4.  Rule engine — boundary conditions ($50,000 exact threshold, $0 amount,
      all 5 rules firing simultaneously and being capped at 1.0)
  5.  Scoring logic (fraud_score in [0.0, 1.0], valid risk_level enum, metadata shape)
  6.  Similarity checker (pre-computed hash, unauthorized access)
  7.  Health endpoint (availability, response structure)

Date reference (all invoice_date values used here):
  2026-02-16 = Monday  (weekday 0) — a normal business day
  2026-02-21 = Saturday (weekday 5) — triggers WEEKEND_INVOICE_DATE
"""

import json
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

AUTH_HEADER = {"Authorization": "Bearer hackathon-secret-api-key-2026"}
WRONG_AUTH_HEADER = {"Authorization": "Bearer wrong-token-xyz"}


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

def _load_scenario(scenario_name: str) -> dict:
    with open("data/sample_payloads.json", "r") as f:
        for item in json.load(f):
            if item["scenario"] == scenario_name:
                return item["payload"]
    raise ValueError(f"Scenario '{scenario_name}' not found in sample_payloads.json")


@pytest.fixture
def normal_invoice():
    return _load_scenario("NORMAL_INVOICE")

@pytest.fixture
def shell_invoice():
    return _load_scenario("SUSPICIOUS_SHELL_INVOICE")

@pytest.fixture
def round_amount_invoice():
    return _load_scenario("ROUND_AMOUNT_INVOICE")

@pytest.fixture
def weekend_invoice():
    return _load_scenario("WEEKEND_INVOICE")

@pytest.fixture
def high_value_round_invoice():
    return _load_scenario("HIGH_VALUE_ROUND_INVOICE")

@pytest.fixture
def missing_due_date_only_invoice():
    return _load_scenario("MISSING_DUE_DATE_ONLY_INVOICE")

@pytest.fixture
def boundary_high_value_invoice():
    return _load_scenario("BOUNDARY_HIGH_VALUE_INVOICE")

@pytest.fixture
def zero_amount_invoice():
    return _load_scenario("ZERO_AMOUNT_INVOICE")

@pytest.fixture
def invoice_with_hash():
    return _load_scenario("INVOICE_WITH_HASH")


# ===========================================================================
# 1. AUTHENTICATION EDGE CASES
# ===========================================================================

def test_wrong_bearer_token_returns_401(normal_invoice):
    """A request carrying an incorrect token must be rejected with 401."""
    response = client.post("/api/v1/score", json=normal_invoice, headers=WRONG_AUTH_HEADER)
    assert response.status_code == 401


def test_no_auth_header_on_score_is_rejected(normal_invoice):
    """A request without any Authorization header must be rejected with 401 or 403."""
    response = client.post("/api/v1/score", json=normal_invoice)
    assert response.status_code in {401, 403}


def test_no_auth_header_on_check_duplicate_is_rejected(normal_invoice):
    """The /check-duplicate endpoint also requires auth; no header → 401 or 403."""
    response = client.post("/api/v1/check-duplicate", json=normal_invoice)
    assert response.status_code in {401, 403}


# ===========================================================================
# 2. INPUT VALIDATION EDGE CASES
# ===========================================================================

def test_missing_invoice_id_returns_422():
    """invoice_id is required — omitting it must produce a 422 Unprocessable Entity."""
    payload = {
        "vendor_id": "V_0001", "buyer_id": "B_0001",
        "amount": 1000.0, "invoice_date": "2026-02-16"
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 422


def test_missing_vendor_id_returns_422():
    """vendor_id is required."""
    payload = {
        "invoice_id": "INV-MISSING-VENDOR", "buyer_id": "B_0001",
        "amount": 1000.0, "invoice_date": "2026-02-16"
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 422


def test_missing_buyer_id_returns_422():
    """buyer_id is required."""
    payload = {
        "invoice_id": "INV-MISSING-BUYER", "vendor_id": "V_0001",
        "amount": 1000.0, "invoice_date": "2026-02-16"
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 422


def test_missing_amount_returns_422():
    """amount is required."""
    payload = {
        "invoice_id": "INV-MISSING-AMOUNT", "vendor_id": "V_0001",
        "buyer_id": "B_0001", "invoice_date": "2026-02-16"
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 422


def test_missing_invoice_date_returns_422():
    """invoice_date is required."""
    payload = {
        "invoice_id": "INV-MISSING-DATE", "vendor_id": "V_0001",
        "buyer_id": "B_0001", "amount": 1000.0
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 422


def test_invalid_date_format_returns_422():
    """invoice_date must be a valid ISO 8601 date string."""
    payload = {
        "invoice_id": "INV-BAD-DATE", "vendor_id": "V_0001",
        "buyer_id": "B_0001", "amount": 1000.0,
        "invoice_date": "not-a-date"
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 422


def test_non_numeric_amount_returns_422():
    """amount must be numeric — a string value must be rejected."""
    payload = {
        "invoice_id": "INV-STRING-AMOUNT", "vendor_id": "V_0001",
        "buyer_id": "B_0001", "amount": "five thousand",
        "invoice_date": "2026-02-16"
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 422


# ===========================================================================
# 3. RULE ENGINE — INDIVIDUAL RULE TRIGGERS
# ===========================================================================

def test_round_amount_rule_fires_in_isolation(round_amount_invoice):
    """
    Invoice: $5,000 (5000 % 1000 == 0), Monday 2026-02-16, has due_date, has line items.
    Only ROUND_AMOUNT_DETECTED must fire.
    """
    response = client.post("/api/v1/score", json=round_amount_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    rules = response.json()["triggered_rules"]
    assert "ROUND_AMOUNT_DETECTED" in rules
    assert "HIGH_VALUE_INVOICE" not in rules      # $5,000 < $50,000
    assert "MISSING_DUE_DATE" not in rules        # due_date present
    assert "ZERO_LINE_ITEMS" not in rules         # has line items
    assert "WEEKEND_INVOICE_DATE" not in rules    # Monday


def test_weekend_rule_fires_in_isolation(weekend_invoice):
    """
    Invoice: $1,234.56 (non-round), Saturday 2026-02-21, has due_date, has line items.
    Only WEEKEND_INVOICE_DATE must fire.
    """
    response = client.post("/api/v1/score", json=weekend_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    rules = response.json()["triggered_rules"]
    assert "WEEKEND_INVOICE_DATE" in rules
    assert "ROUND_AMOUNT_DETECTED" not in rules   # 1234.56 % 1000 ≠ 0
    assert "HIGH_VALUE_INVOICE" not in rules      # $1,234.56 < $50,000
    assert "MISSING_DUE_DATE" not in rules
    assert "ZERO_LINE_ITEMS" not in rules


def test_missing_due_date_rule_fires_in_isolation(missing_due_date_only_invoice):
    """
    Invoice: $1,500 (1500 % 1000 = 500, not divisible by 1000, so ROUND_AMOUNT_DETECTED does
    not fire), Monday 2026-02-16, no due_date, has line items.
    Only MISSING_DUE_DATE must fire.
    """
    response = client.post("/api/v1/score", json=missing_due_date_only_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    rules = response.json()["triggered_rules"]
    assert "MISSING_DUE_DATE" in rules
    assert "ROUND_AMOUNT_DETECTED" not in rules   # 1500 % 1000 = 500
    assert "HIGH_VALUE_INVOICE" not in rules
    assert "ZERO_LINE_ITEMS" not in rules
    assert "WEEKEND_INVOICE_DATE" not in rules


def test_high_value_and_round_amount_rules_fire_together(high_value_round_invoice):
    """
    Invoice: $75,000 (> $50,000 AND 75000 % 1000 == 0), Monday 2026-02-16, has due_date/line items.
    HIGH_VALUE_INVOICE and ROUND_AMOUNT_DETECTED must fire; no other rules.
    """
    response = client.post("/api/v1/score", json=high_value_round_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    rules = response.json()["triggered_rules"]
    assert "HIGH_VALUE_INVOICE" in rules
    assert "ROUND_AMOUNT_DETECTED" in rules
    assert "MISSING_DUE_DATE" not in rules
    assert "ZERO_LINE_ITEMS" not in rules
    assert "WEEKEND_INVOICE_DATE" not in rules


def test_zero_line_items_rule_fires(shell_invoice):
    """A shell invoice with an empty line_items list must trigger ZERO_LINE_ITEMS."""
    response = client.post("/api/v1/score", json=shell_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert "ZERO_LINE_ITEMS" in response.json()["triggered_rules"]


def test_all_five_rules_triggered_simultaneously(shell_invoice):
    """
    The SUSPICIOUS_SHELL_INVOICE (INV-2026-002) triggers all 5 rules:
      - HIGH_VALUE_INVOICE    (100,000 > 50,000)
      - ROUND_AMOUNT_DETECTED (100,000 % 1,000 == 0)
      - MISSING_DUE_DATE      (due_date = null)
      - ZERO_LINE_ITEMS       (line_items = [])
      - WEEKEND_INVOICE_DATE  (2026-02-21 = Saturday)
    Raw rule score: 0.3 + 0.2 + 0.1 + 0.5 + 0.15 = 1.25, capped at 1.0.
    """
    response = client.post("/api/v1/score", json=shell_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    rules = response.json()["triggered_rules"]
    assert "HIGH_VALUE_INVOICE" in rules
    assert "ROUND_AMOUNT_DETECTED" in rules
    assert "MISSING_DUE_DATE" in rules
    assert "ZERO_LINE_ITEMS" in rules
    assert "WEEKEND_INVOICE_DATE" in rules


# ===========================================================================
# 4. RULE ENGINE — BOUNDARY CONDITIONS
# ===========================================================================

def test_exact_50000_does_not_trigger_high_value_rule(boundary_high_value_invoice):
    """
    Amount = $50,000.00 exactly — the rule is `amount > 50000` (strict greater-than),
    so HIGH_VALUE_INVOICE must NOT fire. ROUND_AMOUNT_DETECTED must fire because
    50000 % 1000 == 0.
    """
    response = client.post("/api/v1/score", json=boundary_high_value_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    rules = response.json()["triggered_rules"]
    assert "HIGH_VALUE_INVOICE" not in rules   # 50000 is NOT > 50000
    assert "ROUND_AMOUNT_DETECTED" in rules    # 50000 % 1000 == 0


def test_zero_amount_does_not_trigger_round_or_high_value_rules(zero_amount_invoice):
    """
    Amount = $0.0 — the ROUND_AMOUNT rule requires `amount > 0`, so it must
    not fire. HIGH_VALUE also must not fire (0 < 50000).
    """
    response = client.post("/api/v1/score", json=zero_amount_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    rules = response.json()["triggered_rules"]
    assert "HIGH_VALUE_INVOICE" not in rules
    assert "ROUND_AMOUNT_DETECTED" not in rules


def test_above_50000_threshold_triggers_high_value_rule():
    """
    Amount = $50,000.01 — just one cent above the threshold — must trigger HIGH_VALUE_INVOICE.
    """
    payload = {
        "invoice_id": "INV-BOUNDARY-ABOVE",
        "vendor_id": "V_0060",
        "buyer_id": "B_0110",
        "amount": 50000.01,
        "currency": "USD",
        "invoice_date": "2026-02-16",
        "due_date": "2026-03-16",
        "line_items": [
            {"description": "Item", "quantity": 1, "unit_price": 50000.01, "total": 50000.01}
        ]
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert "HIGH_VALUE_INVOICE" in response.json()["triggered_rules"]


def test_no_rules_triggered_for_clean_invoice():
    """
    A perfectly clean invoice (non-round amount, weekday, has due_date, has line items,
    below high-value threshold) must produce an empty triggered_rules list.
    """
    payload = {
        "invoice_id": "INV-CLEAN",
        "vendor_id": "V_0061",
        "buyer_id": "B_0111",
        "amount": 3789.99,      # non-round, non-high-value
        "currency": "USD",
        "invoice_date": "2026-02-16",   # Monday
        "due_date": "2026-03-16",
        "line_items": [
            {"description": "Goods", "quantity": 3, "unit_price": 1263.33, "total": 3789.99}
        ]
    }
    response = client.post("/api/v1/score", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert response.json()["triggered_rules"] == []


# ===========================================================================
# 5. SCORING LOGIC VERIFICATION
# ===========================================================================

def test_fraud_score_is_always_between_0_and_1(
    normal_invoice, shell_invoice, round_amount_invoice, zero_amount_invoice
):
    """fraud_score must always be in [0.0, 1.0] regardless of invoice type."""
    for invoice in [normal_invoice, shell_invoice, round_amount_invoice, zero_amount_invoice]:
        response = client.post("/api/v1/score", json=invoice, headers=AUTH_HEADER)
        assert response.status_code == 200
        score = response.json()["fraud_score"]
        assert 0.0 <= score <= 1.0, f"fraud_score {score} out of range for invoice {invoice['invoice_id']}"


def test_risk_level_is_always_a_valid_enum(normal_invoice, shell_invoice, high_value_round_invoice):
    """risk_level must always be one of: LOW, MEDIUM, HIGH."""
    valid_levels = {"LOW", "MEDIUM", "HIGH"}
    for invoice in [normal_invoice, shell_invoice, high_value_round_invoice]:
        response = client.post("/api/v1/score", json=invoice, headers=AUTH_HEADER)
        assert response.status_code == 200
        assert response.json()["risk_level"] in valid_levels


def test_shell_invoice_fraud_score_is_at_least_rule_contribution(shell_invoice):
    """
    With all 5 rules triggered (rule_score capped at 1.0) and WEIGHT_RULE_ENGINE = 0.40,
    the minimum possible final_score is 0.40. fraud_score must be >= 0.40.
    """
    response = client.post("/api/v1/score", json=shell_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["fraud_score"] >= 0.40


def test_shell_invoice_risk_level_is_high(shell_invoice):
    """The shell invoice with ML anomaly detection should be classified as HIGH risk."""
    response = client.post("/api/v1/score", json=shell_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert response.json()["risk_level"] == "HIGH"


def test_normal_invoice_risk_level_is_low(normal_invoice):
    """A healthy invoice should be classified as LOW risk."""
    response = client.post("/api/v1/score", json=normal_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert response.json()["risk_level"] == "LOW"


def test_risk_level_matches_fraud_score_thresholds(normal_invoice, shell_invoice):
    """
    Verify the categorisation contract:
      fraud_score >= 0.75 → HIGH
      fraud_score >= 0.40 → MEDIUM
      fraud_score < 0.40  → LOW
    """
    for invoice in [normal_invoice, shell_invoice]:
        response = client.post("/api/v1/score", json=invoice, headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        score = data["fraud_score"]
        level = data["risk_level"]
        if score >= 0.75:
            assert level == "HIGH"
        elif score >= 0.40:
            assert level == "MEDIUM"
        else:
            assert level == "LOW"


def test_response_metadata_contains_expected_keys(normal_invoice):
    """The metadata field must expose ml_score, rule_score, and highest_similarity."""
    response = client.post("/api/v1/score", json=normal_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    meta = response.json().get("metadata", {})
    assert "ml_score" in meta
    assert "rule_score" in meta
    assert "highest_similarity" in meta


def test_response_schema_has_all_required_fields(normal_invoice):
    """Every response must include all FraudOutput contract fields."""
    response = client.post("/api/v1/score", json=normal_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    for field in ["invoice_id", "fraud_score", "risk_level", "is_anomaly", "triggered_rules"]:
        assert field in data, f"Missing field: {field}"


def test_is_anomaly_is_a_boolean(normal_invoice, shell_invoice):
    """is_anomaly must always be a boolean value."""
    for invoice in [normal_invoice, shell_invoice]:
        response = client.post("/api/v1/score", json=invoice, headers=AUTH_HEADER)
        assert response.status_code == 200
        assert isinstance(response.json()["is_anomaly"], bool)


def test_triggered_rules_is_a_list(normal_invoice, shell_invoice):
    """triggered_rules must always be a list (possibly empty)."""
    for invoice in [normal_invoice, shell_invoice]:
        response = client.post("/api/v1/score", json=invoice, headers=AUTH_HEADER)
        assert response.status_code == 200
        assert isinstance(response.json()["triggered_rules"], list)


# ===========================================================================
# 6. SIMILARITY CHECKER EDGE CASES
# ===========================================================================

def test_check_duplicate_uses_precomputed_hash(invoice_with_hash):
    """
    When invoice_hash is provided, the SimilarityChecker should use it directly.
    The response must carry the correct invoice_id and a valid structure.
    """
    response = client.post("/api/v1/check-duplicate", json=invoice_with_hash, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["invoice_id"] == "INV-2026-009"
    assert data["exact_duplicate_found"] is False
    assert isinstance(data["similar_invoices"], list)
    assert isinstance(data["highest_similarity"], float)


def test_check_duplicate_without_precomputed_hash(normal_invoice):
    """
    When no invoice_hash is provided, the service generates one from the payload.
    The response must return the correct invoice_id and a valid structure.
    """
    response = client.post("/api/v1/check-duplicate", json=normal_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["invoice_id"] == "INV-2026-001"
    assert data["exact_duplicate_found"] is False
    assert data["highest_similarity"] == 0.0


def test_check_duplicate_highest_similarity_is_non_negative(normal_invoice):
    """highest_similarity must be >= 0.0."""
    response = client.post("/api/v1/check-duplicate", json=normal_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert response.json()["highest_similarity"] >= 0.0


def test_check_duplicate_accepts_weekend_invoice(weekend_invoice):
    """Similarity endpoint works for any valid invoice, including weekend ones."""
    response = client.post("/api/v1/check-duplicate", json=weekend_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert response.json()["invoice_id"] == "INV-2026-004"


def test_check_duplicate_accepts_zero_amount_invoice(zero_amount_invoice):
    """Similarity endpoint handles a zero-amount invoice gracefully."""
    response = client.post("/api/v1/check-duplicate", json=zero_amount_invoice, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert response.json()["invoice_id"] == "INV-2026-008"


# ===========================================================================
# 7. HEALTH ENDPOINT
# ===========================================================================

def test_health_endpoint_returns_200():
    """The /health endpoint must be publicly accessible and return 200."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_endpoint_response_structure():
    """The /health endpoint must return all expected keys."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "message" in data
    assert "models_ready" in data
    assert "scaler_ready" in data


def test_health_endpoint_status_is_valid_enum():
    """status must be 'ok' or 'degraded'."""
    response = client.get("/api/v1/health")
    assert response.json()["status"] in {"ok", "degraded"}


def test_health_models_ready_is_boolean():
    """models_ready and scaler_ready must be booleans."""
    response = client.get("/api/v1/health")
    data = response.json()
    assert isinstance(data["models_ready"], bool)
    assert isinstance(data["scaler_ready"], bool)

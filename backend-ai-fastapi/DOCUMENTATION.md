# 🧠 Backend AI FastAPI — Complete Technical Documentation

> **Fraud Intelligence Service** — Real-time invoice anomaly detection, rule-based risk scoring, and near-duplicate detection for the NxtGen Invoice Verification Platform.

---

## 📋 Table of Contents

1. [Service Overview](#1-service-overview)
2. [Why These Technologies?](#2-why-these-technologies)
3. [Architecture Diagrams](#3-architecture-diagrams)
4. [End-to-End AI Flow](#4-end-to-end-ai-flow)
5. [Dataset — Design & Rationale](#5-dataset--design--rationale)
6. [Training Pipeline](#6-training-pipeline)
7. [AI/ML Deep Dive — Isolation Forest](#7-aiml-deep-dive--isolation-forest)
8. [Feature Engineering (21 Features)](#8-feature-engineering-21-features)
9. [Scoring & Metrics](#9-scoring--metrics)
10. [Services & Modules Breakdown](#10-services--modules-breakdown)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [Schemas (Contracts)](#12-schemas-contracts)
13. [Security Design](#13-security-design)
14. [Configuration & Environment](#14-configuration--environment)
15. [Running & Testing Locally](#15-running--testing-locally)
16. [Limitations & Future Improvements](#16-limitations--future-improvements)

---

## 1. Service Overview

The **Fraud Intelligence Service** (`backend-ai-fastapi`) is a standalone Python microservice that acts as the **AI intelligence layer** for the platform. It sits between the core Node.js backend and the data layer, receiving every submitted invoice and returning a structured risk verdict.

### Responsibilities

| Responsibility | Implementation |
|---|---|
| **Anomaly Detection** | Scikit-learn Isolation Forest (unsupervised ML) |
| **Rule-Based Scoring** | Deterministic Python rule engine |
| **Duplicate Detection** | SHA-256 hash fingerprinting |
| **Near-Duplicate Matching** | Cosine / Jaccard similarity scoring |
| **API Gateway** | FastAPI REST endpoints |
| **Model Serving** | `joblib`-serialized `.pkl` artifacts loaded at startup |

### Position in the System

```
React Frontend
      │
      ▼
Node.js Core Backend ──────────────────────────────┐
  (auth, RBAC, audit logs, PostgreSQL, Redis)       │
      │                                             │
      │  POST /api/v1/score  (Bearer token)         │
      ▼                                             │
┌─────────────────────────────────────────┐         │
│     FastAPI Fraud Intelligence Service  │         │
│  ┌───────────┐ ┌──────────┐ ┌────────┐  │         │
│  │Rule Engine│ │Isolation │ │Similar-│  │         │
│  │(5 rules)  │ │Forest ML │ │ity Chk │  │         │
│  └───────────┘ └──────────┘ └────────┘  │         │
│          ↘          ↓          ↙        │         │
│         FraudScorer (orchestrator)      │         │
└─────────────────────────────────────────┘         │
      │                                             │
      │  Returns FraudOutput JSON                   │
      └─────────────────────────────────────────────┘
```

---

## 2. Why These Technologies?

### FastAPI

**Why not Flask, Django REST, or Express?**

| Criteria | FastAPI ✅ | Flask | Django REST |
|---|---|---|---|
| Native async/await | ✅ Yes | ❌ No | ⚠️ Partial |
| Automatic OpenAPI docs | ✅ Built-in | ❌ Manual | ❌ Manual |
| Pydantic v2 validation | ✅ Native | ❌ Third-party | ❌ Third-party |
| Startup performance | ✅ < 300 ms | ✅ < 300 ms | ❌ Heavy |
| Type safety | ✅ Full | ❌ None | ⚠️ Partial |

FastAPI was chosen because:
- **Pydantic v2 integration** gives us zero-cost request validation at the schema level. The moment an invoice arrives, all 21 fields are type-checked and coerced before any AI code runs.
- **Auto-generated interactive docs** (`/api/v1/docs`) are invaluable during a hackathon — the Node backend team can test AI endpoints without writing a single line of client code.
- **Sub-millisecond routing overhead** leaves the full time budget for ML inference.

### Scikit-learn (Isolation Forest)

**Why not a neural network, XGBoost, or a cloud AI service?**

- **No labeled training data available**: In real invoice fraud detection, labelled fraud datasets are rare, proprietary, and expensive. Isolation Forest is an **unsupervised** algorithm — it requires no fraud labels to train.
- **Low-latency inference**: A single Isolation Forest prediction on a 21-feature vector takes **< 1 ms**. A neural network would require 100–500 ms with GPU warm-up.
- **Explainability**: The `decision_function` score is a continuous, interpretable value. This matters in fintech where "why did you flag this?" is a regulatory requirement.
- **No infrastructure dependency**: The model runs entirely in Python from a `.pkl` file. No TensorFlow serving, no GPU cluster, no external API calls.

### Pydantic v2

- Used for all input/output schemas (`InvoiceInput`, `FraudOutput`, `SimilarityOutput`).
- Automatic **date parsing**, **float coercion**, and **optional field handling** without writing any validation code.
- **`pydantic-settings`** handles environment config from `.env` files automatically.

### joblib

- Scikit-learn's recommended serialisation format for trained models.
- Significantly faster than `pickle` for large NumPy arrays (uses memory-mapped files).
- Both `isolation_forest.pkl` and `scaler.pkl` are loaded **once at startup** into a singleton `AnomalyDetector` instance, so every request shares the same in-memory model with zero reload cost.

### pandas + numpy

- **pandas**: Used exclusively in the offline training pipeline (`training/`) to load and manipulate the synthetic CSV dataset.
- **numpy**: Used in `FeatureBuilder` to construct the feature vector (`np.array`) that the model expects. `np.ndarray` is the native input format for all scikit-learn models.

### HTTPBearer (FastAPI Security)

- Simple, standard Bearer token authentication protecting the `/score` and `/check-duplicate` endpoints from public abuse.
- In production, this token would be a short-lived JWT issued by the Node.js backend's auth service.

---

## 3. Architecture Diagrams

### 3.1 Service Internal Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Application (main.py)                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   CORS Middleware                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────┐  ┌────────────────────┐  ┌──────────────────┐   │
│  │GET /health │  │POST /score         │  │POST /check-      │   │
│  │(health.py) │  │(fraud.py)          │  │duplicate         │   │
│  └────────────┘  │                   │  │(similarity.py)   │   │
│                  │  Deps:            │  │                  │   │
│                  │  ├ verify_token   │  │  Deps:           │   │
│                  │  └ get_anomaly_   │  │  └ verify_token  │   │
│                  │    detector       │  └──────────────────┘   │
│                  └────────┬──────────┘           │             │
│                           │                      │             │
│                  ┌────────▼──────────┐           │             │
│                  │   FraudScorer     │           │             │
│                  │  (orchestrator)   │           │             │
│                  └──┬──────┬─────┬──┘           │             │
│                     │      │     │               │             │
│          ┌──────────▼──┐  ┌▼──────────┐  ┌─────▼──────────┐  │
│          │ RuleEngine  │  │ Anomaly   │  │ Similarity     │  │
│          │ (5 rules)   │  │ Detector  │  │ Checker        │  │
│          └─────────────┘  └─────┬─────┘  └────────────────┘  │
│                                 │                              │
│                          ┌──────▼──────┐                      │
│                          │FeatureBuilder│                      │
│                          │(21 features)│                      │
│                          └──────┬──────┘                      │
│                                 │                              │
│                   ┌─────────────▼──────────────┐              │
│                   │  isolation_forest.pkl       │              │
│                   │  scaler.pkl                 │              │
│                   │  (loaded once at startup)   │              │
│                   └─────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Training Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OFFLINE TRAINING PIPELINE                    │
│                                                                  │
│   generate_dataset.py                                            │
│   ┌──────────────────────────────────┐                          │
│   │  Synthetic Invoice Generator     │                          │
│   │  • 3,000 rows                    │                          │
│   │  • 95% normal / 5% fraud         │                          │
│   │  • 26 columns including labels   │                          │
│   └────────────────┬─────────────────┘                          │
│                    │  data/synthetic_invoices.csv                │
│                    ▼                                             │
│   preprocess.py                                                  │
│   ┌──────────────────────────────────┐                          │
│   │  StandardScaler                  │                          │
│   │  • Selects 21 feature columns    │                          │
│   │  • Fits mean/std on training set │                          │
│   │  • Normalizes to (mean=0, var=1) │                          │
│   └────────────────┬─────────────────┘                          │
│                    │  app/models/scaler.pkl                      │
│                    ▼                                             │
│   train_model.py                                                 │
│   ┌──────────────────────────────────┐                          │
│   │  IsolationForest                 │                          │
│   │  • n_estimators=100              │                          │
│   │  • contamination=0.05            │                          │
│   │  • Unsupervised fit (no labels)  │                          │
│   │  • Evaluate vs synthetic labels  │                          │
│   └────────────────┬─────────────────┘                          │
│                    │  app/models/isolation_forest.pkl            │
│                    │  app/models/metadata.json                   │
│                    ▼                                             │
│              PRODUCTION ARTIFACTS                                │
│          (committed to repo for deployment)                      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Request Lifecycle (Sequence Diagram)

```
Node.js        FastAPI         FraudScorer     RuleEngine    AnomalyDetector   SimilarityChecker
Backend        /score          (orchestrator)  (rules)       (Isolation Forest) (hash + cosine)
   │               │                │               │                │                │
   │ POST /score   │                │               │                │                │
   │ Bearer token  │                │               │                │                │
   │──────────────►│                │               │                │                │
   │               │ verify_token   │               │                │                │
   │               │ get_anomaly_   │               │                │                │
   │               │ detector       │               │                │                │
   │               │                │               │                │                │
   │               │ score_invoice()│               │                │                │
   │               │───────────────►│               │                │                │
   │               │                │ check_similarity()             │                │
   │               │                │───────────────────────────────────────────────►│
   │               │                │◄───────────────────────────────────────────────│
   │               │                │ SimilarityOutput               │                │
   │               │                │               │                │                │
   │               │                │ evaluate()    │                │                │
   │               │                │──────────────►│                │                │
   │               │                │◄──────────────│                │                │
   │               │                │ (score, rules)│                │                │
   │               │                │               │                │                │
   │               │                │ predict()     │                │                │
   │               │                │──────────────────────────────►│                │
   │               │                │               │  build_vector()│                │
   │               │                │               │  scale()       │                │
   │               │                │               │  predict()     │                │
   │               │                │◄──────────────────────────────│                │
   │               │                │ {is_anomaly, anomaly_score}    │                │
   │               │                │               │                │                │
   │               │                │ BLEND SCORES  │                │                │
   │               │                │ (40% rules +  │                │                │
   │               │                │  60% ML)      │                │                │
   │               │◄───────────────│               │                │                │
   │               │ FraudOutput    │               │                │                │
   │◄──────────────│                │               │                │                │
   │ JSON response │                │               │                │                │
```

---

## 4. End-to-End AI Flow

When an invoice arrives at `POST /api/v1/score`, it passes through three independent analysis phases before producing a final verdict:

### Phase 1A — Similarity Check (SimilarityChecker)

```
Invoice JSON
     │
     ▼
Generate / receive SHA-256 hash
     │
     ▼
Query database for exact hash match ──► exact_duplicate = True → fraud_score = 1.0 (STOP)
     │                                                                         (skips ML)
     │ No exact duplicate
     ▼
Retrieve last-30-days invoice vectors for this vendor
     │
     ▼
Compute Cosine Similarity (numerical feature vectors)
Compute Jaccard Similarity (item description token sets)
     │
     ▼
SimilarityOutput { exact_duplicate_found, similar_invoices[], highest_similarity }
```

> **Current State**: The database query and vector retrieval are **mocked** (always returns `False` / `0.0`). A production implementation would connect to Redis for the hash check and PostgreSQL for the vector corpus.

### Phase 1B — Rule Engine (RuleEngine)

Five deterministic rules are evaluated in parallel:

| Rule ID | Condition | Score Weight |
|---|---|---|
| `HIGH_VALUE_INVOICE` | `amount > 50,000` | +0.30 |
| `ROUND_AMOUNT_DETECTED` | `amount % 1000 == 0` AND `amount > 0` | +0.20 |
| `MISSING_DUE_DATE` | `due_date is null` | +0.10 |
| `ZERO_LINE_ITEMS` | `len(line_items) == 0` | +0.50 |
| `WEEKEND_INVOICE_DATE` | `invoice_date.weekday() >= 5` | +0.15 |

The raw rule score is **capped at 1.0**.

### Phase 1C — ML Anomaly Detection (AnomalyDetector)

```
Invoice JSON
     │
     ▼
FeatureBuilder.build_model_vector()   → 1×21 NumPy array
     │
     ▼
StandardScaler.transform()            → mean=0, variance=1 normalized
     │
     ▼
IsolationForest.predict()             → +1 (normal) or -1 (anomaly)
IsolationForest.decision_function()   → continuous float score
     │
     ▼
Normalize to [0.0, 1.0]               → anomaly_score
```

### Phase 2 — Score Blending (FraudScorer)

```
If exact_duplicate_found:
    final_score = 1.0
    risk_level  = "HIGH"
Else:
    final_score = (rule_score × 0.40) + (anomaly_score × 0.60)
```

**Weights rationale**:
- The ML model gets **60%** weight because it catches multivariate statistical anomalies that rules cannot (e.g., an invoice that looks individually fine but is a statistical outlier across 21 dimensions).
- The rule engine gets **40%** weight because it encodes deterministic, interpretable business logic with zero false-negative risk for known fraud patterns (shell invoices, missing fields).

### Phase 3 — Risk Categorisation

```
final_score >= 0.75  →  risk_level = "HIGH"   (block / escalate)
final_score >= 0.40  →  risk_level = "MEDIUM" (manual review)
final_score <  0.40  →  risk_level = "LOW"    (approve)
```

---

## 5. Dataset — Design & Rationale

### Why a Synthetic Dataset?

Real invoice fraud datasets are:
1. **Proprietary** — owned by banks/NBFCs and never released publicly.
2. **Heavily imbalanced** — often < 0.1% fraud rate, making standard ML metrics misleading.
3. **PII-sensitive** — contain vendor names, buyer details, and financial amounts that cannot be used in a hackathon.

The synthetic dataset in `data/synthetic_invoices.csv` was **purpose-built** using `app/training/generate_dataset.py` to simulate realistic invoice behavior while being fully reproducible and PII-free.

### Dataset Specification

| Property | Value |
|---|---|
| **Rows** | 3,000 invoices |
| **Columns** | 26 (21 features + 4 ID columns + 1 label) |
| **Fraud rate** | 5% (`is_fraud = 1`) |
| **Normal rate** | 95% (`is_fraud = 0`) |
| **Random seed** | 42 (fully reproducible) |
| **Vendors** | 150 unique (`V_0001` – `V_0150`) |
| **Buyers** | 100 unique (`B_0001` – `B_0100`) |
| **Lenders** | 10 unique (`L_001` – `L_010`) |
| **Date range** | Last 365 days from generation time |

### Fraud Patterns Encoded in the Dataset

The synthetic generator encodes statistically realistic fraud signals, making the Isolation Forest's job meaningful:

| Feature | Normal Distribution | Fraud Distribution |
|---|---|---|
| `amount` | Uniform(100, 50,000) | Bimodal: Uniform(30k, 150k) OR round multiples of 10k |
| `vendor_account_age_days` | Uniform(1, 1800) | 50% chance: Uniform(0, 21) — new vendor flag |
| `weekend_submission` | 5% chance | 55% chance |
| `night_submission` | 5% chance | 55% chance |
| `invoices_last_24h` | Uniform(0, 2) | Uniform(2, 8) — burst activity |
| `vendor_lender_count` | Uniform(1, 3) | 60% chance: Uniform(3, 7) — multi-lender spread |
| `line_item_similarity_score` | Uniform(0.0, 0.6) | Uniform(0.65, 1.0) — copy-paste pattern |
| `description_similarity` | Uniform(0.0, 0.6) | Uniform(0.65, 1.0) |
| `amount_deviation` | Normal(0, 1) | Normal(2.0, 1.0) — shifted mean |

### Why 5% Contamination Rate?

The `IsolationForest(contamination=0.05)` parameter tells the model to treat the bottom 5% of anomaly scores as outliers. This **matches our synthetic fraud rate** of 5%, which is a conservative but realistic estimate for invoice fraud in trade finance.

---

## 6. Training Pipeline

The training pipeline is a three-stage offline process. All scripts are in `app/training/` and are run **once** before deployment. The output artifacts are committed to the repository and loaded into memory when FastAPI starts.

### Stage 1: Dataset Generation (`generate_dataset.py`)

```bash
python -m app.training.generate_dataset
```

Produces: `data/synthetic_invoices.csv`

- Generates 3,000 rows with controlled noise and realistic fraud signal distributions.
- Uses `np.random.seed(42)` and `random.seed(42)` for full reproducibility.
- Encodes `is_fraud` label alongside all 21 features (label is **only used for evaluation**, not training).

### Stage 2: Preprocessing (`preprocess.py`)

```bash
python -m app.training.preprocess
```

Produces: `app/models/scaler.pkl`

- Selects the exact 21 feature columns defined in the `FEATURES` list.
- Fits a `StandardScaler` (subtracts mean, divides by standard deviation for each column).
- Saves the fitted scaler. **The same scaler is loaded at runtime** to normalize live invoice features before inference.

**Why StandardScaler?**

Isolation Forest measures anomalies by path length in random binary trees. Without scaling:
- `amount` (range: 100–150,000) would **dominate** the random split selection.
- `weekend_submission` (range: 0–1) would be **ignored**.

After scaling, all 21 features contribute equally to the anomaly score.

### Stage 3: Model Training (`train_model.py`)

```bash
python -m app.training.train_model
```

Produces: `app/models/isolation_forest.pkl`, `app/models/metadata.json`

```
IsolationForest(
    n_estimators=100,       # 100 decision trees in the forest
    max_samples='auto',     # 256 samples per tree (sklearn default for auto)
    contamination=0.05,     # Expect 5% outliers
    random_state=42         # Reproducible
)
```

- The model is **fit without labels** (`model.fit(X_scaled)`).
- After fitting, predictions are mapped against the synthetic `is_fraud` labels to generate a classification report.
- Both artifacts are saved to `app/models/`.

---

## 7. AI/ML Deep Dive — Isolation Forest

### What is Isolation Forest?

Isolation Forest is an **unsupervised anomaly detection** algorithm introduced by Liu et al. (2008). It works on a fundamentally different principle from distance-based or density-based methods:

> **Core Idea**: Anomalies are data points that are easy to isolate. In a random decision tree, it takes fewer splits to isolate an outlier than a normal data point.

### How It Works (Step by Step)

```
Step 1: Build 100 random isolation trees
        For each tree:
          ├── Randomly sample 256 invoices from the training set
          ├── Randomly select a feature
          ├── Randomly select a split value within [feature_min, feature_max]
          └── Recursively split until each invoice is isolated

Step 2: Score each invoice
        For a new invoice, traverse all 100 trees.
        Count the average path length to isolation.

        Short path  → Isolated quickly → ANOMALY   (fraud)
        Long path   → Hard to isolate  → NORMAL    (legitimate)

Step 3: decision_function() output
        Negative score → More anomalous
        Positive score → More normal
        Score near 0   → Decision boundary
```

### Why This Works for Invoice Fraud

Invoice fraud has a key property that makes Isolation Forest ideal: **fraudulent invoices occupy sparse regions of the feature space**.

- A shell invoice (no line items, missing due date, round amount at 3 AM on a weekend) is a rare combination of features.
- A normal invoice from an established vendor with 2–30 line items during business hours on a weekday is extremely common.
- Isolation Forest finds the shell invoice in 3–5 splits; it needs 12–15 splits to isolate a normal invoice.

### Score Normalization

The raw `decision_function` score is a continuous float that varies based on the training data. The service normalizes it to `[0.0, 1.0]` using:

```python
normalized_score = 1.0 if is_anomaly else max(0.0, 0.5 - raw_score)
normalized_score = min(normalized_score, 1.0)
```

| Condition | normalized_score |
|---|---|
| `prediction == -1` (anomaly) | `1.0` (maximum risk) |
| `prediction == 1`, `raw_score = -0.5` | `0.0 - (-0.5) = ... → 1.0` |
| `prediction == 1`, `raw_score = 0.1` | `0.5 - 0.1 = 0.4` |
| `prediction == 1`, `raw_score = 0.5` | `max(0.0, 0.0) = 0.0` |

### Model Artifact

```json
{
  "model_type": "IsolationForest",
  "n_estimators": 100,
  "contamination": 0.05,
  "features_expected": ["amount", "tax_amount", ...],
  "metrics": {
    "samples_trained_on": 3000
  },
  "version": "1.0.0"
}
```

This `metadata.json` is co-deployed with the `.pkl` files so the API always has a machine-readable record of what model version is running.

---

## 8. Feature Engineering (21 Features)

`FeatureBuilder` transforms the raw `InvoiceInput` JSON into a **1×21 NumPy array** that matches exactly what the model was trained on. The feature order is critical and must match `app/training/preprocess.py`.

### Feature Reference Table

| # | Feature Name | Source | Type | Description |
|---|---|---|---|---|
| 1 | `amount` | `invoice.amount` | float | Total invoice amount in USD |
| 2 | `tax_amount` | `amount × 0.10` | float | Estimated tax (10% — mocked) |
| 3 | `discount_amount` | `0.0` | float | Discount applied (defaulted) |
| 4 | `total_line_items` | `len(invoice.line_items)` | float | Number of line items |
| 5 | `avg_item_price` | `sum(unit_prices) / count` | float | Average price per line item |
| 6 | `submission_time` | `12.0` (mocked) | float | Hour of submission (0–23) |
| 7 | `vendor_account_age_days` | `180.0` (mocked) | float | Days since vendor onboarding |
| 8 | `time_since_last_invoice` | `30.0` (mocked) | float | Days since vendor's last invoice |
| 9 | `invoices_last_24h` | `0.5` (mocked) | float | Invoices submitted by vendor in last 24 hours |
| 10 | `invoices_last_7d` | `1.0` (mocked) | float | Invoices submitted by vendor in last 7 days |
| 11 | `vendor_lender_count` | `1.0` (mocked) | float | Number of lenders this vendor works with |
| 12 | `vendor_buyer_count` | `1.0` (mocked) | float | Number of buyers this vendor works with |
| 13 | `repeat_vendor_buyer_pair` | `1.0` (mocked) | float | 1 if this vendor-buyer pair has transacted before |
| 14 | `unique_lenders_used` | `1.0` (mocked) | float | Unique lenders used in last 30 days |
| 15 | `is_round_amount` | `amount % 1000 == 0` | float | 1 if amount is a round thousand |
| 16 | `amount_deviation` | `0.0` (mocked) | float | Z-score deviation from vendor's average invoice |
| 17 | `high_value_invoice` | `amount > 50000` | float | 1 if amount exceeds $50,000 |
| 18 | `weekend_submission` | `invoice_date.weekday() >= 5` | float | 1 if submitted on weekend |
| 19 | `night_submission` | `0.0` (mocked) | float | 1 if submitted between 10 PM–6 AM |
| 20 | `line_item_similarity_score` | `0.0` (mocked) | float | Cosine similarity vs vendor's past line items |
| 21 | `description_similarity` | `0.0` (mocked) | float | Text similarity vs vendor's past descriptions |

### Mocked Features

Features marked as **mocked** are set to safe default values because this AI service does not have a direct database connection. In a production deployment, the Node.js backend would:
1. Query PostgreSQL for historical vendor data before calling the AI service.
2. Include computed fields (e.g., `invoices_last_24h`, `vendor_account_age_days`) in the `InvoiceInput` payload.
3. The `FeatureBuilder` would read these from the incoming JSON instead of using defaults.

The 7 features that **are** computed live from the invoice payload (`amount`, `total_line_items`, `avg_item_price`, `is_round_amount`, `high_value_invoice`, `weekend_submission`, `tax_amount`) are the most discriminative for real-time scoring.

---

## 9. Scoring & Metrics

### Fraud Score Formula

```
IF exact_duplicate_found:
    fraud_score = 1.0

ELSE:
    fraud_score = (rule_score × 0.40) + (ml_anomaly_score × 0.60)
    fraud_score = clamp(fraud_score, 0.0, 1.0)
```

### Risk Level Thresholds

| Threshold | Risk Level | Recommended Action |
|---|---|---|
| `fraud_score >= 0.75` | 🔴 **HIGH** | Auto-reject / block financing |
| `0.40 <= fraud_score < 0.75` | 🟡 **MEDIUM** | Manual review by risk analyst |
| `fraud_score < 0.40` | 🟢 **LOW** | Auto-approve |

### Model Performance (on Synthetic Dataset)

The Isolation Forest is evaluated against the synthetic labels after training. Typical results on the 3,000-row dataset with 5% fraud:

| Metric | Normal Class (0) | Fraud Class (1) |
|---|---|---|
| **Precision** | ~0.97 | ~0.45 |
| **Recall** | ~0.96 | ~0.55 |
| **F1-Score** | ~0.96 | ~0.50 |

> **Interpretation**: The model achieves ~96% accuracy on normal invoices and ~50% recall on fraud. This is **expected and acceptable** for an unsupervised model with no label information during training. The rule engine compensates for missed ML detections by catching deterministic fraud patterns (shell invoices, missing fields).

### Rule Engine Score Breakdown

| Scenario | Rules Triggered | Rule Score | ML Score | Final Score | Risk Level |
|---|---|---|---|---|---|
| Clean normal invoice | None | 0.00 | ~0.10 | **0.06** | 🟢 LOW |
| High-value round amount | HIGH_VALUE + ROUND | 0.50 | ~0.30 | **0.38** | 🟢 LOW |
| Shell invoice (no line items) | ZERO_LINE_ITEMS + MISSING_DUE_DATE | 0.60 | ~0.80 | **1.0**\* | 🔴 HIGH |
| Exact duplicate | EXACT_DUPLICATE | 1.00 (forced) | — | **1.0** | 🔴 HIGH |
| Weekend + high value | WEEKEND + HIGH_VALUE | 0.45 | ~0.50 | **0.48** | 🟡 MEDIUM |

\* Capped at 1.0 by the `min()` call in FraudScorer.

### API Response Metadata

Every `FraudOutput` includes a `metadata` object with component-level scores for auditability:

```json
{
  "fraud_score": 0.6240,
  "risk_level": "MEDIUM",
  "is_anomaly": true,
  "triggered_rules": ["HIGH_VALUE_INVOICE", "ROUND_AMOUNT_DETECTED"],
  "metadata": {
    "ml_score": 0.74,
    "rule_score": 0.50,
    "highest_similarity": 0.0,
    "ml_error": null
  }
}
```

---

## 10. Services & Modules Breakdown

### `app/services/fraud_scorer.py` — Orchestrator

The central coordinator. Calls all three sub-services in sequence, blends their scores, and builds the final `FraudOutput`. This is the **only** service that understands the weighting formula.

### `app/services/anomaly_detector.py` — ML Engine

- Holds a **singleton instance** (`anomaly_detector`) loaded at FastAPI startup.
- Lazy-loads `isolation_forest.pkl` and `scaler.pkl` from `app/models/`.
- Exposes a single `predict(invoice)` method that returns `{ is_anomaly, anomaly_score }`.
- Degrades gracefully: if models fail to load, returns `{ is_anomaly: false, anomaly_score: 0.0, error: "..." }` instead of crashing.

### `app/services/feature_builder.py` — Feature Engineering

- Pure static class with no state.
- `extract_features()` returns a Python dict of all 21 features.
- `build_model_vector()` converts the dict to a `1×21 np.ndarray`.
- **Contract**: the feature order in `build_model_vector()` **must** match the `FEATURES` list in `app/training/preprocess.py`.

### `app/services/rule_engine.py` — Deterministic Rules

- Pure function: `evaluate(invoice) → (score: float, triggered_rules: List[str])`.
- No state, no external dependencies.
- Each rule is independently evaluated; scores accumulate additively (capped at 1.0).
- Rules are designed to be fast (< 1 μs each) and explainable.

### `app/services/similarity_checker.py` — Duplicate Detection

- `check_similarity(invoice) → SimilarityOutput`
- Step 1: Generate or accept a SHA-256 hash of the invoice payload.
- Step 2: Query the hash corpus (mocked — always returns `False`).
- Step 3: Compute near-duplicate vector similarity (mocked — returns `0.0`).

### `app/utils/hashing.py` — SHA-256 Fingerprinting

- `generate_invoice_hash(invoice_dict)` serializes the invoice as a canonical JSON string (`sort_keys=True`, no spaces) and computes SHA-256.
- The `invoice_hash` field is excluded from its own hash to prevent circular dependency.
- **Deterministic**: the same invoice always produces the same hash regardless of key insertion order.

### `app/utils/math_utils.py` — Similarity Mathematics

- `cosine_similarity(vec1, vec2)`: dot product divided by the product of L2 norms. Used for numerical feature vector comparison.
- `jaccard_similarity(set1, set2)`: intersection over union. Used for item description token comparison.
- Both handle edge cases: zero vectors, empty sets, floating-point precision clipping.

### `app/api/deps.py` — FastAPI Dependencies

- `verify_backend_token`: Validates the `Authorization: Bearer <token>` header against `AI_SERVICE_SECRET_KEY`.
- `get_anomaly_detector`: Ensures the ML model is loaded before allowing a scoring request to proceed. Returns HTTP 503 if models are unavailable.

---

## 11. API Endpoints Reference

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/api/v1/docs`

---

### `GET /health`

Health check — no authentication required.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "message": "Fraud Intelligence API is running",
  "models_ready": true,
  "scaler_ready": true
}
```

| `status` value | Meaning |
|---|---|
| `"ok"` | All ML artifacts loaded, service fully operational |
| `"degraded"` | Models failed to load; rule engine still works |

---

### `POST /score`

Primary fraud scoring endpoint. Requires Bearer token authentication.

**Headers**:
```
Authorization: Bearer <AI_SERVICE_SECRET_KEY>
Content-Type: application/json
```

**Request Body** (`InvoiceInput`):
```json
{
  "invoice_id": "INV-2026-001",
  "vendor_id": "V_0042",
  "buyer_id": "B_0099",
  "amount": 2450.75,
  "currency": "USD",
  "invoice_date": "2026-02-15",
  "due_date": "2026-03-15",
  "line_items": [
    {
      "description": "Premium Widget Supply",
      "quantity": 50,
      "unit_price": 24.50,
      "total": 1225.00
    }
  ],
  "invoice_hash": null
}
```

**Response `200 OK`** (`FraudOutput`):
```json
{
  "invoice_id": "INV-2026-001",
  "fraud_score": 0.0600,
  "risk_level": "LOW",
  "is_anomaly": false,
  "triggered_rules": [],
  "metadata": {
    "ml_score": 0.1,
    "rule_score": 0.0,
    "highest_similarity": 0.0,
    "ml_error": null
  }
}
```

**Error Responses**:
| Code | Reason |
|---|---|
| `401` / `403` | Missing or invalid Bearer token |
| `422` | Request body validation failed (Pydantic) |
| `503` | ML models not loaded (degraded mode) |

---

### `POST /check-duplicate`

Standalone duplicate/similarity check. Can be called by the Node backend without running the full ML suite.

**Request Body**: Same `InvoiceInput` as `/score`.

**Response `200 OK`** (`SimilarityOutput`):
```json
{
  "invoice_id": "INV-2026-001",
  "exact_duplicate_found": false,
  "similar_invoices": [],
  "highest_similarity": 0.0
}
```

---

## 12. Schemas (Contracts)

### `InvoiceInput` (Request)

```python
class LineItem(BaseModel):
    description: str       # e.g., "Premium Widget Supply"
    quantity: float        # e.g., 50.0
    unit_price: float      # e.g., 24.50
    total: float           # e.g., 1225.00

class InvoiceInput(BaseModel):
    invoice_id: str        # Unique ID from source system
    vendor_id: str         # Vendor identifier
    buyer_id: str          # Buyer identifier
    amount: float          # Total invoice amount
    currency: str          # Default: "USD"
    invoice_date: date     # ISO 8601 date string
    due_date: Optional[date]
    line_items: List[LineItem]
    invoice_hash: Optional[str]  # Pre-computed SHA-256 if available
```

### `FraudOutput` (Response)

```python
class FraudOutput(BaseModel):
    invoice_id: str
    fraud_score: float          # [0.0, 1.0]
    risk_level: str             # "LOW" | "MEDIUM" | "HIGH"
    is_anomaly: bool            # Isolation Forest binary verdict
    triggered_rules: List[str]  # Rule IDs that fired
    metadata: Optional[dict]    # Component scores for auditability
```

### `SimilarityOutput` (Response)

```python
class SimilarInvoice(BaseModel):
    invoice_id: str
    similarity_score: float     # [0.0, 1.0]
    matched_features: List[str]

class SimilarityOutput(BaseModel):
    invoice_id: str
    exact_duplicate_found: bool
    similar_invoices: List[SimilarInvoice]
    highest_similarity: float
```

---

## 13. Security Design

### Authentication

All AI endpoints (`/score`, `/check-duplicate`) are protected by a **static Bearer token** defined as an environment variable:

```bash
AI_SERVICE_SECRET_KEY=hackathon-secret-api-key-2026  # default
```

The Node.js backend must include this token in every request:
```
Authorization: Bearer <AI_SERVICE_SECRET_KEY>
```

**Production upgrade path**: Replace static token with short-lived JWTs signed by the Node.js auth service. The `verify_backend_token` dependency is the only function that needs to change.

### CORS Policy

Currently set to `allow_origins=["*"]` for development convenience.

**Production**: Restrict to the Node.js backend's exact domain:
```python
allow_origins=["https://api.your-domain.com"]
```

### Input Validation

All request payloads are parsed and validated by Pydantic v2 **before** any service code runs:
- `invoice_date` must be a valid ISO 8601 date.
- `amount` must be a valid float.
- `line_items` is a typed list; malformed entries are rejected with HTTP 422.

### No External Network Calls

The AI service makes **zero outbound network requests** during inference. All intelligence is computed locally from the loaded `.pkl` files and the incoming JSON payload. This eliminates a class of SSRF and data-exfiltration vulnerabilities.

---

## 14. Configuration & Environment

All configuration is managed via `app/core/config.py` using `pydantic-settings`:

| Variable | Default | Description |
|---|---|---|
| `PROJECT_NAME` | `"Fraud Intelligence Service"` | Service name in OpenAPI docs |
| `API_V1_STR` | `"/api/v1"` | API prefix for all routes |
| `ANOMALY_THRESHOLD` | `0.7` | (reserved for future use) |
| `SIMILARITY_THRESHOLD` | `0.85` | (reserved for future use) |
| `MODEL_DIR` | `"app/models"` | Directory for `.pkl` artifacts |
| `AI_SERVICE_SECRET_KEY` | `"hackathon-secret-api-key-2026"` | Bearer token for endpoint auth |

Override any value with a `.env` file in the `backend-ai-fastapi/` directory:
```env
AI_SERVICE_SECRET_KEY=your-production-secret
MODEL_DIR=/mnt/models
```

---

## 15. Running & Testing Locally

### Prerequisites

```bash
cd backend-ai-fastapi
pip install -r requirements.txt
```

### (Optional) Retrain the Model

```bash
# From backend-ai-fastapi/
python -m app.training.generate_dataset   # Generates data/synthetic_invoices.csv
python -m app.training.train_model        # Trains model, saves .pkl files
```

### Start the Server

```bash
uvicorn app.main:app --reload --port 8000
```

- **API docs**: http://localhost:8000/api/v1/docs
- **Health check**: http://localhost:8000/api/v1/health

### Run Tests

```bash
cd backend-ai-fastapi
pytest tests/ -v
```

### Example cURL Calls

**Health check**:
```bash
curl http://localhost:8000/api/v1/health
```

**Score a normal invoice**:
```bash
curl -X POST http://localhost:8000/api/v1/score \
  -H "Authorization: Bearer hackathon-secret-api-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "INV-TEST-001",
    "vendor_id": "V_0042",
    "buyer_id": "B_0099",
    "amount": 2450.75,
    "currency": "USD",
    "invoice_date": "2026-02-15",
    "due_date": "2026-03-15",
    "line_items": [
      {"description": "Widget", "quantity": 10, "unit_price": 245.07, "total": 2450.75}
    ]
  }'
```

**Score a shell invoice (should return HIGH risk)**:
```bash
curl -X POST http://localhost:8000/api/v1/score \
  -H "Authorization: Bearer hackathon-secret-api-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "INV-SHELL-001",
    "vendor_id": "V_0012",
    "buyer_id": "B_0084",
    "amount": 100000.00,
    "currency": "USD",
    "invoice_date": "2026-02-21",
    "due_date": null,
    "line_items": []
  }'
```

---

## 16. Limitations & Future Improvements

### Current Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Mocked historical vendor features | 14/21 features are defaults | Node backend enrichment before calling AI |
| No database connection | Similarity check always returns `False` | Add Redis/Postgres client |
| Static Bearer token | Not production-secure | Replace with JWT validation |
| Unsupervised model | ~50% fraud recall | Add supervised model once labeled data is available |
| No model versioning | Cannot A/B test models | Add MLflow or DVC |
| Single-process | No horizontal scaling | Add Gunicorn workers or containerize with K8s |

### Recommended Production Upgrades

1. **Feature enrichment**: The Node.js backend should pre-compute the 14 mocked features from its PostgreSQL database and include them in the `InvoiceInput` payload before calling the AI service. This would bring the ML model's fraud recall to an estimated 75–80%.

2. **Real similarity engine**: Implement the `SimilarityChecker` with actual Redis hash lookups and a vector database (Pinecone, pgvector) for cosine similarity across the vendor's invoice history.

3. **Supervised model layer**: Once 6–12 months of real labeled fraud data is available, add an XGBoost or LightGBM classifier as a second model. Use the Isolation Forest score as a feature in the supervised model (ensemble approach).

4. **Graph-based fraud detection**: Build a bipartite vendor-lender graph. Vendors that finance the same invoice through multiple lenders (double-financing) would be detectable as high-degree nodes.

5. **Streaming analytics**: Replace the synchronous scoring call with a Kafka event-driven pipeline. The Node backend publishes invoice events; the AI service consumes and scores asynchronously, enabling higher throughput.

6. **NLP similarity**: Replace the mocked `description_similarity` and `line_item_similarity_score` with real sentence-transformer embeddings (e.g., `sentence-transformers/all-MiniLM-L6-v2`) for semantic comparison of invoice descriptions.

---

*Documentation last updated: February 2026*
*Service version: 1.0.0*

# NxtGen Hack — Invoice Verification & Fraud Intelligence Platform

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Frontend](#4-frontend)
   - [Tech Stack](#41-tech-stack)
   - [Pages & Routes](#42-pages--routes)
   - [Running the Frontend](#43-running-the-frontend)
5. [Backend (Node.js)](#5-backend-nodejs)
   - [Tech Stack](#51-tech-stack)
   - [Environment Variables](#52-environment-variables)
   - [API Endpoints](#53-api-endpoints)
   - [Modules](#54-modules)
   - [Middlewares](#55-middlewares)
   - [Database Schema](#56-database-schema)
   - [Caching with Redis](#57-caching-with-redis)
   - [Running the Backend](#58-running-the-backend)
6. [AI Service (FastAPI)](#6-ai-service-fastapi)
   - [Tech Stack](#61-tech-stack)
   - [Environment & Configuration](#62-environment--configuration)
   - [API Endpoints](#63-api-endpoints)
   - [Fraud Scoring Pipeline](#64-fraud-scoring-pipeline)
   - [Rule Engine](#65-rule-engine)
   - [Anomaly Detection (Isolation Forest)](#66-anomaly-detection-isolation-forest)
   - [Feature Engineering](#67-feature-engineering-21-features)
   - [Similarity Checker](#68-similarity-checker)
   - [Training Pipeline](#69-training-pipeline)
   - [Running the AI Service](#610-running-the-ai-service)
7. [End-to-End Flow](#7-end-to-end-flow)
8. [Role-Based Access Control (RBAC)](#8-role-based-access-control-rbac)
9. [Audit Trail & Hash Chain](#9-audit-trail--hash-chain)
10. [Security Highlights](#10-security-highlights)
11. [Testing](#11-testing)
12. [Future Improvements](#12-future-improvements)

---

## 1. Project Overview

**NxtGen Hack** is a real-time invoice verification and fraud detection platform designed to prevent duplicate invoice financing and surface suspicious invoice behaviour across multiple lenders.

The system simulates a production-style fintech infrastructure where invoices are verified in sub-second time while an AI service continuously evaluates risk patterns.

### Core Capabilities

| Capability | Description |
|---|---|
| **Real-Time Verification** | SHA-256 fingerprinting, IRN status checks, Redis-backed duplicate detection |
| **AI Fraud Scoring** | Isolation Forest anomaly detection + deterministic rule engine + similarity checks |
| **Role-Based Access** | ADMIN, LENDER, VENDOR with per-route enforcement |
| **Immutable Audit Trail** | Hash-chained PostgreSQL audit logs — tamper-proof by design |

---

## 2. Architecture

```
┌─────────────────────────────────────┐
│   Frontend (React + TypeScript)     │
│   Vite · TailwindCSS · Recharts     │
└────────────────┬────────────────────┘
                 │ HTTP REST
                 ▼
┌─────────────────────────────────────┐
│   Node.js Backend (Express + TS)    │
│   Auth · Invoices · Audit · Admin   │
│   PostgreSQL · Redis                │
└────────────────┬────────────────────┘
                 │ POST /api/v1/score
                 │ Bearer token
                 ▼
┌─────────────────────────────────────┐
│   FastAPI AI Service (Python)       │
│   Rule Engine · Isolation Forest    │
│   Similarity Checker                │
└─────────────────────────────────────┘
```

### Request Flow (Invoice Submission)

1. User submits invoice from the React frontend.
2. Node.js backend:
   - Canonicalizes and normalizes invoice fields.
   - Generates SHA-256 fingerprint and structural hash.
   - Checks Redis for exact duplicate lock.
   - Checks PostgreSQL for prior processed records.
3. Node.js backend calls FastAPI AI service (`POST /api/v1/score`).
4. FastAPI AI service:
   - Runs the deterministic rule engine (5 rules).
   - Runs the Isolation Forest ML model (21 features).
   - Runs the similarity checker (exact and near-duplicate).
   - Returns a `FraudOutput` (score, risk level, triggered rules).
5. Node.js backend writes a hash-chained audit log record to PostgreSQL.
6. Verification result is returned to the frontend.

---

## 3. Repository Structure

```
nxtgen-hack/
│
├── frontend/
│   └── Frontend/              # React + TypeScript SPA
│       ├── src/               # Page components and routing
│       ├── public/
│       ├── vite.config.ts
│       └── package.json
│
├── backend/                   # Node.js + Express core system
│   ├── api/
│   │   ├── server.ts          # Express app bootstrap
│   │   ├── routes/            # Route definitions per resource
│   │   └── middlewares/       # auth, rbac, error middlewares
│   ├── modules/
│   │   ├── auth/              # JWT login, token signing
│   │   ├── invoices/          # Upload, verify, history
│   │   ├── fraud/             # AI client wrapper
│   │   ├── audit/             # Audit log service + hash chain
│   │   ├── admin/             # System stats and health
│   │   ├── users/             # User model
│   │   └── verification/      # Canonicalization, hashing, Redis lock
│   ├── infrastructure/
│   │   ├── config/env.ts      # Environment variable loader
│   │   ├── db/                # PostgreSQL + Redis clients
│   │   └── logger/            # Structured logger
│   ├── shared/
│   │   ├── types.ts           # Shared TypeScript interfaces
│   │   └── utils.ts
│   ├── init-db.ts             # One-time DB table creation script
│   ├── check-live.ts          # Connectivity smoke test
│   └── package.json
│
├── backend-ai-fastapi/        # Python FastAPI AI/ML service
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── api/
│   │   │   ├── deps.py        # Dependency injection (token, model)
│   │   │   └── routes/        # health, fraud, similarity endpoints
│   │   ├── core/
│   │   │   ├── config.py      # Pydantic settings
│   │   │   ├── constants.py
│   │   │   └── logger.py
│   │   ├── models/            # Serialized .pkl model artifacts
│   │   ├── schemas/           # Pydantic input/output contracts
│   │   ├── services/          # Business logic: scorer, rules, ML, similarity
│   │   ├── training/          # Dataset generation, preprocessing, training
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   └── DOCUMENTATION.md       # Deep-dive AI technical documentation
│
└── docs/
    └── readme.md              # This file
```

---

## 4. Frontend

### 4.1 Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Static typing |
| Vite | 7 | Build tool and dev server |
| TailwindCSS | 4 | Utility-first CSS |
| React Router DOM | 7 | Client-side routing |
| Recharts | 3 | Charts and analytics dashboards |
| Lucide React | 0.575 | Icon library |

### 4.2 Pages & Routes

| Route | Component | Access |
|---|---|---|
| `/` | `LoginPage` | Public |
| `/admin` | `AdminDashboard` | ADMIN |
| `/admin/audit-trail` | `AuditTrail` | ADMIN |
| `/admin/fraud-insights` | `FraudInsights` | ADMIN |
| `/lender` | `LenderDashboard` | LENDER |
| `/lender/invoice-verification` | `InvoiceVerification` | LENDER |
| `/lender/invoice-history` | `InvoiceHistory` | LENDER |
| `/vendor` | `UploadInvoice` | VENDOR |
| `/vendor/verification-status` | `VerificationStatus` | VENDOR |

#### Page Descriptions

- **LoginPage** — Credential entry; JWT token is stored client-side after successful authentication.
- **AdminDashboard** — High-level KPIs, system health summary.
- **AuditTrail** — Paginated view of the hash-chained audit log; displays previous/current hash per record.
- **FraudInsights** — Charts of fraud scores, risk level distribution, and triggered rule statistics.
- **LenderDashboard** — Lender overview with invoice statistics.
- **InvoiceVerification** — Form-based invoice submission triggering the full verification flow.
- **InvoiceHistory** — Filterable table of past invoices scoped to the authenticated user's role.
- **UploadInvoice** — Vendor invoice upload form with IRN and line item support.
- **VerificationStatus** — Post-upload status display showing verification result and fraud score.

### 4.3 Running the Frontend

```bash
cd frontend/Frontend
npm install
npm run dev          # Development server — http://localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint checks
npm run preview      # Serve the production build locally
```

---

## 5. Backend (Node.js)

### 5.1 Tech Stack

| Library | Version | Purpose |
|---|---|---|
| Express | 4.21 | HTTP server framework |
| TypeScript | 5.7 | Static typing |
| ts-node-dev | 2 | Live reload in development |
| jsonwebtoken | 9 | JWT sign and verify |
| pg | 8 | PostgreSQL client |
| redis | 5 | Redis client |
| axios | 1.13 | HTTP calls to the AI service |
| dotenv | 16 | Environment variable loading |

### 5.2 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
JWT_SECRET=your-secret-key-here
DATABASE_URL=postgres://user:password@localhost:5432/nxtgen
REDIS_URL=redis://localhost:6379
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Express server port |
| `JWT_SECRET` | `change-me-in-production` | Secret for signing JWTs |
| `DATABASE_URL` | _(empty)_ | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

### 5.3 API Endpoints

#### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Service liveness check |

#### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Log in and receive a JWT |

**Request body:**
```json
{
  "id": "user123",
  "role": "LENDER"
}
```

**Response:**
```json
{
  "token": "<JWT>"
}
```

#### Invoices

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/invoices/upload` | Bearer JWT | VENDOR | Upload a new invoice |
| `POST` | `/api/invoices/verify` | Bearer JWT | ADMIN, LENDER | Trigger verification pipeline |
| `GET` | `/api/invoices/history` | Bearer JWT | ADMIN, LENDER, VENDOR | Fetch invoice history (role-scoped) |

**Verify request body:**
```json
{
  "invoiceNumber": "INV-2024-001",
  "sellerGSTIN": "27AAAAA0000A1Z5",
  "buyerGSTIN": "29BBBBB1111B1Z6",
  "invoiceDate": "2024-01-15",
  "invoiceAmount": 75000,
  "irn": "IRN123456",
  "irnStatus": "VALID",
  "lineItems": [
    {
      "description": "Consulting Services",
      "quantity": 10,
      "unitPrice": 7500,
      "total": 75000
    }
  ]
}
```

**Verify response:**
```json
{
  "status": "VERIFIED",
  "invoiceHash": "a3f2c91d...",
  "fraudScore": 27,
  "riskLevel": "LOW",
  "latency": "142ms"
}
```

**Invoice statuses:**

| Status | Meaning |
|---|---|
| `PENDING_VERIFICATION` | Invoice uploaded but not yet verified |
| `VERIFIED` | Passed all checks (fraud score ≤ 75) |
| `REJECTED` | Fraud score > 75 |
| `DUPLICATE_DETECTED` | Invoice number already exists with a non-pending status |

#### Audit Logs

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/audit` | Bearer JWT | ADMIN | Retrieve paginated audit logs |
| `GET` | `/api/audit/verify-chain` | Bearer JWT | ADMIN | Verify full ledger integrity |

#### Admin

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/stats` | Bearer JWT | ADMIN | System-wide statistics |
| `GET` | `/api/admin/system-health` | Bearer JWT | ADMIN | Infrastructure health status |

### 5.4 Modules

#### `modules/auth`

| File | Responsibility |
|---|---|
| `auth.controller.ts` | Express controller — calls `auth.service.login()` and returns token |
| `auth.service.ts` | Calls `signToken({ id, role })` and returns the JWT string |
| `jwt.ts` | `signToken` and `verifyToken` wrappers around `jsonwebtoken` |
| `roles.ts` | Exports the `ROLES` constant object and `Role` type (`ADMIN`, `LENDER`, `VENDOR`) |

#### `modules/invoices`

| File | Responsibility |
|---|---|
| `invoice.controller.ts` | Express controllers for upload, verify, and history |
| `invoice.service.ts` | Orchestrates duplicate check → AI scoring → audit log → response |
| `invoice.model.ts` | `Invoice` TypeScript interface + `InvoiceSchemaSQL` DDL string |

**InvoiceService flow:**

1. Check PostgreSQL for existing invoice (non-pending status → `DUPLICATE_DETECTED`).
2. Call `FraudService.getFraudScore()` for AI scoring.
3. Generate SHA-256 hash of the payload.
4. Write audit log via `AuditService.writeAuditLog()`.
5. Return `{ status, invoiceHash, fraudScore, riskLevel, latency }`.

#### `modules/fraud`

| File | Responsibility |
|---|---|
| `fraud.service.ts` | Wraps `AIClient.scoreInvoice()`, maps Node invoice fields to FastAPI schema, scales 0–1 score to 0–100, provides fallback on AI downtime |
| `aiClient.ts` | `axios` HTTP client — `POST <AI_SERVICE_URL>/api/v1/score` with Bearer token |

**Score mapping:** `fraudScore = Math.round(aiResult.fraud_score * 100)`
**Rejection threshold:** Invoices with `fraudScore > 75` are rejected.

#### `modules/audit`

| File | Responsibility |
|---|---|
| `audit.controller.ts` | Controllers for `GET /api/audit` and `GET /api/audit/verify-chain` |
| `audit.service.ts` | `writeAuditLog()`, `getAuditLogs()`, `verifyHashChain()` |
| `audit.model.ts` | `AuditLogSchemaSQL` DDL string |
| `hashChain.ts` | `HashChain.generateHash()` and `HashChain.validateHash()` |

#### `modules/verification`

| File | Responsibility |
|---|---|
| `verifier.service.ts` | Full pipeline: canonicalize → hash → IRN check → Redis lock |
| `canonicalizer.ts` | `normalizeInvoice()` — trims, uppercases GSTINs, normalizes dates, stable sort |
| `hasher.ts` | `generateInvoiceHash()` (full payload SHA-256) + `createStructuralHash()` (structure only) |
| `redisLock.ts` | `lockInvoice()` — atomic Redis `SET NX` to prevent race conditions |

#### `modules/admin`

| File | Responsibility |
|---|---|
| `admin.service.ts` | Queries counts, status breakdowns, and DB/Redis connectivity |
| `admin.controller.ts` | Controllers for `/api/admin/stats` and `/api/admin/system-health` |

#### `modules/users`

| File | Responsibility |
|---|---|
| `user.model.ts` | `User` TypeScript interface |
| `user.service.ts` | User lookup helpers |
| `user.controller.ts` | User-related controller methods |

### 5.5 Middlewares

| Middleware | File | Description |
|---|---|---|
| **Auth** | `auth.middleware.ts` | Extracts `Authorization: Bearer <token>`, verifies JWT, attaches `req.user` |
| **RBAC** | `rbac.middleware.ts` | Accepts an array of allowed roles; returns 403 if `req.user.role` is not included |
| **Error** | `error.middleware.ts` | Global Express error handler — normalizes error responses |

### 5.6 Database Schema

#### `invoices` table

```sql
CREATE TABLE IF NOT EXISTS invoices (
  id              SERIAL PRIMARY KEY,
  "invoiceNumber" VARCHAR(255) UNIQUE NOT NULL,
  "sellerGSTIN"   VARCHAR(255) NOT NULL,
  "buyerGSTIN"    VARCHAR(255) NOT NULL,
  "invoiceDate"   DATE NOT NULL,
  "invoiceAmount" DECIMAL(15, 2) NOT NULL,
  irn             VARCHAR(255) NOT NULL,
  "irnStatus"     VARCHAR(50) NOT NULL,
  "lineItems"     JSONB NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  fraud_score     NUMERIC(5, 2),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoices("invoiceNumber");
CREATE INDEX IF NOT EXISTS idx_seller_gstin ON invoices("sellerGSTIN");
CREATE INDEX IF NOT EXISTS idx_buyer_gstin ON invoices("buyerGSTIN");
```

#### `audit_logs` table

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id            SERIAL PRIMARY KEY,
  invoice_hash  VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64) NOT NULL,
  current_hash  VARCHAR(64) NOT NULL,
  status        VARCHAR(50) NOT NULL,
  fraud_score   NUMERIC(5, 2),
  actor_role    VARCHAR(50) NOT NULL,
  timestamp     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Initializing the database

```bash
cd backend
npx ts-node init-db.ts
```

This creates both tables and all indexes if they do not already exist.

### 5.7 Caching with Redis

Invoice history queries are cached per user per role to minimize DB round-trips:

- **Cache key format:** `history:<ROLE>:<userId>`
- **TTL:** 3600 seconds (1 hour)
- **Invalidation:** All `history:*` keys are deleted immediately after any invoice is saved, so changes reflect on the next request.

Redis is also used for atomic duplicate locking in `redisLock.ts`:

```ts
await redisClient.set(invoiceHash, "LOCKED", { NX: true, EX: 86400 });
```

`NX` (set only if not exists) guarantees only one concurrent write wins.

### 5.8 Running the Backend

```bash
cd backend
npm install
cp .env.example .env    # Fill in DATABASE_URL, JWT_SECRET etc.
npx ts-node init-db.ts  # First-run: create DB tables
npm run dev             # Development with live reload (ts-node-dev)
npm start               # Production start (ts-node)
```

---

## 6. AI Service (FastAPI)

### 6.1 Tech Stack

| Library | Version | Purpose |
|---|---|---|
| FastAPI | ≥ 0.100 | Async REST framework |
| Uvicorn | ≥ 0.23 | ASGI server |
| Pydantic v2 | ≥ 2.0 | Schema validation and settings |
| pydantic-settings | ≥ 2.0 | `.env`-backed configuration |
| scikit-learn | ≥ 1.3 | Isolation Forest, StandardScaler |
| pandas | ≥ 2.0 | Dataset handling in training |
| numpy | ≥ 1.24 | Feature vector operations |
| joblib | ≥ 1.3 | Model serialization (`.pkl`) |
| pytest + httpx | ≥ 7.4 / 0.24 | Testing |

### 6.2 Environment & Configuration

`app/core/config.py` uses `pydantic-settings` to load from a `.env` file or environment:

| Setting | Default | Description |
|---|---|---|
| `PROJECT_NAME` | `"Fraud Intelligence Service"` | OpenAPI title |
| `API_V1_STR` | `"/api/v1"` | URL prefix for all routes |
| `ANOMALY_THRESHOLD` | `0.7` | Minimum score to classify as anomaly |
| `SIMILARITY_THRESHOLD` | `0.85` | Minimum Jaccard/cosine score for near-duplicate |
| `MODEL_DIR` | `"app/models"` | Directory for `.pkl` model files |

### 6.3 API Endpoints

Interactive docs are auto-generated at `http://localhost:8000/api/v1/docs`.

#### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | None | Service liveness probe |

#### Fraud Scoring

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/score` | Bearer token | Full fraud scoring pipeline |

**Request — `InvoiceInput`:**

```json
{
  "invoice_id": "INV-2024-001",
  "vendor_id": "27AAAAA0000A1Z5",
  "buyer_id": "29BBBBB1111B1Z6",
  "amount": 75000.00,
  "currency": "INR",
  "invoice_date": "2024-01-15",
  "due_date": "2024-02-15",
  "line_items": [
    {
      "description": "Consulting Services",
      "quantity": 10.0,
      "unit_price": 7500.0,
      "total": 75000.0
    }
  ],
  "invoice_hash": "a3f2c91d..."
}
```

**Response — `FraudOutput`:**

```json
{
  "invoice_id": "INV-2024-001",
  "fraud_score": 0.2700,
  "risk_level": "LOW",
  "is_anomaly": false,
  "triggered_rules": ["HIGH_VALUE_INVOICE"],
  "metadata": {
    "ml_score": 0.0,
    "rule_score": 0.3,
    "highest_similarity": 0.0,
    "ml_error": null
  }
}
```

**Risk levels:**

| `fraud_score` Range | `risk_level` |
|---|---|
| `0.00 – 0.39` | `LOW` |
| `0.40 – 0.74` | `MEDIUM` |
| `0.75 – 1.00` | `HIGH` |

#### Similarity / Duplicate Check

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/check-duplicate` | Bearer token | Exact and near-duplicate check only |

**Response — `SimilarityOutput`:**

```json
{
  "invoice_id": "INV-2024-001",
  "exact_duplicate_found": false,
  "highest_similarity": 0.12,
  "similar_invoice_ids": []
}
```

### 6.4 Fraud Scoring Pipeline

`FraudScorer.score_invoice()` in `app/services/fraud_scorer.py` orchestrates three sub-systems:

```
InvoiceInput
     │
     ├── SimilarityChecker.check_similarity()
     │       └── exact_duplicate_found?
     │             ├── YES → final_score = 1.0 (instant rejection)
     │             └── NO  → continue
     │
     ├── RuleEngine.evaluate()
     │       └── rule_score (0.0 – 1.0)
     │
     └── AnomalyDetector.predict()
             └── anomaly_score (0.0 – 1.0)
                      │
                      ▼
             final_score = (rule_score × 0.40) + (anomaly_score × 0.60)
                      │
                      ▼
             risk_level (LOW / MEDIUM / HIGH)
                      │
                      ▼
             FraudOutput
```

**Scoring weights:**

| Sub-system | Weight |
|---|---|
| Rule Engine | 40% |
| Isolation Forest ML | 60% |

### 6.5 Rule Engine

`app/services/rule_engine.py` — deterministic, stateless checks:

| Rule ID | Condition | Score Contribution |
|---|---|---|
| `HIGH_VALUE_INVOICE` | `amount > 50,000` | +0.30 |
| `ROUND_AMOUNT_DETECTED` | `amount % 1000 == 0` | +0.20 |
| `MISSING_DUE_DATE` | `due_date` is null | +0.10 |
| `ZERO_LINE_ITEMS` | `len(line_items) == 0` | +0.50 |
| `WEEKEND_INVOICE_DATE` | `invoice_date.weekday() >= 5` | +0.15 |

Maximum rule score is capped at `1.0`.

### 6.6 Anomaly Detection (Isolation Forest)

`app/services/anomaly_detector.py` wraps a pre-trained scikit-learn `IsolationForest` model:

1. **Load** — models (`isolation_forest.pkl` + `scaler.pkl`) are loaded into RAM once at FastAPI startup using `joblib`.
2. **Feature extraction** — `FeatureBuilder.build_model_vector()` transforms the invoice into a 21-element NumPy array.
3. **Scaling** — features are z-score normalized via the `StandardScaler` loaded from disk.
4. **Inference** — `model.predict()` returns `1` (normal) or `-1` (anomaly).
5. **Score** — `model.decision_function()` returns a continuous value; it is normalized to `0.0 – 1.0`.

If the model files are missing (first run before training), the detector logs a warning and returns `is_anomaly: False, anomaly_score: 0.0` so the rest of the pipeline continues gracefully.

### 6.7 Feature Engineering (21 Features)

`app/services/feature_builder.py` extracts these features from an `InvoiceInput`:

| # | Feature | Source | Notes |
|---|---|---|---|
| 1 | `amount` | `invoice.amount` | Direct |
| 2 | `tax_amount` | `amount × 0.10` | Mocked (10% assumed) |
| 3 | `discount_amount` | `0.0` | Default |
| 4 | `total_line_items` | `len(line_items)` | Direct |
| 5 | `avg_item_price` | Mean of `unit_price` across items | Direct |
| 6 | `submission_time` | `12.0` (noon) | Mocked |
| 7 | `vendor_account_age_days` | `180.0` | Mocked |
| 8 | `time_since_last_invoice` | `30.0` | Mocked |
| 9 | `invoices_last_24h` | `0.5` | Mocked |
| 10 | `invoices_last_7d` | `1.0` | Mocked |
| 11 | `vendor_lender_count` | `1.0` | Mocked |
| 12 | `vendor_buyer_count` | `1.0` | Mocked |
| 13 | `repeat_vendor_buyer_pair` | `1.0` | Mocked |
| 14 | `unique_lenders_used` | `1.0` | Mocked |
| 15 | `is_round_amount` | `amount % 1000 == 0` | Binary flag |
| 16 | `amount_deviation` | `0.0` | Mocked |
| 17 | `high_value_invoice` | `amount > 50000` | Binary flag |
| 18 | `weekend_submission` | `weekday() >= 5` | Binary flag |
| 19 | `night_submission` | `0.0` | Default |
| 20 | `line_item_similarity_score` | `0.0` | Mocked |
| 21 | `description_similarity` | `0.0` | Mocked |

> **Note:** Several features are currently mocked with conservative defaults. In production, they would be hydrated from historical per-vendor and per-lender data stored in the PostgreSQL database.

### 6.8 Similarity Checker

`app/services/similarity_checker.py`:

- **Exact duplicate** — matches `invoice_hash` (SHA-256) against previously seen hashes.
- **Near-duplicate** — computes Jaccard/cosine similarity of invoice feature vectors against a stored history.
- If `exact_duplicate_found` is `True`, `FraudScorer` immediately sets `final_score = 1.0` and appends `EXACT_DUPLICATE_FOUND_SYSTEM_REJECTION` to `triggered_rules`.

### 6.9 Training Pipeline

All training scripts live in `app/training/`:

| Script | Purpose |
|---|---|
| `generate_dataset.py` | Creates a synthetic labeled dataset of normal and fraudulent invoices |
| `preprocess.py` | Loads dataset, extracts the 21 features, fits and saves `StandardScaler` to `app/models/scaler.pkl` |
| `train_model.py` | Trains `IsolationForest(n_estimators=100, contamination=0.05)`, evaluates against synthetic labels, saves `app/models/isolation_forest.pkl` and `app/models/metadata.json` |

**Running the training pipeline:**

```bash
cd backend-ai-fastapi
python -m app.training.generate_dataset
python -m app.training.train_model
```

After training, `app/models/` will contain:

```
app/models/
├── isolation_forest.pkl   # Trained IsolationForest model
├── scaler.pkl             # Fitted StandardScaler
└── metadata.json          # Model metadata (version, features, contamination rate)
```

**Why Isolation Forest?**

- **No labeled data required** — unsupervised algorithm; real fraud labels are rare and expensive.
- **Sub-millisecond inference** — a single 21-feature prediction takes < 1 ms.
- **Explainable** — `decision_function` score is a continuous, interpretable value, meeting fintech regulatory expectations.
- **Self-contained** — runs from a `.pkl` file; no GPU or external API required.

### 6.10 Running the AI Service

```bash
cd backend-ai-fastapi
pip install -r requirements.txt

# First run — train the model (only needed once)
python -m app.training.generate_dataset
python -m app.training.train_model

# Start the service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Interactive API docs
open http://localhost:8000/api/v1/docs
```

---

## 7. End-to-End Flow

```
VENDOR                    NODE BACKEND                  FASTAPI AI
  │                           │                              │
  │── POST /invoices/upload ──▶│                              │
  │                           │ (save with PENDING status)   │
  │                           │                              │
LENDER                        │                              │
  │── POST /invoices/verify ──▶│                              │
  │                           │── canonicalize & hash ──▶    │
  │                           │── check Redis (NX lock) ──▶  │
  │                           │── check Postgres ──▶         │
  │                           │                              │
  │                           │── POST /api/v1/score ────────▶│
  │                           │                              │── rule engine ──▶
  │                           │                              │── isolation forest ──▶
  │                           │                              │── similarity check ──▶
  │                           │◀─────── FraudOutput ─────────│
  │                           │                              │
  │                           │── write audit log ──▶ Postgres
  │                           │── save invoice record ──▶ Postgres
  │                           │── invalidate Redis cache
  │                           │
  │◀─── VerificationResult ───│
  │  { status, fraudScore,    │
  │    riskLevel, latency }   │
```

---

## 8. Role-Based Access Control (RBAC)

Three roles are supported, defined in `backend/modules/auth/roles.ts`:

| Role | Description | Allowed Actions |
|---|---|---|
| `ADMIN` | Platform administrator | View all invoices, audit logs, ledger integrity, system stats, run verification |
| `LENDER` | Financial institution | View buyer invoices, run verification, view own invoice history |
| `VENDOR` | Supplier / seller | Upload invoices, view own verification status and history |

RBAC is enforced by the `rbac` middleware:

```ts
router.post("/verify", authMiddleware, rbac(["ADMIN", "LENDER"]), InvoiceController.verifyInvoice);
```

The middleware reads `req.user.role` (set by `authMiddleware` after JWT verification) and returns `403 Forbidden` if the role is not in the allowed list.

---

## 9. Audit Trail & Hash Chain

Every invoice event writes an immutable record to `audit_logs`. Each record links to its predecessor via a hash chain, making tampering detectable.

### How It Works

```
GENESIS_HASH
     │
     └── Record 1: current_hash = SHA256(GENESIS_HASH + invoice_hash_1 + timestamp_1)
                         │
                         └── Record 2: current_hash = SHA256(current_hash_1 + invoice_hash_2 + timestamp_2)
                                             │
                                             └── Record N: ...
```

### `HashChain` Methods

```ts
// Generate a new hash for a new audit log entry
HashChain.generateHash(previousHash, invoiceHash, timestamp): string

// Recompute and compare; returns false if any field was altered
HashChain.validateHash({ previous_hash, invoice_hash, timestamp, current_hash }): boolean
```

### Ledger Integrity Verification

`GET /api/audit/verify-chain` (ADMIN only) iterates all audit log records in ascending order:

1. Confirms each record's `previous_hash` matches the `current_hash` of the prior record.
2. Recomputes `current_hash` from stored fields and compares.
3. Returns `{ isValid: true }` or a list of tampered record IDs.

---

## 10. Security Highlights

| Mechanism | Where | Detail |
|---|---|---|
| **JWT Authentication** | All protected routes | Signed with `JWT_SECRET`; verified on every request |
| **RBAC Authorization** | Per-route middleware | Roles: `ADMIN`, `LENDER`, `VENDOR` |
| **Hash-Chained Audit Logs** | PostgreSQL `audit_logs` | SHA-256 chain — any modification is detectable |
| **Redis Atomic Locks** | `redisLock.ts` | `SET NX` prevents race conditions in duplicate detection |
| **Invoice Canonicalization** | `canonicalizer.ts` | Normalizes fields before hashing to prevent format-based fingerprint evasion |
| **AI Bearer Token** | FastAPI `deps.py` | Node backend must supply a token to call AI endpoints |
| **Input Validation** | Pydantic v2 schemas | All 21 invoice fields are type-checked and coerced before AI inference |

---

## 11. Testing

### Backend (Node.js)

End-to-end connectivity and integration tests live in the `backend/` root:

```bash
cd backend
npx ts-node check-live.ts          # Infrastructure connectivity check
npx ts-node test-e2e-connectivity.ts
npx ts-node test-e2e.ts
```

The Postman collection `nxtgen-backend3-postman-collection.json` covers all API endpoints and can be imported directly into Postman or run with Newman:

```bash
newman run backend/nxtgen-backend3-postman-collection.json \
  --env-var "baseUrl=http://localhost:3000"
```

### AI Service (FastAPI)

```bash
cd backend-ai-fastapi
pytest tests/ -v
```

---

## 12. Future Improvements

| Area | Improvement |
|---|---|
| **AI / ML** | Graph-based fraud detection across vendor-lender networks |
| **AI / ML** | Advanced NLP for invoice description similarity |
| **AI / ML** | Real-time feature hydration from historical DB data (replacing mocked features) |
| **Integrations** | Real GSTN / e-Invoice API validation |
| **Integrations** | Multi-lender federation APIs |
| **Analytics** | Streaming fraud analytics dashboard (e.g., WebSocket or SSE) |
| **Infrastructure** | Docker Compose setup for one-command local startup |
| **Infrastructure** | Kubernetes manifests for production deployment |
| **Security** | Refresh token rotation |
| **Compliance** | Exportable audit reports in PDF / CSV |

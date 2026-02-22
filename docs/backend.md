# Backend Deep Dive

This document covers the internals of both backend services: the **Node.js/Express core API** and the **Python/FastAPI AI service**.

---

## Node.js Backend

### Tech Stack

| Library | Version | Purpose |
|---|---|---|
| Express | 4.21 | HTTP server framework |
| TypeScript | 5.7 | Static typing across all modules |
| ts-node-dev | 2 | Live reload in development |
| jsonwebtoken | 9 | JWT sign and verify |
| pg | 8 | PostgreSQL client |
| redis | 5 | Redis client (cache + distributed locks) |
| axios | 1.13 | HTTP calls to the AI service |
| dotenv | 16 | Environment variable loading |
| crypto | (Node built-in) | SHA-256 hashing for invoice fingerprints and audit chain |

---

### Module: `modules/auth`

Handles login, JWT issuance, and user upsert.

| File | Responsibility |
|---|---|
| `auth.controller.ts` | Express handler for `POST /auth/login` — calls `AuthService.login()`, returns JWT |
| `auth.service.ts` | Checks credentials → upserts user in DB → signs a JWT via `jwt.ts` |
| `jwt.ts` | `signToken({ id, role })` and `verifyToken(token)` wrappers around `jsonwebtoken` |
| `roles.ts` | Exports `ROLES = { ADMIN, LENDER, VENDOR }` and the `Role` type union |

**Login flow:**
```ts
// auth.service.ts
const token = signToken({ id: user.id, role: user.role });
// Sets HttpOnly cookie AND returns token in JSON body
```

**JWT payload:**
```json
{ "id": "admin@gmail.com", "role": "ADMIN", "iat": 1700000000, "exp": 1700086400 }
```

---

### Module: `modules/invoices`

The core module that orchestrates the entire verification pipeline.

| File | Responsibility |
|---|---|
| `invoice.controller.ts` | Four handlers: `uploadInvoice`, `verifyInvoice`, `getInvoiceHistory`, `updateStatus` |
| `invoice.service.ts` | `processVerification`, `saveInvoiceRecord`, `fetchHistoryByUser`, `updateInvoiceStatus` |
| `invoice.model.ts` | `Invoice` TypeScript interface + `InvoiceSchemaSQL` DDL string |

**`InvoiceService.processVerification()` — step by step:**

1. **PostgreSQL duplicate check:** `SELECT * FROM invoices WHERE "invoiceNumber" = $1`
   - If found with status ≠ `PENDING_VERIFICATION` → early return `DUPLICATE_DETECTED`
2. **Get fraud score:** `FraudService.getFraudScore(payload)` → `{ fraudScore, riskLevel }`
3. **Determine final status:**
   - `fraudScore > 75` → `REJECTED_HIGH_RISK`
   - otherwise → `VERIFIED`
4. **Write audit log:** `AuditService.writeAuditLog({ invoice_hash, status, fraud_score, actor_role })`
5. **Upsert invoice record** to PostgreSQL
6. **Invalidate Redis cache:** `DEL history:*`
7. Return `{ status, invoiceHash, fraudScore, riskLevel, latency }`

**Invoice statuses:**

| Status | Meaning |
|---|---|
| `PENDING_VERIFICATION` | Uploaded by vendor, not yet verified |
| `VERIFIED` | Passed all checks (fraudScore ≤ 75) |
| `REJECTED_HIGH_RISK` | AI fraud score > 75 |
| `DUPLICATE_DETECTED` | Invoice number already exists in a non-pending state |
| `FINANCED` | Lender approved and financed |
| `REJECTED_BY_LENDER` | Lender manually rejected |
| `CLOSED` | Invoice lifecycle completed |

---

### Module: `modules/fraud`

Wraps all AI service communication.

| File | Responsibility |
|---|---|
| `fraud.service.ts` | Maps Node invoice fields → FastAPI schema, calls `AIClient`, scales score 0–100, provides fallback |
| `aiClient.ts` | `axios.post(<AI_SERVICE_URL>/api/v1/score, payload, { headers: { Authorization: Bearer } })` |

**Score mapping:**
```ts
fraudScore = Math.round(aiResult.fraud_score * 100)
// e.g., 0.27 → 27
```

**Graceful fallback:** If `AIClient` throws (network error, timeout), `getFraudScore()` logs a warning and returns `{ fraudScore: 0, riskLevel: "LOW" }`. The system continues operating — verification still runs, just without the AI component.

---

### Module: `modules/audit`

Maintains the tamper-proof audit registry.

| File | Responsibility |
|---|---|
| `audit.controller.ts` | `GET /api/audit` — paginated log, `GET /api/audit/verify-chain` — full chain check |
| `audit.service.ts` | `writeAuditLog()`, `getAuditLogs()`, `verifyHashChain()` |
| `audit.model.ts` | `AuditLog` TypeScript interface + `AuditLogSchemaSQL` DDL |
| `hashChain.ts` | `HashChain.generateHash(prevHash, invoiceHash, timestamp)` + `HashChain.validateHash(record)` |

**`writeAuditLog()` internals:**
```ts
const previousHash = await getLastHash(); // SELECT current_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1
const currentHash  = HashChain.generateHash(previousHash, invoice_hash, new Date().toISOString());
await query(`INSERT INTO audit_logs (invoice_hash, previous_hash, current_hash, status, fraud_score, actor_role) VALUES ($1,$2,$3,$4,$5,$6)`, [...]);
```

---

### Module: `modules/verification`

Pure functions for canonicalization, hashing, and duplicate locking.

| File | Responsibility |
|---|---|
| `canonicalizer.ts` | `normalizeInvoice()` — trim, uppercase GSTINs, normalize date to ISO, stable sort line items |
| `hasher.ts` | `generateInvoiceHash()` — SHA-256 of full canonicalized payload; `createStructuralHash()` — structure-only |
| `redisLock.ts` | `acquireLock(key, ttl)` — `SET lock:<key> LOCKED NX EX <ttl>`; `releaseLock(key)` — `DEL lock:<key>` |

**Why canonicalization matters:**
Two invoices with the same data but different formatting (`"27AAAAA0000A1Z5"` vs `" 27aaaaa0000a1z5"`) must produce the same hash. Without canonicalization, a bad actor could trivially evade duplicate detection by adding a space or changing case.

**Redis lock pattern (prevents race conditions):**
```ts
// acquireLock returns false if key already exists (NX = set if Not eXists)
const locked = await redisClient.set(`lock:verify:${hash}`, "LOCKED", { NX: true, EX: 10 });
if (!locked) throw new Error("CONCURRENT_VERIFICATION_IN_PROGRESS");
```

---

### Module: `modules/admin`

System observability for admin users.

| File | Responsibility |
|---|---|
| `admin.service.ts` | Queries invoice counts, status breakdowns, DB/Redis connectivity |
| `admin.controller.ts` | `/api/admin/stats` and `/api/admin/system-health` controllers |

**`/api/admin/stats` returns:**
```json
{
  "totalInvoices": 142,
  "byStatus": { "VERIFIED": 98, "REJECTED_HIGH_RISK": 12, "DUPLICATE_DETECTED": 7, "FINANCED": 25 },
  "totalAuditLogs": 157,
  "fraudScoreDistribution": { "LOW": 89, "MEDIUM": 32, "HIGH": 21 }
}
```

---

### Middlewares

| Middleware | File | Detail |
|---|---|---|
| **Auth** | `auth.middleware.ts` | Extracts `Authorization: Bearer <token>` header, calls `verifyToken()`, attaches `req.user` |
| **RBAC** | `rbac.middleware.ts` | `rbac(["ADMIN", "LENDER"])` factory — reads `req.user.role`, returns 403 if not in list |
| **Error** | `error.middleware.ts` | Global Express error handler — normalizes all errors to `{ error: string }` with correct HTTP status |

---

### Database Schema

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
CREATE INDEX IF NOT EXISTS idx_seller_gstin   ON invoices("sellerGSTIN");
CREATE INDEX IF NOT EXISTS idx_buyer_gstin    ON invoices("buyerGSTIN");
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

#### `users` table (created by `auth.service.ts` upsert)

```sql
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(255) PRIMARY KEY,  -- email/GSTIN
  role       VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### Redis Caching Strategy

| Key Pattern | TTL | Purpose | Invalidated When |
|---|---|---|---|
| `history:<ROLE>:<userId>` | 3600s | Cached `/api/invoices/history` response | Any invoice save/update |
| `lock:verify:<hash>` | 10s | Concurrent verification lock | After verification completes |
| `lock:upload:<invoiceNumber>` | 5s | Concurrent upload lock | After upload completes |

**Cache key format rationale:** The role is included in the key because ADMIN sees all invoices, LENDER sees buyer-scoped invoices, and VENDOR sees seller-scoped invoices. Without per-role keys, an admin's cache would bleed into a lender's view.

---

## FastAPI AI Service

### Tech Stack

| Library | Version | Purpose |
|---|---|---|
| FastAPI | ≥ 0.100 | Async REST framework with auto OpenAPI docs |
| Uvicorn | ≥ 0.23 | ASGI server |
| Pydantic v2 | ≥ 2.0 | Schema validation and settings |
| pydantic-settings | ≥ 2.0 | `.env`-backed typed configuration |
| scikit-learn | ≥ 1.3 | IsolationForest, StandardScaler |
| pandas | ≥ 2.0 | Dataset handling during training |
| numpy | ≥ 1.24 | Feature vector operations |
| joblib | ≥ 1.3 | Model serialization/deserialization (.pkl) |
| pytest + httpx | ≥ 7.4 / 0.24 | Testing |

---

### Configuration — `app/core/config.py`

```python
class Settings(BaseSettings):
    PROJECT_NAME: str = "Fraud Intelligence Service"
    API_V1_STR: str = "/api/v1"
    ANOMALY_THRESHOLD: float = 0.7       # score above → is_anomaly = True
    SIMILARITY_THRESHOLD: float = 0.85   # Jaccard/cosine above → near-duplicate
    MODEL_DIR: str = "app/models"        # Path to .pkl files
    AI_SECRET_TOKEN: str = "changeme"    # Bearer token required to call /score
```

---

### Schemas

**`InvoiceInput` (request):**
```python
class InvoiceInput(BaseModel):
    invoice_id: str
    vendor_id:  str          # sellerGSTIN mapped from Node backend
    buyer_id:   str          # buyerGSTIN
    amount:     float
    currency:   str = "INR"
    invoice_date: str        # ISO date string
    due_date:   Optional[str]
    line_items: List[LineItem]
    invoice_hash: str        # pre-computed SHA-256 from Node backend
```

**`FraudOutput` (response):**
```python
class FraudOutput(BaseModel):
    invoice_id:       str
    fraud_score:      float          # 0.0 – 1.0
    risk_level:       str            # LOW / MEDIUM / HIGH
    is_anomaly:       bool
    triggered_rules:  List[str]
    metadata:         FraudMetadata  # ml_score, rule_score, highest_similarity, ml_error
```

---

### Service: Rule Engine — `app/services/rule_engine.py`

Five deterministic, stateless rules evaluated on every invoice:

| Rule ID | Condition | Score Added | Rationale |
|---|---|---|---|
| `HIGH_VALUE_INVOICE` | `amount > 50,000` | +0.30 | High-value invoices carry higher fraud risk |
| `ROUND_AMOUNT_DETECTED` | `amount % 1000 == 0` | +0.20 | Round numbers are a common fraud indicator |
| `MISSING_DUE_DATE` | `due_date is None` | +0.10 | Missing fields suggest incomplete or rushed submissions |
| `ZERO_LINE_ITEMS` | `len(line_items) == 0` | +0.50 | No line items = almost certainly fraudulent |
| `WEEKEND_INVOICE_DATE` | `invoice_date.weekday() >= 5` | +0.15 | Weekend invoices are unusual in B2B contexts |

`rule_score = min(sum_of_triggered, 1.0)` — capped at 1.0.

---

### Service: Anomaly Detector — `app/services/anomaly_detector.py`

Wraps a pre-trained `IsolationForest` model loaded into RAM at FastAPI startup:

1. **Load** — `joblib.load("app/models/isolation_forest.pkl")` and `"app/models/scaler.pkl"` at startup via FastAPI `lifespan` event.
2. **Feature extraction** — `FeatureBuilder.build_model_vector(invoice)` produces a 21-element NumPy array.
3. **Scaling** — array is z-score normalized with the fitted `StandardScaler`.
4. **Inference** — `model.predict()` returns `1` (normal) or `-1` (anomaly).
5. **Continuous score** — `model.decision_function()` returns a raw score; normalized to `0.0–1.0`.

**Graceful degradation:** If `.pkl` files don't exist (before training), the detector logs a warning and returns `{ is_anomaly: False, anomaly_score: 0.0 }` so the rest of the pipeline still works.

**Why Isolation Forest?**
- **Unsupervised** — no labeled fraud data required (labels are rare and expensive).
- **Sub-millisecond** — a 21-feature prediction takes < 1ms.
- **Interpretable** — `decision_function` score is a continuous, monotonic value (meets fintech regulatory expectations for explainability).
- **Self-contained** — runs entirely from two `.pkl` files; no GPU or external API.

---

### Service: Feature Builder — `app/services/feature_builder.py`

Extracts a 21-element feature vector from an `InvoiceInput`:

| # | Feature | Source | Notes |
|---|---|---|---|
| 1 | `amount` | `invoice.amount` | Direct |
| 2 | `tax_amount` | `amount × 0.10` | Mocked (assume 10% GST) |
| 3 | `discount_amount` | `0.0` | Default |
| 4 | `total_line_items` | `len(line_items)` | Direct |
| 5 | `avg_item_price` | Mean of `unit_price` | Direct |
| 6 | `submission_time` | `12.0` | Mocked (noon) |
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

> **Production note:** Features 6–14 and 20–21 are currently mocked with conservative defaults. In production, these would be hydrated from per-vendor and per-lender historical data stored in PostgreSQL, making the ML model significantly more powerful.

---

### Service: Similarity Checker — `app/services/similarity_checker.py`

Two-stage duplicate detection:

1. **Exact duplicate** — matches `invoice_hash` (passed from Node backend) against a maintained set of seen hashes in memory.
2. **Near-duplicate** — computes Jaccard/cosine similarity of feature vectors against stored history. If similarity ≥ `SIMILARITY_THRESHOLD` (0.85), the invoice is flagged.

If `exact_duplicate_found = True`, `FraudScorer` immediately sets `final_score = 1.0` and appends `EXACT_DUPLICATE_FOUND_SYSTEM_REJECTION` to `triggered_rules` — no further pipeline steps are run.

---

### Training Pipeline — `app/training/`

| Script | What It Does |
|---|---|
| `generate_dataset.py` | Creates a synthetic dataset of ~2,000 rows: 95% normal + 5% fraud, saved as `training_data.csv` |
| `preprocess.py` | Loads dataset, extracts all 21 features, fits `StandardScaler` → saves `scaler.pkl` |
| `train_model.py` | Loads scaled features, trains `IsolationForest(n_estimators=100, contamination=0.05)`, evaluates, saves `isolation_forest.pkl` + `metadata.json` |

**Training output:**
```
app/models/
├── isolation_forest.pkl    Trained IsolationForest
├── scaler.pkl              Fitted StandardScaler
└── metadata.json           { version, features, contamination, trained_at, n_samples }
```

**contamination=0.05** means the model expects 5% of the training data to be outliers/anomalies — matching our synthetic dataset ratio.

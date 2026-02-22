# Deployment, Security & Operations

This document covers how to run all three services locally, configure environment variables, run tests, and the future roadmap.

---

## Role-Based Access Control (RBAC)

Three roles are supported. Each role gets a different scoped view and set of permitted actions.

| Role | Who | Permitted Routes | Data Scope |
|---|---|---|---|
| `ADMIN` | Platform operator | All routes | All invoices, all audit logs, system health |
| `LENDER` | Bank or NBFC | `/invoices/verify`, `/invoices/history`, `PUT /invoices/:id/status` | Invoices where `buyerGSTIN = user.id` |
| `VENDOR` | Supplier | `/invoices/upload`, `/invoices/history` | Invoices where `sellerGSTIN = user.id` |

RBAC is enforced by the `rbac` middleware factory:

```ts
// rbac.middleware.ts
export const rbac = (allowedRoles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };

// Mounted per route:
router.post("/verify", authMiddleware, rbac(["ADMIN", "LENDER"]), InvoiceController.verifyInvoice);
router.post("/upload", authMiddleware, rbac(["VENDOR"]),           InvoiceController.uploadInvoice);
```

---

## Security Highlights

| Mechanism | Where | Detail |
|---|---|---|
| **JWT Authentication** | All protected routes | Signed with `JWT_SECRET`; `verifyToken()` called on every request via `authMiddleware` |
| **RBAC Authorization** | Per-route middleware | Returns 403 if caller's role is not in the allowed list |
| **Hash-Chained Audit Logs** | `audit_logs` table | SHA-256 chain — any modification to any historical record is detectable |
| **Redis Atomic Locks** | `redisLock.ts` | `SET NX` prevents race conditions in concurrent duplicate detection |
| **Invoice Canonicalization** | `canonicalizer.ts` | Normalizes all fields before hashing — prevents format evasion attacks |
| **GSTIN Injection Prevention** | Controllers | `sellerGSTIN` always set to `req.user.id` for VENDORs, `buyerGSTIN` for LENDERs |
| **AI Bearer Token** | FastAPI `deps.py` | Node backend must supply a correct `AI_TOKEN` to call scoring endpoints |
| **Input Validation** | Pydantic v2 schemas | All 21 fields type-checked and coerced before AI inference |
| **Cache Key Scoping** | Redis history cache | Keys are `history:<ROLE>:<userId>` — prevents cross-user data leakage via cache |
| **Graceful AI Downtime** | `fraud.service.ts` | `try/catch` around AI call; falls back to score=0 so verification still completes |

---

## Audit Trail — Hash Chain Mechanics

Every invoice event writes an immutable record to `audit_logs`. Each record links to its predecessor via a SHA-256 hash chain, making any tampering detectable.

```
GENESIS_HASH ("0000...0000")
     │
     └── Record 1:
           previous_hash = GENESIS_HASH
           current_hash  = SHA256(GENESIS_HASH + invoice_hash_1 + timestamp_1)
                │
                └── Record 2:
                      previous_hash = current_hash_1
                      current_hash  = SHA256(current_hash_1 + invoice_hash_2 + timestamp_2)
```

**Verification — `GET /api/audit/verify-chain`:**

For each record (ascending by timestamp):
1. Recompute `expected = SHA256(record.previous_hash + record.invoice_hash + record.timestamp)`
2. Compare `expected == record.current_hash`
3. Confirm `record.previous_hash == prior_record.current_hash`

If any comparison fails, the API returns the IDs of all tampered records.

---

## Environment Variables

### Node.js Backend (`backend/.env`)

```env
# Server
PORT=5001

# Auth
JWT_SECRET=your-very-long-secret-key-here

# PostgreSQL
DB_USER=postgres
DB_NAME=nextgen
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_TOKEN=your-ai-bearer-token
AI_TIMEOUT_MS=5000
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5001` | Express server port |
| `JWT_SECRET` | _(required)_ | Secret for signing JWTs — use a long random string in production |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_NAME` | `nextgen` | PostgreSQL database name |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `AI_SERVICE_URL` | `http://localhost:8000` | FastAPI service base URL |
| `AI_TOKEN` | _(required)_ | Bearer token for AI service authentication |
| `AI_TIMEOUT_MS` | `5000` | Timeout for AI service HTTP calls |

### FastAPI AI Service (`backend-ai-fastapi/.env`)

```env
AI_SECRET_TOKEN=your-ai-bearer-token      # Must match AI_TOKEN in backend/.env
ANOMALY_THRESHOLD=0.7
SIMILARITY_THRESHOLD=0.85
MODEL_DIR=app/models
```

---

## Running the Services

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ (running locally or via Docker)
- Redis 7+ (running locally or via Docker)

### Quick setup with Docker (PostgreSQL + Redis)

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nextgen -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7
```

### 1. Node.js Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Initialize database tables (one-time)
npx ts-node init-db.ts

# Connectivity check (optional smoke test)
npx ts-node check-live.ts

# Development (live reload)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:5001`.

### 2. FastAPI AI Service

```bash
cd backend-ai-fastapi
pip install -r requirements.txt

# First run only: train the model
python -m app.training.generate_dataset   # Creates synthetic training data
python -m app.training.train_model        # Trains and saves isolation_forest.pkl + scaler.pkl

# Start service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Interactive API docs (auto-generated by FastAPI)
open http://localhost:8000/api/v1/docs
```

### 3. Frontend

```bash
cd frontend/Frontend
npm install
npm run dev        # Development — http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run lint       # ESLint
```

---

## Testing

### Node.js Backend — Connectivity & E2E

```bash
cd backend

# Infrastructure connectivity check (Postgres + Redis + AI service)
npx ts-node check-live.ts

# Full end-to-end integration tests (uploads, verifies, checks history)
npx ts-node test-e2e-connectivity.ts
npx ts-node test-e2e.ts

# Lender history scoping test
npx ts-node test-lender-history.ts
```

### Postman Collection

A complete Postman collection covering all API endpoints is included:

```bash
# Import into Postman directly, or run with Newman:
newman run backend/nxtgen-backend3-postman-collection.json \
  --env-var "baseUrl=http://localhost:5001" \
  --env-var "jwtToken=<your-jwt-here>"
```

The collection includes environment variables for each role and covers:
- Login flow for each role
- Upload invoice (VENDOR)
- Verify invoice (LENDER)
- Finance / Reject invoice (LENDER)
- Get history (all roles)
- Audit log retrieval (ADMIN)
- Hash chain verification (ADMIN)
- Admin stats and system health

### FastAPI AI Service

```bash
cd backend-ai-fastapi
pytest tests/ -v

# Individual test files:
pytest tests/test_fraud.py -v      # Fraud scoring pipeline tests
pytest tests/test_similarity.py -v # Similarity checker tests
```

---

## Future Improvements

| Area | Planned Enhancement |
|---|---|
| **AI / ML** | Replace mocked features (submission_time, vendor_account_age, etc.) with real historical data from PostgreSQL |
| **AI / ML** | Graph-based fraud detection across vendor-lender networks (detect coordinated fraud rings) |
| **AI / ML** | Advanced NLP (TF-IDF or BERT embeddings) for invoice description similarity |
| **AI / ML** | Online learning — continuously retrain the Isolation Forest as new verified data accumulates |
| **Integrations** | Real GSTN / NIC e-Invoice API validation (replace mock `irnStatus`) |
| **Integrations** | Multi-lender federation API — expose registry queries to external institutions |
| **Integrations** | RBI Trade Receivables Discounting System (TReDS) protocol compatibility |
| **Analytics** | Streaming fraud analytics dashboard using WebSocket or Server-Sent Events |
| **Analytics** | Exportable audit reports in PDF / CSV for regulatory submissions |
| **Infrastructure** | Docker Compose for one-command local startup of all three services |
| **Infrastructure** | Kubernetes manifests + Helm chart for production deployment |
| **Infrastructure** | CI/CD pipeline (GitHub Actions) with automated tests on every PR |
| **Security** | Refresh token rotation — short-lived access tokens + long-lived refresh tokens |
| **Security** | Rate limiting per API key to prevent abuse |
| **Security** | Mutual TLS (mTLS) between Node backend and AI service |
| **Compliance** | Field-level encryption for PII (GSTIN, amounts) at rest in PostgreSQL |
| **Frontend** | Confirmation dialogs before Finance / Reject actions |
| **Frontend** | Real-time invoice status updates via WebSocket (avoid poll/refresh) |
| **API** | OpenAPI 3.0 spec (`openapi.yaml`) for external developer integrations |
| **API** | Pagination and cursor-based filtering for invoice history |

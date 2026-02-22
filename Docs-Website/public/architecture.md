# Architecture

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Browser (React 19 + TypeScript)                │
│   LoginPage · AdminDashboard · LenderDashboard · UploadInvoice   │
│   AuditTrail · FraudInsights · InvoiceHistory · VerifStatus      │
│   Recharts · Lucide React · React Router v7 · TailwindCSS        │
└─────────────────────────────┬────────────────────────────────────┘
                              │  HTTP/REST  (JWT Bearer Token)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│               Node.js Backend  (Express 4 + TypeScript)           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  API Layer                                                │    │
│  │  authMiddleware → jwt.verifyToken → req.user             │    │
│  │  rbac(['ROLE']) → 403 if unauthorized                    │    │
│  │  Routes: /auth  /invoices  /audit  /admin                │    │
│  └──────────┬────────────────────┬──────────────────────────┘    │
│             │                    │                                │
│     ┌───────▼───────┐   ┌────────▼──────────┐                   │
│     │  PostgreSQL   │   │   Redis            │                   │
│     │               │   │                    │                   │
│     │  invoices     │   │  Cache:            │                   │
│     │  audit_logs   │   │   history:<R>:<id> │                   │
│     │  users        │   │                    │                   │
│     │               │   │  Distributed Lock: │                   │
│     │  (auth +      │   │   lock:verify:<inv>│                   │
│     │   data store) │   │   lock:upload:<inv>│                   │
│     └───────────────┘   └────────────────────┘                   │
│                                    │                              │
│                    POST /api/v1/score (Bearer)                    │
└────────────────────────────────────┼─────────────────────────────┘
                                     │
                    ┌────────────────▼─────────────────────────┐
                    │        FastAPI AI Service (Python)         │
                    │                                           │
                    │  SimilarityChecker  → exact dup check     │
                    │  RuleEngine         → 5 deterministic     │
                    │                       rules (40% weight)  │
                    │  AnomalyDetector    → IsolationForest     │
                    │                       (60% weight)        │
                    │  FeatureBuilder     → 21-feature vector   │
                    │                                           │
                    │  Returns: FraudOutput                     │
                    │  { fraud_score, risk_level,               │
                    │    is_anomaly, triggered_rules }          │
                    └───────────────────────────────────────────┘
```

---

## Components

| Component | Technology | Responsibility |
|---|---|---|
| **Frontend SPA** | React 19, TypeScript, Vite, TailwindCSS | UI for all three roles; calls backend REST API |
| **Node.js Backend** | Express 4, TypeScript, ts-node-dev | Auth, invoice orchestration, audit logging, admin stats |
| **PostgreSQL** | pg v8 | Persistent storage: invoices, audit_logs, users |
| **Redis** | redis v5 | History cache (1hr TTL) + distributed NX locks |
| **FastAPI AI Service** | FastAPI, scikit-learn, Pydantic v2 | Fraud scoring: ML model + rule engine + similarity |

---

## Request Flows

### 1. Vendor Invoice Upload — `POST /api/invoices/upload`

```
Vendor → POST /api/invoices/upload (JWT)
  authMiddleware: verify JWT → req.user { id, role: "VENDOR" }
  rbac(["VENDOR"]): passes
  uploadInvoice controller:
    ├── sellerGSTIN = req.user.id   (prevents spoofing)
    ├── validates required fields
    ├── acquires Redis lock (5s TTL, NX)
    │     └── 429 if already locked
    ├── InvoiceService.getInvoiceByNumber()
    │     └── 409 if already exists
    ├── InvoiceService.saveInvoiceRecord({ status: "PENDING_VERIFICATION" })
    │     ├── INSERT INTO invoices ...
    │     └── DEL history:* from Redis
    └── 201 { message, data: savedInvoice }
```

### 2. Lender Invoice Verification — `POST /api/invoices/verify`

```
Lender → POST /api/invoices/verify (JWT)
  authMiddleware: verify JWT → req.user { id, role: "LENDER" }
  rbac(["ADMIN", "LENDER"]): passes
  verifyInvoice controller:
    ├── buyerGSTIN = req.user.id   (forces lender's own ID)
    ├── validates required fields
    ├── acquires Redis lock (10s TTL, NX)
    │
    └── InvoiceService.processVerification(payload, role)
          │
          ├── 1. PostgreSQL duplicate check:
          │       SELECT * FROM invoices WHERE invoiceNumber = $1
          │       If exists AND status != PENDING_VERIFICATION
          │         → invoiceStatus = "DUPLICATE_DETECTED" (skip AI)
          │
          ├── 2. FraudService.getFraudScore(payload)
          │       └── AIClient.scoreInvoice()
          │             POST <AI_SERVICE_URL>/api/v1/score
          │             {Bearer <AI_TOKEN>, payload}
          │             → FraudOutput { fraud_score 0–1, risk_level }
          │       fraudScore = Math.round(fraud_score × 100)
          │       if fraudScore > 75 → invoiceStatus = "REJECTED"
          │
          ├── 3. AuditService.writeAuditLog()
          │       HashChain.generateHash(prevHash, invoiceHash, ts)
          │       INSERT INTO audit_logs ...
          │
          └── Returns { status, invoiceHash, fraudScore, riskLevel, latency }

  saveInvoiceRecord() → upsert to invoices table
  DEL history:* from Redis
  releaseLock()
  → 200 VerificationResult
```

### 3. Lender Status Update — `PUT /api/invoices/:id/status`

```
Lender → PUT /api/invoices/:id/status { status: "FINANCED" }
  authMiddleware + rbac(["ADMIN", "LENDER"])
  updateStatus controller:
    ├── validates status ∈ ["FINANCED", "REJECTED_BY_LENDER", "CLOSED"]
    └── InvoiceService.updateInvoiceStatus(id, status, role)
          ├── UPDATE invoices SET status = $1 WHERE invoiceNumber = $2
          ├── AuditService.writeAuditLog() — records state transition
          └── DEL history:* from Redis
  Frontend updates row in-place via React state (no page reload)
```

### 4. AI Fraud Scoring — `POST /api/v1/score` (internal)

```
FraudOutput = FraudScorer.score_invoice(invoice)
    │
    ├── SimilarityChecker.check_similarity(invoice)
    │       exact hash match found?
    │         YES → final_score = 1.0
    │               triggered_rules += ["EXACT_DUPLICATE_FOUND_SYSTEM_REJECTION"]
    │               return immediately
    │
    ├── RuleEngine.evaluate(invoice)
    │       rule_score = 0.0
    │       + 0.30 if amount > 50,000         [HIGH_VALUE_INVOICE]
    │       + 0.20 if amount % 1000 == 0      [ROUND_AMOUNT_DETECTED]
    │       + 0.10 if due_date is null        [MISSING_DUE_DATE]
    │       + 0.50 if len(line_items) == 0    [ZERO_LINE_ITEMS]
    │       + 0.15 if weekday >= 5            [WEEKEND_INVOICE_DATE]
    │       rule_score = min(rule_score, 1.0)
    │
    ├── AnomalyDetector.predict(invoice)
    │       features = FeatureBuilder.build_model_vector(invoice)  # 21 features
    │       scaled  = StandardScaler.transform(features)
    │       pred    = IsolationForest.predict(scaled)  # 1=normal, -1=anomaly
    │       score   = IsolationForest.decision_function(scaled) → normalized 0–1
    │
    └── final_score = (rule_score × 0.40) + (anomaly_score × 0.60)
        risk_level  = LOW if < 0.40 | MEDIUM if < 0.75 | HIGH if >= 0.75
        return FraudOutput
```

### 5. Audit Chain Verification — `GET /api/audit/verify-chain`

```
Admin → GET /api/audit/verify-chain
  AuditService.verifyHashChain()
    SELECT * FROM audit_logs ORDER BY timestamp ASC
    For each record n:
      recompute = SHA256(record[n].previous_hash + record[n].invoice_hash + record[n].timestamp)
      if recompute != record[n].current_hash → tampered!
      if record[n].previous_hash != record[n-1].current_hash → chain broken!
  → { isValid: true } | { isValid: false, tamperedIds: [...] }
```

---

## Repository Structure

```
nxtgen-hack/
├── backend/                        Node.js Express API
│   ├── api/
│   │   ├── server.ts               Express app, CORS, middleware chain, route mount
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      POST /auth/login
│   │   │   ├── invoice.routes.ts   upload, verify, history, updateStatus
│   │   │   ├── audit.routes.ts     GET /audit, GET /audit/verify-chain
│   │   │   └── admin.routes.ts     GET /admin/stats, /admin/system-health
│   │   └── middlewares/
│   │       ├── auth.middleware.ts  JWT extraction → req.user
│   │       ├── rbac.middleware.ts  Role array enforcement → 403
│   │       └── error.middleware.ts Global error handler
│   ├── modules/
│   │   ├── auth/                   JWT sign/verify, upsert user, login controller
│   │   ├── invoices/               Upload, verify, history, updateStatus
│   │   ├── fraud/                  AI HTTP client + score mapping
│   │   ├── audit/                  Hash chain, write/read audit logs
│   │   ├── verification/           Canonicalize, hash, Redis lock
│   │   ├── admin/                  System stats, health queries
│   │   └── users/                  User lookups
│   ├── infrastructure/
│   │   ├── db/postgres.ts          pg Pool + query() helper
│   │   ├── db/redis.ts             Redis client init
│   │   └── logger/logger.ts        Structured logger
│   ├── shared/types.ts             Shared TypeScript interfaces
│   └── init-db.ts                  One-time table creation
│
├── backend-ai-fastapi/             Python FastAPI ML service
│   ├── app/
│   │   ├── main.py                 FastAPI factory, routers, CORS
│   │   ├── api/routes/             health, fraud (score), similarity
│   │   ├── core/config.py          Pydantic settings (thresholds, paths)
│   │   ├── schemas/                InvoiceInput, FraudOutput, SimilarityOutput
│   │   ├── services/               fraud_scorer, rule_engine, anomaly_detector,
│   │   │                           similarity_checker, feature_builder
│   │   ├── models/                 isolation_forest.pkl, scaler.pkl, metadata.json
│   │   └── training/               generate_dataset, preprocess, train_model
│   └── requirements.txt
│
├── frontend/Frontend/              React SPA
│   └── src/
│       ├── api/client.ts           Axios: http://localhost:5001/api
│       ├── LoginPage.tsx           Role selector + JWT login
│       ├── AdminDashboard.tsx      KPIs, live invoice data
│       ├── AuditTrail.tsx          Hash-chained audit log viewer
│       ├── FraudInsights.tsx       Risk charts, fraud analytics
│       ├── LenderDashboard.tsx     Verification table + Finance/Reject buttons
│       ├── InvoiceHistory.tsx      Filterable invoice history
│       ├── UploadInvoice.tsx       Vendor upload form
│       └── VerificationStatus.tsx  Post-upload result display
│
└── docs/                           This documentation
    ├── index.md
    ├── architecture.md
    ├── backend.md
    ├── api-reference.md
    └── deployment.md
```

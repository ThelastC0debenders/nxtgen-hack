# NxtGen Hack — Invoice Verification & Fraud Intelligence Platform

> **Real-time, API-first infrastructure that prevents duplicate invoice financing across banks and NBFCs using cryptographic hashing, AI-powered fraud detection, and an immutable cross-lender audit registry.**

---

## Documentation

| File | What's Inside |
|---|---|
| [**index.md**](./index.md) | This file — project overview, problem, capabilities, demo credentials |
| [**architecture.md**](./architecture.md) | System design, component diagram, all request flows, repo structure |
| [**backend.md**](./backend.md) | Node.js API deep dive + Python AI service (modules, schemas, ML model) |
| [**api-reference.md**](./api-reference.md) | Every endpoint with full request/response examples and error codes |
| [**deployment.md**](./deployment.md) | Running all three services, env vars, DB setup, testing, future roadmap |

---

## The Problem

In Indian trade finance, a supplier can present the **same invoice to multiple lenders simultaneously** to fraudulently obtain multiple loans against a single receivable. Because lenders operate in siloed systems with no shared registry, they have no way of knowing an invoice was already financed elsewhere.

The industry loses an estimated **₹12,000+ crore annually** to this form of duplicate invoice fraud.

### Why Existing Approaches Fail

| Approach | Limitation |
|---|---|
| Manual cross-checking | Slow (days), no cross-bank coordination |
| GSTN portal lookup | Confirms invoice generation, not whether it was financed |
| In-house blacklists | Siloed — invisible to other institutions |
| Paper-based processes | No standardization, no cryptographic verification |

---

## The Solution

NxtGen Hack intercepts every financing decision with a sub-second verification checkpoint:

1. **Canonicalize** — normalize invoice fields to prevent format-based fingerprint evasion
2. **Hash** — generate a SHA-256 fingerprint that uniquely identifies this invoice
3. **Redis Lock** — query in-memory cache for duplicates in microseconds
4. **AI Score** — run Isolation Forest ML + rule engine + similarity checker
5. **Audit Log** — write an immutable, hash-chained record to PostgreSQL
6. **Respond** — return `{ status, fraudScore, riskLevel, latency }` in under 100ms

---

## Core Capabilities

| Capability | Description | Where |
|---|---|---|
| **Sub-second verification** | Redis SETNX + SHA-256 fingerprint | `modules/verification/` |
| **AI fraud scoring** | Isolation Forest (60%) + rule engine (40%) | `backend-ai-fastapi/` |
| **Role-based access** | ADMIN / LENDER / VENDOR per-route enforcement | `api/middlewares/rbac.ts` |
| **Immutable audit trail** | Hash-chained PostgreSQL log | `modules/audit/` |
| **Lender financing actions** | Finance / Reject verified invoices in-place | `PUT /api/invoices/:id/status` |
| **Zero-knowledge registry** | Only SHA-256 hashes stored — no raw invoice shared | `modules/verification/hasher.ts` |
| **Multi-role dashboards** | Role-specific React UI with live API data | `frontend/Frontend/src/` |
| **Graceful AI fallback** | If AI service is down, system continues with score = 0 | `modules/fraud/fraud.service.ts` |

---

## User Roles

| Role | Who They Are | Capabilities |
|---|---|---|
| **VENDOR** | Supplier submitting invoices | Upload invoices, view own history and status |
| **LENDER** | Bank or NBFC considering financing | Verify invoices, finance or reject, view history |
| **ADMIN** | Platform operator | Full visibility: all invoices, audit logs, fraud analytics, system health |

---

## Quick Start

```bash
# Requirements: Node 18+, Python 3.10+, PostgreSQL, Redis

# 1. Clone
git clone https://github.com/ThelastC0debenders/nxtgen-hack.git
cd nxtgen-hack

# 2. Backend
cd backend && npm install
cp .env.example .env          # See deployment.md for all variables
npx ts-node init-db.ts        # Creates invoices, audit_logs, users tables
npm run dev                    # → http://localhost:5001

# 3. AI Service
cd ../backend-ai-fastapi
pip install -r requirements.txt
python -m app.training.generate_dataset   # One-time: generate training data
python -m app.training.train_model        # One-time: train IsolationForest model
uvicorn app.main:app --port 8000 --reload

# 4. Frontend
cd ../frontend/Frontend && npm install
npm run dev                    # → http://localhost:5173
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gmail.com` | `1234567890` |
| Lender | `lendor@gmail.com` | `0987654321` |
| Vendor | `vendor@gmail.com` | `1234567890` |

> **Note:** These credentials auto-create users in the database on first login via the `auth.service.ts` upsert logic. No manual seeding needed beyond `init-db.ts`.

---

## System Quality Attributes

| Attribute | Value |
|---|---|
| Average API latency | < 100ms (Redis cache hit) |
| Duplicate detection speed | < 2ms (Redis SETNX) |
| AI fraud score latency | < 5ms (in-memory Isolation Forest) |
| Concurrent safety | Redis distributed lock prevents race conditions |
| Audit log integrity | Cryptographically verifiable SHA-256 hash chain |
| Graceful degradation | System operates if AI service is unavailable |
| History caching | 1-hour Redis TTL per user-role pair |

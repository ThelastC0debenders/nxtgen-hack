<div align="center">

# 🔐 NxtGen Hack

### Real-Time Invoice Verification & Fraud Intelligence Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

**An API-first infrastructure platform that prevents duplicate invoice financing across banks and NBFCs using cryptographic hashing, AI-powered fraud detection, and an immutable cross-lender audit registry.**

[📖 Full Documentation](./docs/index.md) · [🏗️ Architecture](./docs/architecture.md) · [📡 API Reference](./docs/api-reference.md) · [🚀 Deployment](./docs/deployment.md)

</div>

---

## ✨ What It Does

In Indian trade finance, a supplier can present the **same invoice to multiple lenders simultaneously** to fraudulently obtain multiple loans. NxtGen Hack solves this with a sub-second verification checkpoint that every lender calls before approving financing.

```
Vendor submits invoice → Lender calls /api/invoices/verify → System responds in < 100ms
                                         │
                          ┌──────────────┼──────────────────┐
                          ▼              ▼                   ▼
                    SHA-256 Hash    Redis Duplicate     AI Fraud Score
                    Fingerprint     Lock (< 2ms)       (IsolationForest)
                          │              │                   │
                          └──────────────┴───────────────────┘
                                         │
                              VERIFIED / DUPLICATE_DETECTED
                              REJECTED_HIGH_RISK
```

---

## 🏗️ Architecture

Three services communicate over HTTP:

| Service | Stack | Port |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS | `5173` |
| **Node.js API** | Express 4, TypeScript, PostgreSQL, Redis | `5001` |
| **AI Service** | FastAPI, scikit-learn, Pydantic v2 | `8000` |

→ See [architecture.md](./docs/architecture.md) for the full system diagram and request flows.

---

## 🚀 Quick Start

**Prerequisites:** Node 18+, Python 3.10+, PostgreSQL 14+, Redis 7+

```bash
# 1. Backend
cd backend && npm install
cp .env.example .env        # Fill in DB, Redis, JWT, AI token
npx ts-node init-db.ts      # Create tables
npm run dev                  # http://localhost:5001

# 2. AI Service
cd backend-ai-fastapi && pip install -r requirements.txt
python -m app.training.generate_dataset
python -m app.training.train_model
uvicorn app.main:app --port 8000 --reload

# 3. Frontend
cd frontend/Frontend && npm install && npm run dev   # http://localhost:5173
```

---

## 🎭 Demo Credentials

| Role | Email | Password |
|---|---|---|
| 🛡️ Admin | `admin@gmail.com` | `1234567890` |
| 🏦 Lender | `lendor@gmail.com` | `0987654321` |
| 📦 Vendor | `vendor@gmail.com` | `1234567890` |

---

## ⚡ Core Features

| Feature | How |
|---|---|
| **Sub-second verification** | Redis SETNX duplicate lock resolves in < 2ms |
| **AI fraud scoring** | Isolation Forest (60%) + deterministic rule engine (40%) |
| **Zero-knowledge registry** | Only SHA-256 hashes stored — no raw invoice data shared cross-institution |
| **Immutable audit trail** | Hash-chained `audit_logs` table — tamper-proof by design |
| **Role-based access** | Per-route RBAC middleware for ADMIN, LENDER, VENDOR |
| **Graceful degradation** | System runs if AI service is unavailable (falls back to score = 0) |
| **Lender financing actions** | Finance or Reject invoices directly from dashboard |

---

## 📁 Repository Structure

```
nxtgen-hack/
├── backend/              Node.js + Express API (TypeScript)
├── backend-ai-fastapi/   Python FastAPI ML service
├── frontend/Frontend/    React SPA (TypeScript + TailwindCSS)
└── docs/                 Full documentation
    ├── index.md          Project overview & quick start
    ├── architecture.md   System design & request flows
    ├── backend.md        Backend & AI service deep dive
    ├── api-reference.md  All endpoints, request/response examples
    └── deployment.md     RBAC, security, env vars, testing, roadmap
```

---

## 📊 Invoice Lifecycle

```
PENDING_VERIFICATION  →  VERIFIED  →  FINANCED
                      →  REJECTED_HIGH_RISK
                      →  DUPLICATE_DETECTED
                      →  REJECTED_BY_LENDER
                      →  CLOSED
```

---

## 📚 Documentation

| Doc | Description |
|---|---|
| [index.md](./docs/index.md) | Project overview, problem, capabilities, demo creds |
| [architecture.md](./docs/architecture.md) | System diagram, all request flows, repo tree |
| [backend.md](./docs/backend.md) | Node.js modules + AI service (ML, rules, features) |
| [api-reference.md](./docs/api-reference.md) | Every endpoint with examples and error codes |
| [deployment.md](./docs/deployment.md) | Security, env vars, running services, testing, roadmap |

---

## 🛠️ Tech Stack

**Backend**
- Express 4 · TypeScript 5.7 · jsonwebtoken · pg · redis · axios

**AI Service**
- FastAPI · Uvicorn · scikit-learn (IsolationForest) · Pydantic v2 · joblib · pandas

**Frontend**
- React 19 · TypeScript 5.9 · Vite 7 · TailwindCSS 4 · React Router v7 · Recharts · Lucide React

**Infrastructure**
- PostgreSQL 14 (invoices, audit_logs, users)
- Redis 7 (history cache + distributed locks)

---

<div align="center">

Built with ❤️ by **Team ThelastC0debenders**

</div>
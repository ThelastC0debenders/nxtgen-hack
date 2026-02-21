# 🧾 Invoice Verification & Fraud Intelligence System

## 🚀 Project Overview

This project is a **real-time invoice verification and fraud detection platform** designed to prevent duplicate financing and detect suspicious invoice behavior across multiple lenders.

The system simulates a **production-style fintech infrastructure** where invoices are verified instantly while AI continuously evaluates risk patterns.

### The platform combines:

* ⚡ Fast invoice verification
* 🤖 AI-based fraud scoring
* 🔐 Role-Based Access Control (RBAC)
* 🧾 Immutable audit logging

---

## 🏗 High-Level Architecture

```
Frontend (React + TS + Tailwind)
            ↓
    Node.js Backend (Core System)
            ↓
   FastAPI AI Service (Fraud Intelligence)
            ↓
   Redis + PostgreSQL (Caching & Audit)
```

### Core Flow

1. User submits invoice.
2. Node backend performs:

   * Canonicalization
   * Hash generation
   * Duplicate check using Redis
3. Invoice data is sent to AI service.
4. AI returns a fraud score.
5. Result is written to immutable audit logs.
6. Response returned to frontend.

---

## 🧠 Key Features

### ✔ Real-Time Verification

* SHA-256 invoice fingerprinting
* Duplicate detection across lenders
* Sub-second response time

### 🤖 AI Fraud Intelligence

* Anomaly detection (Isolation Forest)
* Rule-based risk engine
* Near-duplicate similarity detection
* Explainable risk scoring

### 🔐 Role-Based Access Control (RBAC)

* Admin
* Lender
* Vendor
* Risk Analyst

### 🧾 Tamper-Proof Audit Trail

* Hash-chained logs
* Immutable financing history
* Full audit visibility

---

## 👨‍💻 Tech Stack

### Frontend

* React + TypeScript
* TailwindCSS

### Backend (Core)

* Node.js + Express
* Redis (fast duplicate checks)
* PostgreSQL (audit logs)

### AI Service

* FastAPI (Python)
* Scikit-learn
* Isolation Forest
* Rule-based scoring

---

## 📄 Main Modules

### Node Backend

* Authentication & RBAC
* Invoice verification engine
* Fraud service client (AI integration)
* Audit service

### FastAPI AI Layer

* Fraud scoring
* Feature engineering
* Similarity detection
* Model inference

### Frontend

* Dashboard
* Invoice verification page
* Fraud insights
* Audit trail

---

## ⚙️ System Workflow

```
User → Submit Invoice
        ↓
Node Backend
   ├── Canonicalize invoice data
   ├── Generate SHA256 fingerprint
   ├── Check Redis for duplicates
   └── Send features to AI Service
        ↓
FastAPI AI
   ├── Run fraud rules
   ├── Model inference
   └── Return fraud score
        ↓
Node Backend
   ├── Write hash-chained audit log
   └── Return verification result
        ↓
Frontend Dashboard
```

---

## 🎯 Project Goal

Build a **scalable, modular system** that demonstrates how financial institutions can:

* Prevent duplicate invoice financing
* Detect fraud early
* Maintain transparent, auditable records

---

## 📦 Suggested Folder Structure

```
invoice-verification-system/
│
├── frontend/                 # React + TS UI
│   ├── src/
│   └── package.json
│
├── backend/                  # Node.js core system
│   ├── src/
│   │   ├── auth/
│   │   ├── verification/
│   │   ├── audit/
│   │   └── ai-client/
│   └── package.json
│
├── ai-service/               # FastAPI ML service
│   ├── app/
│   │   ├── models/
│   │   ├── scoring/
│   │   └── main.py
│   └── requirements.txt
│
├── docker-compose.yml
└── README.md
```

---

## 🧪 Example Verification Response

```json
{
  "invoice_hash": "a3f2c91d...",
  "duplicate": false,
  "fraud_score": 0.27,
  "risk_level": "LOW",
  "status": "APPROVED"
}
```

---

## 🔒 Security Highlights

* JWT-based authentication
* RBAC authorization middleware
* Hash-chained audit records
* Redis atomic checks for race-condition prevention

---

## 📈 Future Improvements

* Graph-based fraud detection
* Multi-lender federation APIs
* Advanced NLP invoice similarity detection
* Real GSTN / e-Invoice validation integration
* Streaming fraud analytics dashboard

---

## 🏆 Why This Project Matters

Invoice financing fraud causes massive losses and slows MSME credit flow. This platform demonstrates how **real-time verification + AI intelligence + immutable audit trails** can build trust across financial institutions while maintaining speed and scalability.

---

## 📜 License

MIT License

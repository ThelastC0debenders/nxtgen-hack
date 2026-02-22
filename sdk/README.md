# 🛡️ NxtGen Fraud Intelligence SDK
> Integrating enterprise-grade Unsupervised Machine Learning into your application in 3 lines of code.

## 🚀 Overview

The NxtGen SDK is a TypeScript-native wrapper for our core API. It enables 3rd-party Developers, Banks, and Logistics networks to directly pipe raw invoice metadata into our real-time **Isolation Forest Machine Learning Sandbox** to evaluate document authenticity and detect multi-lender syndication fraud before money moves.

---

## 📦 Installation

To test and compile the SDK locally:
```bash
cd sdk
npm install
npm run build 
```

Once published to a registry, you can install it via:
```bash
npm install @nxtgen/fraud-sdk
# or
yarn add @nxtgen/fraud-sdk
```

---

## 🛠️ Quick Start

Because the SDK leverages TypeScript, your IDE will provide native autocomplete (IntelliSense) for both our Input Schemas and returning AI metrics payloads.

```typescript
import { NxtGenClient, InvoicePayload } from '@nxtgen/fraud-sdk';
import axios from 'axios';

// 1. Authenticate with the NxtGen backend to get a live session token
const loginRes = await axios.post('http://your-backend/api/auth/login', {
    email: 'your-email@example.com',
    role: 'LENDER',
    password: 'your-password'
});
const sessionCookie = loginRes.headers['set-cookie'][0].match(/session=([^;]+)/)[1];

// 2. Initialize the SDK Client
const fraudClient = new NxtGenClient(sessionCookie, 'sandbox');

// 3. Define your invoice
// ⚠️  The IRN must be in the GST Whitelist for verification to succeed
const targetDocument: InvoicePayload = {
    invoiceNumber: 'INV-992-API',
    buyerGSTIN: 'LND-8821',
    sellerGSTIN: 'VND-9904',
    invoiceAmount: 75000,        // Explicit amount entered by user
    invoiceDate: '2026-02-21',   // Weekend submission
    irn: 'IRN-VALID-123',        // Must be in approved GST whitelist
    irnStatus: 'VALID',
    lineItems: [
        { description: 'API Consulting', quantity: 75, unitPrice: 1000, total: 75000 }
    ]
};

// 4. Run fraud verification
const report = await fraudClient.verifyFraudRisk(targetDocument);
console.log(`Fraud Score: ${report.fraudScore.toFixed(2)}/100`);
console.log(`Risk Level:  ${report.riskLevel}`);
report.triggeredRules?.forEach(rule => console.log(`⚠️ ${rule}`));
```

---

## 🧠 Core Methods

### `verifyFraudRisk(payload: InvoicePayload): Promise<FraudReport>`
This is an isolated intelligence test. The API does **not** permanently commit the transaction to the Postgres DB. It routes the mathematical tensor into `FastAPI`, executes the Python inference against the data, and returns the raw scoring fraction. Perfect for pre-flight intelligence.

### `uploadInvoice(payload: InvoicePayload): Promise<{success, irn}>`
This commits the document permanently to the network. It requires a `VENDOR` role token. It calculates the final anomaly derivations and permanently hashes the data down to the ledger, acting as the Single Source of Truth for deduplication.

### `getHistory(): Promise<any[]>`
Pulls the complete array of historical transactions, scores, and network statuses mapped to your Session Token's oversight layer.

---

---

## 🔐 GST IRN Whitelist

The NxtGen backend runs a **mock GST Portal verification** on every invoice before ML scoring. The IRN (`Invoice Registration Number`) must exist in the approved whitelist or the invoice will be rejected with `REJECTED_INVALID_IRN` before the AI even runs.

**Pre-approved IRNs for Sandbox:**

| IRN | Notes |
|---|---|
| `IRN-1001` through `IRN-1008` | Standard demo IRNs |
| `IRN-VALID-123` | Integration testing IRN |
| `TEST-IRN-999` | SDK demo IRN |

> In production, this would query the official GSTN (Goods and Services Tax Network) API to validate the IRN digitally.

---

## 🎯 AI Rule Triggers — Cheat Sheet

Use these to craft invoices that exercise different AI risk pathways:

| What To Do | Rule Triggered | Score Impact |
|---|---|---|
| `invoiceAmount > 50000` | `HIGH_VALUE_INVOICE` | +30 |
| Amount is multiple of 1000 | `ROUND_AMOUNT_DETECTED` | +20 |
| `invoiceDate` falls on Saturday/Sunday | `WEEKEND_INVOICE_DATE` | +15 |
| No `due_date` provided | `MISSING_DUE_DATE` | +10 |
| No `lineItems` array | `ZERO_LINE_ITEMS` | +50 |

---

## 📊 Security & Rate Limiting

* **Architecture:** Inferences sit behind an asynchronous messaging bridge; standard verification latency sits between `30ms - 85ms`.
* **Tokens:** The `NxtGenClient` natively structures all HTTP boundaries with JWT Bearer validation. Expired tokens will immediately throw an SDK Validation Exception.

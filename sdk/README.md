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

// 1. Initialize Client
// For production use your active Developer API Token 
const fraudClient = new NxtGenClient('YOUR_ACTIVE_SESSION_TOKEN', 'sandbox');

// 2. Define your Payload (mapped to our InvoicePayload schema)
const targetDocument: InvoicePayload = {
    invoiceNumber: "INV-992-API",
    buyerGSTIN: "LND-8821",  
    sellerGSTIN: "VND-9904",
    invoiceAmount: 75200.50, // High Value
    invoiceDate: "2026-02-21", // Weekend Submission
    irn: "IRN-010-333"
};

// 3. Verify Document against ML Architecture
async function checkFraud() {
    try {
        const report = await fraudClient.verifyFraudRisk(targetDocument);
        
        console.log(`Document Risk Score: ${report.fraudScore.toFixed(2)}/100`);
        console.log(`Risk Level: ${report.riskLevel}`); // LOW, MEDIUM, or HIGH

        if (report.duplicate) {
             console.error("CRITICAL: Invoice already exists in another lender's registry!");
        }

        // View dynamic AI rationale rules
        report.triggeredRules?.forEach(rule => {
             console.log(`Triggered AI Flag: ${rule}`); 
             // e.g. "ROUND_AMOUNT_DETECTED", "WEEKEND_INVOICE_DATE"
        });

    } catch (error) {
        console.error("SDK Authentication or Validation Error", error);
    }
}

checkFraud();
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

## 📊 Security & Rate Limiting

* **Architecture:** Inferences sit behind an asynchronous messaging bridge; standard verification latency sits between `30ms - 85ms`.
* **Tokens:** The `NxtGenClient` natively structures all HTTP boundaries with JWT Bearer validation. Expired tokens will immediately throw an SDK Validation Exception.

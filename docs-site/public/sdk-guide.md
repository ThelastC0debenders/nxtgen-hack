# SDK & Integration Guide

This guide provides everything you need to successfully integrate your systems with the NxtGen Verification API. We've included full connection examples for both **Node.js** and **Python**.

## Prerequisites
Before calling the API, ensure you have:
1. Valid credentials (a username and password for your `VENDOR` or `LENDER` service account).
2. The BASE_URL for your environment (e.g., `https://api.nxtgen.xyz` or `http://localhost:5001`).

---

## Node.js SDK (TypeScript)

The easiest way to integrate NxtGen into a Node service is using `axios`.

### 1. The API Client Wrapper
Create a reusable class that handles authentication seamlessly before making verification requests.

```typescript
import axios, { AxiosInstance } from 'axios';

export class NxtGenClient {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor(
    private baseUrl: string,
    private email: string,
    private password: string
  ) {
    this.api = axios.create({ baseURL: this.baseUrl });
    
    // Automatically inject the Bearer token
    this.api.interceptors.request.use((config) => {
      if (this.token) config.headers.Authorization = `Bearer ${this.token}`;
      return config;
    });
  }

  // 1. Authenticate to get the JWT
  async authenticate(): Promise<void> {
    const res = await this.api.post('/api/auth/login', {
      email: this.email,
      password: this.password
    });
    this.token = res.data.token;
  }

  // 2. Vendor: Upload an Invoice
  async uploadInvoice(invoiceData: any) {
    if (!this.token) await this.authenticate();
    const res = await this.api.post('/api/invoices/upload', invoiceData);
    return res.data;
  }

  // 3. Lender: Verify an Invoice
  async verifyInvoice(invoiceData: any) {
    if (!this.token) await this.authenticate();
    try {
      const res = await this.api.post('/api/invoices/verify', invoiceData);
      return res.data; // e.g. status: 'VERIFIED' and AI score
    } catch (error: any) {
      if (error.response?.data?.status === 'DUPLICATE_DETECTED') {
        throw new Error('STOP: This invoice is already financed elsewhere!');
      }
      throw error;
    }
  }
}
```

### 2. Usage Example (Lender Flow)
Here is how your lending backend should use the client right before approving capital:

```typescript
const client = new NxtGenClient('http://localhost:5001', 'lendor@gmail.com', 'securepass');

async function approveCapital(invoice) {
  try {
    // 1. Ask NxtGen if it's safe
    const result = await client.verifyInvoice({
      ...invoice,
      buyerGSTIN: "33BBBB2222B1Z2" // Your bank's GSTIN
    });

    if (result.status === 'VERIFIED' && result.verification.ai_flag === 'LOW_RISK') {
      console.log('Safe to proceed with loan!');
      // TODO: Execute your internal transfer logic
    }
  } catch (error) {
    console.error('Capital approval rejected:', error.message);
  }
}
```

---

## Python SDK

For data-science pipelines or Python backends, `httpx` or `requests` is recommended.

### 1. API Client Wrapper

```python
import httpx
from typing import Dict, Any

class NxtGenClient:
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url
        self.email = email
        self.password = password
        self.client = httpx.Client(base_url=self.base_url)
        self.token = None

    def authenticate(self):
        res = self.client.post("/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        res.raise_for_status()
        self.token = res.json()["token"]
        # Update headers for subsequent calls
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    def verify_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.token:
            self.authenticate()
        
        res = self.client.post("/api/invoices/verify", json=invoice_data)
        
        # Specific handling for fraud/duplicates
        data = res.json()
        if res.status_code == 400 and data.get("status") == "DUPLICATE_DETECTED":
            raise ValueError("FRAUD ALERT: Duplicate invoice detected.")
            
        res.raise_for_status()
        return data

# Usage Example
client = NxtGenClient("http://localhost:5001", "lendor@gmail.com", "my_password")

try:
    verification_payload = { ... } # Your invoice JSON
    result = client.verify_invoice(verification_payload)
    print("Verification Passed:", result["verification"]["ai_score"])
except ValueError as e:
    print(str(e))
```

---

## Required Header: Content-Type

When sending payloads via `POST` or `PUT`, ensure your HTTP client includes the `Content-Type: application/json` header (both Axios and `httpx.post(json=...)` do this automatically).

## Error Handling Pattern
The NxtGen API follows a consistent, descriptive error schema. Always check `error.response.data`.

**Schema:**
```json
{
  "error": "Human readable summary",
  "status": "DUPLICATE_DETECTED",         // Optional: Machine-readable state flag
  "details": ["Field missing", ...]      // Optional: Validation array
}
```

**Common HTTP Codes you must handle:**
*   `400 Bad Request`: Validation failure (missing fields).
*   `401 Unauthorized`: Invalid or expired JWT token (re-authenticate).
*   `403 Forbidden`: You are using the wrong account role (e.g. Vendor trying to hit verification endpoint).
*   `409 Conflict`: The invoice was already verified by another lender.

# API Reference

All endpoints are prefixed at the base URL of the Node.js backend (default: `http://localhost:5001`).

**Authentication:** All protected routes require `Authorization: Bearer <JWT>` in the HTTP headers.

---

## Authentication

### `POST /api/auth/login`

Log in and receive a signed JWT. The user is upserted on login — no separate registration required.

**Auth:** None

**Request body:**
```json
{
  "id": "lendor@gmail.com",
  "role": "LENDER"
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | User email or GSTIN |
| `role` | string | One of `ADMIN`, `LENDER`, `VENDOR` |

**Response — 200 OK:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**JWT payload:**
```json
{ "id": "lendor@gmail.com", "role": "LENDER", "iat": 1700000000, "exp": 1700086400 }
```

---

## Invoices

### `POST /api/invoices/upload`

Upload a new invoice. Sets status to `PENDING_VERIFICATION`. The `sellerGSTIN` is always overridden with the authenticated user's ID.

**Auth:** Bearer JWT  
**Roles:** `VENDOR`

**Request body:**
```json
{
  "invoiceNumber": "INV-2024-00441",
  "sellerGSTIN": "29AABCU9603R1ZM",
  "buyerGSTIN": "27AAACM5748Q1ZP",
  "invoiceDate": "2024-11-15",
  "invoiceAmount": 125000.00,
  "irn": "3f4d5e6a7b8c9d0e1f2a3b4c5d6e7f8",
  "irnStatus": "VALID",
  "lineItems": [
    {
      "description": "Cloud Infrastructure Services",
      "quantity": 5,
      "unitPrice": 25000,
      "total": 125000
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `invoiceNumber` | string | ✅ | Unique invoice identifier |
| `sellerGSTIN` | string | ✅ | Supplier's 15-digit GSTIN (overridden with `req.user.id`) |
| `buyerGSTIN` | string | ✅ | Buyer's 15-digit GSTIN |
| `invoiceDate` | string (ISO date) | ✅ | Date of invoice (`YYYY-MM-DD`) |
| `invoiceAmount` | number | ✅ | Total invoice value in INR |
| `irn` | string | ✅ | Invoice Reference Number from NIC portal |
| `irnStatus` | string | ✅ | `VALID`, `CANCELLED`, etc. |
| `lineItems` | array | ✅ | At least one line item |

**Response — 201 Created:**
```json
{
  "message": "Invoice uploaded successfully",
  "data": {
    "id": 47,
    "invoiceNumber": "INV-2024-00441",
    "sellerGSTIN": "29AABCU9603R1ZM",
    "status": "PENDING_VERIFICATION",
    "fraud_score": null,
    "created_at": "2024-11-15T08:22:00.000Z"
  }
}
```

**Error — 409 Conflict (duplicate invoice number):**
```json
{ "error": "Invoice already exists" }
```

**Error — 423 Locked (concurrent upload):**
```json
{ "error": "Concurrent upload in progress for this invoice. Try again shortly." }
```

---

### `POST /api/invoices/verify`

Run the full verification pipeline: duplicate check → AI fraud scoring → audit log write. The `buyerGSTIN` is always overridden with the authenticated user's ID (the lender).

**Auth:** Bearer JWT  
**Roles:** `ADMIN`, `LENDER`

**Request body:** Same schema as `/upload` (all fields required)

**Response — 200 OK (clean invoice):**
```json
{
  "status": "VERIFIED",
  "invoiceHash": "a3f2c91d7e8b4f5c2a1d9e7b6c3f0a4d",
  "fraudScore": 27,
  "riskLevel": "LOW",
  "latency": "142ms"
}
```

**Response — 200 OK (high fraud score):**
```json
{
  "status": "REJECTED_HIGH_RISK",
  "invoiceHash": "b7e4d2c1a9f3b8e5d2c6a1f9b7e4d2c1",
  "fraudScore": 88,
  "riskLevel": "HIGH",
  "latency": "98ms"
}
```

**Response — 200 OK (duplicate detected):**
```json
{
  "status": "DUPLICATE_DETECTED",
  "invoiceHash": "a3f2c91d7e8b4f5c2a1d9e7b6c3f0a4d",
  "fraudScore": 0,
  "riskLevel": "LOW",
  "latency": "12ms"
}
```

**Risk level thresholds:**

| `fraudScore` Range | `riskLevel` |
|---|---|
| 0 – 39 | `LOW` |
| 40 – 74 | `MEDIUM` |
| 75 – 100 | `HIGH` → status becomes `REJECTED_HIGH_RISK` |

---

### `GET /api/invoices/history`

Fetch invoice history, scoped to the caller's role:
- **ADMIN:** all invoices
- **LENDER:** invoices where `buyerGSTIN = req.user.id`
- **VENDOR:** invoices where `sellerGSTIN = req.user.id`

Results are cached in Redis with a 1-hour TTL per user-role pair.

**Auth:** Bearer JWT  
**Roles:** `ADMIN`, `LENDER`, `VENDOR`  
**Query params:** None (pagination NOT yet implemented — full list returned)

**Response — 200 OK:**
```json
{
  "data": [
    {
      "id": 47,
      "invoiceNumber": "INV-2024-00441",
      "sellerGSTIN": "29AABCU9603R1ZM",
      "buyerGSTIN": "27AAACM5748Q1ZP",
      "invoiceDate": "2024-11-15T00:00:00.000Z",
      "invoiceAmount": "125000.00",
      "irn": "3f4d5e6a...",
      "irnStatus": "VALID",
      "lineItems": [...],
      "status": "VERIFIED",
      "fraud_score": "27.00",
      "created_at": "2024-11-15T08:22:00.000Z"
    }
  ],
  "source": "cache"
}
```

The `source` field is either `"cache"` (Redis hit) or `"database"` (fresh query).

---

### `PUT /api/invoices/:id/status`

Update the financing status of an invoice. `:id` is the `invoiceNumber` (not the numeric row ID).

**Auth:** Bearer JWT  
**Roles:** `ADMIN`, `LENDER`

**Request body:**
```json
{ "status": "FINANCED" }
```

| Status | Meaning |
|---|---|
| `FINANCED` | Lender approved and financed the invoice |
| `REJECTED_BY_LENDER` | Lender manually rejected the invoice |
| `CLOSED` | Invoice lifecycle closed |

**Response — 200 OK:**
```json
{
  "message": "Status updated successfully",
  "data": {
    "id": 47,
    "invoiceNumber": "INV-2024-00441",
    "status": "FINANCED",
    ...
  }
}
```

**Error — 400 Bad Request (invalid status):**
```json
{ "error": "Invalid status for manual update" }
```

**Error — 404 Not Found:**
```json
{ "error": "Invoice not found" }
```

---

## Audit Logs

### `GET /api/audit`

Returns paginated audit log entries in reverse chronological order.

**Auth:** Bearer JWT  
**Roles:** `ADMIN`

**Response — 200 OK:**
```json
{
  "data": [
    {
      "id": 157,
      "invoice_hash": "a3f2c91d...",
      "previous_hash": "b7e4d2c1...",
      "current_hash":  "c9f3a2b7...",
      "status": "VERIFIED",
      "fraud_score": "27.00",
      "actor_role": "LENDER",
      "timestamp": "2024-11-15T08:22:01.000Z"
    }
  ]
}
```

---

### `GET /api/audit/verify-chain`

Recomputes and validates the entire hash chain. Returns the first tampered record's ID if integrity is violated.

**Auth:** Bearer JWT  
**Roles:** `ADMIN`

**Response — 200 OK (chain intact):**
```json
{ "isValid": true, "checkedRecords": 157 }
```

**Response — 200 OK (tampered):**
```json
{
  "isValid": false,
  "tamperedIds": [42, 43],
  "message": "Hash chain integrity violation detected"
}
```

---

## Admin

### `GET /api/admin/stats`

Returns system-wide invoice statistics.

**Auth:** Bearer JWT  
**Roles:** `ADMIN`

**Response — 200 OK:**
```json
{
  "totalInvoices": 142,
  "byStatus": {
    "PENDING_VERIFICATION": 8,
    "VERIFIED": 98,
    "REJECTED_HIGH_RISK": 12,
    "DUPLICATE_DETECTED": 7,
    "FINANCED": 25,
    "REJECTED_BY_LENDER": 5,
    "CLOSED": 3
  },
  "totalAuditLogs": 157,
  "fraudScoreDistribution": {
    "LOW": 89,
    "MEDIUM": 32,
    "HIGH": 21
  }
}
```

---

### `GET /api/admin/system-health`

Returns connectivity status and latency for all infrastructure components.

**Auth:** Bearer JWT  
**Roles:** `ADMIN`

**Response — 200 OK:**
```json
{
  "status": "healthy",
  "components": {
    "postgres": { "connected": true, "latencyMs": 14 },
    "redis":    { "connected": true, "latencyMs": 2 },
    "aiService": { "connected": true, "latencyMs": 87 }
  },
  "uptime": "4h 22m"
}
```

---

## Health

### `GET /health`

Infrastructure liveness probe. No authentication required — safe to use as a load balancer health check.

**Auth:** None

**Response — 200 OK:**
```json
{ "status": "ok", "timestamp": "2024-11-15T08:00:00.000Z" }
```

---

## AI Service Endpoints

These are called internally by the Node.js backend. All require `Authorization: Bearer <AI_TOKEN>`.

### `POST /api/v1/score`

Full fraud scoring pipeline: similarity check → rule engine → Isolation Forest → final score.

**Host:** `http://localhost:8000`

**Request body — `InvoiceInput`:**
```json
{
  "invoice_id": "INV-2024-00441",
  "vendor_id":  "29AABCU9603R1ZM",
  "buyer_id":   "27AAACM5748Q1ZP",
  "amount":     125000.00,
  "currency":   "INR",
  "invoice_date": "2024-11-15",
  "due_date":   "2024-12-15",
  "line_items": [
    { "description": "Cloud Infrastructure", "quantity": 5, "unit_price": 25000, "total": 125000 }
  ],
  "invoice_hash": "a3f2c91d7e8b4f5c2a1d9e7b6c3f0a4d"
}
```

**Response — `FraudOutput`:**
```json
{
  "invoice_id":      "INV-2024-00441",
  "fraud_score":     0.2700,
  "risk_level":      "LOW",
  "is_anomaly":      false,
  "triggered_rules": ["HIGH_VALUE_INVOICE"],
  "metadata": {
    "ml_score":           0.0,
    "rule_score":         0.30,
    "highest_similarity": 0.0,
    "ml_error":           null
  }
}
```

---

### `POST /api/v1/check-duplicate`

Similarity-only check (no rule engine or ML). Use for fast duplicate pre-screening.

**Response — `SimilarityOutput`:**
```json
{
  "invoice_id":           "INV-2024-00441",
  "exact_duplicate_found": false,
  "highest_similarity":    0.12,
  "similar_invoice_ids":   []
}
```

---

### `GET /api/v1/health`

AI service liveness probe.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "scaler_loaded": true
}
```

---

## Error Reference

All error responses follow the same schema:

```json
{ "error": "Human-readable error message" }
```

| HTTP Status | When It Occurs |
|---|---|
| `400 Bad Request` | Missing required fields or invalid field values |
| `401 Unauthorized` | Missing, expired, or invalid JWT |
| `403 Forbidden` | Authenticated but role not allowed for this route |
| `404 Not Found` | Invoice number not found in the database |
| `409 Conflict` | Duplicate invoice number already exists |
| `423 Locked` | Concurrent request in progress for same invoice |
| `500 Internal Server Error` | Unhandled exception — check server logs |

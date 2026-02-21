/* ── Invoice Input ─────────────────────────────────── */

export interface LineItem {
    description: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export type IRNStatus = "VALID" | "INVALID" | "CANCELLED";

export interface InvoiceInput {
    invoiceNumber: string;
    sellerGSTIN: string;
    buyerGSTIN: string;
    invoiceDate: string;
    invoiceAmount: number;
    irn?: string;
    irnStatus?: IRNStatus;
    lineItems: LineItem[];
}

/* ── Verification Result ──────────────────────────── */

export type VerificationStatus =
    | "VERIFIED"
    | "DUPLICATE_EXACT"
    | "LOCK_ACQUIRED"
    | "REJECTED_IRN_INVALID"
    | "REJECTED_IRN_CANCELLED";

export interface VerificationLatency {
    canonicalizationMs: number;
    hashingMs: number;
    redisMs: number;
    totalMs: number;
}

export interface VerificationResult {
    status: VerificationStatus;
    invoiceHash: string;
    structureHash: string;
    duplicate: boolean;
    vendorBuyerKey: string;
    latency: VerificationLatency;
}

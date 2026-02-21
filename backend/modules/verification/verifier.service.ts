import { InvoiceInput, VerificationResult, VerificationStatus } from "../../shared/types";
import { normalizeInvoice } from "./canonicalizer";
import { generateInvoiceHash, createStructuralHash } from "./hasher";
import { lockInvoice } from "./redisLock";

export async function verifyInvoice(invoice: InvoiceInput): Promise<VerificationResult> {
    const totalStart = Date.now();

    // ── 1. Canonicalize ────────────────────────────────
    const canonStart = Date.now();
    const normalized = normalizeInvoice(invoice);
    const canonicalizationMs = Date.now() - canonStart;

    // ── 2. Generate hashes ─────────────────────────────
    const hashStart = Date.now();
    const invoiceHash = generateInvoiceHash(normalized);
    const structureHash = createStructuralHash(normalized);
    const hashingMs = Date.now() - hashStart;

    // ── 3. IRN status check ────────────────────────────
    if (normalized.irnStatus === "INVALID") {
        return buildResult("REJECTED_IRN_INVALID", invoiceHash, structureHash, false, normalized, {
            canonicalizationMs,
            hashingMs,
            redisMs: 0,
            totalMs: Date.now() - totalStart,
        });
    }

    if (normalized.irnStatus === "CANCELLED") {
        return buildResult("REJECTED_IRN_CANCELLED", invoiceHash, structureHash, false, normalized, {
            canonicalizationMs,
            hashingMs,
            redisMs: 0,
            totalMs: Date.now() - totalStart,
        });
    }

    // ── 4. Redis duplicate detection ───────────────────
    const redisStart = Date.now();
    const lockAcquired = await lockInvoice(invoiceHash);
    const redisMs = Date.now() - redisStart;

    const status: VerificationStatus = lockAcquired ? "LOCK_ACQUIRED" : "DUPLICATE_EXACT";
    const duplicate = !lockAcquired;

    const totalMs = Date.now() - totalStart;

    return buildResult(status, invoiceHash, structureHash, duplicate, normalized, {
        canonicalizationMs,
        hashingMs,
        redisMs,
        totalMs,
    });
}

function buildResult(
    status: VerificationStatus,
    invoiceHash: string,
    structureHash: string,
    duplicate: boolean,
    invoice: InvoiceInput,
    latency: VerificationResult["latency"],
): VerificationResult {
    return {
        status,
        invoiceHash,
        structureHash,
        duplicate,
        vendorBuyerKey: `${invoice.sellerGSTIN}_${invoice.buyerGSTIN}`,
        latency,
    };
}

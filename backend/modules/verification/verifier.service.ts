import { InvoiceInput, VerificationResult, VerificationStatus } from "../../shared/types";
import { normalizeInvoice } from "./canonicalizer";
import { generateInvoiceHash, createStructuralHash } from "./hasher";
import { lockInvoice } from "./redisLock";
import logger from "../../infrastructure/logger/logger";

// Mock valid IRNs for the hackathon
const VALID_IRNS = new Set(["IRN-123", "IRN-456", "IRN-789", "IRN-999"]);

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

    // ── 3. Mock GST API / IRN status check ─────────────

    // Simulate lookup latency
    await new Promise(resolve => setTimeout(resolve, 80));

    if (normalized.irn) {
        if (!VALID_IRNS.has(normalized.irn)) {
            logger.warn('Mock GST API lookup failed for IRN', { irn: normalized.irn });
            normalized.irnStatus = "INVALID";
        } else {
            logger.info('Mock GST API lookup succeeded for IRN', { irn: normalized.irn });
            normalized.irnStatus = "VALID";
        }
    } else {
        // Fail securely if no IRN is present per new rules
        normalized.irnStatus = "INVALID";
    }

    if (normalized.irnStatus === "INVALID") {
        return buildResult("REJECTED_IRN_INVALID", invoiceHash, structureHash, false, normalized, {
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

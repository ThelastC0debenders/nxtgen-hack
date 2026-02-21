import crypto from "crypto";
import { InvoiceInput } from "../../shared/types";

/** SHA256 of core invoice fields (+ IRN if present) */
export function generateInvoiceHash(invoice: InvoiceInput): string {
    const fields = [
        invoice.invoiceNumber,
        invoice.sellerGSTIN,
        invoice.buyerGSTIN,
        invoice.invoiceDate,
        String(invoice.invoiceAmount),
    ];

    if (invoice.irn) fields.push(invoice.irn);

    const payload = fields.join("|");
    return crypto.createHash("sha256").update(payload).digest("hex");
}

/** SHA256 of sorted lineItems (sku/description, quantity, unitPrice) */
export function createStructuralHash(invoice: InvoiceInput): string {
    const items = [...invoice.lineItems]
        .map((item) => ({
            key: item.sku || item.description,
            qty: item.quantity,
            price: item.unitPrice,
        }))
        .sort((a, b) => a.key.localeCompare(b.key));

    const payload = JSON.stringify(items);
    return crypto.createHash("sha256").update(payload).digest("hex");
}

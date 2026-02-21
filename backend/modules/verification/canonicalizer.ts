import { InvoiceInput } from "../../shared/types";

/** Trim, uppercase GSTINs, normalize date to ISO, stable key order */
export function normalizeInvoice(invoice: InvoiceInput): InvoiceInput {
    const sanitized = sanitizeFields(invoice);
    const irnNormalized = normalizeIRN(sanitized);
    return sortPayload(irnNormalized);
}

/** Trim strings, uppercase GSTINs, normalize date */
export function sanitizeFields(invoice: InvoiceInput): InvoiceInput {
    return {
        ...invoice,
        invoiceNumber: invoice.invoiceNumber.trim(),
        sellerGSTIN: invoice.sellerGSTIN.trim().toUpperCase(),
        buyerGSTIN: invoice.buyerGSTIN.trim().toUpperCase(),
        invoiceDate: new Date(invoice.invoiceDate).toISOString(),
        irn: invoice.irn?.trim(),
        irnStatus: invoice.irnStatus,
        lineItems: invoice.lineItems.map((item) => ({
            ...item,
            description: item.description.trim(),
            sku: item.sku?.trim(),
        })),
    };
}

/** Normalize the IRN field — uppercase and trim */
export function normalizeIRN(invoice: InvoiceInput): InvoiceInput {
    if (!invoice.irn) return invoice;
    return {
        ...invoice,
        irn: invoice.irn.trim().toUpperCase(),
    };
}

/** Return a new object with line items in stable sorted order */
export function sortPayload(invoice: InvoiceInput): InvoiceInput {
    const sortedLineItems = [...invoice.lineItems].sort((a, b) => {
        const skuA = a.sku || a.description;
        const skuB = b.sku || b.description;
        return skuA.localeCompare(skuB);
    });

    return { ...invoice, lineItems: sortedLineItems };
}

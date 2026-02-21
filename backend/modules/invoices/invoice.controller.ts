import { Request, Response } from "express";
import { verifyInvoice } from "../verification/verifier.service";
import { InvoiceInput } from "../../shared/types";

/** POST /api/invoices — submit an invoice for verification */
export async function submitInvoice(req: Request, res: Response): Promise<void> {
    const body = req.body as InvoiceInput;

    // Basic field validation
    const missing = validateRequired(body);
    if (missing.length > 0) {
        res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
        return;
    }

    try {
        const result = await verifyInvoice(body);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
}

function validateRequired(body: InvoiceInput): string[] {
    const missing: string[] = [];
    if (!body.invoiceNumber) missing.push("invoiceNumber");
    if (!body.sellerGSTIN) missing.push("sellerGSTIN");
    if (!body.buyerGSTIN) missing.push("buyerGSTIN");
    if (!body.invoiceDate) missing.push("invoiceDate");
    if (body.invoiceAmount == null) missing.push("invoiceAmount");
    if (!body.lineItems || body.lineItems.length === 0) missing.push("lineItems");
    return missing;
}

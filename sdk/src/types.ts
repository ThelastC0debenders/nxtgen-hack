export interface InvoicePayload {
    invoiceNumber: string;
    buyerGSTIN: string;
    sellerGSTIN: string;
    invoiceAmount: number;
    invoiceDate: string;
    irn: string;
    irnStatus?: string;
    lineItems?: Array<{
        description?: string;
        quantity?: number;
        unitPrice?: number;
        total?: number;
    }>;
}

export interface FraudReport {
    status: string;
    fraudScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    duplicate: boolean;
    message?: string;
    invoiceHash?: string;
    triggeredRules?: string[];
    metadata?: any;
}

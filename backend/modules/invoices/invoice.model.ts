export interface Invoice {
  id?: number;
  invoiceNumber: string; // The unique identifier for the invoice
  sellerGSTIN: string;
  buyerGSTIN: string;
  invoiceDate: string | Date;
  invoiceAmount: number;
  irn: string;
  irnStatus: string;
  lineItems: any[];
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'DUPLICATE_DETECTED' | 'FINANCED' | 'REJECTED_BY_LENDER';
  fraud_score?: number;
  metadata?: any;
  created_at?: Date;
}

export const InvoiceSchemaSQL = `
  CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    "invoiceNumber" VARCHAR(255) UNIQUE NOT NULL,
    "sellerGSTIN" VARCHAR(255) NOT NULL,
    "buyerGSTIN" VARCHAR(255) NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "invoiceAmount" DECIMAL(15, 2) NOT NULL,
    irn VARCHAR(255) NOT NULL,
    "irnStatus" VARCHAR(50) NOT NULL,
    "lineItems" JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    fraud_score NUMERIC(5, 2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoices("invoiceNumber");
  CREATE INDEX IF NOT EXISTS idx_seller_gstin ON invoices("sellerGSTIN");
  CREATE INDEX IF NOT EXISTS idx_buyer_gstin ON invoices("buyerGSTIN");
`;

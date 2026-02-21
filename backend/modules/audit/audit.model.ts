export interface AuditLog {
    id?: number;
    invoice_hash: string;
    previous_hash: string;
    current_hash: string;
    status: string;
    fraud_score?: number;
    actor_role: string;
    timestamp?: Date;
}

// These are typescript interfaces, the actual table creation should be done 
// via migrations or an initialization script, but we represent the schema here.
export const AuditLogSchemaSQL = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    invoice_hash VARCHAR(255) NOT NULL,
    previous_hash VARCHAR(255) NOT NULL,
    current_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    fraud_score NUMERIC(5, 2),
    actor_role VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_audit_invoice_hash ON audit_logs(invoice_hash);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
`;

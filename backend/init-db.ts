import { query } from './infrastructure/db/postgres';
import { connectDB } from './infrastructure/db/postgres';
import { InvoiceSchemaSQL } from './modules/invoices/invoice.model';
import { AuditLogSchemaSQL } from './modules/audit/audit.model';
import { AuthSchemaSQL } from './modules/auth/auth.model';
import logger from './infrastructure/logger/logger';

async function initDB() {
    await connectDB();

    logger.info('Creating tables...');

    await query(AuthSchemaSQL);
    logger.info('✅ auth (RBAC & sessions) tables ready');

    await query(InvoiceSchemaSQL);
    logger.info('✅ invoices table ready');

    await query(AuditLogSchemaSQL);
    logger.info('✅ audit_logs table ready');

    logger.info('Database initialized successfully!');
    process.exit(0);
}

initDB().catch((err) => {
    logger.error('Failed to initialize database', err);
    process.exit(1);
});

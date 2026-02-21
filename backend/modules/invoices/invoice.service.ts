import { query } from '../../infrastructure/db/postgres';
import { FraudService } from '../fraud/fraud.service';
import { AuditService } from '../audit/audit.service';
import logger from '../../infrastructure/logger/logger';
import crypto from 'crypto';

export class InvoiceService {
    /**
     * Pure business logic coordinating the verification flow.
     */
    static async processVerification(payload: any, userRole: string) {
        const startTime = Date.now();
        logger.info('Starting invoice verification process', { invoiceNumber: payload.invoiceNumber });

        try {
            // 1. Check for duplicates in the DB first
            // We only consider it a duplicate if it's already been processed (not PENDING_VERIFICATION)
            const duplicateCheck = await query(`SELECT id, status FROM invoices WHERE "invoiceNumber" = $1`, [payload.invoiceNumber]);

            let invoiceStatus = 'VERIFIED';
            let fraudScoreResult = { score: 0, riskLevel: 'LOW' };

            if (duplicateCheck.rows.length > 0 && duplicateCheck.rows[0].status !== 'PENDING_VERIFICATION') {
                invoiceStatus = 'DUPLICATE_DETECTED';
                logger.warn('Duplicate invoice detected', { invoiceNumber: payload.invoiceNumber, existingStatus: duplicateCheck.rows[0].status });
            } else {
                // 2. If not duplicate or if it is just pending → call fraudService.getFraudScore()
                fraudScoreResult = await FraudService.getFraudScore(payload);
                if (fraudScoreResult.score > 75) {
                    invoiceStatus = 'REJECTED'; // High fraud
                }
            }

            // Generate a hash representing this specific invoice payload for audit
            const payloadString = JSON.stringify(payload);
            const invoiceHash = crypto.createHash('sha256').update(payloadString).digest('hex');

            // 3. Call auditService.writeAuditLog()
            await AuditService.writeAuditLog({
                invoice_hash: invoiceHash,
                status: invoiceStatus,
                fraud_score: fraudScoreResult.score,
                actor_role: userRole
            });

            const latency = Date.now() - startTime;

            return {
                status: invoiceStatus,
                invoiceHash,
                fraudScore: fraudScoreResult.score,
                riskLevel: fraudScoreResult.riskLevel,
                latency: `${latency}ms`
            };

        } catch (error) {
            logger.error('Error in processing verification', error);
            throw error;
        }
    }

    /**
     * Stores the invoice record in Postgres.
     */
    static async saveInvoiceRecord(data: any) {
        try {
            const result = await query(
                `INSERT INTO invoices ("invoiceNumber", "sellerGSTIN", "buyerGSTIN", "invoiceDate", "invoiceAmount", irn, "irnStatus", "lineItems", status, fraud_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT ("invoiceNumber") DO UPDATE SET status = EXCLUDED.status, fraud_score = EXCLUDED.fraud_score
         RETURNING *`,
                [data.invoiceNumber, data.sellerGSTIN, data.buyerGSTIN, data.invoiceDate, data.invoiceAmount, data.irn, data.irnStatus, JSON.stringify(data.lineItems), data.status, data.fraud_score || null]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Failed to save invoice record', error);
            throw error;
        }
    }

    /**
     * Returns filtered invoices based on user role and id.
     */
    static async fetchHistoryByUser(userId: string, role: string) {
        try {
            let result;
            if (role === 'LENDER') {
                result = await query(`SELECT * FROM invoices WHERE "buyerGSTIN" = $1 ORDER BY created_at DESC`, [userId]);
            } else if (role === 'VENDOR') {
                result = await query(`SELECT * FROM invoices WHERE "sellerGSTIN" = $1 ORDER BY created_at DESC`, [userId]);
            } else if (role === 'ADMIN') {
                result = await query(`SELECT * FROM invoices ORDER BY created_at DESC`);
            } else {
                return [];
            }
            return result.rows;
        } catch (error) {
            logger.error('Failed to fetch invoice history', error);
            throw error;
        }
    }
}

import { query } from '../../infrastructure/db/postgres';
import redisClient from '../../infrastructure/db/redis';
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
     * Checks if an invoice exists by number
     */
    static async getInvoiceByNumber(invoiceNumber: string) {
        const result = await query(`SELECT id, status FROM invoices WHERE "invoiceNumber" = $1`, [invoiceNumber]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Stores the invoice record in Postgres and invalidates history caches.
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

            // Clear Redis cache so changes reflect instantly
            if (redisClient.isOpen) {
                const keys = await redisClient.keys('history:*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                    logger.info('Deleted stale history caches from Redis');
                }
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to save invoice record', error);
            throw error;
        }
    }

    /**
     * Returns filtered invoices based on user role and id, utilizes Redis caching.
     */
    static async fetchHistoryByUser(userId: string, role: string) {
        try {
            const cacheKey = `history:${role}:${userId}`;

            // Check Cache
            if (redisClient.isOpen) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    logger.info('Cache hit! Served history from Redis', { cacheKey });
                    return JSON.parse(cached); // Return immediately (0ms DB delay)
                }
            }

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

            // Save to Redis Cache for future calls (Expires in 1 hour)
            if (redisClient.isOpen && result.rows) {
                await redisClient.set(cacheKey, JSON.stringify(result.rows), { EX: 3600 });
                logger.info('Saved history to Redis cache', { cacheKey });
            }

            return result.rows;
        } catch (error) {
            logger.error('Failed to fetch invoice history', error);
            throw error;
        }
    }

    /**
     * Updates an invoice status (e.g. from VERIFIED to FINANCED)
     */
    static async updateInvoiceStatus(invoiceNumber: string, status: string, userRole: string) {
        try {
            // First check if it exists
            const existing = await this.getInvoiceByNumber(invoiceNumber);
            if (!existing) {
                throw new Error('INVOICE_NOT_FOUND');
            }

            // Update status
            const result = await query(
                `UPDATE invoices SET status = $1 WHERE "invoiceNumber" = $2 RETURNING *`,
                [status, invoiceNumber]
            );

            const updatedInvoice = result.rows[0];

            // Write an audit log for this state change
            const payloadString = JSON.stringify(updatedInvoice);
            const invoiceHash = crypto.createHash('sha256').update(payloadString).digest('hex');

            await AuditService.writeAuditLog({
                invoice_hash: invoiceHash,
                status: status,
                fraud_score: updatedInvoice.fraud_score || 0,
                actor_role: userRole
            });

            // Invalidate cache
            if (redisClient.isOpen) {
                const keys = await redisClient.keys('history:*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                    logger.info('Deleted stale history caches from Redis after status update');
                }
            }

            return updatedInvoice;
        } catch (error) {
            logger.error('Failed to update invoice status', error);
            throw error;
        }
    }
}

import { query } from '../../infrastructure/db/postgres';
import { HashChain } from './hashChain';
import logger from '../../infrastructure/logger/logger';

export class AuditService {
    /**
     * Writes a new audit log record, maintaining the hash chain.
     */
    static async writeAuditLog(data: { invoice_hash: string; status: string; fraud_score?: number; actor_role: string }) {
        try {
            // 1. Get the last hash from the database
            const lastRecordRes = await query(`
        SELECT current_hash 
        FROM audit_logs 
        ORDER BY id DESC 
        LIMIT 1
      `);

            const previousHash = lastRecordRes.rows.length > 0 ? lastRecordRes.rows[0].current_hash : 'GENESIS_HASH';

            // 2. Generate new hash via hashChain.generateHash()
            const timestamp = new Date();
            const currentHash = HashChain.generateHash(previousHash, data.invoice_hash, timestamp);

            // 3. Insert record into DB
            const result = await query(
                `INSERT INTO audit_logs (invoice_hash, previous_hash, current_hash, status, fraud_score, actor_role, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
                [data.invoice_hash, previousHash, currentHash, data.status, data.fraud_score || null, data.actor_role, timestamp]
            );

            logger.info('Audit log written successfully', { id: result.rows[0].id, currentHash });
            return result.rows[0];
        } catch (error) {
            logger.error('Failed to write audit log', error);
            throw error;
        }
    }

    /**
     * Fetches audit logs ordered by timestamp.
     */
    static async getAuditLogs(limit: number = 50, offset: number = 0) {
        try {
            const result = await query(
                `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            const countResult = await query(`SELECT COUNT(*) FROM audit_logs`);

            return {
                logs: result.rows,
                total: parseInt(countResult.rows[0].count, 10),
            };
        } catch (error) {
            logger.error('Failed to fetch audit logs', error);
            throw error;
        }
    }

    /**
     * Iterates through logs, verifies matching previous_hash and recomputes current_hash.
     */
    static async verifyHashChain() {
        try {
            const result = await query(`SELECT * FROM audit_logs ORDER BY id ASC`);
            const logs = result.rows;

            if (logs.length === 0) {
                return { isValid: true, message: 'Ledger is empty.' };
            }

            let expectedPreviousHash = 'GENESIS_HASH';
            let tamperedRecords = [];

            for (const log of logs) {
                // Confirm previous_hash matches
                if (log.previous_hash !== expectedPreviousHash) {
                    tamperedRecords.push({ id: log.id, reason: 'Broken Chain: previous_hash mismatch' });
                }

                // Recompute hash
                const isValidHash = HashChain.validateHash({
                    previous_hash: log.previous_hash,
                    invoice_hash: log.invoice_hash,
                    timestamp: log.timestamp,
                    current_hash: log.current_hash
                });

                if (!isValidHash) {
                    tamperedRecords.push({ id: log.id, reason: 'Tampered Record: Invalid current_hash' });
                }

                expectedPreviousHash = log.current_hash;
            }

            if (tamperedRecords.length > 0) {
                logger.warn('Ledger integrity compromised', { count: tamperedRecords.length });
                return { isValid: false, tamperedRecords };
            }

            return { isValid: true, message: 'Ledger integrity verified successfully.' };
        } catch (error) {
            logger.error('Failed to verify hash chain', error);
            throw error;
        }
    }
}

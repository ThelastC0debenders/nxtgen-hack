import { Request, Response } from 'express';
import { AuditService } from './audit.service';
import logger from '../../infrastructure/logger/logger';

export class AuditController {
    /**
     * Admin only endpoint to get paginated audit logs.
     */
    static async getAuditLogs(req: Request, res: Response): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const logs = await AuditService.getAuditLogs(limit, offset);
            res.status(200).json({ data: logs });
        } catch (error) {
            logger.error('Error fetching audit logs', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Admin only endpoint to verify the cryptographic integrity of the ledger.
     */
    static async verifyLedgerIntegrity(req: Request, res: Response): Promise<void> {
        try {
            const integrityResult = await AuditService.verifyHashChain();

            const statusCode = integrityResult.isValid ? 200 : 409; // 409 Conflict if tampered
            res.status(statusCode).json({ data: integrityResult });
        } catch (error) {
            logger.error('Error verifying ledger integrity', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

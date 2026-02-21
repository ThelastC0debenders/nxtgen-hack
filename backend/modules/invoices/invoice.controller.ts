import { Request, Response } from 'express';
import { InvoiceService } from './invoice.service';
import { RedisLock } from '../verification/redisLock';
import { FraudService } from '../fraud/fraud.service';
import logger from '../../infrastructure/logger/logger';

export class InvoiceController {
    /**
     * Main orchestration endpoint.
     * Flow: Validate -> Lock -> Service verify -> Save -> Respond -> Unlock
     */
    static async verifyInvoice(req: Request, res: Response): Promise<void> {
        const payload = req.body;
        const lockKey = `lock:verify:${payload.invoiceNumber}`;
        let lockAcquired = false;

        try {
            const userRole = (req as any).user?.role || 'SYSTEM'; // Fallback if auth missing
            const userId = (req as any).user?.id;

            // Force the buyer identifier to be the logged-in user's ID if lender
            if (userRole === 'LENDER' && userId) {
                payload.buyerGSTIN = userId;
            }

            // Basic validation
            if (!payload.invoiceNumber || !payload.sellerGSTIN || !payload.buyerGSTIN || !payload.invoiceAmount || !payload.invoiceDate || !payload.irn || !payload.irnStatus || !payload.lineItems) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            // 1. Acquire Distributed Lock (10s TTL for AI processing buffer)
            lockAcquired = await RedisLock.acquireLock(lockKey, 10000);
            if (!lockAcquired) {
                logger.warn('Verification lock collision', { invoiceNumber: payload.invoiceNumber });
                res.status(429).json({ error: 'Verification currently in progress. Please wait.' });
                return;
            }

            // 2. Call verification flow
            const verificationResult = await InvoiceService.processVerification(payload, userRole);

            // 3. Save invoice to DB
            const invoiceRecordData = {
                ...payload,
                status: verificationResult.status,
                fraud_score: verificationResult.fraudScore,
                metadata: { triggered_rules: verificationResult.triggeredRules || [] }
            };

            await InvoiceService.saveInvoiceRecord(invoiceRecordData);

            // Return final response
            res.status(200).json(verificationResult);
        } catch (error: any) {
            logger.error('verifyInvoice controller error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            if (lockAcquired) {
                await RedisLock.releaseLock(lockKey);
            }
        }
    }

    /**
     * Used for Vendor role to just upload and set status to PENDING_VERIFICATION.
     */
    static async uploadInvoice(req: Request, res: Response): Promise<void> {
        const payload = req.body;
        const lockKey = `lock:upload:${payload.invoiceNumber}`;
        let lockAcquired = false;

        try {
            // Force the seller identifier to be the logged-in user's ID
            const userId = (req as any).user?.id;
            if (userId) {
                payload.sellerGSTIN = userId;
            }

            if (!payload.invoiceNumber || !payload.sellerGSTIN || !payload.buyerGSTIN || !payload.invoiceAmount || !payload.invoiceDate || !payload.irn || !payload.irnStatus || !payload.lineItems) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            // 1. Acquire lock (5s TTL)
            lockAcquired = await RedisLock.acquireLock(lockKey, 5000);
            if (!lockAcquired) {
                logger.warn('Upload lock collision', { invoiceNumber: payload.invoiceNumber });
                res.status(429).json({ error: 'Upload currently in progress. Please wait.' });
                return;
            }

            // 2. Explicit duplicate check before saving to prevent resetting a VERIFIED invoice
            const existing = await InvoiceService.getInvoiceByNumber(payload.invoiceNumber);
            if (existing) {
                logger.warn('Attempted to upload an invoice that already exists', { invoiceNumber: payload.invoiceNumber });
                res.status(409).json({ error: 'Invoice already exists in database.' });
                return;
            }

            // Evaluate the fraud score using AI before saving
            const fraudResult = await FraudService.getFraudScore(payload);

            const newInvoice = {
                ...payload,
                status: 'PENDING_VERIFICATION',
                fraud_score: fraudResult.score,
                metadata: { triggered_rules: fraudResult.triggeredRules || [] }
            };

            // 3. Save
            const saved = await InvoiceService.saveInvoiceRecord(newInvoice);
            res.status(201).json({ message: 'Invoice uploaded successfully', data: saved });
        } catch (error: any) {
            logger.error('uploadInvoice controller error', error);
            // Catch Postgres Unique Constraint violations explicitly
            if (error.code === '23505') {
                res.status(409).json({ error: 'Invoice already exists in database.' });
                return;
            }
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            if (lockAcquired) {
                await RedisLock.releaseLock(lockKey);
            }
        }
    }

    /**
     * Fetch invoices based on user role context.
     */
    static async getInvoiceHistory(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;

            if (!user || !user.id || !user.role) {
                res.status(401).json({ error: 'Unauthorized: Missing user context' });
                return;
            }

            const history = await InvoiceService.fetchHistoryByUser(user.id, user.role);
            res.status(200).json({ data: history });
        } catch (error: any) {
            logger.error('getInvoiceHistory controller error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Update the status of an invoice.
     * Accessible by LENDER and ADMIN roles.
     */
    static async updateStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = (req as any).user;

            if (!id || !status) {
                res.status(400).json({ error: 'Invoice ID and status are required' });
                return;
            }

            // Optional: validate that status is one of the allowed transitions
            const allowedStatuses = ['FINANCED', 'REJECTED_BY_LENDER', 'CLOSED'];
            if (!allowedStatuses.includes(status)) {
                res.status(400).json({ error: 'Invalid status for manual update' });
                return;
            }

            const updatedInvoice = await InvoiceService.updateInvoiceStatus(id as string, status, user.role);

            res.status(200).json({ message: 'Status updated successfully', data: updatedInvoice });
        } catch (error: any) {
            logger.error('updateStatus controller error', error);
            if (error.message === 'INVOICE_NOT_FOUND') {
                res.status(404).json({ error: 'Invoice not found' });
                return;
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

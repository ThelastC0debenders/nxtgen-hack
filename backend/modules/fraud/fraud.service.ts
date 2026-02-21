import { AIClient } from './aiClient';
import logger from '../../infrastructure/logger/logger';

export class FraudService {
    /**
     * Wrapper around aiClient.scoreInvoice().
     * Adds fallback logic (if AI down) with default score = 0.
     */
    static async getFraudScore(invoiceData: any): Promise<{ score: number; riskLevel: string }> {
        logger.info('Requesting fraud score for invoice', { invoiceId: invoiceData.invoice_id });

        // Attempt to get score from AI Service
        const aiResult = await AIClient.scoreInvoice(invoiceData);

        if (aiResult !== null) {
            return aiResult;
        }

        // Fallback logic if AI service fails or times out
        logger.warn('AI Service failed, applying fallback fraud score of 0 for invoice', { invoiceId: invoiceData.invoice_id });
        return {
            score: 0,
            riskLevel: 'UNKNOWN (AI OFFLINE)'
        };
    }
}

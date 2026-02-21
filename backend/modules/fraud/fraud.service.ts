import { AIClient } from './aiClient';
import logger from '../../infrastructure/logger/logger';

export class FraudService {
    /**
     * Wrapper around aiClient.scoreInvoice().
     * Adds fallback logic (if AI down) with default score = 0.
     */
    static async getFraudScore(invoiceData: any): Promise<{ score: number; riskLevel: string }> {
        logger.info('Requesting fraud score for invoice', { invoiceId: invoiceData.invoiceNumber });

        // Map invoiceData to FastAPI schema
        let dueDate = invoiceData.dueDate || invoiceData.dueDateStr || null;
        let lineItems = invoiceData.lineItems || [];
        if (typeof lineItems === 'string') {
            try { lineItems = JSON.parse(lineItems); } catch (e) { }
        }

        const aiPayload = {
            invoice_id: invoiceData.invoiceNumber || 'UNKNOWN',
            vendor_id: invoiceData.sellerGSTIN || 'UNKNOWN',
            buyer_id: invoiceData.buyerGSTIN || 'UNKNOWN',
            amount: parseFloat(invoiceData.invoiceAmount) || 0.0,
            currency: "INR",
            invoice_date: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            due_date: dueDate ? new Date(dueDate).toISOString().split('T')[0] : null,
            line_items: lineItems.map((item: any) => ({
                description: item.description || item.itemName || "Item",
                quantity: parseFloat(item.quantity) || 1.0,
                unit_price: parseFloat(item.unitPrice || item.rate || item.price) || 0.0,
                total: parseFloat(item.total || item.amount || item.totalAmount) || 0.0
            }))
        };

        // Attempt to get score from AI Service
        const aiResult = await AIClient.scoreInvoice(aiPayload);

        if (aiResult !== null) {
            return {
                score: Math.round(aiResult.fraud_score * 100), // Scale 0.0-1.0 to 0-100
                riskLevel: aiResult.risk_level
            };
        }

        // Fallback logic if AI service fails or times out
        logger.warn('AI Service failed, applying fallback fraud score of 0 for invoice', { invoiceId: invoiceData.invoiceNumber });
        return {
            score: 0,
            riskLevel: 'UNKNOWN (AI OFFLINE)'
        };
    }
}

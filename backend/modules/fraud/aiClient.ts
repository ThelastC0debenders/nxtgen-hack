import axios from 'axios';
import logger from '../../infrastructure/logger/logger';
import dotenv from 'dotenv';

dotenv.config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '5000', 10);

export class AIClient {
    /**
     * Sends POST request to FastAPI to score the invoice for fraud.
     * Handles timeout and returns AI response.
     */
    static async scoreInvoice(payload: any): Promise<{ score: number; riskLevel: string } | null> {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/score`, payload, {
                timeout: AI_TIMEOUT_MS,
            });

            logger.info('Received fraud score from AI service', { score: response.data.score });
            return response.data;
        } catch (error: any) {
            logger.error('Failed to get fraud score from AI service', {
                message: error.message,
                code: error.code,
            });
            return null;
        }
    }

    /**
     * Ping AI /health endpoint to check system status
     */
    static async checkAIHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 2000 });
            return response.status === 200;
        } catch (error) {
            logger.warn('AI Service is unreachable for health check');
            return false;
        }
    }
}

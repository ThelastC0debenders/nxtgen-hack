import { query } from '../../infrastructure/db/postgres';
import { pingRedis } from '../../infrastructure/db/redis';
import { AIClient } from '../fraud/aiClient';
import logger from '../../infrastructure/logger/logger';

export class AdminService {
    /**
     * Aggregates DB queries to calculate system stats.
     */
    static async calculateStats() {
        try {
            const totalInvoicesRes = await query(`SELECT COUNT(*) as count FROM invoices`);
            const duplicatesRes = await query(`SELECT COUNT(*) as count FROM invoices WHERE status = 'DUPLICATE_DETECTED'`);
            const avgFraudScoreRes = await query(`SELECT AVG(fraud_score) as avg FROM invoices WHERE fraud_score IS NOT NULL`);
            const highRiskCountRes = await query(`SELECT COUNT(*) as count FROM invoices WHERE fraud_score > 75`);

            return {
                totalInvoices: parseInt(totalInvoicesRes.rows[0].count, 10),
                duplicatesBlocked: parseInt(duplicatesRes.rows[0].count, 10),
                avgFraudScore: parseFloat(avgFraudScoreRes.rows[0].avg) || 0,
                highRiskCount: parseInt(highRiskCountRes.rows[0].count, 10),
            };
        } catch (error) {
            logger.error('Failed to calculate system stats', error);
            throw error;
        }
    }

    /**
     * Checks dependencies: Redis, Postgres, AI
     */
    static async checkDependencies() {
        let dbStatus = 'DOWN';
        let redisStatus = 'DOWN';
        let aiStatus = 'DOWN';

        try {
            await query(`SELECT 1`);
            dbStatus = 'UP';
        } catch (e) {
            logger.warn('Postgres connection check failed in health ping');
        }

        try {
            const isRedisUp = await pingRedis();
            if (isRedisUp) redisStatus = 'UP';
        } catch (e) {
            logger.warn('Redis connection check failed in health ping');
        }

        try {
            const isAiUp = await AIClient.checkAIHealth();
            if (isAiUp) aiStatus = 'UP';
        } catch (e) {
            logger.warn('AI service connection check failed in health ping');
        }

        return {
            db: dbStatus,
            redis: redisStatus,
            ai: aiStatus,
        };
    }
}

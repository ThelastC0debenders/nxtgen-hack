import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import logger from '../../infrastructure/logger/logger';

export class AdminController {
    /**
     * Returns aggregated general platform statistics.
     */
    static async getSystemStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await AdminService.calculateStats();
            res.status(200).json({ data: stats });
        } catch (error) {
            logger.error('Error fetching system stats', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Returns health status of connected dependencies (Postgres, Redis, AI).
     */
    static async getSystemHealth(req: Request, res: Response): Promise<void> {
        try {
            const health = await AdminService.checkDependencies();

            const isHealthy = health.db === 'UP' && health.redis === 'UP';
            const statusCode = isHealthy ? 200 : 503;

            res.status(statusCode).json({ status: isHealthy ? 'OK' : 'DEGRADED', dependencies: health });
        } catch (error) {
            logger.error('Error fetching system health', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

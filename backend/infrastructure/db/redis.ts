import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from '../logger/logger'; // Assuming logger exists

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
    logger.error('Redis Client Error', err);
});

export const initRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            logger.info('Connected to Redis successfully');
        }
    } catch (err) {
        logger.error('Failed to connect to Redis', err);
        process.exit(1);
    }
};

export const pingRedis = async (): Promise<boolean> => {
    try {
        const response = await redisClient.ping();
        return response === 'PONG';
    } catch (err) {
        logger.error('Redis ping failed', err);
        return false;
    }
};

export default redisClient;

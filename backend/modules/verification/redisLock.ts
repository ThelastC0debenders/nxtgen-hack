import redisClient from '../../infrastructure/db/redis';
import logger from '../../infrastructure/logger/logger';

const LOCK_TTL_MS = 3600000; // 1 hour
const KEY_PREFIX = 'invoice:lock:';

export class RedisLock {
    /**
     * Acquires a distributed lock for a given key to prevent race conditions.
     * @param key The unique key to lock (e.g., 'lock:upload:INV-001')
     * @param ttlMs Time to live in milliseconds before auto-releasing
     * @returns Boolean indicating if lock was successfully acquired
     */
    static async acquireLock(key: string, ttlMs: number = 5000): Promise<boolean> {
        try {
            if (!redisClient.isOpen) {
                logger.warn('Redis client is not open, bypassing lock to prevent halting');
                return true;
            }

            // Using SET NX (Not eXists) to safely acquire a lock atomically
            const result = await redisClient.set(key, 'LOCKED', {
                NX: true,
                PX: ttlMs
            });

            return result === 'OK';
        } catch (error) {
            logger.error('Failed to acquire Redis lock', { key, error });
            return true; // Failsafe allows progress, falling back to DB constraints
        }
    }

    /**
     * Releases a previously acquired lock.
     * @param key The unique key to release
     */
    static async releaseLock(key: string): Promise<void> {
        try {
            if (!redisClient.isOpen) return;
            await redisClient.del(key);
        } catch (error) {
            logger.error('Failed to release Redis lock', { key, error });
        }
    }
}

/**
 * Try to acquire a lock for an invoice hash.
 * Returns true if lock acquired (new invoice), false if duplicate.
 */
export async function lockInvoice(hash: string): Promise<boolean> {
    return RedisLock.acquireLock(`${KEY_PREFIX}${hash}`, LOCK_TTL_MS);
}


import { getRedis } from "../../infrastructure/db/redis";

const LOCK_TTL_SECONDS = 3600; // 1 hour
const KEY_PREFIX = "invoice:lock:";

/** Check if this hash already exists in Redis */
export async function checkDuplicate(hash: string): Promise<boolean> {
    const redis = await getRedis();
    const exists = await redis.exists(`${KEY_PREFIX}${hash}`);
    return exists === 1;
}

/**
 * Try to acquire a lock for this hash using SETNX.
 * Returns true if lock acquired (new invoice), false if duplicate.
 */
export async function lockInvoice(hash: string): Promise<boolean> {
    const redis = await getRedis();
    const result = await redis.set(`${KEY_PREFIX}${hash}`, Date.now().toString(), {
        NX: true,
        EX: LOCK_TTL_SECONDS,
    });
    return result === "OK";
}

import { query } from './infrastructure/db/postgres';
import redisClient from './infrastructure/db/redis';

async function checkState() {
    console.log("--- POSTGRES: INVOICES ---");
    const inv = await query(`SELECT id, "invoiceNumber", status FROM invoices`);
    console.log(inv.rows);

    console.log("--- POSTGRES: AUDIT LOGS ---");
    const aud = await query(`SELECT id, status, invoice_hash FROM audit_logs`);
    console.log(aud.rows);

    if (redisClient.isOpen) {
        console.log("--- REDIS: FLUSHING CACHE ---");
        await redisClient.flushAll();
        console.log("Cache flushed");
        await redisClient.quit();
    }
}

// connect redis and run
require('./infrastructure/db/redis').initRedis().then(() => {
    checkState().then(() => process.exit(0));
});

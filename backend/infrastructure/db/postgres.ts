import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from '../logger/logger'; // Assuming a logger exists, or we will create one

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nxtgen_hack',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

export const connectDB = async () => {
    try {
        const client = await pool.connect();
        logger.info('Connected to PostgreSQL successfully');
        client.release();
    } catch (err) {
        logger.error('Failed to connect to PostgreSQL', err);
        process.exit(1);
    }
};

export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        logger.error('Database query error', { text, err });
        throw err;
    }
};

export default pool;

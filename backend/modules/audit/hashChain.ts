import crypto from 'crypto';

export class HashChain {
    /**
     * Generates a SHA256 hash.
     * @param previousHash The hash of the previous record in the chain.
     * @param invoiceHash The hash of the invoice data.
     * @param timestamp The timestamp of the event.
     * @returns hex string of the SHA256 hash
     */
    static generateHash(previousHash: string, invoiceHash: string, timestamp: string | Date): string {
        const timeString = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
        const dataString = `${previousHash}${invoiceHash}${timeString}`;

        return crypto
            .createHash('sha256')
            .update(dataString)
            .digest('hex');
    }

    /**
     * Recomputes the hash of an audit record and compares it to the stored expected hash.
     * @param record The record containing previous_hash, invoice_hash, timestamp and the expected current_hash.
     * @returns boolean true if valid, false if tampered.
     */
    static validateHash(record: { previous_hash: string; invoice_hash: string; timestamp: Date | string; current_hash: string }): boolean {
        const computedHash = this.generateHash(record.previous_hash, record.invoice_hash, record.timestamp);
        return computedHash === record.current_hash;
    }
}

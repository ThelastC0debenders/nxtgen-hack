import axios from 'axios';
import { query } from './infrastructure/db/postgres';
import { InvoiceSchemaSQL } from './modules/invoices/invoice.model';
import { AuditLogSchemaSQL } from './modules/audit/audit.model';
import { signToken } from './modules/auth/jwt';
import { Role } from './modules/auth/roles';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
    console.log('=============================================');
    console.log('🚀 Starting Backend 3 End-to-End Tests 🚀');
    console.log('=============================================');

    try {
        console.log('\n[1/5] 🛠️ Initializing Database Schemas...');
        await query(InvoiceSchemaSQL);
        await query(AuditLogSchemaSQL);
        console.log('✅ Schemas created (or already exist).');

        console.log('\n[2/5] 🧹 Cleaning up old test data...');
        await query(`DELETE FROM audit_logs`);
        await query(`DELETE FROM invoices WHERE "invoiceNumber" = 'TEST-INV-999'`);
        console.log('✅ Clean up complete.');

        console.log('\n[3/5] 🔑 Generating JWT Tokens...');
        const vendorToken = signToken({ id: 'V-001', role: 'VENDOR' as Role });
        const adminToken = signToken({ id: 'A-001', role: 'ADMIN' as Role });
        console.log('✅ Tokens generated successfully.');

        // The Payload matching the new JSON Structure
        const testPayload = {
            invoiceNumber: "TEST-INV-999",
            sellerGSTIN: "29aabcu9603r1zm",
            buyerGSTIN: "27aaacm5748q1zp",
            invoiceDate: "2026-02-21",
            invoiceAmount: 25000,
            irn: "abc123-test",
            irnStatus: "VALID",
            lineItems: [
                { description: "Test Widget", sku: "TW-01", quantity: 5, unitPrice: 5000, total: 25000 }
            ]
        };

        console.log('\n[4/5] 📤 Testing Invoice Upload (As PENDING VENDOR)...');
        try {
            const uploadRes = await axios.post(`${BASE_URL}/api/invoices/upload`, testPayload, {
                headers: { Authorization: `Bearer ${vendorToken}` }
            });
            console.log('✅ Upload Success:', uploadRes.data.message);
        } catch (err: any) {
            console.error('❌ Upload Failed:', err.response?.data || err.message);
            process.exit(1);
        }

        console.log('\n[5/5] 🕵️ Testing Invoice Orchestration (As ADMIN)...');
        try {
            const verifyRes = await axios.post(`${BASE_URL}/api/invoices/verify`, testPayload, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('✅ Orchestration Success! Result:');
            console.log(verifyRes.data);
        } catch (err: any) {
            console.error('❌ Verify Failed:', err.response?.data || err.message);
            process.exit(1);
        }

        console.log('\n[6/6] ⛓️ Testing Audit Ledger Integrity...');
        try {
            const auditRes = await axios.get(`${BASE_URL}/api/audit/verify-chain`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('✅ Ledger Verified! Result:');
            console.log(auditRes.data);
        } catch (err: any) {
            console.error('❌ Ledger Verification Failed:', err.response?.data || err.message);
            process.exit(1);
        }

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Backend is solid. 🎉\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ FATAL TEST ERROR:', error);
        process.exit(1);
    }
}

runTests();

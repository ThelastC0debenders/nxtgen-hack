import { NxtGenClient } from '../src';
import * as jwt from 'jsonwebtoken';

async function runDemo() {
    console.log("-----------------------------------------");
    console.log("🚀 NxtGen Hackathon SDK Demo Initiated");
    console.log("-----------------------------------------");

    // We generate a temp JWT token locally purely for the testing environment
    // In production, your customers would use an API key you gave them
    const devApiKey = jwt.sign({ userId: 'LND-8821', role: 'LENDER' }, 'super-secret-key-for-testing', { expiresIn: '1h' });

    // 1. Initialize SDK
    const client = new NxtGenClient(devApiKey, 'sandbox');

    // 2. Mock a really risky invoice coming from their internal software
    const incomingDocument = {
        invoiceNumber: `INV-API-${Math.floor(Math.random() * 1000)}`,
        buyerGSTIN: "LND-8821",
        sellerGSTIN: "VND-9904",
        invoiceAmount: 60000,         // High Value -> trips AI 
        invoiceDate: "2026-02-21",    // Saturday -> trips AI 
        irn: `IRN-${Date.now()}`
    };

    console.log(`\n[+] Verifying Document ${incomingDocument.invoiceNumber} via AI Sandbox...`);

    try {
        // 3. Verify exactly like Stripe API
        const fraudReport = await client.verifyFraudRisk(incomingDocument);

        console.log(`\n✅ Verification Complete!`);
        console.log(`    Status:      ${fraudReport.status}`);
        console.log(`    Fraud Score: ${fraudReport.fraudScore.toFixed(2)} / 100`);
        console.log(`    Risk Level:  ${fraudReport.riskLevel}`);

        if (fraudReport.triggeredRules && fraudReport.triggeredRules.length > 0) {
            console.log(`    Triggered Flags:`);
            fraudReport.triggeredRules.forEach(rule => console.log(`      ⚠️  ${rule}`));
        } else {
            console.log(`    Triggered Flags: None! Document is perfectly clean.`);
        }

    } catch (err: any) {
        console.error("❌ SDK Error:", err.message);
    }
}

runDemo();

import { NxtGenClient } from '../src';
import axios from 'axios';

async function runDemo() {
    console.log("-----------------------------------------");
    console.log("🚀 NxtGen Fraud Intelligence SDK Demo");
    console.log("-----------------------------------------");

    console.log("[~] Authenticating with NxtGen Registry via Test Lender Credentials...");

    let activeSessionToken = "";

    try {
        // 1. Authenticate with the real backend to get a valid secure session
        const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
            email: "demo-lender@nxtgen.com",
            role: "LENDER",
            password: "sandbox-password-123"
        });

        // Extract the HttpOnly session cookie from the login response headers
        const cookies = loginResponse.headers['set-cookie'];
        if (cookies && cookies.length > 0) {
            const sessionMatch = cookies[0].match(/session=([^;]+)/);
            if (sessionMatch) {
                activeSessionToken = sessionMatch[1];
                console.log("✅ Live JWT Session Established Successfully!\n");
            }
        }
    } catch (err: any) {
        console.error("❌ Failed to authenticate. Is the backend running on port 5001?", err.message);
        return;
    }

    if (!activeSessionToken) {
        console.error("❌ Could not extract session token from login cookies.");
        return;
    }

    // 2. Initialize SDK with the live session token
    const client = new NxtGenClient(activeSessionToken, 'sandbox');

    // 3. Define the invoice payload
    // IMPORTANT: The IRN must be in the backend's GST whitelist to pass verification.
    // Whitelisted IRNs: IRN-1001, IRN-1002, IRN-1003, IRN-1004, IRN-1005,
    //                   IRN-1006, IRN-1007, IRN-1008, IRN-VALID-123, TEST-IRN-999
    const incomingDocument = {
        invoiceNumber: `INV-SDK-${Math.floor(Math.random() * 9000) + 1000}`,
        buyerGSTIN: "LND-8821",
        sellerGSTIN: "VND-9904",
        invoiceAmount: 60000,         // High Value  -> triggers HIGH_VALUE_INVOICE rule
        invoiceDate: "2026-02-21",    // Saturday    -> triggers WEEKEND_INVOICE_DATE rule
        irn: "IRN-VALID-123",         // Pre-approved whitelisted IRN
        irnStatus: "VALID",
        lineItems: [
            { description: "SDK Consulting Services", quantity: 60, unitPrice: 1000, total: 60000 }
        ]
    };

    console.log(`[+] Verifying Document ${incomingDocument.invoiceNumber} via AI Sandbox...`);

    try {
        // 4. Call verifyFraudRisk — runs AI Isolation Forest + Rule Engine in real time
        const fraudReport = await client.verifyFraudRisk(incomingDocument);

        console.log(`\n✅ Verification Complete!`);
        console.log(`    Status:      ${fraudReport.status}`);
        console.log(`    Fraud Score: ${fraudReport.fraudScore.toFixed(2)} / 100`);
        console.log(`    Risk Level:  ${fraudReport.riskLevel}`);
        console.log(`    Duplicate:   ${fraudReport.duplicate ? 'YES ⚠️' : 'NO ✅'}`);

        if (fraudReport.triggeredRules && fraudReport.triggeredRules.length > 0) {
            console.log(`    Triggered AI Flags:`);
            fraudReport.triggeredRules.forEach(rule => console.log(`      ⚠️  ${rule}`));
        } else {
            console.log(`    Triggered Flags: None — Document passed all AI checks cleanly.`);
        }

    } catch (err: any) {
        console.error("❌ SDK Error:", err.message);
    }

    console.log("\n-----------------------------------------");
    console.log("💡 Try 'IRN-1001' through 'IRN-1008' for valid GST IRNs.");
    console.log("💡 Use amounts > 50000 to trigger HIGH_VALUE_INVOICE rule.");
    console.log("💡 Use a weekend date (Sat/Sun) to trigger WEEKEND_INVOICE_DATE.");
    console.log("💡 Use multiples of 1000 to trigger ROUND_AMOUNT_DETECTED.");
    console.log("-----------------------------------------\n");
}

runDemo();

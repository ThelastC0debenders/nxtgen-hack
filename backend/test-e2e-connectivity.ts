import axios from 'axios';
import { signToken } from './modules/auth/jwt';
import { Role } from './modules/auth/roles';

// Ensure both servers are running before executing this!
const NODE_SERVER = 'http://localhost:5001';

// Generate a valid Admin Mock Token using the real backend secret.
const validAdminToken = signToken({ id: 'E2E-TESTING-ADMIN', role: 'ADMIN' as Role });

async function runE2ETest() {
    console.log("🚀 Starting End-to-End System Integration Test...\n");

    try {
        // ----------------------------------------------------
        // TEST 1: Admin Health Ping (Checks Postgres, Redis, AI)
        // ----------------------------------------------------
        console.log("📡 [TEST 1] Pinging Node.js Health Endpoint...");
        const healthResponse = await axios.get(`${NODE_SERVER}/api/admin/system-health`, {
            headers: { Authorization: `Bearer ${validAdminToken}` }
        });

        console.log("✅ Health Response Receieved: " + healthResponse.status);
        console.log("   Dependancies Status:", JSON.stringify(healthResponse.data.dependencies, null, 2));

        if (healthResponse.data.dependencies.ai !== 'UP') {
            console.error("\n❌ ERROR: FastAPI is offline or models failed to load!\n");
            return;
        }

        // ----------------------------------------------------
        // TEST 2: Submit a Synthetic Invoice
        // ----------------------------------------------------
        console.log("\n📄 [TEST 2] Submitting Synthetic Invoice through Node.js...");

        const mockInvoice = {
            invoiceNumber: `E2E-TEST-${Date.now()}`,
            sellerGSTIN: "29GGGGG1314R9Z6",
            buyerGSTIN: "07AAAAA0000A1Z5",
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceAmount: 145000.00, // Large round amount to trigger some AI risk
            irn: "mock-irn-" + Date.now(),
            irnStatus: "ACTV",
            lineItems: [
                { description: "Server Compute Cluster", quantity: 5, unitPrice: 29000, total: 145000 }
            ]
        };

        const postResponse = await axios.post(`${NODE_SERVER}/api/invoices/verify`, mockInvoice, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validAdminToken}`
            }
        });

        console.log("✅ Invoice Verified and Saved!");
        console.log("   Node.js returned HTTP:", postResponse.status);

        const result = postResponse.data;
        console.log("\n🤖 [AI ORCHESTRATOR VERDICT]");
        console.log(`   Final Status: ${result.status}`);
        console.log(`   Risk Level:   ${result.riskLevel}`);
        console.log(`   Fraud Score:  ${result.fraudScore}%`);
        console.log(`   Audit Hash:   ${result.invoiceHash}`);
        console.log(`   Process Time: ${result.latency}`);

        console.log("\n🎉 ALL BACKEND SYSTEMS ARE CONNECTED AND ONLINE!");

    } catch (error: any) {
        console.error("\n❌ AUTOMATED TEST FAILED!");
        if (error.response) {
            console.error("Server responded with HTTP", error.response.status);
            console.error(error.response.data);
        } else {
            console.error("Could not reach servers. Are both npm run dev and uvicorn running?");
            console.error(error.message);
        }
    }
}

// Execute the async test
runE2ETest();

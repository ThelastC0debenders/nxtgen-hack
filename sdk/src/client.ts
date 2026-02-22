import axios, { AxiosInstance } from 'axios';
import { InvoicePayload, FraudReport } from './types';

export class NxtGenClient {
    private apiKey: string;
    private baseURL: string;
    private apiClient: AxiosInstance;

    /**
     * Initialize the NxtGen Anti-Fraud SDK
     * @param apiKey The API Key from your Lender/Admin Dashboard
     * @param environment Choose 'sandbox' for local testing, 'production' for live network
     */
    constructor(apiKey: string, environment: 'sandbox' | 'production' = 'sandbox') {
        this.apiKey = apiKey;
        this.baseURL = environment === 'sandbox'
            ? 'http://localhost:5001/api'
            : 'https://api.nxtgen.com/v1';

        this.apiClient = axios.create({
            baseURL: this.baseURL,
            headers: {
                // In a production backend wrapper, this might expect an Administrator JWT or App SDK Token
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Injects a raw invoice strictly into the fraud evaluation engine without pushing to DB payload yet
     */
    async verifyFraudRisk(invoiceData: InvoicePayload): Promise<FraudReport> {
        try {
            const response = await this.apiClient.post('/invoices/verify', invoiceData);
            const { fraudScore, riskLevel, duplicate, status, metadata } = response.data;

            // Re-hydrate the rules properly from Postgres backend structure if running offline check
            const triggeredRules = metadata?.triggered_rules || [];

            return {
                status,
                fraudScore,
                riskLevel,
                duplicate,
                invoiceHash: response.data.invoiceHash,
                triggeredRules,
                metadata: response.data.metadata
            };
        } catch (error: any) {
            throw new Error(`NxtGen Verifier failed: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Used by Vendors to officially register an invoice onto the network layer.
     * Evaluates fraud concurrently.
     */
    async uploadInvoice(invoiceData: InvoicePayload): Promise<{ success: boolean; irn: string; result: any }> {
        try {
            const response = await this.apiClient.post('/invoices/upload', invoiceData);
            return {
                success: true,
                irn: invoiceData.irn,
                result: response.data
            };
        } catch (error: any) {
            throw new Error(`NxtGen Upload failed: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Pulls historical intelligence feeds based on the credentials
     */
    async getHistory(): Promise<any> {
        try {
            const response = await this.apiClient.get('/invoices/history');
            return response.data;
        } catch (error: any) {
            throw new Error(`NxtGen History sync failed: ${error.response?.data?.error || error.message}`);
        }
    }
}

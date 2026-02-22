/**
 * API Layer — Entry Point
 *
 * This file is the boundary between the outside world (HTTP) and the
 * application's internal modules. It:
 *   1. Mounts every route group under the /api prefix (HTTP contract).
 *   2. Applies global middleware (JSON parsing, error handling).
 *   3. Delegates all business logic to the controllers in modules/.
 *
 * Nothing in this file contains domain logic. See README.md for a full
 * explanation of why api/ is the API layer.
 */
import express from "express";
import { env } from "../infrastructure/config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";
import invoiceRoutes from "./routes/invoice.routes";
import auditRoutes from "./routes/audit.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();
app.use(express.json());

// Route mounting — defines the public HTTP surface of the backend.
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/admin", adminRoutes);

// Global error handler — serialises unhandled errors into HTTP 500 responses.
app.use(errorMiddleware);

app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
});

export default app;

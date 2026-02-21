import express from "express";
import { env } from "../infrastructure/config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";
import invoiceRoutes from "./routes/invoice.routes";
import auditRoutes from "./routes/audit.routes";
import adminRoutes from "./routes/admin.routes";
import healthRoutes from "./routes/health.routes";
import { connectDB } from "../infrastructure/db/postgres";
import { initRedis } from "../infrastructure/db/redis";
import logger from "../infrastructure/logger/logger";

const app = express();
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorMiddleware);

const bootstrap = async () => {
    try {
        await connectDB();
        await initRedis();

        app.listen(env.PORT, () => {
            logger.info(`Server running on http://localhost:${env.PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start server", error);
        process.exit(1);
    }
};

bootstrap();

export default app;

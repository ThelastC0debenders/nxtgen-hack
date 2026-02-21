import express from "express";
import { env } from "../infrastructure/config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";
import invoiceRoutes from "./routes/invoice.routes";
import auditRoutes from "./routes/audit.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorMiddleware);

app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
});

export default app;

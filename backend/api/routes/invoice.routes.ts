import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { InvoiceController } from "../../modules/invoices/invoice.controller";

const router = Router();

// LENDER, VENDOR (History might be checked by both, verification handled inside service if needed)
router.get("/history", authMiddleware, rbac(["LENDER", "VENDOR", "ADMIN"]), InvoiceController.getInvoiceHistory);

// VENDOR only
router.post("/upload", authMiddleware, rbac(["VENDOR"]), InvoiceController.uploadInvoice);

// ADMIN + LENDER
router.post("/verify", authMiddleware, rbac(["ADMIN", "LENDER"]), InvoiceController.verifyInvoice);

// ADMIN + LENDER Update Status
router.put("/:id/status", authMiddleware, rbac(["ADMIN", "LENDER"]), InvoiceController.updateStatus);

export default router;

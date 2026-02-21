import { Router, Request, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { submitInvoice } from "../../modules/invoices/invoice.controller";
import { verifyInvoice } from "../../modules/verification/verifier.service";

const router = Router();

// VENDOR — submit an invoice (validated + verified)
router.post("/", authMiddleware, rbac(["VENDOR"]), submitInvoice);

// VENDOR — upload placeholder
router.post("/upload", authMiddleware, rbac(["VENDOR"]), (req: AuthRequest, res: Response) => {
    res.json({ message: "Invoice uploaded", user: req.user });
});

// ADMIN + LENDER — verify an invoice
router.get("/verify", authMiddleware, rbac(["ADMIN", "LENDER"]), (req: AuthRequest, res: Response) => {
    res.json({ message: "Invoice verification access granted", user: req.user });
});

// Test the verification pipeline (no auth — for dev only)
router.post("/verify-test", async (req: Request, res: Response) => {
    try {
        const result = await verifyInvoice(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

export default router;


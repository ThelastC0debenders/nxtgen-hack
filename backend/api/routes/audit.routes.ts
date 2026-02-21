import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { AuditController } from "../../modules/audit/audit.controller";

const router = Router();

// ADMIN only
router.get("/", authMiddleware, rbac(["ADMIN"]), AuditController.getAuditLogs);
router.get("/verify-chain", authMiddleware, rbac(["ADMIN"]), AuditController.verifyLedgerIntegrity);

export default router;

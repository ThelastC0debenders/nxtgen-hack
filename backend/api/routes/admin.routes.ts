import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { AdminController } from "../../modules/admin/admin.controller";

const router = Router();

// ADMIN only
router.get("/stats", authMiddleware, rbac(["ADMIN"]), AdminController.getSystemStats);
router.get("/system-health", authMiddleware, rbac(["ADMIN"]), AdminController.getSystemHealth);

export default router;

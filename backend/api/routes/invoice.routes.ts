import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";

const router = Router();

// VENDOR only
router.post("/upload", authMiddleware, rbac(["VENDOR"]), (req: AuthRequest, res: Response) => {
    res.json({ message: "Invoice uploaded", user: req.user });
});

// ADMIN + LENDER
router.get("/verify", authMiddleware, rbac(["ADMIN", "LENDER"]), (req: AuthRequest, res: Response) => {
    res.json({ message: "Invoice verification access granted", user: req.user });
});

export default router;

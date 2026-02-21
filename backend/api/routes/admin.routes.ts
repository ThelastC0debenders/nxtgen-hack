import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";

const router = Router();

// ADMIN only
router.get("/users", authMiddleware, rbac(["ADMIN"]), (req: AuthRequest, res: Response) => {
    res.json({ message: "Admin users access granted", user: req.user });
});

export default router;

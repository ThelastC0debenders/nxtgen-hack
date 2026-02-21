import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { Role } from "../../modules/auth/roles";

export function rbac(allowedRoles: Role[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const userRole = req.user?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            res.status(403).json({ error: "Forbidden: insufficient permissions" });
            return;
        }

        next();
    };
}

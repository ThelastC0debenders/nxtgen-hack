import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../../modules/auth/jwt";

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }

    try {
        const token = header.split(" ")[1];
        req.user = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

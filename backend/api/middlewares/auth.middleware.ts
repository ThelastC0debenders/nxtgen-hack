import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../../modules/auth/jwt";
import { query } from "../../infrastructure/db/postgres";

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const token = req.cookies?.session || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);

    if (!token) {
        res.status(401).json({ error: "Missing or invalid session token" });
        return;
    }

    try {
        // Validate JWT signature
        const decoded = verifyToken(token);

        // Ensure session exists and is valid in the database
        const sessionRes = await query(`SELECT id FROM sessions WHERE token = $1 AND expires_at > NOW()`, [token]);

        if (sessionRes.rows.length === 0) {
            res.status(401).json({ error: "Session expired or invalid" });
            return;
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid or expired session" });
    }
}

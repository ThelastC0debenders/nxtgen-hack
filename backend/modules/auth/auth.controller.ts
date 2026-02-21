import { Request, Response } from "express";
import { signToken } from "./jwt";
import { Role, ROLES } from "./roles";

export function login(req: Request, res: Response): void {
    const { id, role } = req.body;

    if (!id || !role) {
        res.status(400).json({ error: "id and role are required" });
        return;
    }

    const validRoles = Object.values(ROLES) as string[];
    if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
        return;
    }

    const token = signToken({ id, role: role as Role });
    res.json({ token });
}

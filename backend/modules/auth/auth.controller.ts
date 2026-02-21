import { Request, Response } from "express";
import { signToken } from "./jwt";
import { Role, ROLES } from "./roles";
import { query } from "../../infrastructure/db/postgres";

export async function login(req: Request, res: Response): Promise<void> {
    const { email, role, password } = req.body;

    if (!email || !role || !password) {
        res.status(400).json({ error: "email, role, and password are required" });
        return;
    }

    const validRoles = Object.values(ROLES) as string[];
    if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
        return;
    }

    try {
        const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [role.toUpperCase()]);
        const roleId = roleRes.rows[0]?.id;

        if (!roleId) {
            res.status(500).json({ error: "Role not found in DB" });
            return;
        }

        let userRes = await query(`SELECT id, password_hash FROM users WHERE email = $1`, [email]);
        let userId;

        if (userRes.rows.length === 0) {
            // For hackathon/demo, auto-create the user if they don't exist
            userRes = await query(
                `INSERT INTO users (email, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id`,
                [email, password, roleId]
            );
            userId = userRes.rows[0].id;
        } else {
            userId = userRes.rows[0].id;
            if (userRes.rows[0].password_hash !== password) {
                res.status(401).json({ error: "Invalid credentials" });
                return;
            }
        }

        // Generate token and store session
        const token = signToken({ id: userId, role: role as Role });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await query(
            `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
            [userId, token, expiresAt]
        );

        // Set HttpOnly cookie
        res.cookie('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ message: "Login successful", role, userId });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

import { Router } from "express";
import { login } from "../../modules/auth/auth.controller";

const router = Router();

router.post("/login", login);

export default router;

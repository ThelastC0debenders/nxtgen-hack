import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
    res.status(200).json({ status: 'UP', service: 'Backend 3 - Orchestration & Audit' });
});

export default router;

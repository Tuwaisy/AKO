import { Router } from 'express';
const router = Router();
router.get('/', (req: any, res: any) => res.json({ message: 'Media routes - coming soon' }));
export default router;

import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getOperationLivePayload } from '../services/operationService.js';

const router = Router();

router.get('/live', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const payload = await getOperationLivePayload(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock } from '../models/sensei.js';
import { getOperationLivePayload } from '../services/operationService.js';
import { getOperationBriefingForUser } from '../services/operationBriefingService.js';

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

router.get('/briefing', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const briefing = await getOperationBriefingForUser(user.id);
    const clock = await getGameClock();
    res.json({ briefing, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

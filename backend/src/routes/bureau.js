import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock, getSquadPayload } from '../models/sensei.js';
import { getDailySealPayload, openChakraSeal } from '../services/dailySealService.js';

const router = Router();

router.get('/daily-seal', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const seal = await getDailySealPayload(user.id);
    const clock = await getGameClock();
    res.json({ seal, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/daily-seal/open', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = req.body?.ninjaId ? Number(req.body.ninjaId) : null;
    const result = await openChakraSeal(user.id, { ninjaId });
    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...result, ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock, getSquadPayload } from '../models/sensei.js';
import { getAcademyPayload, recruitAcademyAspirant } from '../services/academyService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const academy = await getAcademyPayload(user.id);
    const clock = await getGameClock();
    res.json({ academy, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/recruit', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const result = await recruitAcademyAspirant(user.id);
    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ result, ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

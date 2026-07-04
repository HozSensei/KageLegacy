import { Router } from 'express';
import { getGameClock } from '../services/gameClock.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const clock = await getGameClock();
    res.json(clock);
  } catch (error) {
    next(error);
  }
});

export default router;

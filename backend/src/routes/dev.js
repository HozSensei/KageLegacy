import { Router } from 'express';
import { advanceHourDev, getGameClock, setHourDev } from '../services/gameClock.js';
import { processCycleTick } from '../services/cycleJobs.js';
import { setHourSchema } from '../validators/squadTactics.js';

const router = Router();

function devOnly(_req, res, next) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_TOOLS !== 'true') {
    return res.status(403).json({ error: 'Outils dev désactivés en production.' });
  }
  next();
}

router.use(devOnly);

router.post('/advance-hour', async (_req, res, next) => {
  try {
    const clock = await advanceHourDev();
    const tick = await processCycleTick();
    res.json({ clock, tick });
  } catch (error) {
    next(error);
  }
});

router.post('/set-hour', async (req, res, next) => {
  try {
    const { hour } = setHourSchema.parse(req.body);
    const clock = await setHourDev(hour);
    const tick = await processCycleTick();
    res.json({ clock, tick });
  } catch (error) {
    next(error);
  }
});

router.post('/tick', async (_req, res, next) => {
  try {
    const tick = await processCycleTick();
    const clock = await getGameClock();
    res.json({ clock, tick });
  } catch (error) {
    next(error);
  }
});

export default router;

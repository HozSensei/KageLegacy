import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { getGameClock } from '../services/gameClock.js';
import {
  getVillagePayload,
  isValidVillageId,
  retakeVillage,
  VILLAGE_IDS,
} from '../services/villageService.js';

const router = Router();

const retakeSchema = z.object({
  villageId: z.enum(['leaf', 'sand', 'mist', 'stone']),
});

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const village = await getVillagePayload(user.id);
    res.json({ village, gameClock: await getGameClock(), villages: VILLAGE_IDS });
  } catch (error) {
    next(error);
  }
});

router.post('/retake', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { villageId } = retakeSchema.parse(req.body);
    if (!isValidVillageId(villageId)) {
      return res.status(400).json({ error: 'Village invalide.' });
    }
    const village = await retakeVillage(user.id, villageId);
    res.json({ village, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

export default router;

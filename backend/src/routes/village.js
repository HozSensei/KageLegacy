import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getGameClock } from '../services/gameClock.js';
import {
  getVillagePayload,
  isValidVillageId,
  retakeVillage,
  VILLAGE_IDS,
} from '../services/villageService.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const village = await getVillagePayload(req.user.id);
    res.json({ village, gameClock: await getGameClock(), villages: VILLAGE_IDS });
  } catch (error) {
    next(error);
  }
});

const retakeSchema = z.object({
  villageId: z.enum(['leaf', 'sand', 'mist', 'stone']),
});

router.post('/retake', async (req, res, next) => {
  try {
    const { villageId } = retakeSchema.parse(req.body);
    if (!isValidVillageId(villageId)) {
      return res.status(400).json({ error: 'Village invalide.' });
    }
    const village = await retakeVillage(req.user.id, villageId);
    res.json({ village, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

export default router;

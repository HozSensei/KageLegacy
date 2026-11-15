import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  claimAchievementTier,
  getAchievementRegistry,
} from '../services/achievementService.js';

const router = Router();

const claimSchema = z.object({
  achievementKey: z.string().trim().min(1).max(100),
  tier: z.coerce.number().int().min(1).max(20),
});

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await getAchievementRegistry(user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/claim', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = claimSchema.parse(req.body || {});
    res.json(await claimAchievementTier(user.id, parsed.achievementKey, parsed.tier));
  } catch (err) {
    next(err);
  }
});

export default router;

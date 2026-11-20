import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  claimOnboardingStep,
  completeOnboardingVisit,
  getOnboardingProgress,
} from '../services/onboardingService.js';

const router = Router();

const stepKeySchema = z.object({
  stepKey: z.string().trim().min(1).max(64),
});

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await getOnboardingProgress(user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/visit', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { stepKey } = stepKeySchema.parse(req.body || {});
    res.json(await completeOnboardingVisit(user.id, stepKey));
  } catch (err) {
    next(err);
  }
});

router.post('/claim', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { stepKey } = stepKeySchema.parse(req.body || {});
    res.json(await claimOnboardingStep(user.id, stepKey));
  } catch (err) {
    next(err);
  }
});

export default router;

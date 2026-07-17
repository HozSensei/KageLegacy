import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock, getSquadPayload } from '../models/sensei.js';
import { getOnboardingPayload, markOnboardingStep } from '../services/onboardingService.js';
import { getCycleObjectivesPayload } from '../services/cycleObjectiveService.js';
import {
  getMidcycleChoicePayload,
  purchaseMidcycleRumor,
} from '../services/midcycleChoiceService.js';
import { getUserLanguage } from '../services/narrative/viewerLocale.js';

const router = Router();

router.get('/onboarding', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const onboarding = await getOnboardingPayload(user.id);
    res.json({ onboarding, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

router.post('/onboarding/:step', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const onboarding = await markOnboardingStep(user.id, req.params.step);
    const squad = await getSquadPayload(user.id);
    res.json({ onboarding, ...squad, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

router.get('/cycle-objectives', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const locale = await getUserLanguage(user.id);
    const cycleObjectives = await getCycleObjectivesPayload(user.id, locale);
    res.json({ ...cycleObjectives, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

router.get('/midcycle', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const midcycle = await getMidcycleChoicePayload(user.id);
    res.json({ midcycle, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

router.post('/midcycle/rumor', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const rumor = await purchaseMidcycleRumor(user.id);
    const squad = await getSquadPayload(user.id);
    res.json({ rumor, ...squad, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

export default router;

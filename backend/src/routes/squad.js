import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock, getSquadPayload } from '../models/sensei.js';
import { updateSquadComposition } from '../models/squadComposition.js';
import {
  requestBirdFlight,
  requestChuninExam,
  updateBattleStrategies,
  updateTrainingFocus,
  updateTrainingPlans,
} from '../models/squadTactics.js';
import {
  dispensaryTreatSchema,
  dismissNotificationSchema,
  releaseNinjaSchema,
  requestBirdFlightSchema,
  requestChuninExamSchema,
  updateStrategiesSchema,
  updateTrainingFocusSchema,
  updateTrainingPlansSchema,
} from '../validators/squadTactics.js';
import { dismissNotification } from '../services/dojoNotifications.js';
import { treatNinjaAtDispensary } from '../services/dispensaryService.js';
import { releaseNinja } from '../services/ninjaReleaseService.js';
import { updateCompositionSchema } from '../validators/squadComposition.js';
import { ensureStarterSquad } from '../services/starterSquadService.js';

const router = Router();

async function resolveUser(req, res) {
  return requireUser(req, res);
}

router.get('/', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    if (!user.is_bot) {
      await ensureStarterSquad(user.id);
    }

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();

    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.patch('/composition', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = updateCompositionSchema.parse(req.body);
    await updateSquadComposition(user.id, parsed.slots);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.patch('/strategies', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = updateStrategiesSchema.parse(req.body);
    await updateBattleStrategies(user.id, parsed.strategies);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/chunin-exam', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = requestChuninExamSchema.parse(req.body);
    await requestChuninExam(user.id, parsed.ninjaId);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/bird-flight', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = requestBirdFlightSchema.parse(req.body);
    await requestBirdFlight(user.id, parsed.ninjaId);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/notifications/dismiss', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = dismissNotificationSchema.parse(req.body);
    const dismissed = await dismissNotification(user.id, parsed.notificationId);
    if (!dismissed) {
      return res.status(404).json({ error: 'Notification introuvable.' });
    }

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/dispensary', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = dispensaryTreatSchema.parse(req.body);
    await treatNinjaAtDispensary(user.id, parsed.ninjaId);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/release', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = releaseNinjaSchema.parse(req.body);
    await releaseNinja(user.id, parsed.ninjaId);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.patch('/training-plans', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = updateTrainingPlansSchema.parse(req.body);
    await updateTrainingPlans(user.id, parsed.plans);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.patch('/training-focus', async (req, res, next) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const parsed = updateTrainingFocusSchema.parse(req.body);
    await updateTrainingFocus(user.id, parsed.trainingFocus);

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

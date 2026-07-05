import { Router } from 'express';
import { findDemoUser, getGameClock, getSquadPayload } from '../models/sensei.js';
import {
  requestChuninExam,
  updateBattleStrategies,
  updateTrainingFocus,
} from '../models/squadTactics.js';
import {
  requestChuninExamSchema,
  updateStrategiesSchema,
  updateTrainingFocusSchema,
} from '../validators/squadTactics.js';

const router = Router();

async function requireDemoUser(res) {
  const user = await findDemoUser();
  if (!user) {
    res.status(404).json({ error: 'Aucun joueur de démonstration. Exécutez npm run db:seed.' });
    return null;
  }
  return user;
}

router.get('/', async (_req, res, next) => {
  try {
    const user = await requireDemoUser(res);
    if (!user) return;

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();

    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.patch('/strategies', async (req, res, next) => {
  try {
    const user = await requireDemoUser(res);
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
    const user = await requireDemoUser(res);
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

router.patch('/training-focus', async (req, res, next) => {
  try {
    const user = await requireDemoUser(res);
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

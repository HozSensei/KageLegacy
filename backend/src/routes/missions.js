import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock, getSquadPayload } from '../models/sensei.js';
import {
  assignMission,
  collectMissionRewards,
  getMissionsForUser,
} from '../services/missionService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const missions = await getMissionsForUser(user.id);
    const clock = await getGameClock();
    res.json({ ...missions, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/assign', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = Number(req.body?.ninjaId);
    const rank = req.body?.rank;
    if (!ninjaId || !rank) {
      return res.status(400).json({ error: 'ninjaId et rank requis.' });
    }

    const result = await assignMission(user.id, ninjaId, rank);
    const missions = await getMissionsForUser(user.id);
    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ result, missions, squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/collect', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const collection = await collectMissionRewards(user.id);
    const missions = await getMissionsForUser(user.id);
    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ collection, missions, squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

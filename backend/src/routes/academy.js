import { Router } from 'express';
import { findDemoUser, getGameClock, getSquadPayload } from '../models/sensei.js';
import { getAcademyPayload, recruitAcademyAspirant } from '../services/academyService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      return res.status(404).json({ error: 'Aucun joueur de démonstration.' });
    }

    const academy = await getAcademyPayload(user.id);
    const clock = await getGameClock();
    res.json({ academy, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/recruit', async (req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) return res.status(404).json({ error: 'Joueur introuvable.' });

    const result = await recruitAcademyAspirant(user.id);
    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ result, ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { findDemoUser, getGameClock, getSquadPayload } from '../models/sensei.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      return res.status(404).json({ error: 'Aucun joueur de démonstration. Exécutez npm run db:seed.' });
    }

    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();

    res.json({ ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

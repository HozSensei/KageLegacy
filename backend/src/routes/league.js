import { Router } from 'express';
import { findDemoUser } from '../models/sensei.js';
import { getLeaguePayload } from '../models/league.js';
import { getGameClock } from '../services/gameClock.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      return res.status(404).json({ error: 'Aucun joueur de démonstration. Exécutez npm run db:seed.' });
    }

    const league = await getLeaguePayload(user.id);
    const gameClock = await getGameClock();

    if (!league) {
      return res.status(404).json({
        error: 'Aucune pool assignée. Relancez npm run db:seed.',
        gameClock,
      });
    }

    res.json({ ...league, gameClock });
  } catch (error) {
    next(error);
  }
});

export default router;

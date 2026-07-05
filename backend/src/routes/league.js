import { Router } from 'express';
import { findDemoUser } from '../models/sensei.js';
import { getLeaguePayload } from '../models/league.js';
import { getGameClock } from '../services/gameClock.js';
import { findUserPool } from '../services/poolService.js';

const router = Router();

router.get('/invite', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      return res.status(404).json({ error: 'Aucun joueur de démonstration.' });
    }

    const pool = await findUserPool(user.id);
    if (!pool) {
      return res.status(404).json({ error: 'Aucune pool active.' });
    }

    const baseUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    res.json({
      poolId: pool.id,
      divisionLevel: pool.division_level,
      invitePath: `/register?invitePoolId=${pool.id}`,
      inviteUrl: `${baseUrl}/register?invitePoolId=${pool.id}`,
    });
  } catch (error) {
    next(error);
  }
});

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

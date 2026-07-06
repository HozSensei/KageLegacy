import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getLeaguePayload } from '../models/league.js';
import { getGameClock } from '../services/gameClock.js';
import { findUserPool } from '../services/poolService.js';

const router = Router();

router.get('/invite', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

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

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const league = await getLeaguePayload(user.id);
    const gameClock = await getGameClock();

    if (!league) {
      return res.status(404).json({
        error: 'Aucune pool assignée.',
        gameClock,
      });
    }

    res.json({ ...league, gameClock });
  } catch (error) {
    next(error);
  }
});

export default router;

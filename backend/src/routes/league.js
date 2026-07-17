import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { getLeaguePayload } from '../models/league.js';
import { getGameClock } from '../services/gameClock.js';
import { findUserPool } from '../services/poolService.js';
import { createWallPost, listWallPosts } from '../services/leagueWallService.js';
import { getPoolRosterCounts } from '../services/leagueSocialService.js';
import { listExternalOpponents } from '../services/reconnaissanceService.js';

const router = Router();

const wallPostSchema = z.object({
  body: z.string().min(1).max(280),
});

router.get('/invite', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const pool = await findUserPool(user.id);
    if (!pool) {
      return res.status(404).json({ error: 'Aucune pool active.' });
    }

    const roster = await getPoolRosterCounts(pool.id);
    const baseUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
    res.json({
      poolId: pool.id,
      divisionLevel: pool.division_level,
      seasonNumber: pool.season_number,
      roster,
      invitePath: `/register?invitePoolId=${pool.id}`,
      inviteUrl: `${baseUrl}/register?invitePoolId=${pool.id}`,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/wall', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const beforeId = req.query.beforeId != null ? Number(req.query.beforeId) : null;
    const limit = req.query.limit != null ? Number(req.query.limit) : 20;
    const wall = await listWallPosts(user.id, { beforeId, limit });
    res.json({ ...wall, gameClock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

router.post('/wall', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { body } = wallPostSchema.parse(req.body || {});
    const created = await createWallPost(user.id, body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

/** Cibles défi recon : pool + autres ligues (division proche). */
router.get('/challenge-targets', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const opponents = await listExternalOpponents(user.id, 40);
    res.json({
      opponents,
      gameClock: await getGameClock(),
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

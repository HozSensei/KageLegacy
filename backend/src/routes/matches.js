import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  getMatchOperationPayload,
  getOperationLivePayload,
  getOperationNavigation,
} from '../services/operationService.js';
import { browsePools, getPoolMatches } from '../services/matchSpectatorService.js';

const router = Router();

router.get('/pools', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const pools = await browsePools(user.id);
    res.json({ pools });
  } catch (error) {
    next(error);
  }
});

router.get('/pools/:poolId/fixtures', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const poolId = Number(req.params.poolId);
    const cycle = req.query.cycle != null ? Number(req.query.cycle) : undefined;
    const payload = await getPoolMatches(user.id, poolId, { cycle });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/navigation', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const nav = await getOperationNavigation(user.id, {
      poolId: req.query.poolId,
      cycle: req.query.cycle,
      matchId: req.query.matchId,
    });
    res.json(nav);
  } catch (error) {
    next(error);
  }
});

router.get('/live', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const payload = await getOperationLivePayload(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/:matchId', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const matchId = Number(req.params.matchId);
    if (!matchId) {
      return res.status(400).json({ error: 'matchId invalide.' });
    }
    const payload = await getMatchOperationPayload(matchId, user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  acceptChallenge,
  createChallenge,
  declineChallenge,
  getReconnaissanceState,
  listExternalOpponents,
  startMatchmaking,
} from '../services/reconnaissanceService.js';

const router = Router();

const challengeBodySchema = z.object({
  targetUserId: z.number().int().positive(),
});

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const state = await getReconnaissanceState(user.id);
    res.json(state);
  } catch (error) {
    next(error);
  }
});

router.get('/opponents', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const opponents = await listExternalOpponents(user.id);
    res.json({ opponents });
  } catch (error) {
    next(error);
  }
});

router.post('/matchmake', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await startMatchmaking(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/challenges', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = challengeBodySchema.parse(req.body);
    const result = await createChallenge(user.id, parsed.targetUserId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/challenges/:id/accept', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const challengeId = Number(req.params.id);
    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return res.status(400).json({ error: 'Identifiant de défi invalide.' });
    }
    const result = await acceptChallenge(challengeId, user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/challenges/:id/decline', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const challengeId = Number(req.params.id);
    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return res.status(400).json({ error: 'Identifiant de défi invalide.' });
    }
    const result = await declineChallenge(challengeId, user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

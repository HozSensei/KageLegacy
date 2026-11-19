import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  discardForChakra,
  discardForDraw,
  endTurn,
  forfeit,
  getCombatState,
  playCard,
  reserveCard,
  startCombat,
} from '../services/combatEngineService.js';

const router = Router();

const startSchema = z.object({
  missionId: z.number().int().positive().optional(),
  deckId: z.number().int().positive().optional(),
  templateId: z.string().min(1).max(80).optional(),
  difficulty: z.number().positive().max(5).optional(),
  turnPrototype: z.enum(['classic', 'persistent']).optional(),
});

const playSchema = z.object({
  instanceId: z.string().min(1).optional(),
  cardId: z.string().min(1).optional(),
});

const discardSchema = z.object({
  instanceId: z.string().min(1),
});

/** POST /api/combat/start */
router.post('/start', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = startSchema.parse(req.body || {});
    const combat = await startCombat(user.id, body);
    res.status(201).json({ combat });
  } catch (error) {
    next(error);
  }
});

/** GET /api/combat/:id/state */
router.get('/:id/state', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const combat = await getCombatState(user.id, req.params.id);
    res.json({ combat });
  } catch (error) {
    next(error);
  }
});

/** POST /api/combat/:id/play */
router.post('/:id/play', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = playSchema.parse(req.body || {});
    const combat = await playCard(user.id, req.params.id, body);
    res.json({ combat });
  } catch (error) {
    next(error);
  }
});

/** POST /api/combat/:id/discard-for-chakra */
router.post('/:id/discard-for-chakra', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = discardSchema.parse(req.body || {});
    const combat = await discardForChakra(user.id, req.params.id, body);
    res.json({ combat });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/discard-for-draw', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = discardSchema.parse(req.body || {});
    const combat = await discardForDraw(user.id, req.params.id, body);
    res.json({ combat });
  } catch (error) {
    next(error);
  }
});

/** POST /api/combat/:id/reserve-card */
router.post('/:id/reserve-card', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = discardSchema.parse(req.body || {});
    const combat = await reserveCard(user.id, req.params.id, body);
    res.json({ combat });
  } catch (error) {
    next(error);
  }
});

/** POST /api/combat/:id/end-turn */
router.post('/:id/end-turn', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const combat = await endTurn(user.id, req.params.id);
    res.json({ combat });
  } catch (error) {
    next(error);
  }
});

/** POST /api/combat/:id/forfeit */
router.post('/:id/forfeit', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const combat = await forfeit(user.id, req.params.id);
    res.json({ combat });
  } catch (error) {
    next(error);
  }
});

export default router;

/**
 * Routes missions V2 (combat deck-building).
 * Montées sur /api/missions — le router legacy n'est pas branché en V2.
 */
import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  getEnemyCatalog,
  getMission,
  listMissions,
  startMission,
} from '../services/combatMissionService.js';

const router = Router();

const startSchema = z.object({
  deckId: z.number().int().positive().optional(),
});

/** GET /api/missions */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const missions = await listMissions();
    res.json({ missions, enemies: getEnemyCatalog() });
  } catch (error) {
    next(error);
  }
});

/** GET /api/missions/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'id invalide.' });
    }
    const mission = await getMission(id);
    res.json({ mission });
  } catch (error) {
    next(error);
  }
});

/** POST /api/missions/:id/start */
router.post('/:id/start', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'id invalide.' });
    }
    const body = startSchema.parse(req.body || {});
    const combat = await startMission(user.id, id, body.deckId ?? null);
    res.status(201).json({ combat });
  } catch (error) {
    next(error);
  }
});

export default router;

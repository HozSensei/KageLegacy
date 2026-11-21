/**
 * Routes missions V2 (combat deck-building + parcours multi-combats).
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
import {
  abandonRun,
  enterNode,
  getActiveRun,
  getRun,
  resolveEvent,
} from '../services/missionRunService.js';
import { getActiveCombat } from '../services/combatEngineService.js';
import { getCharacter } from '../services/playerCharacterService.js';
import { ASPIRANT_RANK } from '../services/characterAppearance.js';

const router = Router();

const startSchema = z.object({
  deckId: z.number().int().positive().optional(),
  hardMode: z.boolean().optional(),
});

const resolveEventSchema = z.object({
  choiceId: z.string().min(1).max(40),
});

/** GET /api/missions */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const character = await getCharacter(user.id);
    const [missions, activeRun, activeCombat] = await Promise.all([
      listMissions(character?.rank || ASPIRANT_RANK),
      getActiveRun(user.id),
      getActiveCombat(user.id),
    ]);
    res.json({ missions, enemies: getEnemyCatalog(), activeRun, activeCombat });
  } catch (error) {
    next(error);
  }
});

/** GET /api/missions/runs/active */
router.get('/runs/active', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const run = await getActiveRun(user.id);
    res.json({ run });
  } catch (error) {
    next(error);
  }
});

/** GET /api/missions/runs/:runId */
router.get('/runs/:runId', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const run = await getRun(user.id, req.params.runId);
    res.json({ run });
  } catch (error) {
    next(error);
  }
});

/** POST /api/missions/runs/:runId/enter — entre dans le nœud disponible */
router.post('/runs/:runId/enter', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await enterNode(user.id, req.params.runId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/missions/runs/:runId/resolve-event */
router.post('/runs/:runId/resolve-event', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = resolveEventSchema.parse(req.body || {});
    const run = await resolveEvent(user.id, req.params.runId, body.choiceId);
    res.json({ run });
  } catch (error) {
    next(error);
  }
});

/** POST /api/missions/runs/:runId/abandon */
router.post('/runs/:runId/abandon', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const run = await abandonRun(user.id, req.params.runId);
    res.json({ run });
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

/** POST /api/missions/:id/start — démarre un parcours (run) */
router.post('/:id/start', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'id invalide.' });
    }
    const body = startSchema.parse(req.body || {});
    const run = await startMission(user.id, id, body.deckId ?? null, {
      hardMode: Boolean(body.hardMode),
    });
    res.status(201).json({ run });
  } catch (error) {
    next(error);
  }
});

export default router;

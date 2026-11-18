import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  canUnlock,
  getTalentTree,
  getUserTalents,
  unlockTalent,
  removeTalentRank,
  computeTalentBonuses,
  respecTalents,
} from '../services/talentTreeService.js';

const router = Router();

const unlockSchema = z.object({
  nodeId: z.string().min(1).max(50),
});

/** GET /api/talents/tree — catalogue de l'arbre */
router.get('/tree', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const nodes = await getTalentTree();
    res.json({ nodes, count: nodes.length });
  } catch (error) {
    next(error);
  }
});

/** GET /api/talents/me — talents du joueur + points + quote respec */
router.get('/me', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const [talents, bonuses] = await Promise.all([
      getUserTalents(user.id),
      computeTalentBonuses(user.id),
    ]);
    res.json({ talents, bonuses });
  } catch (error) {
    next(error);
  }
});

/** GET /api/talents/can-unlock/:nodeId — prévisualisation unlock */
router.get('/can-unlock/:nodeId', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const result = await canUnlock(user.id, req.params.nodeId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/talents/unlock — débloquer un nœud */
router.post('/unlock', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = unlockSchema.parse(req.body);
    const result = await unlockTalent(user.id, parsed.nodeId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/talents/remove — retirer un rang et rembourser 1 point */
router.post('/remove', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = unlockSchema.parse(req.body);
    const result = await removeTalentRank(user.id, parsed.nodeId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/talents/respec — réinitialiser l'arbre */
router.post('/respec', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const result = await respecTalents(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/talents/bonuses — bonus calculés (debug / sync) */
router.get('/bonuses', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const bonuses = await computeTalentBonuses(user.id);
    res.json({ bonuses });
  } catch (error) {
    next(error);
  }
});

export default router;

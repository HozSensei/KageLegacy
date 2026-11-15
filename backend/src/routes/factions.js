import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  getPlayerFaction,
  listFactions,
  retakeFaction,
  setFaction,
} from '../services/factionService.js';
import { FACTION_IDS } from '../services/factionCatalog.js';

const router = Router();

const factionBodySchema = z.object({
  factionId: z.enum(FACTION_IDS, {
    errorMap: () => ({ message: 'Faction invalide.' }),
  }),
});

/** GET /api/factions — catalogue des 3 factions jouables */
router.get('/', async (_req, res, next) => {
  try {
    res.json({ factions: listFactions() });
  } catch (error) {
    next(error);
  }
});

/** GET /api/factions/me — faction du personnage courant */
router.get('/me', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const mine = await getPlayerFaction(user.id);
    if (!mine) {
      return res.status(404).json({ error: 'Aucun personnage.' });
    }
    res.json(mine);
  } catch (error) {
    next(error);
  }
});

/** POST /api/factions/join — première affiliation */
router.post('/join', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { factionId } = factionBodySchema.parse(req.body);
    const result = await setFaction(user.id, factionId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/factions/retake — un seul changement autorisé */
router.post('/retake', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { factionId } = factionBodySchema.parse(req.body);
    const result = await retakeFaction(user.id, factionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

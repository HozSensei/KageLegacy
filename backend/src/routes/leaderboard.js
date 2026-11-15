import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { FACTION_IDS } from '../services/factionCatalog.js';
import {
  getFactionStandings,
  getLeaderboard,
  LEADERBOARD_BOARDS,
} from '../services/leaderboardService.js';

const router = Router();

const listQuerySchema = z.object({
  board: z.enum(LEADERBOARD_BOARDS).optional().default('level'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(25),
  factionId: z.enum(FACTION_IDS).optional().nullable(),
});

const factionsQuerySchema = z.object({
  board: z.enum(LEADERBOARD_BOARDS).optional().default('level'),
});

/**
 * GET /api/leaderboard
 * Boards : level | pvp — pagination + filtre faction optionnel.
 * Stats calculées serveur uniquement (anti-triche basique).
 */
router.get('/', async (req, res, next) => {
  try {
    // Classement public authentifié (évite scraping anonyme massif)
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = listQuerySchema.parse({
      board: req.query.board,
      page: req.query.page,
      limit: req.query.limit,
      factionId: req.query.factionId || undefined,
    });

    const payload = await getLeaderboard({
      board: parsed.board,
      page: parsed.page,
      limit: parsed.limit,
      factionId: parsed.factionId || null,
      viewerUserId: user.id,
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

/** GET /api/leaderboard/factions — agrégats par faction */
router.get('/factions', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = factionsQuerySchema.parse({
      board: req.query.board,
    });
    const payload = await getFactionStandings({ board: parsed.board });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;

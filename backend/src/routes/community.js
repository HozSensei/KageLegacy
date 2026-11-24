import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { listActivityFeed } from '../services/communityActivityService.js';
import { getHonorByFaction } from '../services/villageHonorService.js';
import { utcDateString } from '../services/dailyUtc.js';
import { FACTION_IDS } from '../services/factionCatalog.js';

const router = Router();

const feedQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).max(80).optional().nullable(),
  factionId: z.enum(FACTION_IDS).optional().nullable(),
  outcome: z.enum(['success', 'failure']).optional().nullable(),
});

/** GET /api/community/activity — mur d’activité (curseur + filtres) */
router.get('/activity', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = feedQuery.parse({
      limit: req.query.limit,
      cursor: req.query.cursor || null,
      factionId: req.query.factionId || null,
      outcome: req.query.outcome || null,
    });
    const feed = await listActivityFeed(parsed);
    res.json(feed);
  } catch (error) {
    next(error);
  }
});

/** GET /api/community/honor — ninjas à l’honneur du jour (UTC) par village */
router.get('/honor', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const scoredOn = utcDateString();
    const honorByFaction = await getHonorByFaction(scoredOn);
    res.json({ scoredOn, honorByFaction });
  } catch (error) {
    next(error);
  }
});

export default router;

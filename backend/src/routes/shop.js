import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  BOOSTER_TYPES,
  ELEMENTS,
  listBoosters,
  openBooster,
} from '../services/boosterService.js';

const router = Router();

const openSchema = z.object({
  element: z.enum(ELEMENTS).optional().nullable(),
});

/** GET /api/shop/boosters — catalogue + soldes */
router.get('/boosters', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const payload = await listBoosters(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shop/boosters/:type/open — ouvrir un booster (serveur-side roll)
 * Body optionnel : { element } pour le parchemin élémentaire.
 * Le client ne peut PAS choisir les cartes — anti-triche.
 */
router.post('/boosters/:type/open', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const type = String(req.params.type || '').toLowerCase();
    if (!BOOSTER_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Type de booster invalide.', allowed: BOOSTER_TYPES });
    }

    // Rejeter toute tentative de forcer les cartes côté client
    if (req.body?.cards != null || req.body?.cardIds != null || req.body?.rarities != null) {
      return res.status(400).json({
        error: 'Paramètres de loot interdits. Le tirage est exclusivement serveur.',
      });
    }

    const parsed = openSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    const result = await openBooster(user.id, type, {
      element: parsed.data.element || null,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

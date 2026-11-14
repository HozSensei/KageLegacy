import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  getAllCards,
  getCardById,
  getCardsByRarity,
  getCardsByType,
} from '../services/cardService.js';

const router = Router();

/** GET /api/cards — catalogue (filtres optionnels) */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { type, rarity, element, statType, search } = req.query;
    const cards = await getAllCards({ type, rarity, element, statType, search });
    res.json({ cards });
  } catch (error) {
    next(error);
  }
});

/** GET /api/cards/rarity/:rarity */
router.get('/rarity/:rarity', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const cards = await getCardsByRarity(req.params.rarity);
    res.json({ cards });
  } catch (error) {
    next(error);
  }
});

/** GET /api/cards/type/:type */
router.get('/type/:type', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const cards = await getCardsByType(req.params.type);
    res.json({ cards });
  } catch (error) {
    next(error);
  }
});

/** GET /api/cards/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const card = await getCardById(req.params.id);
    res.json({ card });
  } catch (error) {
    next(error);
  }
});

export default router;

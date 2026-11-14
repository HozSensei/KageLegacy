import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  addCard,
  craftCard,
  disenchantCard,
  getCollection,
  getCollectionEntry,
  upgradeCard,
} from '../services/collectionService.js';
import { ensureStarterLoadout } from '../services/starterLoadoutService.js';

const router = Router();

/** GET /api/collection */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    // Rattrapage alpha : personnages créés avant le grant starter.
    await ensureStarterLoadout(user.id);
    const { type, rarity } = req.query;
    const collection = await getCollection(user.id, { type, rarity });
    res.json({ collection });
  } catch (error) {
    next(error);
  }
});

/** POST /api/collection/grant — debug / admin grant */
router.post('/grant', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const cardDefinitionId = Number(req.body?.cardDefinitionId);
    const quantity = Number(req.body?.quantity) || 1;
    if (!cardDefinitionId) {
      return res.status(400).json({ error: 'cardDefinitionId requis.' });
    }
    const entry = await addCard(user.id, cardDefinitionId, {
      quantity,
      source: 'grant',
    });
    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
});

/** POST /api/collection/craft */
router.post('/craft', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const cardDefinitionId = Number(req.body?.cardDefinitionId);
    if (!cardDefinitionId) {
      return res.status(400).json({ error: 'cardDefinitionId requis.' });
    }
    const result = await craftCard(user.id, cardDefinitionId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/collection/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const entry = await getCollectionEntry(user.id, Number(req.params.id));
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

/** POST /api/collection/:id/upgrade */
router.post('/:id/upgrade', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await upgradeCard(user.id, Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/collection/:id/disenchant */
router.post('/:id/disenchant', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const quantity = Number(req.body?.quantity) || 1;
    const result = await disenchantCard(user.id, Number(req.params.id), { quantity });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

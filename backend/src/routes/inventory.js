import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock } from '../models/sensei.js';
import { getInventoryForUser, equipItem, unequipItem } from '../services/equipmentService.js';
import {
  equipTacticCard,
  getTacticCardsForUser,
  unequipTacticCard,
} from '../services/tacticCards/tacticCardService.js';
import { useBureauItem } from '../services/bureauItemService.js';

const router = Router();

async function inventoryPayload(userId, extra = {}) {
  const inventory = await getInventoryForUser(userId);
  const tacticCards = await getTacticCardsForUser(userId);
  const clock = await getGameClock();
  return { ...inventory, tacticCards, gameClock: clock, ...extra };
}

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await inventoryPayload(user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/equip', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = Number(req.body?.ninjaId);
    const userItemId = Number(req.body?.userItemId);
    if (!ninjaId || !userItemId) {
      return res.status(400).json({ error: 'ninjaId et userItemId requis.' });
    }

    await equipItem(user.id, ninjaId, userItemId);
    res.json(await inventoryPayload(user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/unequip', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = Number(req.body?.ninjaId);
    const slot = req.body?.slot;
    if (!ninjaId || !['match', 'cycle'].includes(slot)) {
      return res.status(400).json({ error: 'ninjaId et slot (match|cycle) requis.' });
    }

    await unequipItem(user.id, ninjaId, slot);
    res.json(await inventoryPayload(user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/equip-card', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = Number(req.body?.ninjaId);
    const userTacticCardId = Number(req.body?.userTacticCardId);
    if (!ninjaId || !userTacticCardId) {
      return res.status(400).json({ error: 'ninjaId et userTacticCardId requis.' });
    }

    await equipTacticCard(user.id, ninjaId, userTacticCardId);
    res.json(await inventoryPayload(user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/unequip-card', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = Number(req.body?.ninjaId);
    if (!ninjaId) {
      return res.status(400).json({ error: 'ninjaId requis.' });
    }

    await unequipTacticCard(user.id, ninjaId);
    res.json(await inventoryPayload(user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/use', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = req.body?.ninjaId != null ? Number(req.body.ninjaId) : null;
    const userItemId = Number(req.body?.userItemId);
    if (!userItemId) {
      return res.status(400).json({ error: 'userItemId requis.' });
    }

    const result = await useBureauItem(user.id, userItemId, ninjaId);
    res.json(await inventoryPayload(user.id, { result }));
  } catch (error) {
    next(error);
  }
});

export default router;

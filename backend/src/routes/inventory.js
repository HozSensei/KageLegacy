import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock } from '../models/sensei.js';
import { equipItem, getInventoryForUser, unequipItem } from '../services/equipmentService.js';
import { useBureauItem } from '../services/bureauItemService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const inventory = await getInventoryForUser(user.id);
    const clock = await getGameClock();
    res.json({ ...inventory, gameClock: clock });
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
    const inventory = await getInventoryForUser(user.id);
    const clock = await getGameClock();
    res.json({ ...inventory, gameClock: clock });
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
    const inventory = await getInventoryForUser(user.id);
    const clock = await getGameClock();
    res.json({ ...inventory, gameClock: clock });
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
    const inventory = await getInventoryForUser(user.id);
    const clock = await getGameClock();
    res.json({ result, ...inventory, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

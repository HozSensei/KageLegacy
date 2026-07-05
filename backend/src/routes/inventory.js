import { Router } from 'express';
import { findDemoUser, getGameClock } from '../models/sensei.js';
import { equipItem, getInventoryForUser, unequipItem } from '../services/equipmentService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      res.status(404).json({ error: 'Aucun joueur de démonstration.' });
      return;
    }

    const inventory = await getInventoryForUser(user.id);
    const clock = await getGameClock();
    res.json({ ...inventory, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/equip', async (req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) return res.status(404).json({ error: 'Joueur introuvable.' });

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
    const user = await findDemoUser();
    if (!user) return res.status(404).json({ error: 'Joueur introuvable.' });

    const ninjaId = Number(req.body?.ninjaId);
    const slot = req.body?.slot;
    if (!ninjaId || !['gear', 'consumable'].includes(slot)) {
      return res.status(400).json({ error: 'ninjaId et slot (gear|consumable) requis.' });
    }

    await unequipItem(user.id, ninjaId, slot);
    const inventory = await getInventoryForUser(user.id);
    const clock = await getGameClock();
    res.json({ ...inventory, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;

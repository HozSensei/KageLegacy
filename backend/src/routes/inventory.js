import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock } from '../models/sensei.js';
import { getInventoryForUser } from '../services/equipmentService.js';
import { getTacticCardsForUser } from '../services/tacticCards/tacticCardService.js';
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

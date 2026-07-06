import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock } from '../models/sensei.js';
import { getDebtStatus } from '../services/economyDebt.js';
import {
  buyListing,
  cancelListing,
  createItemListing,
  createNinjaListing,
  getPlayerMarketPayload,
} from '../services/playerMarketService.js';

const router = Router();

async function marketResponse(userId, extra = {}) {
  const market = await getPlayerMarketPayload(userId);
  const debt = await getDebtStatus(userId);
  const clock = await getGameClock();
  return {
    ...extra,
    ...market,
    ryos: debt.ryos,
    debtBlocksSpending: debt.debtBlocksSpending,
    gameClock: clock,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await marketResponse(user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/list-ninja', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const ninjaId = Number(req.body?.ninjaId);
    const price = Number(req.body?.price);
    if (!ninjaId || !price) {
      return res.status(400).json({ error: 'ninjaId et price requis.' });
    }

    const result = await createNinjaListing(user.id, ninjaId, price);
    res.json(await marketResponse(user.id, { result }));
  } catch (error) {
    next(error);
  }
});

router.post('/list', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const userItemId = Number(req.body?.userItemId);
    const price = Number(req.body?.price);
    if (!userItemId || !price) {
      return res.status(400).json({ error: 'userItemId et price requis.' });
    }

    const result = await createItemListing(user.id, userItemId, price);
    res.json(await marketResponse(user.id, { result }));
  } catch (error) {
    next(error);
  }
});

router.post('/buy', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const listingId = Number(req.body?.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'listingId requis.' });
    }

    const purchase = await buyListing(user.id, listingId);
    res.json(await marketResponse(user.id, { purchase }));
  } catch (error) {
    next(error);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const listingId = Number(req.body?.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'listingId requis.' });
    }

    const result = await cancelListing(user.id, listingId);
    res.json(await marketResponse(user.id, { result }));
  } catch (error) {
    next(error);
  }
});

export default router;

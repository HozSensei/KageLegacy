import { Router } from 'express';
import { query } from '../config/database.js';
import { findDemoUser, getGameClock } from '../models/sensei.js';
import {
  buyListing,
  cancelListing,
  createItemListing,
  getPlayerMarketPayload,
} from '../services/playerMarketService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      res.status(404).json({ error: 'Aucun joueur de démonstration.' });
      return;
    }

    const market = await getPlayerMarketPayload(user.id);
    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);
    const clock = await getGameClock();

    res.json({
      ...market,
      ryos: senseiRows[0]?.ryos ?? 0,
      gameClock: clock,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/list', async (req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) return res.status(404).json({ error: 'Joueur introuvable.' });

    const userItemId = Number(req.body?.userItemId);
    const price = Number(req.body?.price);
    if (!userItemId || !price) {
      return res.status(400).json({ error: 'userItemId et price requis.' });
    }

    const result = await createItemListing(user.id, userItemId, price);
    const market = await getPlayerMarketPayload(user.id);
    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);
    const clock = await getGameClock();

    res.json({
      result,
      ...market,
      ryos: senseiRows[0]?.ryos ?? 0,
      gameClock: clock,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/buy', async (req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) return res.status(404).json({ error: 'Joueur introuvable.' });

    const listingId = Number(req.body?.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'listingId requis.' });
    }

    const purchase = await buyListing(user.id, listingId);
    const market = await getPlayerMarketPayload(user.id);
    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);
    const clock = await getGameClock();

    res.json({
      purchase,
      ...market,
      ryos: senseiRows[0]?.ryos ?? 0,
      gameClock: clock,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/cancel', async (req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) return res.status(404).json({ error: 'Joueur introuvable.' });

    const listingId = Number(req.body?.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'listingId requis.' });
    }

    const result = await cancelListing(user.id, listingId);
    const market = await getPlayerMarketPayload(user.id);
    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);
    const clock = await getGameClock();

    res.json({
      result,
      ...market,
      ryos: senseiRows[0]?.ryos ?? 0,
      gameClock: clock,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

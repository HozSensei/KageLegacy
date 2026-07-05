import { Router } from 'express';
import { query } from '../config/database.js';
import { findDemoUser, getGameClock } from '../models/sensei.js';
import { ensureMarketForUser, getMarketOffers, purchaseOffer } from '../services/marketService.js';
import { describeUsageLimits } from '../services/combat/equipmentConstants.js';

const router = Router();

function mapOffers(offers) {
  return offers.map((o) => ({
    id: o.id,
    slotIndex: o.slot_index,
    purchased: Boolean(o.purchased),
    slug: o.slug,
    category: o.category,
    nameFr: o.name_fr,
    nameEn: o.name_en,
    descriptionFr: o.description_fr,
    descriptionEn: o.description_en,
    price: o.price,
    effects: typeof o.effects === 'string' ? JSON.parse(o.effects) : o.effects,
    usageLimits: describeUsageLimits(o.effects, o.category),
  }));
}

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      res.status(404).json({ error: 'Aucun joueur de démonstration. Exécutez npm run db:seed.' });
      return;
    }

    const clock = await getGameClock();
    const cycleStartAt = clock.cycleStartAt;
    if (!cycleStartAt) {
      res.status(400).json({ error: 'Horloge non initialisée.' });
      return;
    }

    const offers = await ensureMarketForUser(user.id, cycleStartAt);
    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);

    res.json({
      offers: mapOffers(offers),
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
    if (!user) {
      res.status(404).json({ error: 'Aucun joueur de démonstration.' });
      return;
    }

    const offerId = Number(req.body?.offerId);
    if (!offerId) {
      res.status(400).json({ error: 'offerId requis.' });
      return;
    }

    const purchase = await purchaseOffer(user.id, offerId);
    const clock = await getGameClock();
    const offers = await getMarketOffers(user.id, clock.cycleStartAt);

    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);
    res.json({
      purchase,
      offers: mapOffers(offers),
      ryos: senseiRows[0]?.ryos ?? 0,
      gameClock: clock,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

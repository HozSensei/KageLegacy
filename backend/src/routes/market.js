import { Router } from 'express';
import { query } from '../config/database.js';
import { findDemoUser, getGameClock } from '../models/sensei.js';
import {
  getVillageShopForUser,
  purchaseVillageShopItem,
} from '../services/villageShopService.js';
import { describeUsageLimits } from '../services/combat/equipmentConstants.js';

const router = Router();

function mapShopItems(items) {
  return items.map((item) => ({
    ...item,
    usageLimits: describeUsageLimits(item.effects, item.category),
  }));
}

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      res.status(404).json({ error: 'Aucun joueur de démonstration. Exécutez npm run db:seed.' });
      return;
    }

    const shop = await getVillageShopForUser(user.id);
    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);
    const clock = await getGameClock();

    res.json({
      items: mapShopItems(shop.items),
      restockPeriod: shop.restockPeriod,
      poolCycle: shop.poolCycle,
      cyclesUntilRestock: shop.cyclesUntilRestock,
      restockEveryCycles: shop.restockEveryCycles,
      promoCount: shop.promoCount,
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

    const stockId = Number(req.body?.stockId);
    if (!stockId) {
      res.status(400).json({ error: 'stockId requis.' });
      return;
    }

    const purchase = await purchaseVillageShopItem(user.id, stockId);
    const shop = await getVillageShopForUser(user.id);
    const clock = await getGameClock();
    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);

    res.json({
      purchase,
      items: mapShopItems(shop.items),
      restockPeriod: shop.restockPeriod,
      poolCycle: shop.poolCycle,
      cyclesUntilRestock: shop.cyclesUntilRestock,
      restockEveryCycles: shop.restockEveryCycles,
      promoCount: shop.promoCount,
      ryos: senseiRows[0]?.ryos ?? 0,
      gameClock: clock,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

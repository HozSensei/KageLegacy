import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { isAdminUser } from '../middleware/admin.js';
import {
  claimReward,
  getBattlePassState,
  purchaseLevels,
  unlockPremium,
  PREMIUM_COST_KAGE_COINS,
  LEVEL_COST_KAGE_COINS,
} from '../services/battlePassService.js';
import { claimQuestReward, getActiveQuests } from '../services/battlePassQuestService.js';
import {
  buyLevelsSchema,
  claimRewardSchema,
  unlockPremiumSchema,
} from '../validators/battlePass.js';

const router = Router();

/** GET /api/battle-pass — état saison + progression + tracks */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const state = await getBattlePassState(user.id);
    const { getShopPaymentMeta, BATTLE_PASS_PREMIUM_PRICE_EUR } =
      await import('../services/shopStripeService.js');
    const payments = getShopPaymentMeta();
    res.json({
      ...state,
      meta: {
        premiumCostKageCoins: PREMIUM_COST_KAGE_COINS,
        premiumPriceEur: BATTLE_PASS_PREMIUM_PRICE_EUR,
        levelCostKageCoins: LEVEL_COST_KAGE_COINS,
        payments,
        stripeNote: payments.stripeEnabled
          ? `Stripe Checkout disponible (${BATTLE_PASS_PREMIUM_PRICE_EUR} €) — ou ${PREMIUM_COST_KAGE_COINS} Kage Coins.`
          : 'Stripe non configuré — unlock-premium via kage_coins ou stub admin/dev.',
      },
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/battle-pass/quests — quêtes actives */
router.get('/quests', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await getActiveQuests(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/battle-pass/claim/:level — body { track: 'free'|'premium' } */
router.post('/claim/:level', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = claimRewardSchema.parse(req.body || {});
    const result = await claimReward(user.id, req.params.level, parsed.track);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/battle-pass/unlock-premium
 * body { method: 'kage_coins' | 'stub' | 'stripe' }
 * stripe → Checkout Session si STRIPE_SECRET_KEY ; stub = admin ou BATTLE_PASS_STUB_UNLOCK
 */
router.post('/unlock-premium', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = unlockPremiumSchema.parse(req.body || {});
    const result = await unlockPremium(user.id, {
      method: parsed.method,
      isAdmin: isAdminUser(user),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** Alias roadmap : POST /api/battle-pass/buy → unlock premium kage_coins */
router.post('/buy', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const raw = req.body?.method;
    const method = raw === 'stub' || raw === 'stripe' || raw === 'kage_coins' ? raw : 'kage_coins';
    const result = await unlockPremium(user.id, {
      method,
      isAdmin: isAdminUser(user),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/battle-pass/buy-levels — body { count } */
router.post('/buy-levels', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = buyLevelsSchema.parse(req.body || {});
    const result = await purchaseLevels(user.id, parsed.count);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/battle-pass/quests/:id/claim */
router.post('/quests/:id/claim', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await claimQuestReward(user.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

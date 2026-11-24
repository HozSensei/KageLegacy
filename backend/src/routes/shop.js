import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { isAdminUser } from '../middleware/admin.js';
import { BOOSTER_TYPES, ELEMENTS, listBoosters, openBooster } from '../services/boosterService.js';
import {
  COIN_PACK_IDS,
  getBattlePassShopOffer,
  getShopOverview,
  listCoinPacks,
  listCosmeticFrames,
  purchaseCosmeticFrame,
  listCosmeticCardEffects,
  purchaseCosmeticCardEffect,
  purchaseCoinPack,
  purchaseWelcomePackFromShop,
  unlockBattlePassFromShop,
  getPlayerBalances,
} from '../services/shopService.js';
import { confirmShopCheckoutSession, getShopPaymentMeta } from '../services/shopStripeService.js';
import { getWelcomePackOffer } from '../services/welcomePackService.js';
import {
  getDailyItemOffers,
  buyDailyItem,
} from '../services/playerInventoryService.js';

const router = Router();

const buyItemSchema = z.object({
  itemId: z.string().min(1).max(64).optional(),
});

const openSchema = z.object({
  element: z.enum(ELEMENTS).optional().nullable(),
});

const coinPurchaseSchema = z.object({
  method: z.enum(['stub', 'stripe']).default('stripe'),
});

const unlockBpSchema = z.object({
  method: z.enum(['stub', 'kage_coins', 'stripe']).default('kage_coins'),
});

const confirmSchema = z.object({
  session_id: z.string().trim().min(1).max(255),
});

/** GET /api/shop — aperçu catalogue (coins, BP) + soldes */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const overview = await getShopOverview(user.id);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/balances — soldes utilisés dans l’en-tête global. */
router.get('/balances', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ balances: await getPlayerBalances(user.id) });
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/items — offre journalière d’objets (→ coffre) */
router.get('/items', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const payload = await getDailyItemOffers(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

/** POST /api/shop/items/:itemId/buy — achat objet du jour → coffre */
router.post('/items/:itemId/buy', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const itemId = String(req.params.itemId || req.body?.itemId || '').trim();
    const parsed = buyItemSchema.safeParse({ itemId });
    if (!itemId || !parsed.success) {
      return res.status(400).json({ error: 'itemId invalide.' });
    }
    const result = await buyDailyItem(user.id, itemId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/boosters — catalogue + soldes */
router.get('/boosters', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const payload = await listBoosters(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shop/boosters/:type/open — ouvrir un booster (serveur-side roll)
 * Body optionnel : { element } pour le parchemin élémentaire.
 * Le client ne peut PAS choisir les cartes — anti-triche.
 */
router.post('/boosters/:type/open', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const type = String(req.params.type || '').toLowerCase();
    if (!BOOSTER_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Type de booster invalide.', allowed: BOOSTER_TYPES });
    }

    // Rejeter toute tentative de forcer les cartes côté client
    if (req.body?.cards != null || req.body?.cardIds != null || req.body?.rarities != null) {
      return res.status(400).json({
        error: 'Paramètres de loot interdits. Le tirage est exclusivement serveur.',
      });
    }

    const parsed = openSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    const result = await openBooster(user.id, type, {
      element: parsed.data.element || null,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/frames — cadres cosmétiques (ryos) */
router.get('/frames', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const [frames, balances] = await Promise.all([
      listCosmeticFrames(user.id),
      getPlayerBalances(user.id),
    ]);
    res.json({ frames, balances });
  } catch (error) {
    next(error);
  }
});

/** POST /api/shop/frames/:frameId/purchase — achat en ryos */
router.post('/frames/:frameId/purchase', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const frameId = String(req.params.frameId || '');
    const result = await purchaseCosmeticFrame(user.id, frameId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/card-effects — effets atmosphériques de fiche (ryos) */
router.get('/card-effects', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const [cardEffects, balances] = await Promise.all([
      listCosmeticCardEffects(user.id),
      getPlayerBalances(user.id),
    ]);
    res.json({ cardEffects, balances });
  } catch (error) {
    next(error);
  }
});

/** POST /api/shop/card-effects/:effectId/purchase — achat en ryos */
router.post('/card-effects/:effectId/purchase', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const effectId = String(req.params.effectId || '');
    const result = await purchaseCosmeticCardEffect(user.id, effectId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/coin-packs */
router.get('/coin-packs', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const [balances, welcomePack] = await Promise.all([
      getPlayerBalances(user.id),
      getWelcomePackOffer(user.id),
    ]);
    const payments = getShopPaymentMeta();
    res.json({
      packs: listCoinPacks(),
      balances,
      payments,
      welcomePack,
      meta: {
        purchaseNote: !payments.paymentsEnabled
          ? 'Paiements bientôt disponibles.'
          : payments.stripeEnabled
            ? 'Paiement Stripe Checkout disponible pour les packs Kage Coins.'
            : 'Stripe non configuré — achat stub admin/dev (SHOP_COIN_STUB=true).',
      },
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/welcome-pack */
router.get('/welcome-pack', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const [welcomePack, balances] = await Promise.all([
      getWelcomePackOffer(user.id),
      getPlayerBalances(user.id),
    ]);
    res.json({ welcomePack, balances, payments: getShopPaymentMeta() });
  } catch (error) {
    next(error);
  }
});

/** POST /api/shop/welcome-pack/purchase — body { method: 'stub'|'stripe' } */
router.post('/welcome-pack/purchase', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = coinPurchaseSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    const result = await purchaseWelcomePackFromShop(user.id, {
      method: parsed.data.method,
      isAdmin: isAdminUser(user),
    });
    const status = result.mode === 'stripe_checkout' ? 200 : 201;
    res.status(status).json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/shop/coin-packs/:packId/purchase — body { method: 'stub'|'stripe' } */
router.post('/coin-packs/:packId/purchase', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const packId = String(req.params.packId || '').toLowerCase();
    if (!COIN_PACK_IDS.includes(packId)) {
      return res.status(400).json({ error: 'Pack invalide.', allowed: COIN_PACK_IDS });
    }

    const parsed = coinPurchaseSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    const result = await purchaseCoinPack(user.id, packId, {
      method: parsed.data.method,
      isAdmin: isAdminUser(user),
    });
    const status = result.mode === 'stripe_checkout' ? 200 : 201;
    res.status(status).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shop/checkout/confirm?session_id=
 * Complète le fulfillment après redirect Stripe (idempotent avec le webhook).
 */
router.get('/checkout/confirm', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = confirmSchema.safeParse({
      session_id: req.query.session_id || req.query.sessionId,
    });
    if (!parsed.success) {
      return res.status(400).json({ error: 'session_id requis.' });
    }

    const result = await confirmShopCheckoutSession(user.id, parsed.data.session_id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/shop/battle-pass — offre premium depuis le shop */
router.get('/battle-pass', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const offer = await getBattlePassShopOffer(user.id);
    res.json(offer);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shop/battle-pass/unlock
 * body { method: 'kage_coins' | 'stub' } — délègue à unlockPremium existant
 */
router.post('/battle-pass/unlock', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = unlockBpSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }

    const result = await unlockBattlePassFromShop(user.id, {
      method: parsed.data.method,
      isAdmin: isAdminUser(user),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

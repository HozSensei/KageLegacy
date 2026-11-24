/**
 * Shop — packs Kage Coins et offre Battle Pass.
 * Noms originaux (pas d'IP tierce). Achat coins = stub / Stripe léger.
 */
import { query, getConnection } from '../config/database.js';
import { getBattlePassState, unlockPremium, PREMIUM_COST_KAGE_COINS } from './battlePassService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/** Packs alignés BATTLE_PASS.md — prix affichés, fulfillment stub MVP. */
export const COIN_PACK_CATALOG = {
  spark: {
    id: 'spark',
    nameFr: 'Éclat de Chakra',
    nameEn: 'Chakra Spark',
    descriptionFr: 'Petite réserve de Kage Coins pour un booster premium.',
    descriptionEn: 'A small Kage Coins stash for one premium scroll.',
    coins: 100,
    bonusCoins: 0,
    priceEur: 1,
    sortOrder: 1,
  },
  ember: {
    id: 'ember',
    nameFr: 'Braise du Village',
    nameEn: 'Village Ember',
    descriptionFr: '500 coins + 50 bonus — idéal pour le Passe premium.',
    descriptionEn: '500 coins + 50 bonus — ideal for the premium Pass.',
    coins: 500,
    bonusCoins: 50,
    priceEur: 5,
    sortOrder: 2,
  },
  forge: {
    id: 'forge',
    nameFr: 'Forge des Ombres',
    nameEn: 'Shadow Forge',
    descriptionFr: '1200 coins + 200 bonus pour votre réserve.',
    descriptionEn: '1200 coins + 200 bonus for your stash.',
    coins: 1200,
    bonusCoins: 200,
    priceEur: 10,
    sortOrder: 3,
  },
  vault: {
    id: 'vault',
    nameFr: 'Coffre du Kage',
    nameEn: "Kage's Vault",
    descriptionFr: '6000 coins + 1500 bonus — réserve de saison.',
    descriptionEn: '6000 coins + 1500 bonus — season reserve.',
    coins: 6000,
    bonusCoins: 1500,
    priceEur: 50,
    sortOrder: 4,
  },
};

export const COIN_PACK_IDS = Object.keys(COIN_PACK_CATALOG);

export async function getPlayerBalances(userId, connection = null) {
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const rows = await run(
    'SELECT ryos, card_dust, card_essence, kage_coins FROM player_profiles WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!rows[0]) throw httpError(404, 'Profil joueur introuvable.');
  return {
    ryos: Number(rows[0].ryos) || 0,
    dust: Number(rows[0].card_dust) || 0,
    essence: Number(rows[0].card_essence) || 0,
    kageCoins: Number(rows[0].kage_coins) || 0,
  };
}

export function serializeCoinPack(pack) {
  return {
    id: pack.id,
    nameFr: pack.nameFr,
    nameEn: pack.nameEn,
    descriptionFr: pack.descriptionFr,
    descriptionEn: pack.descriptionEn,
    coins: pack.coins,
    bonusCoins: pack.bonusCoins,
    totalCoins: pack.coins + pack.bonusCoins,
    priceEur: pack.priceEur,
    sortOrder: pack.sortOrder,
  };
}

export function listCoinPacks() {
  return Object.values(COIN_PACK_CATALOG)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(serializeCoinPack);
}

export function getCoinPack(packId) {
  const pack = COIN_PACK_CATALOG[packId];
  if (!pack) throw httpError(400, 'Pack de Kage Coins invalide.');
  return pack;
}

/**
 * Achète un pack.
 * - method=stripe + STRIPE_SECRET_KEY → Checkout Session
 * - method=stripe sans clé → fallback stub en dev / admin / SHOP_COIN_STUB
 * - method=stub → admin / SHOP_COIN_STUB
 */
export async function purchaseCoinPack(userId, packId, { method = 'stub', isAdmin = false } = {}) {
  const pack = getCoinPack(packId);
  const mode = method === 'stripe' ? 'stripe' : 'stub';
  const totalCoins = pack.coins + pack.bonusCoins;

  if (mode === 'stripe') {
    const {
      isPaymentsEnabled,
      isStripeConfigured,
      createCoinPackCheckoutSession,
      isShopStripeDevFallbackAllowed,
    } = await import('./shopStripeService.js');

    if (!isPaymentsEnabled()) {
      throw httpError(503, 'Paiements désactivés (PAIEMENT_ENABLE=false).');
    }

    if (isStripeConfigured()) {
      return createCoinPackCheckoutSession(userId, packId);
    }

    const allowStubFallback =
      isAdmin || process.env.SHOP_COIN_STUB === 'true' || isShopStripeDevFallbackAllowed();
    if (!allowStubFallback) {
      throw httpError(503, 'Paiement Stripe indisponible — STRIPE_SECRET_KEY non configuré.');
    }
  } else if (!isAdmin && process.env.SHOP_COIN_STUB !== 'true') {
    throw httpError(
      403,
      'Achat stub réservé admin/dev (SHOP_COIN_STUB=true ou compte admin). Utilisez method=stripe.',
    );
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE player_profiles SET kage_coins = kage_coins + ? WHERE user_id = ?', [
      totalCoins,
      userId,
    ]);
    await connection.execute(
      `INSERT INTO shop_coin_pack_purchases (user_id, pack_id, coins_granted, method)
       VALUES (?, ?, ?, 'stub')`,
      [userId, pack.id, totalCoins],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const balances = await getPlayerBalances(userId);
  return {
    pack: serializeCoinPack(pack),
    coinsGranted: totalCoins,
    method: 'stub',
    note:
      mode === 'stripe'
        ? 'Pack crédité via stub (fallback dev — Stripe non configuré).'
        : 'Pack crédité via stub admin/dev. Stripe Checkout actif si STRIPE_SECRET_KEY est défini.',
    balances,
  };
}

/**
 * Offre Battle Pass premium exposée dans le shop.
 */
export async function getBattlePassShopOffer(userId) {
  const state = await getBattlePassState(userId);
  const balances = await getPlayerBalances(userId);
  const { getShopPaymentMeta, BATTLE_PASS_PREMIUM_PRICE_EUR } =
    await import('./shopStripeService.js');
  const payments = getShopPaymentMeta();

  const { getWelcomePackOffer } = await import('./welcomePackService.js');
  const welcomePack = await getWelcomePackOffer(userId);

  if (!state.season) {
    return {
      available: false,
      reason: 'no_active_season',
      premiumCostKageCoins: PREMIUM_COST_KAGE_COINS,
      premiumPriceEur: BATTLE_PASS_PREMIUM_PRICE_EUR,
      href: '/battle-pass',
      payments,
      balances,
      welcomePack,
    };
  }

  const season = state.season;
  const unlockMethods = ['kage_coins', 'stub'];
  if (payments.stripeEnabled) unlockMethods.push('stripe');

  let stripeNote =
    'Stripe non configuré — unlock via Kage Coins ou stub admin/dev.';
  if (!payments.paymentsEnabled) {
    stripeNote = 'Paiements bientôt disponibles — unlock via Kage Coins en attendant.';
  } else if (payments.stripeEnabled) {
    stripeNote = `Paiement Stripe disponible (${BATTLE_PASS_PREMIUM_PRICE_EUR} €) ou ${PREMIUM_COST_KAGE_COINS} Kage Coins.`;
  }

  return {
    available: true,
    isPremium: Boolean(state.progress?.isPremium),
    premiumCostKageCoins: PREMIUM_COST_KAGE_COINS,
    premiumPriceEur: BATTLE_PASS_PREMIUM_PRICE_EUR,
    season: {
      id: season.id,
      seasonNumber: season.seasonNumber,
      name: season.name,
      theme: season.theme,
    },
    href: '/battle-pass',
    unlockMethods,
    payments,
    stripeNote,
    balances,
    welcomePack,
  };
}

/**
 * Débloque le premium depuis le shop (délègue à battlePassService.unlockPremium).
 */
export async function unlockBattlePassFromShop(
  userId,
  { method = 'kage_coins', isAdmin = false } = {},
) {
  const result = await unlockPremium(userId, { method, isAdmin });
  if (result?.mode === 'stripe_checkout') {
    return result;
  }
  const offer = await getBattlePassShopOffer(userId);
  return { ...result, offer };
}

export async function getShopOverview(userId) {
  const { getShopPaymentMeta } = await import('./shopStripeService.js');
  const { getWelcomePackOffer } = await import('./welcomePackService.js');
  const [balances, battlePass, welcomePack] = await Promise.all([
    getPlayerBalances(userId),
    getBattlePassShopOffer(userId),
    getWelcomePackOffer(userId),
  ]);
  return {
    balances,
    coinPacks: listCoinPacks(),
    battlePass,
    welcomePack,
    payments: getShopPaymentMeta(),
  };
}

export async function purchaseWelcomePackFromShop(userId, { method = 'stripe', isAdmin = false } = {}) {
  const mode = method === 'stripe' ? 'stripe' : 'stub';
  if (mode === 'stripe') {
    const {
      isPaymentsEnabled,
      isStripeConfigured,
      createWelcomePackCheckoutSession,
      isShopStripeDevFallbackAllowed,
    } = await import('./shopStripeService.js');

    if (!isPaymentsEnabled()) {
      throw httpError(503, 'Paiements désactivés (PAIEMENT_ENABLE=false).');
    }

    if (isStripeConfigured()) {
      return createWelcomePackCheckoutSession(userId);
    }

    const allowStubFallback =
      isAdmin || process.env.SHOP_COIN_STUB === 'true' || isShopStripeDevFallbackAllowed();
    if (!allowStubFallback) {
      throw httpError(503, 'Paiement Stripe indisponible — STRIPE_SECRET_KEY non configuré.');
    }
  }

  const { purchaseWelcomePack } = await import('./welcomePackService.js');
  return purchaseWelcomePack(userId, { method: mode === 'stripe' ? 'stub' : mode, isAdmin });
}

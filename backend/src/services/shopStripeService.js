/**
 * Stripe Checkout — packs Kage Coins + Battle Pass Premium + pack bienvenue.
 */
import Stripe from 'stripe';
import { query, getConnection } from '../config/database.js';
import { WELCOME_PACK } from '../config/economyConfig.js';
import { findUserById } from './authService.js';
import {
  COIN_PACK_CATALOG,
  getCoinPack,
  getPlayerBalances,
  serializeCoinPack,
} from './shopService.js';
import {
  getActiveSeason,
  getOrCreateUserBattlePass,
  PREMIUM_COST_KAGE_COINS,
} from './battlePassService.js';
import { fulfillWelcomePackSession, hasPurchasedWelcomePack } from './welcomePackService.js';

export const SHOP_PRODUCT = Object.freeze({
  KAGE_COINS: 'kage_coins',
  BATTLE_PASS_PREMIUM: 'battle_pass_premium',
  WELCOME_PACK: 'welcome_pack',
});

/** Prix EUR direct premium BP (docs : 5€ / 500 KC). */
export const BATTLE_PASS_PREMIUM_PRICE_EUR = 5;

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePublicUrl(raw) {
  if (raw == null || raw === '') return null;
  const trimmed = String(raw).split(',')[0].trim().replace(/\/$/, '');
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(?::\d+)?$/i.test(trimmed) || /^127\.0\.0\.1(?::\d+)?$/.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function getPublicAppUrl() {
  const candidates = [process.env.APP_PUBLIC_URL, process.env.CORS_ORIGIN, 'http://localhost:5173'];

  for (const candidate of candidates) {
    const normalized = normalizePublicUrl(candidate);
    if (normalized) {
      try {
        const parsed = new URL(normalized);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return normalized;
        }
      } catch {
        // try next
      }
    }
  }

  return 'http://localhost:5173';
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Kill-switch paiements réels (Stripe Checkout).
 * Défaut : activé. Mettre PAIEMENT_ENABLE=false pour une beta sans monétisation.
 */
export function isPaymentsEnabled() {
  return process.env.PAIEMENT_ENABLE !== 'false';
}

/** Checkout Stripe utilisable (clés présentes + kill-switch ouvert). */
export function isStripeCheckoutAvailable() {
  return isPaymentsEnabled() && isStripeConfigured();
}

export function isShopStripeDevFallbackAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_TOOLS === 'true';
}

export function getShopPaymentMeta() {
  return {
    paymentsEnabled: isPaymentsEnabled(),
    stripeEnabled: isStripeCheckoutAvailable(),
    coinStubEnabled: process.env.SHOP_COIN_STUB === 'true',
    battlePassStubEnabled: process.env.BATTLE_PASS_STUB_UNLOCK === 'true',
  };
}

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function coinPackPriceEnvKey(packId) {
  return `STRIPE_PRICE_ID_COIN_${String(packId || '')
    .trim()
    .toUpperCase()}`;
}

export function buildCoinPackLineItems(pack) {
  const envKey = coinPackPriceEnvKey(pack.id);
  const priceId = process.env[envKey];
  if (priceId) {
    return [{ price: priceId, quantity: 1 }];
  }

  const unitAmount = Math.round(Number(pack.priceEur) * 100);
  if (!Number.isFinite(unitAmount) || unitAmount < 1) {
    throw httpError(`Prix invalide pour le pack ${pack.id}.`, 500);
  }

  return [
    {
      price_data: {
        currency: 'eur',
        unit_amount: unitAmount,
        product_data: {
          name: `Kage Coins — ${pack.nameFr}`,
          description: `${pack.coins + pack.bonusCoins} Kage Coins`,
          metadata: {
            pack_id: pack.id,
            product: SHOP_PRODUCT.KAGE_COINS,
          },
        },
      },
      quantity: 1,
    },
  ];
}

export function buildBattlePassLineItems() {
  const priceId = process.env.STRIPE_PRICE_ID_BATTLE_PASS;
  if (priceId) {
    return [{ price: priceId, quantity: 1 }];
  }

  const unitAmount = Math.round(BATTLE_PASS_PREMIUM_PRICE_EUR * 100);
  return [
    {
      price_data: {
        currency: 'eur',
        unit_amount: unitAmount,
        product_data: {
          name: 'Battle Pass Premium',
          description: `Débloque la piste premium (${PREMIUM_COST_KAGE_COINS} Kage Coins équivalent).`,
          metadata: {
            product: SHOP_PRODUCT.BATTLE_PASS_PREMIUM,
          },
        },
      },
      quantity: 1,
    },
  ];
}

export function buildWelcomePackLineItems() {
  const priceId = process.env.STRIPE_PRICE_ID_WELCOME;
  if (priceId) {
    return [{ price: priceId, quantity: 1 }];
  }

  const unitAmount = Math.round(Number(WELCOME_PACK.priceEur) * 100);
  return [
    {
      price_data: {
        currency: 'eur',
        unit_amount: unitAmount,
        product_data: {
          name: 'Pack de bienvenue',
          description: 'Battle Pass Premium + titre + 2 boosters standard',
          metadata: {
            product: SHOP_PRODUCT.WELCOME_PACK,
          },
        },
      },
      quantity: 1,
    },
  ];
}

export function resolveShopProductFromSession(session) {
  const product = String(session?.metadata?.product || '').trim();
  if (
    product === SHOP_PRODUCT.KAGE_COINS ||
    product === SHOP_PRODUCT.BATTLE_PASS_PREMIUM ||
    product === SHOP_PRODUCT.WELCOME_PACK
  ) {
    return product;
  }
  return null;
}

export function isShopCheckoutSession(session) {
  return Boolean(resolveShopProductFromSession(session));
}

function sessionPaid(session) {
  // Checkout can be complete while an asynchronous payment is still pending.
  return session?.payment_status === 'paid';
}

async function createCheckoutSession({ userId, lineItems, metadata, successPath, cancelPath }) {
  if (!isPaymentsEnabled()) {
    throw httpError('Paiements désactivés (PAIEMENT_ENABLE=false).', 503);
  }

  const stripe = getStripeClient();
  if (!stripe) {
    throw httpError('Stripe non configuré (STRIPE_SECRET_KEY).', 503);
  }

  const user = await findUserById(userId);
  const baseUrl = getPublicAppUrl();
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw httpError(
      'APP_PUBLIC_URL invalide — utilisez une URL complète (ex. https://kagelegacy.example.com).',
      503,
    );
  }

  const sessionParams = {
    mode: 'payment',
    line_items: lineItems,
    success_url: `${baseUrl}${successPath}`,
    cancel_url: `${baseUrl}${cancelPath}`,
    client_reference_id: String(userId),
    metadata,
    allow_promotion_codes: false,
    customer_creation: 'always',
  };

  if (user?.email) {
    sessionParams.customer_email = user.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return {
    mode: 'stripe_checkout',
    ok: true,
    url: session.url,
    sessionId: session.id,
    product: metadata.product,
  };
}

export async function createCoinPackCheckoutSession(userId, packId) {
  const pack = getCoinPack(packId);
  const totalCoins = pack.coins + pack.bonusCoins;

  return createCheckoutSession({
    userId,
    lineItems: buildCoinPackLineItems(pack),
    metadata: {
      user_id: String(userId),
      product: SHOP_PRODUCT.KAGE_COINS,
      pack_id: pack.id,
      coins_granted: String(totalCoins),
    },
    successPath: '/shop?tab=currency&checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancelPath: '/shop?tab=currency&checkout=canceled',
  });
}

export async function createBattlePassCheckoutSession(userId) {
  const season = await getActiveSeason();
  if (!season) {
    throw httpError('Aucune saison Battle Pass active.', 404);
  }

  const userPass = await getOrCreateUserBattlePass(userId, season.id);
  if (userPass.isPremium) {
    throw httpError('Battle Pass Premium déjà actif.', 409);
  }

  return createCheckoutSession({
    userId,
    lineItems: buildBattlePassLineItems(),
    metadata: {
      user_id: String(userId),
      product: SHOP_PRODUCT.BATTLE_PASS_PREMIUM,
      season_id: String(season.id),
      season_number: String(season.seasonNumber),
    },
    successPath: '/shop?tab=battlePass&checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancelPath: '/shop?tab=battlePass&checkout=canceled',
  });
}

export async function createWelcomePackCheckoutSession(userId) {
  const owned = await hasPurchasedWelcomePack(userId);
  if (owned) {
    throw httpError('Pack de bienvenue déjà acheté.', 409);
  }

  return createCheckoutSession({
    userId,
    lineItems: buildWelcomePackLineItems(),
    metadata: {
      user_id: String(userId),
      product: SHOP_PRODUCT.WELCOME_PACK,
      pack_id: WELCOME_PACK.id,
    },
    successPath: '/shop?tab=battlePass&checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancelPath: '/shop?tab=battlePass&checkout=canceled',
  });
}

async function fulfillKageCoinsSession(session) {
  const userId = Number(session.metadata?.user_id || session.client_reference_id);
  const packId = String(session.metadata?.pack_id || '').trim();
  if (!userId || !packId || !COIN_PACK_CATALOG[packId]) {
    return { fulfilled: false, reason: 'missing_metadata' };
  }

  const pack = COIN_PACK_CATALOG[packId];
  const totalCoins = Number(session.metadata?.coins_granted) || pack.coins + pack.bonusCoins;

  const existing = await query(
    'SELECT id FROM shop_coin_pack_purchases WHERE stripe_session_id = ? LIMIT 1',
    [session.id],
  );
  if (existing[0]) {
    return {
      fulfilled: true,
      reason: 'already_fulfilled',
      product: SHOP_PRODUCT.KAGE_COINS,
      packId,
      coinsGranted: totalCoins,
      userId,
    };
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE player_profiles SET kage_coins = kage_coins + ? WHERE user_id = ?', [
      totalCoins,
      userId,
    ]);
    try {
      await connection.execute(
        `INSERT INTO shop_coin_pack_purchases (user_id, pack_id, coins_granted, method, stripe_session_id)
         VALUES (?, ?, ?, 'stripe', ?)`,
        [userId, pack.id, totalCoins, session.id],
      );
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return {
          fulfilled: true,
          reason: 'already_fulfilled',
          product: SHOP_PRODUCT.KAGE_COINS,
          packId,
          coinsGranted: totalCoins,
          userId,
        };
      }
      throw error;
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    fulfilled: true,
    product: SHOP_PRODUCT.KAGE_COINS,
    packId,
    coinsGranted: totalCoins,
    userId,
    pack: serializeCoinPack(pack),
  };
}

async function fulfillBattlePassSession(session) {
  const userId = Number(session.metadata?.user_id || session.client_reference_id);
  let seasonId = Number(session.metadata?.season_id);
  if (!userId) {
    return { fulfilled: false, reason: 'missing_metadata' };
  }

  if (!seasonId) {
    const season = await getActiveSeason();
    if (!season) return { fulfilled: false, reason: 'no_active_season' };
    seasonId = season.id;
  }

  const priorSession = await query(
    'SELECT id, user_id, season_id FROM battle_pass_stripe_purchases WHERE stripe_session_id = ? LIMIT 1',
    [session.id],
  );
  if (priorSession[0]) {
    return {
      fulfilled: true,
      reason: 'already_fulfilled',
      product: SHOP_PRODUCT.BATTLE_PASS_PREMIUM,
      userId,
      seasonId,
    };
  }

  const userPass = await getOrCreateUserBattlePass(userId, seasonId);
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    if (!userPass.isPremium) {
      await connection.execute(
        `UPDATE user_battle_pass
         SET is_premium = TRUE, premium_purchased_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [userPass.id],
      );
    }

    try {
      await connection.execute(
        `INSERT INTO battle_pass_stripe_purchases
           (user_id, season_id, stripe_session_id, amount_eur_cents)
         VALUES (?, ?, ?, ?)`,
        [userId, seasonId, session.id, Math.round(BATTLE_PASS_PREMIUM_PRICE_EUR * 100)],
      );
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return {
          fulfilled: true,
          reason: 'already_fulfilled',
          product: SHOP_PRODUCT.BATTLE_PASS_PREMIUM,
          userId,
          seasonId,
        };
      }
      throw error;
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    fulfilled: true,
    product: SHOP_PRODUCT.BATTLE_PASS_PREMIUM,
    userId,
    seasonId,
  };
}

export async function fulfillShopCheckoutSession(session) {
  if (!session) return { fulfilled: false, reason: 'missing_session' };
  if (!sessionPaid(session)) return { fulfilled: false, reason: 'not_paid' };

  const product = resolveShopProductFromSession(session);
  if (!product) return { fulfilled: false, reason: 'not_shop_product' };

  if (product === SHOP_PRODUCT.KAGE_COINS) {
    return fulfillKageCoinsSession(session);
  }
  if (product === SHOP_PRODUCT.BATTLE_PASS_PREMIUM) {
    return fulfillBattlePassSession(session);
  }
  if (product === SHOP_PRODUCT.WELCOME_PACK) {
    return fulfillWelcomePackSession(session);
  }
  return { fulfilled: false, reason: 'unknown_product' };
}

export async function confirmShopCheckoutSession(userId, sessionId) {
  if (!sessionId) {
    throw httpError('session_id requis.', 400);
  }

  const stripe = getStripeClient();
  if (!stripe) {
    throw httpError('Stripe non configuré.', 503);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const sessionUserId = Number(session.metadata?.user_id || session.client_reference_id);
  if (sessionUserId !== userId) {
    throw httpError('Session de paiement invalide.', 403);
  }

  if (!isShopCheckoutSession(session)) {
    throw httpError('Session non liée au shop / Battle Pass.', 400);
  }

  const result = await fulfillShopCheckoutSession(session);
  const balances = await getPlayerBalances(userId);

  return {
    ok: true,
    fulfilled: result.fulfilled,
    reason: result.reason || null,
    product: result.product || resolveShopProductFromSession(session),
    paymentStatus: session.payment_status,
    balances,
    pack: result.pack || null,
    coinsGranted: result.coinsGranted ?? null,
    granted: result.granted || null,
  };
}

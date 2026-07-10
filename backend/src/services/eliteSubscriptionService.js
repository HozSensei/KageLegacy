import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';

export async function getActiveEliteSubscription(userId, pool) {
  if (!pool) return null;
  const rows = await query(
    `SELECT * FROM sensei_elite_subscriptions
     WHERE user_id = ? AND season_number = ? AND status = 'active'
     LIMIT 1`,
    [userId, pool.season_number]
  );
  return rows[0] ?? null;
}

export async function ensureSeasonPass(userId, pool) {
  const subscription = await getActiveEliteSubscription(userId, pool);
  if (!subscription) return null;

  await query(
    `INSERT IGNORE INTO elite_season_passes (user_id, pool_id, season_number)
     VALUES (?, ?, ?)`,
    [userId, pool.id, pool.season_number]
  );

  return subscription;
}

/**
 * Active le Pack Élite pour la saison de ligue en cours (tests / admin / Stripe).
 */
export async function grantEliteSubscription(userId, { poolId, seasonNumber } = {}) {
  const pool = poolId
    ? (await query('SELECT * FROM pools WHERE id = ? LIMIT 1', [poolId]))[0]
    : await findUserPool(userId);

  if (!pool) {
    throw new Error('Pool introuvable pour activer le Pack Élite.');
  }

  const season = seasonNumber ?? pool.season_number;

  return activateEliteFromStripe({
    userId,
    poolId: pool.id,
    seasonNumber: season,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeCheckoutSessionId: null,
  });
}

export async function activateEliteFromStripe({
  userId,
  poolId,
  seasonNumber,
  stripeCustomerId = null,
  stripeSubscriptionId = null,
  stripeCheckoutSessionId = null,
}) {
  if (stripeCheckoutSessionId) {
    const dup = await query(
      `SELECT id FROM sensei_elite_subscriptions
       WHERE stripe_checkout_session_id = ? LIMIT 1`,
      [stripeCheckoutSessionId]
    );
    if (dup[0]) {
      const poolRows = await query('SELECT * FROM pools WHERE id = ? LIMIT 1', [poolId]);
      return getActiveEliteSubscription(userId, poolRows[0]);
    }
  }

  await query(
    `INSERT INTO sensei_elite_subscriptions
       (user_id, pool_id, season_number, status,
        stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
        current_period_start, current_period_end)
     VALUES (?, ?, ?, 'active', ?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 70 DAY))
     ON DUPLICATE KEY UPDATE
       pool_id = VALUES(pool_id),
       status = 'active',
       stripe_customer_id = COALESCE(VALUES(stripe_customer_id), stripe_customer_id),
       stripe_subscription_id = COALESCE(VALUES(stripe_subscription_id), stripe_subscription_id),
       stripe_checkout_session_id = COALESCE(VALUES(stripe_checkout_session_id), stripe_checkout_session_id),
       current_period_start = UTC_TIMESTAMP(),
       current_period_end = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 70 DAY)`,
    [
      userId,
      poolId,
      seasonNumber,
      stripeCustomerId,
      stripeSubscriptionId,
      stripeCheckoutSessionId,
    ]
  );

  await query(
    `INSERT IGNORE INTO elite_season_passes (user_id, pool_id, season_number)
     VALUES (?, ?, ?)`,
    [userId, poolId, seasonNumber]
  );

  const pool = (await query('SELECT * FROM pools WHERE id = ? LIMIT 1', [poolId]))[0];
  return getActiveEliteSubscription(userId, pool);
}

export async function expireEliteSubscriptionsForSeason(seasonNumber) {
  await query(
    `UPDATE sensei_elite_subscriptions
     SET status = 'expired'
     WHERE season_number = ? AND status = 'active'`,
    [seasonNumber]
  );
}

export async function assertActiveEliteSubscription(userId) {
  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune ligue active.');
    error.statusCode = 404;
    throw error;
  }
  const subscription = await getActiveEliteSubscription(userId, pool);
  if (!subscription) {
    const error = new Error('Pack Élite requis.');
    error.statusCode = 403;
    throw error;
  }
  return { pool, subscription };
}

export async function hasActiveEliteSubscription(userId) {
  const pool = await findUserPool(userId);
  if (!pool) return false;
  const subscription = await getActiveEliteSubscription(userId, pool);
  return Boolean(subscription);
}

export async function getEliteMePayload(userId, locale = 'fr') {
  const pool = await findUserPool(userId);
  const subscription = pool ? await getActiveEliteSubscription(userId, pool) : null;
  const isActive = Boolean(subscription);

  const equippedRows = isActive
    ? await query('SELECT * FROM sensei_cosmetics WHERE user_id = ? LIMIT 1', [userId])
    : [];

  return {
    subscription: {
      isActive,
      status: subscription?.status ?? null,
      seasonNumber: subscription?.season_number ?? pool?.season_number ?? null,
      poolId: subscription?.pool_id ?? pool?.id ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
    },
    equipped: isActive
      ? {
          titleSlug: equippedRows[0]?.title_slug ?? null,
          bannerSlug: equippedRows[0]?.banner_slug ?? 'none',
          nameColor: equippedRows[0]?.name_color ?? '#e8ece9',
        }
      : null,
    locale,
  };
}

import Stripe from 'stripe';
import { query } from '../config/database.js';
import { findUserById } from './authService.js';
import { findUserPool } from './poolService.js';
import {
  activateEliteFromStripe,
  getActiveEliteSubscription,
  revokeEliteSubscription,
} from './eliteSubscriptionService.js';

function isDevEliteGrantAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_TOOLS === 'true';
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

function getPublicAppUrl() {
  const candidates = [
    process.env.APP_PUBLIC_URL,
    process.env.CORS_ORIGIN,
    'http://localhost:5173',
  ];

  for (const candidate of candidates) {
    const normalized = normalizePublicUrl(candidate);
    if (normalized) {
      try {
        const parsed = new URL(normalized);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return normalized;
        }
      } catch {
        // try next candidate
      }
    }
  }

  return 'http://localhost:5173';
}

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function stripeHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function resolveCheckoutMode(stripe, priceId) {
  const price = await stripe.prices.retrieve(priceId);
  return price.type === 'recurring' ? 'subscription' : 'payment';
}

/**
 * Active le Pack Élite via Stripe Checkout (paiement saison ou abonnement).
 */
export async function createEliteCheckoutSession(userId) {
  if (!process.env.STRIPE_SECRET_KEY) {
    if (!isDevEliteGrantAllowed()) {
      throw stripeHttpError('Paiement Pack Élite indisponible — Stripe non configuré.', 503);
    }
    const { grantEliteSubscription } = await import('./eliteSubscriptionService.js');
    const subscription = await grantEliteSubscription(userId);
    return {
      mode: 'dev_grant',
      ok: true,
      subscription,
      message: 'Pack Élite activé (mode développement sans Stripe).',
    };
  }

  const priceId = process.env.STRIPE_ELITE_PRICE_ID;
  if (!priceId) {
    throw stripeHttpError('STRIPE_ELITE_PRICE_ID non configuré.', 503);
  }

  const pool = await findUserPool(userId);
  if (!pool) {
    throw stripeHttpError('Aucune ligue active — rejoignez une pool avant le Pack Élite.', 404);
  }

  const existing = await getActiveEliteSubscription(userId, pool);
  if (existing) {
    throw stripeHttpError('Pack Élite déjà actif pour la saison en cours.', 409);
  }

  const stripe = getStripeClient();
  const user = await findUserById(userId);
  const baseUrl = getPublicAppUrl();
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw stripeHttpError(
      'APP_PUBLIC_URL invalide — utilisez une URL complète (ex. https://kagelegacy.jeromedessy.be).',
      503
    );
  }
  const checkoutMode = await resolveCheckoutMode(stripe, priceId);

  const sessionParams = {
    mode: checkoutMode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/profil?elite=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/profil?elite=canceled`,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      pool_id: String(pool.id),
      season_number: String(pool.season_number),
      product: 'elite_season',
    },
    allow_promotion_codes: false,
  };

  if (user?.email) {
    sessionParams.customer_email = user.email;
  }

  if (checkoutMode === 'payment') {
    sessionParams.customer_creation = 'always';
  } else {
    sessionParams.subscription_data = {
      metadata: {
        user_id: String(userId),
        pool_id: String(pool.id),
        season_number: String(pool.season_number),
        product: 'elite_season',
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    mode: 'stripe_checkout',
    ok: true,
    url: session.url,
    sessionId: session.id,
  };
}

export async function fulfillCheckoutSession(session) {
  if (!session) return { fulfilled: false, reason: 'missing_session' };

  const paid =
    session.payment_status === 'paid' ||
    session.status === 'complete' ||
    session.status === 'paid';
  if (!paid) return { fulfilled: false, reason: 'not_paid' };

  const userId = Number(session.metadata?.user_id || session.client_reference_id);
  const poolId = Number(session.metadata?.pool_id);
  const seasonNumber = Number(session.metadata?.season_number);
  if (!userId || !poolId || !seasonNumber) {
    return { fulfilled: false, reason: 'missing_metadata' };
  }

  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;

  const subscription = await activateEliteFromStripe({
    userId,
    poolId,
    seasonNumber,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeCheckoutSessionId: session.id,
  });

  return { fulfilled: true, subscription };
}

/**
 * Confirmation côté client après redirect Stripe (complète le webhook si besoin).
 */
export async function confirmEliteCheckoutSession(userId, sessionId) {
  if (!sessionId) {
    throw stripeHttpError('session_id requis.', 400);
  }

  const stripe = getStripeClient();
  if (!stripe) {
    throw stripeHttpError('Stripe non configuré.', 503);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const sessionUserId = Number(session.metadata?.user_id || session.client_reference_id);

  if (sessionUserId !== userId) {
    throw stripeHttpError('Session de paiement invalide.', 403);
  }

  const result = await fulfillCheckoutSession(session);
  const pool = await findUserPool(userId);
  const subscription = pool ? await getActiveEliteSubscription(userId, pool) : null;

  return {
    ok: true,
    fulfilled: result.fulfilled,
    paymentStatus: session.payment_status,
    subscription: subscription
      ? {
          isActive: subscription.status === 'active',
          status: subscription.status,
          seasonNumber: subscription.season_number,
          poolId: subscription.pool_id,
          currentPeriodEnd: subscription.current_period_end,
        }
      : null,
  };
}

async function findSubscriptionByStripeRef({ customerId, subscriptionId }) {
  if (subscriptionId) {
    const rows = await query(
      `SELECT * FROM sensei_elite_subscriptions
       WHERE stripe_subscription_id = ? ORDER BY id DESC LIMIT 1`,
      [subscriptionId]
    );
    if (rows[0]) return rows[0];
  }
  if (customerId) {
    const rows = await query(
      `SELECT * FROM sensei_elite_subscriptions
       WHERE stripe_customer_id = ? ORDER BY id DESC LIMIT 1`,
      [customerId]
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

async function setEliteSubscriptionStatus(subscriptionRow, status) {
  if (!subscriptionRow) return;
  await query(
    `UPDATE sensei_elite_subscriptions SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
    [status, subscriptionRow.id]
  );
}

async function handleSubscriptionUpdated(subscription) {
  const row = await findSubscriptionByStripeRef({
    customerId: subscription.customer,
    subscriptionId: subscription.id,
  });
  if (!row) return;

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await query(
      `UPDATE sensei_elite_subscriptions
       SET status = 'active',
           current_period_start = FROM_UNIXTIME(?),
           current_period_end = FROM_UNIXTIME(?),
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [subscription.current_period_start, subscription.current_period_end, row.id]
    );
    return;
  }

  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    await setEliteSubscriptionStatus(row, 'past_due');
    return;
  }

  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    await setEliteSubscriptionStatus(row, 'canceled');
  }
}

async function handleSubscriptionDeleted(subscription) {
  const row = await findSubscriptionByStripeRef({
    customerId: subscription.customer,
    subscriptionId: subscription.id,
  });
  if (!row) return;
  await setEliteSubscriptionStatus(row, 'canceled');
}

async function handleInvoicePaymentFailed(invoice) {
  const row = await findSubscriptionByStripeRef({
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
  });
  if (!row) return;
  await setEliteSubscriptionStatus(row, 'past_due');
}

function isChargeFullyRefunded(charge) {
  if (!charge) return false;
  if (charge.refunded === true) return true;
  const amount = charge.amount ?? 0;
  const refunded = charge.amount_refunded ?? 0;
  return amount > 0 && refunded >= amount;
}

/**
 * Révoque le Pack Élite après remboursement Stripe (charge.refunded).
 * Exporté pour les tests unitaires sans appel API.
 */
export async function revokeEliteForChargeRefund(charge, { stripe = null } = {}) {
  if (!isChargeFullyRefunded(charge)) {
    return { revoked: false, reason: 'not_fully_refunded' };
  }

  const customerId =
    typeof charge.customer === 'string' ? charge.customer : charge.customer?.id ?? null;
  const paymentIntent =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  let row = null;

  if (paymentIntent && stripe) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent,
        limit: 1,
      });
      const sessionId = sessions.data[0]?.id;
      if (sessionId) {
        const rows = await query(
          `SELECT * FROM sensei_elite_subscriptions
           WHERE stripe_checkout_session_id = ?
           ORDER BY id DESC LIMIT 1`,
          [sessionId]
        );
        row = rows[0] ?? null;
      }
    } catch (error) {
      console.error('Stripe checkout.sessions.list:', error.message);
    }
  }

  if (!row && customerId) {
    const rows = await query(
      `SELECT * FROM sensei_elite_subscriptions
       WHERE stripe_customer_id = ? AND status IN ('active', 'past_due')
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [customerId]
    );
    row = rows[0] ?? null;
  }

  if (!row) {
    return { revoked: false, reason: 'subscription_not_found' };
  }

  if (row.status === 'canceled' || row.status === 'expired') {
    return { revoked: false, reason: 'already_revoked', userId: row.user_id };
  }

  await revokeEliteSubscription(row.id, 'canceled');
  return { revoked: true, userId: row.user_id, subscriptionId: row.id };
}

async function handleChargeRefunded(charge) {
  const stripe = getStripeClient();
  return revokeEliteForChargeRefund(charge, { stripe });
}

export async function handleStripeWebhook(rawBody, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw stripeHttpError('STRIPE_WEBHOOK_SECRET non configuré.', 503);
  }

  const stripe = getStripeClient();
  if (!stripe) {
    throw stripeHttpError('STRIPE_SECRET_KEY non configuré.', 503);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    throw stripeHttpError(`Signature webhook invalide : ${error.message}`, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await fulfillCheckoutSession(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    case 'invoice.paid':
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object);
      break;
    default:
      break;
  }

  return { received: true, handled: true, type: event.type };
}

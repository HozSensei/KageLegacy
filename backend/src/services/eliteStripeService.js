import { grantEliteSubscription } from './eliteSubscriptionService.js';

/**
 * Stripe checkout — stub V1 : active le pack en dev si STRIPE_SECRET_KEY absent.
 */
function isDevEliteGrantAllowed() {
  return (
    process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_TOOLS === 'true'
  );
}

export async function createEliteCheckoutSession(userId) {
  if (!process.env.STRIPE_SECRET_KEY) {
    if (!isDevEliteGrantAllowed()) {
      const error = new Error('Paiement Pack Élite indisponible — Stripe non configuré.');
      error.statusCode = 503;
      throw error;
    }
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
    const error = new Error('STRIPE_ELITE_PRICE_ID non configuré.');
    error.statusCode = 503;
    throw error;
  }

  const error = new Error('Intégration Stripe à finaliser — configurez le webhook et Checkout Session.');
  error.statusCode = 501;
  throw error;
}

/**
 * Webhook Stripe (squelette) — à brancher sur customer.subscription.created/updated.
 */
export async function handleStripeWebhook(_event) {
  return { received: true, handled: false };
}

import { Router } from 'express';
import Stripe from 'stripe';
import { fulfillShopCheckoutSession } from '../services/shopStripeService.js';

const router = Router();

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'En-tête stripe-signature manquant.' });
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Stripe non configuré.' });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    if (event.type === 'checkout.session.completed') {
      await fulfillShopCheckoutSession(event.data.object);
    }
    res.json({ received: true, handled: true, type: event.type });
  } catch (error) {
    console.error('Stripe webhook:', error);
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

export default router;

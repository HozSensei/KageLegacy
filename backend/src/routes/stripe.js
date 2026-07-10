import { Router } from 'express';
import { handleStripeWebhook } from '../services/eliteStripeService.js';

const router = Router();

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'En-tête stripe-signature manquant.' });
    }

    const result = await handleStripeWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    console.error('Stripe webhook:', error);
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

export default router;

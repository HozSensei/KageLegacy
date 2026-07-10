-- Stripe : idempotence checkout one-shot (paiement par saison)

ALTER TABLE sensei_elite_subscriptions
  ADD COLUMN stripe_checkout_session_id VARCHAR(128) NULL AFTER stripe_subscription_id;

CREATE INDEX idx_elite_sub_checkout_session
  ON sensei_elite_subscriptions (stripe_checkout_session_id);

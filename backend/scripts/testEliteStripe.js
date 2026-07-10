/**
 * Tests Stripe Pack Élite (fulfillment checkout sans appel API Stripe).
 * Usage: node scripts/testEliteStripe.js
 */
import { query } from '../src/config/database.js';
import { fulfillCheckoutSession } from '../src/services/eliteStripeService.js';
import { getActiveEliteSubscription } from '../src/services/eliteSubscriptionService.js';

const PREFIX = `elite_stripe_${Date.now()}`;

async function createSensei(username) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [username]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Genjutsu', 10000, 0, 100, 'fr')`,
    [userId, username]
  );
  return userId;
}

async function main() {
  const poolRows = await query('SELECT * FROM pools LIMIT 1');
  if (!poolRows[0]) {
    console.error('SKIP: aucune pool en base.');
    process.exit(0);
  }
  const pool = poolRows[0];
  const userId = await createSensei(`${PREFIX}_sensei`);

  await query('INSERT IGNORE INTO pool_members (pool_id, user_id) VALUES (?, ?)', [pool.id, userId]);
  await query('INSERT IGNORE INTO pool_standings (pool_id, user_id) VALUES (?, ?)', [pool.id, userId]);

  const session = {
    id: `cs_test_${PREFIX}`,
    payment_status: 'paid',
    status: 'complete',
    customer: 'cus_test_123',
    subscription: null,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      pool_id: String(pool.id),
      season_number: String(pool.season_number),
      product: 'elite_season',
    },
  };

  const first = await fulfillCheckoutSession(session);
  console.assert(first.fulfilled, 'premier fulfillment OK');

  let sub = await getActiveEliteSubscription(userId, pool);
  console.assert(sub?.status === 'active', 'abonnement actif');
  console.assert(sub?.stripe_customer_id === 'cus_test_123', 'customer stripe enregistré');

  const second = await fulfillCheckoutSession(session);
  console.assert(second.fulfilled, 'idempotence session checkout');

  await query('DELETE FROM sensei_elite_subscriptions WHERE user_id = ?', [userId]);
  await query('DELETE FROM elite_season_passes WHERE user_id = ?', [userId]);
  await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
  await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);

  console.log('testEliteStripe: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

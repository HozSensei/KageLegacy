/**
 * Tests Stripe shop — mapping packs + fulfillment idempotent (sans API Stripe).
 * Usage: node scripts/testShopStripe.js
 */
import {
  BATTLE_PASS_PREMIUM_PRICE_EUR,
  SHOP_PRODUCT,
  buildBattlePassLineItems,
  buildCoinPackLineItems,
  coinPackPriceEnvKey,
  fulfillShopCheckoutSession,
  isShopCheckoutSession,
  resolveShopProductFromSession,
} from '../src/services/shopStripeService.js';
import { COIN_PACK_CATALOG, getCoinPack } from '../src/services/shopService.js';
import { query } from '../src/config/database.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(coinPackPriceEnvKey('ember') === 'STRIPE_PRICE_ID_COIN_EMBER', 'env key ember');
const ember = getCoinPack('ember');
const emberItems = buildCoinPackLineItems(ember);
assert(emberItems[0].price_data?.unit_amount === 500, 'ember 5€ = 500 cents');
assert(buildCoinPackLineItems(getCoinPack('vault'))[0].price_data.unit_amount === 5000, 'vault');

const prev = process.env.STRIPE_PRICE_ID_COIN_SPARK;
process.env.STRIPE_PRICE_ID_COIN_SPARK = 'price_test_spark';
assert(
  buildCoinPackLineItems(getCoinPack('spark'))[0].price === 'price_test_spark',
  'price override'
);
if (prev === undefined) delete process.env.STRIPE_PRICE_ID_COIN_SPARK;
else process.env.STRIPE_PRICE_ID_COIN_SPARK = prev;

assert(BATTLE_PASS_PREMIUM_PRICE_EUR === 5, 'BP 5€');
assert(buildBattlePassLineItems()[0].price_data?.unit_amount === 500, 'BP cents');

const coinMeta = { metadata: { product: SHOP_PRODUCT.KAGE_COINS, pack_id: 'ember', user_id: '1' } };
assert(resolveShopProductFromSession(coinMeta) === SHOP_PRODUCT.KAGE_COINS, 'resolve');
assert(isShopCheckoutSession(coinMeta), 'is shop');
assert(!isShopCheckoutSession({ metadata: { product: 'unknown_product' } }), 'not shop product');
assert(
  Object.values(COIN_PACK_CATALOG).every(p => p.priceEur > 0 && p.coins > 0),
  'catalog'
);
assert(
  (
    await fulfillShopCheckoutSession({
      status: 'complete',
      payment_status: 'unpaid',
      metadata: { product: SHOP_PRODUCT.KAGE_COINS },
    })
  ).reason === 'not_paid',
  'complete checkout without confirmed payment is rejected'
);
console.log('testShopStripe mapping: OK');

async function dbAvailable() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function integration() {
  const PREFIX = `shop_stripe_${Date.now()}`;
  const userResult = await query('INSERT INTO users (username) VALUES (?)', [`${PREFIX}_u`]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO player_profiles (user_id, display_name, ryos, language, kage_coins)
     VALUES (?, ?, 10000, 'fr', 0)`,
    [userId, `${PREFIX}_s`]
  );
  const session = {
    id: `cs_test_${PREFIX}`,
    payment_status: 'paid',
    status: 'complete',
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      product: SHOP_PRODUCT.KAGE_COINS,
      pack_id: 'ember',
      coins_granted: '550',
    },
  };
  const first = await fulfillShopCheckoutSession(session);
  assert(first.fulfilled && first.coinsGranted === 550, 'first fulfill');
  const second = await fulfillShopCheckoutSession(session);
  assert(second.reason === 'already_fulfilled', 'idempotent');
  const profileRows = await query('SELECT kage_coins FROM player_profiles WHERE user_id = ?', [
    userId,
  ]);
  assert(Number(profileRows[0].kage_coins) === 550, 'no double credit');

  const seasons = await query(
    'SELECT id FROM battle_pass_seasons WHERE is_active = TRUE ORDER BY id DESC LIMIT 1'
  );
  if (seasons[0]) {
    const seasonId = seasons[0].id;
    await query(
      `INSERT INTO user_battle_pass (user_id, season_id, current_level, current_xp, is_premium, claimed_rewards_json)
       VALUES (?, ?, 0, 0, FALSE, '{"free":[],"premium":[]}')
       ON DUPLICATE KEY UPDATE is_premium = FALSE`,
      [userId, seasonId]
    );
    const bpSession = {
      id: `cs_test_bp_${PREFIX}`,
      payment_status: 'paid',
      status: 'complete',
      client_reference_id: String(userId),
      metadata: {
        user_id: String(userId),
        product: SHOP_PRODUCT.BATTLE_PASS_PREMIUM,
        season_id: String(seasonId),
      },
    };
    assert((await fulfillShopCheckoutSession(bpSession)).fulfilled, 'BP fulfill');
    assert(
      (await fulfillShopCheckoutSession(bpSession)).reason === 'already_fulfilled',
      'BP idempotent'
    );
    await query('DELETE FROM battle_pass_stripe_purchases WHERE user_id = ?', [userId]);
    await query('DELETE FROM user_battle_pass WHERE user_id = ?', [userId]);
  } else {
    console.log('  (BP integration skipped — no active season)');
  }

  await query('DELETE FROM shop_coin_pack_purchases WHERE user_id = ?', [userId]);
  await query('DELETE FROM player_profiles WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
  console.log('testShopStripe fulfillment: OK');
}

if (await dbAvailable()) await integration();
else console.log('testShopStripe fulfillment: SKIP (no DB)');
console.log('testShopStripe: OK');
process.exit(0);

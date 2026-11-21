/**
 * Pack bienvenue one-shot — BP premium + titre + booster standard.
 */
import { query, getConnection } from '../config/database.js';
import { WELCOME_PACK } from '../config/economyConfig.js';
import {
  getActiveSeason,
  getOrCreateUserBattlePass,
  grantBattlePassReward,
} from './battlePassService.js';
import { grantNicknameUnlock, WELCOME_NICKNAME } from './nicknameUnlockService.js';
import { getPlayerBalances } from './shopService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export function serializeWelcomePackOffer({ available, purchasedAt = null } = {}) {
  return {
    id: WELCOME_PACK.id,
    available: Boolean(available),
    purchasedAt,
    priceEur: WELCOME_PACK.priceEur,
    contents: {
      battlePassPremium: true,
      nicknameId: WELCOME_NICKNAME.id,
      boosterType: WELCOME_PACK.boosterType,
      fallbackKageCoins: WELCOME_PACK.fallbackKageCoins,
    },
  };
}

export async function hasPurchasedWelcomePack(userId, connection = null) {
  if (!(await tableExists('shop_welcome_purchases'))) return false;
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;
  const rows = await run(
    'SELECT id, created_at FROM shop_welcome_purchases WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

export async function getWelcomePackOffer(userId) {
  const purchase = await hasPurchasedWelcomePack(userId);
  return serializeWelcomePackOffer({
    available: !purchase,
    purchasedAt: purchase?.created_at || null,
  });
}

/**
 * Applique les récompenses du pack (idempotent si appelé dans une tx déjà enregistrée).
 */
export async function grantWelcomePackContents(userId, connection) {
  const granted = {
    battlePassPremium: false,
    kageCoinsFallback: 0,
    nickname: null,
    booster: null,
  };

  const season = await getActiveSeason();
  if (season) {
    const userPass = await getOrCreateUserBattlePass(userId, season.id);
    if (!userPass.isPremium) {
      await connection.execute(
        `UPDATE user_battle_pass
         SET is_premium = TRUE, premium_purchased_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [userPass.id],
      );
      granted.battlePassPremium = true;
    }
  } else {
    await connection.execute(
      'UPDATE player_profiles SET kage_coins = kage_coins + ? WHERE user_id = ?',
      [WELCOME_PACK.fallbackKageCoins, userId],
    );
    granted.kageCoinsFallback = WELCOME_PACK.fallbackKageCoins;
  }

  granted.nickname = await grantNicknameUnlock(userId, WELCOME_NICKNAME.id, {
    source: 'welcome_pack',
    sourceRef: WELCOME_PACK.id,
    connection,
  });

  granted.booster = await grantBattlePassReward(
    userId,
    { type: 'booster', boosterType: WELCOME_PACK.boosterType },
    connection,
  );

  return granted;
}

/**
 * Achat stub / fulfillment interne.
 */
export async function purchaseWelcomePack(
  userId,
  { method = 'stub', isAdmin = false, stripeSessionId = null } = {},
) {
  if (!(await tableExists('shop_welcome_purchases'))) {
    throw httpError(503, 'Table shop_welcome_purchases absente — migrer la base.');
  }

  const mode = method === 'stripe' ? 'stripe' : 'stub';
  if (mode === 'stub' && !isAdmin && process.env.SHOP_COIN_STUB !== 'true') {
    throw httpError(
      403,
      'Achat stub réservé admin/dev (SHOP_COIN_STUB=true ou compte admin). Utilisez method=stripe.',
    );
  }

  const existing = await hasPurchasedWelcomePack(userId);
  if (existing) {
    throw httpError(409, 'Pack de bienvenue déjà acheté.');
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [dup] = await connection.execute(
      'SELECT id FROM shop_welcome_purchases WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (dup[0]) {
      await connection.rollback();
      throw httpError(409, 'Pack de bienvenue déjà acheté.');
    }

    const granted = await grantWelcomePackContents(userId, connection);

    await connection.execute(
      `INSERT INTO shop_welcome_purchases (user_id, method, stripe_session_id, payload_json)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        mode,
        stripeSessionId,
        JSON.stringify({ granted, priceEur: WELCOME_PACK.priceEur }),
      ],
    );

    await connection.commit();
    const balances = await getPlayerBalances(userId);
    return {
      ok: true,
      pack: serializeWelcomePackOffer({ available: false, purchasedAt: new Date().toISOString() }),
      granted,
      method: mode,
      balances,
      note: 'Pack de bienvenue crédité.',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Fulfillment Stripe idempotent par session.
 */
export async function fulfillWelcomePackSession(session) {
  const userId = Number(session.metadata?.user_id || session.client_reference_id);
  if (!userId) return { fulfilled: false, reason: 'missing_metadata' };

  if (!(await tableExists('shop_welcome_purchases'))) {
    return { fulfilled: false, reason: 'table_missing' };
  }

  const bySession = await query(
    'SELECT id, user_id FROM shop_welcome_purchases WHERE stripe_session_id = ? LIMIT 1',
    [session.id],
  );
  if (bySession[0]) {
    return {
      fulfilled: true,
      reason: 'already_fulfilled',
      product: 'welcome_pack',
      userId,
    };
  }

  const byUser = await hasPurchasedWelcomePack(userId);
  if (byUser) {
    return {
      fulfilled: true,
      reason: 'already_owned',
      product: 'welcome_pack',
      userId,
    };
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const granted = await grantWelcomePackContents(userId, connection);
    try {
      await connection.execute(
        `INSERT INTO shop_welcome_purchases (user_id, method, stripe_session_id, payload_json)
         VALUES (?, 'stripe', ?, ?)`,
        [userId, session.id, JSON.stringify({ granted, priceEur: WELCOME_PACK.priceEur })],
      );
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return {
          fulfilled: true,
          reason: 'already_fulfilled',
          product: 'welcome_pack',
          userId,
        };
      }
      throw error;
    }
    await connection.commit();
    return {
      fulfilled: true,
      product: 'welcome_pack',
      userId,
      granted,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

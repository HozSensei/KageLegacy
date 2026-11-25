/**
 * Déblocages d’effets de fiche profil (boutique ryo).
 */
import { query } from '../config/database.js';
import {
  PROFILE_CARD_EFFECT_CATALOG,
  getProfileCardEffect,
  isKnownProfileCardEffectId,
} from './characterAppearance.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?
       LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function listGrantedCardEffectIds(userId, connection = null) {
  if (!(await tableExists('player_card_effect_unlocks'))) return [];
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;
  const rows = await run(
    `SELECT effect_id FROM player_card_effect_unlocks
     WHERE user_id = ? ORDER BY unlocked_at ASC, id ASC`,
    [userId],
  );
  return rows.map(row => row.effect_id).filter(Boolean);
}

export function catalogEntriesForGrantedCardEffectIds(grantedIds = []) {
  const set = new Set(grantedIds || []);
  return PROFILE_CARD_EFFECT_CATALOG.filter(entry => set.has(entry.id));
}

/**
 * @param {number} userId
 * @param {string} effectId
 * @param {{ source?: string, sourceRef?: string|null, connection?: object|null }} [opts]
 */
export async function grantCardEffectUnlock(
  userId,
  effectId,
  { source = 'unknown', sourceRef = null, connection = null } = {},
) {
  if (!userId) throw httpError(400, 'userId requis.');
  if (!isKnownProfileCardEffectId(effectId)) throw httpError(400, 'Effet de fiche inconnu.');

  if (!(await tableExists('player_card_effect_unlocks'))) {
    throw httpError(503, 'Table player_card_effect_unlocks absente — migrer la base.');
  }

  const executor = connection || {
    execute: async (sql, params) => [await query(sql, params)],
  };

  try {
    await executor.execute(
      `INSERT INTO player_card_effect_unlocks (user_id, effect_id, source, source_ref)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        effectId,
        String(source).slice(0, 32),
        sourceRef != null ? String(sourceRef).slice(0, 64) : null,
      ],
    );
    return { effectId, granted: true, source };
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return { effectId, granted: false, alreadyOwned: true, source };
    }
    throw err;
  }
}

/**
 * Achat d’un effet de fiche contre des ryos ou des Kage Coins.
 * @param {'ryos'|'kage_coins'} [currency='ryos']
 */
export async function purchaseCardEffectWithCurrency(
  userId,
  effectId,
  { currency = 'ryos' } = {},
) {
  if (!userId) throw httpError(400, 'userId requis.');
  const effect = getProfileCardEffect(effectId);
  if (!effect) throw httpError(404, 'Effet introuvable.');
  const useKc = currency === 'kage_coins';
  const cost = Number(useKc ? effect.kageCoins : effect.ryos) || 0;
  if (cost <= 0) {
    throw httpError(
      400,
      useKc ? 'Cet effet n’est pas achetable en Kage Coins.' : 'Cet effet n’est pas achetable en ryos.',
    );
  }

  if (!(await tableExists('player_card_effect_unlocks'))) {
    throw httpError(503, 'Table player_card_effect_unlocks absente — migrer la base.');
  }

  const { getConnection } = await import('../config/database.js');
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const owned = await listGrantedCardEffectIds(userId, connection);
    if (owned.includes(effectId)) {
      throw httpError(409, 'Effet déjà possédé.');
    }

    const [profiles] = await connection.execute(
      'SELECT ryos, kage_coins FROM player_profiles WHERE user_id = ? FOR UPDATE',
      [userId],
    );
    if (!profiles[0]) throw httpError(404, 'Profil joueur introuvable.');
    const ryos = Number(profiles[0].ryos) || 0;
    const kageCoins = Number(profiles[0].kage_coins) || 0;
    if (useKc) {
      if (kageCoins < cost) throw httpError(400, 'Kage Coins insuffisants.');
      await connection.execute(
        'UPDATE player_profiles SET kage_coins = kage_coins - ? WHERE user_id = ?',
        [cost, userId],
      );
    } else {
      if (ryos < cost) throw httpError(400, 'Ryos insuffisants.');
      await connection.execute('UPDATE player_profiles SET ryos = ryos - ? WHERE user_id = ?', [
        cost,
        userId,
      ]);
    }
    const result = await grantCardEffectUnlock(userId, effectId, {
      source: 'shop',
      sourceRef: `${useKc ? 'kage_coins' : 'ryos'}:${cost}`,
      connection,
    });
    await connection.commit();
    return {
      ...result,
      currency: useKc ? 'kage_coins' : 'ryos',
      ryosSpent: useKc ? 0 : cost,
      kageCoinsSpent: useKc ? cost : 0,
      ryosRemaining: useKc ? ryos : ryos - cost,
      kageCoinsRemaining: useKc ? kageCoins - cost : kageCoins,
      effect,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/** @deprecated Prefer purchaseCardEffectWithCurrency */
export async function purchaseCardEffectWithRyos(userId, effectId) {
  return purchaseCardEffectWithCurrency(userId, effectId, { currency: 'ryos' });
}

export {
  PROFILE_CARD_EFFECT_CATALOG,
  getProfileCardEffect,
  isKnownProfileCardEffectId,
};

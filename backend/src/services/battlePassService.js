/**
 * Battle Pass — saisons, XP/tiers, claim free/premium, unlock premium (stub / Kage Coins).
 */
import { query, getConnection } from '../config/database.js';
import { addCard } from './collectionService.js';
import { getCardsByRarity, parseJsonSafe } from './cardService.js';

export const PREMIUM_COST_KAGE_COINS = 500;
export const LEVEL_COST_KAGE_COINS = 150;
export const MAX_PURCHASABLE_LEVELS = 20;
export const BUY_LEVELS_MIN_LEVEL = 30;
export const PREMIUM_XP_MULTIPLIER = 1.2;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseClaimed(raw) {
  const parsed = parseJsonSafe(raw, { free: [], premium: [] }) || { free: [], premium: [] };
  return {
    free: Array.isArray(parsed.free) ? parsed.free.map(Number) : [],
    premium: Array.isArray(parsed.premium) ? parsed.premium.map(Number) : [],
  };
}

function parseRewards(raw) {
  const parsed = parseJsonSafe(raw, { free: {}, premium: {} }) || { free: {}, premium: {} };
  return {
    free: parsed.free && typeof parsed.free === 'object' ? parsed.free : {},
    premium: parsed.premium && typeof parsed.premium === 'object' ? parsed.premium : {},
  };
}

/** XP requis pour atteindre `level` depuis level-1 (progressif +50 / 10 niv.). */
export function getXPForLevel(level, baseXp = 1000) {
  const target = Math.max(1, Number(level) || 1);
  const tier = Math.floor((target - 1) / 10);
  return Number(baseXp) + tier * 50;
}

export function serializeSeason(row) {
  if (!row) return null;
  return {
    id: row.id,
    seasonNumber: row.season_number,
    name: row.name,
    theme: row.theme,
    startDate: row.start_date,
    endDate: row.end_date,
    maxLevel: row.max_level,
    baseXpPerLevel: row.base_xp_per_level,
    isActive: Boolean(row.is_active),
    rewards: parseRewards(row.rewards_json),
  };
}

export function serializeUserPass(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    seasonId: row.season_id,
    currentLevel: row.current_level,
    currentXp: row.current_xp,
    isPremium: Boolean(row.is_premium),
    premiumPurchasedAt: row.premium_purchased_at,
    claimedRewards: parseClaimed(row.claimed_rewards_json),
    missionsCompleted: row.missions_completed,
    combatsWon: row.combats_won,
    cardsObtained: row.cards_obtained,
  };
}

export async function getActiveSeason() {
  const rows = await query(
    `SELECT * FROM battle_pass_seasons
     WHERE is_active = TRUE
     ORDER BY season_number DESC
     LIMIT 1`,
  );
  return rows[0] ? serializeSeason(rows[0]) : null;
}

export async function getSeasonRow(seasonId) {
  const rows = await query('SELECT * FROM battle_pass_seasons WHERE id = ? LIMIT 1', [seasonId]);
  return rows[0] || null;
}

/**
 * Crée la ligne user_battle_pass si absente.
 */
export async function getOrCreateUserBattlePass(userId, seasonId) {
  const existing = await query(
    'SELECT * FROM user_battle_pass WHERE user_id = ? AND season_id = ? LIMIT 1',
    [userId, seasonId],
  );
  if (existing[0]) return serializeUserPass(existing[0]);

  const claimed = JSON.stringify({ free: [], premium: [] });
  const result = await query(
    `INSERT INTO user_battle_pass
      (user_id, season_id, current_level, current_xp, is_premium, claimed_rewards_json)
     VALUES (?, ?, 0, 0, FALSE, ?)`,
    [userId, seasonId, claimed],
  );
  const rows = await query('SELECT * FROM user_battle_pass WHERE id = ? LIMIT 1', [result.insertId]);
  return serializeUserPass(rows[0]);
}

export async function getBattlePassState(userId) {
  const season = await getActiveSeason();
  if (!season) {
    return { season: null, progress: null, tracks: null };
  }
  const progress = await getOrCreateUserBattlePass(userId, season.id);
  return {
    season,
    progress,
    tracks: buildTrackView(season, progress),
  };
}

function rewardsForLevel(trackMap, level) {
  const key = String(level);
  const entry = trackMap[key] ?? trackMap[level];
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

export function buildTrackView(season, progress) {
  const max = season.maxLevel;
  const claimed = progress.claimedRewards;
  const free = [];
  const premium = [];

  for (let level = 1; level <= max; level += 1) {
    const xpNeeded = getXPForLevel(level, season.baseXpPerLevel);
    const reached = progress.currentLevel >= level;
    free.push({
      level,
      xpNeeded,
      rewards: rewardsForLevel(season.rewards.free, level),
      reached,
      claimed: claimed.free.includes(level),
      claimable: reached && !claimed.free.includes(level),
    });
    premium.push({
      level,
      xpNeeded,
      rewards: rewardsForLevel(season.rewards.premium, level),
      reached,
      claimed: claimed.premium.includes(level),
      claimable: progress.isPremium && reached && !claimed.premium.includes(level),
      locked: !progress.isPremium,
    });
  }

  return { free, premium };
}

/**
 * Ajoute de l'XP Battle Pass (bonus +20% si premium).
 */
export async function addBattlePassXP(userId, xpAmount, source = 'unknown') {
  const amount = Math.floor(Number(xpAmount) || 0);
  if (amount <= 0) throw httpError(400, 'xpAmount doit être positif.');

  const season = await getActiveSeason();
  if (!season) throw httpError(404, 'Aucune saison Battle Pass active.');

  const userPass = await getOrCreateUserBattlePass(userId, season.id);
  const multiplier = userPass.isPremium ? PREMIUM_XP_MULTIPLIER : 1.0;
  const finalXP = Math.floor(amount * multiplier);

  let newXP = userPass.currentXp + finalXP;
  let newLevel = userPass.currentLevel;
  const levelsGained = [];

  while (newLevel < season.maxLevel) {
    const need = getXPForLevel(newLevel + 1, season.baseXpPerLevel);
    if (newXP < need) break;
    newXP -= need;
    newLevel += 1;
    levelsGained.push(newLevel);
  }

  if (newLevel >= season.maxLevel) {
    newLevel = season.maxLevel;
    newXP = Math.min(newXP, getXPForLevel(season.maxLevel, season.baseXpPerLevel) - 1);
  }

  await query(
    `UPDATE user_battle_pass
     SET current_level = ?, current_xp = ?
     WHERE user_id = ? AND season_id = ?`,
    [newLevel, newXP, userId, season.id],
  );

  return {
    source,
    xpGained: finalXP,
    multiplier,
    previousLevel: userPass.currentLevel,
    currentLevel: newLevel,
    currentXp: newXP,
    levelsGained,
  };
}

async function grantCosmetic(userId, cosmeticType, cosmeticKey, seasonId) {
  await query(
    `INSERT INTO user_cosmetics (user_id, cosmetic_type, cosmetic_key, season_obtained)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE obtained_at = obtained_at`,
    [userId, cosmeticType, cosmeticKey, seasonId],
  );
  return { type: 'cosmetic', cosmeticType, cosmeticKey };
}

async function pickRandomCardId(rarity) {
  const cards = await getCardsByRarity(rarity);
  if (!cards.length) return null;
  const pick = cards[Math.floor(Math.random() * cards.length)];
  return pick.id;
}

async function grantCardReward(userId, reward) {
  let cardId = reward.cardDefinitionId || reward.cardId || null;
  if (!cardId && reward.slug) {
    const rows = await query('SELECT id FROM card_definitions WHERE slug = ? LIMIT 1', [reward.slug]);
    cardId = rows[0]?.id || null;
  }
  if (!cardId && reward.rarity) {
    cardId = await pickRandomCardId(reward.rarity);
  }
  const count = Math.max(1, Number(reward.count) || 1);
  if (!cardId) {
    // Fallback dust if catalogue empty / rarity missing
    const dust = reward.rarity === 'legendary' ? 100 : reward.rarity === 'mythic' ? 500 : 20;
    await query('UPDATE sensei SET card_dust = card_dust + ? WHERE user_id = ?', [dust * count, userId]);
    return { type: 'dust', amount: dust * count, fallback: true, reason: 'no_card' };
  }
  const granted = [];
  for (let i = 0; i < count; i += 1) {
    granted.push(await addCard(userId, cardId, { quantity: 1, source: 'battle_pass' }));
  }
  await query(
    `UPDATE user_battle_pass ubp
     JOIN battle_pass_seasons s ON s.id = ubp.season_id AND s.is_active = TRUE
     SET ubp.cards_obtained = ubp.cards_obtained + ?
     WHERE ubp.user_id = ?`,
    [count, userId],
  );
  return { type: 'card', cardDefinitionId: cardId, count, entries: granted };
}

async function grantBoosterStub(userId, reward) {
  // Shop/boosters géré ailleurs — MVP : 5 cartes (rareté selon type) ou dust.
  const boosterType = reward.boosterType || reward.booster || 'standard';
  const rolls =
    boosterType === 'legendary'
      ? [{ rarity: 'legendary', count: 1 }, { rarity: 'rare', count: 2 }]
      : boosterType === 'premium'
        ? [{ rarity: 'rare', count: 1 }, { rarity: 'common', count: 4 }]
        : [{ rarity: 'common', count: 5 }];

  const cards = [];
  for (const roll of rolls) {
    for (let i = 0; i < roll.count; i += 1) {
      const result = await grantCardReward(userId, { rarity: roll.rarity, count: 1 });
      cards.push(result);
    }
  }
  return { type: 'booster', boosterType, cards };
}

/**
 * Applique une récompense individuelle (ryos, dust, essence, kage_coins, card, booster, cosmetic).
 */
export async function grantBattlePassReward(userId, reward, seasonId) {
  if (!reward || typeof reward !== 'object') {
    throw httpError(400, 'Récompense invalide.');
  }
  const type = reward.type;

  switch (type) {
    case 'ryos': {
      const amount = Math.max(0, Number(reward.amount) || 0);
      await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [amount, userId]);
      return { type, amount };
    }
    case 'dust': {
      const amount = Math.max(0, Number(reward.amount) || 0);
      await query('UPDATE sensei SET card_dust = card_dust + ? WHERE user_id = ?', [amount, userId]);
      return { type, amount };
    }
    case 'essence': {
      const amount = Math.max(0, Number(reward.amount) || 0);
      await query('UPDATE sensei SET card_essence = card_essence + ? WHERE user_id = ?', [
        amount,
        userId,
      ]);
      return { type, amount };
    }
    case 'kage_coins': {
      const amount = Math.max(0, Number(reward.amount) || 0);
      await query('UPDATE sensei SET kage_coins = kage_coins + ? WHERE user_id = ?', [
        amount,
        userId,
      ]);
      return { type, amount };
    }
    case 'card':
      return grantCardReward(userId, reward);
    case 'booster':
      return grantBoosterStub(userId, reward);
    case 'cosmetic':
      return grantCosmetic(
        userId,
        reward.cosmeticType || reward.cosmetic_type || 'avatar',
        reward.key || reward.cosmeticKey || reward.cosmetic_key,
        seasonId,
      );
    default:
      throw httpError(400, `Type de récompense inconnu: ${type}`);
  }
}

export async function claimReward(userId, level, trackType = 'free') {
  const track = trackType === 'premium' ? 'premium' : 'free';
  const targetLevel = Number(level);
  if (!Number.isFinite(targetLevel) || targetLevel < 1) {
    throw httpError(400, 'Niveau invalide.');
  }

  const season = await getActiveSeason();
  if (!season) throw httpError(404, 'Aucune saison Battle Pass active.');

  const userPass = await getOrCreateUserBattlePass(userId, season.id);

  if (track === 'premium' && !userPass.isPremium) {
    throw httpError(403, 'Battle Pass Premium requis.');
  }
  if (userPass.currentLevel < targetLevel) {
    throw httpError(400, 'Niveau non atteint.');
  }
  if (targetLevel > season.maxLevel) {
    throw httpError(400, 'Niveau hors saison.');
  }

  const claimed = { ...userPass.claimedRewards };
  if (claimed[track].includes(targetLevel)) {
    throw httpError(409, 'Récompense déjà réclamée.');
  }

  const rewards = rewardsForLevel(season.rewards[track], targetLevel);
  if (!rewards.length) {
    throw httpError(404, 'Aucune récompense à ce niveau.');
  }

  const granted = [];
  for (const reward of rewards) {
    granted.push(await grantBattlePassReward(userId, reward, season.id));
  }

  claimed[track] = [...claimed[track], targetLevel].sort((a, b) => a - b);
  await query('UPDATE user_battle_pass SET claimed_rewards_json = ? WHERE id = ?', [
    JSON.stringify(claimed),
    userPass.id,
  ]);

  const progress = await getOrCreateUserBattlePass(userId, season.id);
  return { level: targetLevel, track, rewards: granted, progress };
}

/**
 * Débloque le premium :
 * - method=kage_coins : débite 500 Kage Coins
 * - method=stub : admin/dev sans paiement (Stripe checkout reporté)
 */
export async function unlockPremium(userId, { method = 'stub', isAdmin = false } = {}) {
  const season = await getActiveSeason();
  if (!season) throw httpError(404, 'Aucune saison Battle Pass active.');

  const userPass = await getOrCreateUserBattlePass(userId, season.id);
  if (userPass.isPremium) {
    throw httpError(409, 'Battle Pass Premium déjà actif.');
  }

  const mode = method === 'kage_coins' ? 'kage_coins' : 'stub';

  if (mode === 'stub' && !isAdmin && process.env.BATTLE_PASS_STUB_UNLOCK !== 'true') {
    throw httpError(
      403,
      'Unlock stub réservé admin/dev (BATTLE_PASS_STUB_UNLOCK=true ou compte admin). Stripe checkout à venir.',
    );
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    if (mode === 'kage_coins') {
      const [senseiRows] = await connection.execute(
        'SELECT kage_coins FROM sensei WHERE user_id = ? LIMIT 1 FOR UPDATE',
        [userId],
      );
      if (!senseiRows[0]) throw httpError(404, 'Sensei introuvable.');
      if (Number(senseiRows[0].kage_coins) < PREMIUM_COST_KAGE_COINS) {
        throw httpError(
          400,
          `Kage Coins insuffisants (${senseiRows[0].kage_coins}/${PREMIUM_COST_KAGE_COINS}).`,
        );
      }
      await connection.execute('UPDATE sensei SET kage_coins = kage_coins - ? WHERE user_id = ?', [
        PREMIUM_COST_KAGE_COINS,
        userId,
      ]);
    }

    await connection.execute(
      `UPDATE user_battle_pass
       SET is_premium = TRUE, premium_purchased_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [userPass.id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const progress = await getOrCreateUserBattlePass(userId, season.id);
  return {
    progress,
    method: mode,
    note:
      mode === 'stub'
        ? 'Premium débloqué via stub admin/dev. Intégration Stripe Checkout prévue (réutiliser eliteStripeService patterns).'
        : `Premium débloqué pour ${PREMIUM_COST_KAGE_COINS} Kage Coins.`,
  };
}

export async function purchaseLevels(userId, count) {
  const n = Math.floor(Number(count) || 0);
  if (n < 1 || n > MAX_PURCHASABLE_LEVELS) {
    throw httpError(400, `count doit être entre 1 et ${MAX_PURCHASABLE_LEVELS}.`);
  }

  const season = await getActiveSeason();
  if (!season) throw httpError(404, 'Aucune saison Battle Pass active.');

  const userPass = await getOrCreateUserBattlePass(userId, season.id);
  if (userPass.currentLevel < BUY_LEVELS_MIN_LEVEL) {
    throw httpError(400, `Achat de niveaux débloqué à partir du niveau ${BUY_LEVELS_MIN_LEVEL}.`);
  }
  if (userPass.currentLevel >= season.maxLevel) {
    throw httpError(400, 'Niveau max déjà atteint.');
  }

  const levelsToBuy = Math.min(n, season.maxLevel - userPass.currentLevel);
  const cost = levelsToBuy * LEVEL_COST_KAGE_COINS;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [senseiRows] = await connection.execute(
      'SELECT kage_coins FROM sensei WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (!senseiRows[0]) throw httpError(404, 'Sensei introuvable.');
    if (Number(senseiRows[0].kage_coins) < cost) {
      throw httpError(400, `Kage Coins insuffisants (${senseiRows[0].kage_coins}/${cost}).`);
    }
    await connection.execute('UPDATE sensei SET kage_coins = kage_coins - ? WHERE user_id = ?', [
      cost,
      userId,
    ]);
    await connection.execute(
      'UPDATE user_battle_pass SET current_level = current_level + ?, current_xp = 0 WHERE id = ?',
      [levelsToBuy, userPass.id],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const progress = await getOrCreateUserBattlePass(userId, season.id);
  return { levelsPurchased: levelsToBuy, costKageCoins: cost, progress };
}

export async function getUserCosmetics(userId) {
  const rows = await query(
    `SELECT cosmetic_type, cosmetic_key, season_obtained, obtained_at
     FROM user_cosmetics WHERE user_id = ? ORDER BY obtained_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    cosmeticType: r.cosmetic_type,
    cosmeticKey: r.cosmetic_key,
    seasonObtained: r.season_obtained,
    obtainedAt: r.obtained_at,
  }));
}

/**
 * Registre d’exploits — progression permanente (tiers), distincte des quêtes BP daily.
 */
import { query } from '../config/database.js';
import {
  ACHIEVEMENT_DEFS,
  achievementsForAction,
  formatAchievementDescription,
  getAchievementDef,
  LOW_DAMAGE_PCT,
} from '../../scripts/data/achievements.js';
import { addXP } from './playerCharacterService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseJsonSafe(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
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

function claimedTiersOf(row) {
  const parsed = parseJsonSafe(row?.claimed_tiers_json, []);
  return Array.isArray(parsed) ? parsed.map(Number).filter((n) => n > 0) : [];
}

function metaOf(row) {
  return parseJsonSafe(row?.meta_json, {}) || {};
}

async function getOrCreateProgress(userId, achievementKey) {
  const existing = await query(
    'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_key = ? LIMIT 1',
    [userId, achievementKey],
  );
  if (existing[0]) return existing[0];
  const result = await query(
    `INSERT INTO user_achievements (user_id, achievement_key, current_progress, claimed_tiers_json)
     VALUES (?, ?, 0, ?)`,
    [userId, achievementKey, JSON.stringify([])],
  );
  const rows = await query('SELECT * FROM user_achievements WHERE id = ? LIMIT 1', [result.insertId]);
  return rows[0];
}

function computeHighestTier(progress, tiers) {
  let highest = 0;
  for (let i = 0; i < tiers.length; i += 1) {
    if (progress >= tiers[i].goal) highest = i + 1;
    else break;
  }
  return highest;
}

function serializeAchievement(def, row) {
  const progress = Number(row?.current_progress) || 0;
  const claimed = claimedTiersOf(row);
  const highest = Math.max(Number(row?.highest_tier) || 0, computeHighestTier(progress, def.tiers));
  const tiers = def.tiers.map((tier, idx) => {
    const tierIndex = idx + 1;
    const unlocked = progress >= tier.goal;
    const isClaimed = claimed.includes(tierIndex);
    return {
      tier: tierIndex,
      goal: tier.goal,
      rewards: tier.rewards,
      unlocked,
      claimable: unlocked && !isClaimed,
      claimed: isClaimed,
      descriptionFr: formatAchievementDescription(def, tier.goal, 'fr'),
      descriptionEn: formatAchievementDescription(def, tier.goal, 'en'),
    };
  });
  const nextTier = def.tiers.find((t) => progress < t.goal) || null;
  const currentGoal = nextTier?.goal ?? def.tiers[def.tiers.length - 1]?.goal ?? 1;
  return {
    key: def.key,
    category: def.category,
    nameFr: def.nameFr,
    nameEn: def.nameEn,
    descriptionFr: def.descriptionFr,
    descriptionEn: def.descriptionEn,
    action: def.action,
    mode: def.mode || 'increment',
    progress,
    currentGoal,
    highestTier: highest,
    unlocked: highest > 0,
    claimableCount: tiers.filter((t) => t.claimable).length,
    firstUnlockedAt: row?.first_unlocked_at || null,
    tiers,
  };
}

export async function getAchievementRegistry(userId) {
  if (!(await tableExists('user_achievements'))) {
    return { achievements: [], meta: { tableMissing: true } };
  }
  const achievements = [];
  for (const def of ACHIEVEMENT_DEFS) {
    achievements.push(serializeAchievement(def, await getOrCreateProgress(userId, def.key)));
  }
  return {
    achievements,
    meta: {
      total: achievements.length,
      unlocked: achievements.filter((a) => a.unlocked).length,
      claimable: achievements.reduce((s, a) => s + a.claimableCount, 0),
      lowDamagePct: LOW_DAMAGE_PCT,
    },
  };
}

async function grantAchievementReward(userId, reward) {
  if (!reward || typeof reward !== 'object') return null;
  const type = reward.type;
  const amount = Math.max(0, Number(reward.amount) || 0);
  if (type === 'ryos' && amount) {
    await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [amount, userId]);
  } else if (type === 'dust' && amount) {
    await query('UPDATE sensei SET card_dust = card_dust + ? WHERE user_id = ?', [amount, userId]);
  } else if (type === 'essence' && amount) {
    await query('UPDATE sensei SET card_essence = card_essence + ? WHERE user_id = ?', [
      amount,
      userId,
    ]);
  } else if (type === 'xp' && amount) {
    try {
      await addXP(userId, Math.floor(amount));
    } catch {
      /* */
    }
  } else {
    return { type, skipped: true };
  }
  return { type, amount: type === 'xp' ? Math.floor(amount) : amount };
}

export async function claimAchievementTier(userId, achievementKey, tierIndex) {
  const def = getAchievementDef(achievementKey);
  if (!def) throw httpError(404, 'Exploit introuvable.');
  const tier = Number(tierIndex);
  if (!Number.isFinite(tier) || tier < 1 || tier > def.tiers.length) {
    throw httpError(400, 'Palier invalide.');
  }
  if (!(await tableExists('user_achievements'))) {
    throw httpError(503, 'Tables exploits absentes — lancez les migrations.');
  }
  const row = await getOrCreateProgress(userId, def.key);
  if ((Number(row.current_progress) || 0) < def.tiers[tier - 1].goal) {
    throw httpError(400, 'Palier non débloqué.');
  }
  const claimed = claimedTiersOf(row);
  if (claimed.includes(tier)) throw httpError(409, 'Palier déjà réclamé.');
  const granted = [];
  for (const reward of def.tiers[tier - 1].rewards) {
    granted.push(await grantAchievementReward(userId, reward));
  }
  claimed.push(tier);
  claimed.sort((a, b) => a - b);
  await query(
    'UPDATE user_achievements SET claimed_tiers_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(claimed), row.id],
  );
  const refreshed = await query('SELECT * FROM user_achievements WHERE id = ? LIMIT 1', [row.id]);
  return { achievement: serializeAchievement(def, refreshed[0]), tier, rewards: granted };
}

export async function onAchievementAction(userId, action, value = 1, meta = {}) {
  if (!userId || !action) return { skipped: true, reason: 'bad_args' };
  const defs = achievementsForAction(action);
  if (!defs.length) return { skipped: true, reason: 'unknown_action' };
  const amount = Number(value);
  if (!Number.isFinite(amount)) return { skipped: true, reason: 'bad_value' };
  try {
    if (!(await tableExists('user_achievements'))) return { skipped: true, reason: 'table_missing' };
  } catch {
    return { skipped: true, reason: 'check_failed' };
  }
  const results = [];
  for (const def of defs) {
    try {
      results.push(await progressAchievement(userId, def, amount, meta));
    } catch (err) {
      results.push({ key: def.key, error: err?.message || 'error' });
    }
  }
  return { action, amount, results };
}

async function progressAchievement(userId, def, amount, meta = {}) {
  const row = await getOrCreateProgress(userId, def.key);
  const mode = def.mode || 'increment';
  const prev = Number(row.current_progress) || 0;
  let next = prev;
  if (mode === 'set_absolute') next = Math.max(0, Math.floor(amount));
  else if (mode === 'set_max') next = Math.max(prev, Math.floor(amount));
  else {
    const delta = Math.max(0, Math.floor(amount));
    if (delta <= 0) return serializeAchievement(def, row);
    next = prev + delta;
  }
  const highest = computeHighestTier(next, def.tiers);
  const prevHighest = Number(row.highest_tier) || 0;
  const unlockNow = prevHighest === 0 && highest > 0;
  const nextMeta = { ...metaOf(row), ...meta };
  await query(
    `UPDATE user_achievements
     SET current_progress = ?, highest_tier = ?, meta_json = ?,
         first_unlocked_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE first_unlocked_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [next, Math.max(prevHighest, highest), JSON.stringify(nextMeta), unlockNow, row.id],
  );
  const refreshed = await query('SELECT * FROM user_achievements WHERE id = ? LIMIT 1', [row.id]);
  return serializeAchievement(def, refreshed[0]);
}

export async function recordCombatAchievements(userId, session, outcome) {
  if (!userId || !session) return { skipped: true };
  const track = session.player?._achTrack || createCombatAchTrack();
  if (outcome === 'victory') {
    await onAchievementAction(userId, 'combat_win', 1);
    let currentStreak = 1;
    try {
      const streakRow = await getOrCreateProgress(userId, 'win_streak');
      const streakMeta = metaOf(streakRow);
      currentStreak = (Number(streakMeta.currentStreak) || 0) + 1;
      await onAchievementAction(userId, 'win_streak', currentStreak, {
        currentStreak,
        bestStreak: Math.max(Number(streakMeta.bestStreak) || 0, currentStreak),
      });
    } catch {
      /* */
    }
    if (session.enemy?.boss) await onAchievementAction(userId, 'boss_kill', 1);
    const maxHp = Math.max(1, Number(session.player?.maxHp) || 1);
    const damageTaken = Math.max(0, Number(track.damageTaken) || 0);
    const lowThreshold = Math.max(1, Math.floor(maxHp * LOW_DAMAGE_PCT));
    if (damageTaken <= 0) await onAchievementAction(userId, 'flawless_win', 1);
    if (damageTaken <= lowThreshold) await onAchievementAction(userId, 'low_damage_win', 1);
    if ((Number(track.healCardsPlayed) || 0) <= 0) await onAchievementAction(userId, 'no_heal_win', 1);
    if ((Number(track.taijutsuPlayed) || 0) <= 0 && (Number(track.cardsPlayed) || 0) > 0) {
      await onAchievementAction(userId, 'no_taijutsu_win', 1);
    }
    const typed =
      (Number(track.taijutsuPlayed) || 0) +
      (Number(track.ninjutsuPlayed) || 0) +
      (Number(track.genjutsuPlayed) || 0);
    if (typed > 0 && (Number(track.ninjutsuPlayed) || 0) === typed) {
      await onAchievementAction(userId, 'ninjutsu_only_win', 1);
    }
    if (typed > 0 && (Number(track.genjutsuPlayed) || 0) === typed) {
      await onAchievementAction(userId, 'genjutsu_only_win', 1);
    }
    return { outcome, streak: currentStreak, damageTaken, lowThreshold };
  }
  if (outcome === 'defeat' || outcome === 'forfeited') {
    try {
      const streakRow = await getOrCreateProgress(userId, 'win_streak');
      const streakMeta = metaOf(streakRow);
      await query(
        'UPDATE user_achievements SET meta_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
          JSON.stringify({
            ...streakMeta,
            currentStreak: 0,
            bestStreak: Number(streakMeta.bestStreak) || Number(streakRow.current_progress) || 0,
          }),
          streakRow.id,
        ],
      );
    } catch {
      /* */
    }
    return { outcome, streak: 0 };
  }
  return { outcome };
}

export function createCombatAchTrack() {
  return {
    damageTaken: 0,
    healCardsPlayed: 0,
    taijutsuPlayed: 0,
    ninjutsuPlayed: 0,
    genjutsuPlayed: 0,
    cardsPlayed: 0,
  };
}

export function trackCardPlayForAchievements(player, card) {
  if (!player || !card) return player;
  const track = player._achTrack || createCombatAchTrack();
  track.cardsPlayed = (Number(track.cardsPlayed) || 0) + 1;
  if ((Number(card.heal) || 0) > 0 || card.statType === 'medicine') {
    track.healCardsPlayed = (Number(track.healCardsPlayed) || 0) + 1;
  }
  if (card.statType === 'taijutsu') track.taijutsuPlayed = (Number(track.taijutsuPlayed) || 0) + 1;
  else if (card.statType === 'ninjutsu') track.ninjutsuPlayed = (Number(track.ninjutsuPlayed) || 0) + 1;
  else if (card.statType === 'genjutsu') track.genjutsuPlayed = (Number(track.genjutsuPlayed) || 0) + 1;
  player._achTrack = track;
  return player;
}

export function trackDamageTakenForAchievements(player, amount) {
  if (!player) return player;
  const track = player._achTrack || createCombatAchTrack();
  track.damageTaken = (Number(track.damageTaken) || 0) + Math.max(0, Number(amount) || 0);
  player._achTrack = track;
  return player;
}

export { ACHIEVEMENT_DEFS, LOW_DAMAGE_PCT };

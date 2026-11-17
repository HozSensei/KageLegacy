import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import {
  ensureSeasonPass,
  getActiveEliteSubscription,
} from './eliteSubscriptionService.js';

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

export async function getUnlockedRewardSlugs(userId) {
  const rows = await query(
    'SELECT reward_type, reward_slug FROM elite_unlocked_rewards WHERE user_id = ?',
    [userId],
  );
  const titles = new Set();
  const banners = new Set();
  for (const row of rows) {
    if (row.reward_type === 'title') titles.add(row.reward_slug);
    if (row.reward_type === 'banner') banners.add(row.reward_slug);
  }
  return { titles, banners };
}

async function unlockReward(userId, rewardType, rewardSlug, questSlug = null) {
  await query(
    `INSERT IGNORE INTO elite_unlocked_rewards (user_id, reward_type, reward_slug, unlocked_via_quest_slug)
     VALUES (?, ?, ?, ?)`,
    [userId, rewardType, rewardSlug, questSlug],
  );
}

async function incrementQuestProgress(userId, seasonNumber, quest, amount) {
  const rows = await query(
    `SELECT current_progress, completed_at FROM elite_quest_progress
     WHERE user_id = ? AND season_number = ? AND quest_slug = ? LIMIT 1`,
    [userId, seasonNumber, quest.slug],
  );
  const existing = rows[0];
  if (existing?.completed_at) return { completed: true, progress: quest.target_count };

  const nextProgress = Math.min(quest.target_count, (existing?.current_progress ?? 0) + amount);
  const completed = nextProgress >= quest.target_count;

  if (existing) {
    await query(
      `UPDATE elite_quest_progress
       SET current_progress = ?,
           completed_at = IF(? AND completed_at IS NULL, UTC_TIMESTAMP(), completed_at),
           claimed_at = IF(? AND claimed_at IS NULL, UTC_TIMESTAMP(), claimed_at)
       WHERE user_id = ? AND season_number = ? AND quest_slug = ?`,
      [nextProgress, completed, completed, userId, seasonNumber, quest.slug],
    );
  } else {
    await query(
      `INSERT INTO elite_quest_progress
         (user_id, season_number, quest_slug, current_progress, completed_at, claimed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        seasonNumber,
        quest.slug,
        nextProgress,
        completed ? new Date() : null,
        completed ? new Date() : null,
      ],
    );
  }

  if (completed && !existing?.completed_at) {
    await unlockReward(userId, quest.reward_type, quest.reward_slug, quest.slug);
  }

  return { completed, progress: nextProgress };
}

async function syncLeaguePointsQuest(userId, pool) {
  const subscription = await getActiveEliteSubscription(userId, pool);
  if (!subscription) return;

  const standingRows = await query(
    'SELECT points FROM pool_standings WHERE pool_id = ? AND user_id = ? LIMIT 1',
    [pool.id, userId],
  );
  const points = standingRows[0]?.points ?? 0;

  const quests = await query(
    'SELECT * FROM elite_quest_catalog WHERE is_active = TRUE AND event_type = \'league_points\'',
  );
  for (const quest of quests) {
    const rows = await query(
      `SELECT current_progress, completed_at FROM elite_quest_progress
       WHERE user_id = ? AND season_number = ? AND quest_slug = ? LIMIT 1`,
      [userId, pool.season_number, quest.slug],
    );
    if (rows[0]?.completed_at) continue;

    const nextProgress = Math.min(quest.target_count, Math.max(points, rows[0]?.current_progress ?? 0));
    await query(
      `INSERT INTO elite_quest_progress (user_id, season_number, quest_slug, current_progress, completed_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_progress = GREATEST(current_progress, VALUES(current_progress)),
         completed_at = IF(
           GREATEST(current_progress, VALUES(current_progress)) >= ? AND completed_at IS NULL,
           UTC_TIMESTAMP(),
           completed_at
         )`,
      [
        userId,
        pool.season_number,
        quest.slug,
        nextProgress,
        nextProgress >= quest.target_count ? new Date() : null,
        quest.target_count,
      ],
    );

    if (nextProgress >= quest.target_count && !rows[0]?.completed_at) {
      await unlockReward(userId, quest.reward_type, quest.reward_slug, quest.slug);
      await query(
        `UPDATE elite_quest_progress SET claimed_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND season_number = ? AND quest_slug = ?`,
        [userId, pool.season_number, quest.slug],
      );
    }
  }
}

/**
 * Enregistre la progression des quêtes season pass (Pack Élite actif sur la saison).
 * @param {number} userId
 * @param {string} eventType
 * @param {number} [amount]
 */
export async function recordEliteQuestEvent(userId, eventType, amount = 1) {
  const pool = await findUserPool(userId);
  if (!pool) return;

  const subscription = await getActiveEliteSubscription(userId, pool);
  if (!subscription) return;

  await ensureSeasonPass(userId, pool);

  if (eventType === 'league_points') {
    await syncLeaguePointsQuest(userId, pool);
    return;
  }

  const quests = await query(
    'SELECT * FROM elite_quest_catalog WHERE is_active = TRUE AND event_type = ?',
    [eventType],
  );

  for (const quest of quests) {
    await incrementQuestProgress(userId, pool.season_number, quest, amount);
  }

  if (eventType === 'league_win' || eventType === 'league_match_played') {
    await syncLeaguePointsQuest(userId, pool);
  }
}

export async function getSeasonPassPayload(userId, locale = 'fr') {
  const lang = normalizeLocale(locale);
  const pool = await findUserPool(userId);
  if (!pool) {
    return { active: false, seasonNumber: null, quests: [], summary: null };
  }

  const subscription = await getActiveEliteSubscription(userId, pool);
  if (!subscription) {
    return {
      active: false,
      seasonNumber: pool.season_number,
      poolId: pool.id,
      quests: [],
      summary: null,
    };
  }

  await ensureSeasonPass(userId, pool);
  await syncLeaguePointsQuest(userId, pool);

  const quests = await query(
    `SELECT q.*, p.current_progress, p.completed_at, p.claimed_at
     FROM elite_quest_catalog q
     LEFT JOIN elite_quest_progress p
       ON p.quest_slug = q.slug
      AND p.user_id = ?
      AND p.season_number = ?
     WHERE q.is_active = TRUE
     ORDER BY q.sort_order ASC`,
    [userId, pool.season_number],
  );

  const unlocked = await getUnlockedRewardSlugs(userId);

  return {
    active: true,
    seasonNumber: pool.season_number,
    poolId: pool.id,
    maxCycles: 10,
    currentCycle: pool.current_cycle,
    subscriptionEnds: subscription.current_period_end,
    summary: {
      completed: quests.filter((q) => q.completed_at).length,
      total: quests.length,
      unlockedTitles: [...unlocked.titles],
      unlockedBanners: [...unlocked.banners],
    },
    quests: quests.map((q) => ({
      slug: q.slug,
      label: lang === 'en' ? q.label_en : q.label_fr,
      eventType: q.event_type,
      targetCount: q.target_count,
      currentProgress: Math.min(q.current_progress ?? 0, q.target_count),
      completed: Boolean(q.completed_at),
      claimed: Boolean(q.claimed_at),
      reward: {
        type: q.reward_type,
        slug: q.reward_slug,
      },
    })),
  };
}

/**
 * Quêtes Battle Pass — daily / weekly / milestone.
 * Progression via progressQuest (API) ou onBattlePassAction (hooks jeu).
 */
import { query } from '../config/database.js';
import {
  addBattlePassXP,
  getActiveSeason,
  getOrCreateUserBattlePass,
  getSeasonRow,
  grantBattlePassReward,
} from './battlePassService.js';
import { parseJsonSafe } from './cardService.js';

function toMysqlDatetime(d) {
  return new Date(d).toISOString().slice(0, 19).replace('T', ' ');
}

export async function ensureFreshQuestWindows(seasonId = null) {
  let season = null;
  if (seasonId) {
    const row = await getSeasonRow(seasonId);
    if (row) season = { id: row.id, startDate: row.start_date, endDate: row.end_date };
  } else {
    season = await getActiveSeason();
  }
  if (!season?.id) return { skipped: true, reason: 'no_season' };
  if (!(await tableExists('battle_pass_quests')))
    return { skipped: true, reason: 'bp_table_missing' };

  const [dailyActive] = await query(
    `SELECT COUNT(*) AS c FROM battle_pass_quests WHERE season_id = ? AND quest_type = 'daily' AND available_from <= CURRENT_TIMESTAMP AND available_until >= CURRENT_TIMESTAMP`,
    [season.id]
  );
  const [weeklyActive] = await query(
    `SELECT COUNT(*) AS c FROM battle_pass_quests WHERE season_id = ? AND quest_type = 'weekly' AND available_from <= CURRENT_TIMESTAMP AND available_until >= CURRENT_TIMESTAMP`,
    [season.id]
  );
  const needDaily = Number(dailyActive?.c || 0) === 0;
  const needWeekly = Number(weeklyActive?.c || 0) === 0;
  if (!needDaily && !needWeekly)
    return { skipped: true, reason: 'windows_fresh', seasonId: season.id };

  const { buildSeason1QuestDefs } = await import('../../scripts/data/battlePassSeason1.js');
  const defs = buildSeason1QuestDefs(
    new Date(season.startDate || Date.now()),
    new Date(season.endDate || Date.now() + 90 * 86400000)
  );
  let insertedDaily = 0,
    insertedWeekly = 0;
  if (needDaily) {
    await query(`DELETE FROM battle_pass_quests WHERE season_id = ? AND quest_type = 'daily'`, [
      season.id,
    ]);
    for (const q of defs.filter(d => d.quest_type === 'daily')) {
      await query(
        `INSERT INTO battle_pass_quests (season_id, quest_type, quest_key, description_fr, description_en, goal_value, xp_reward, bonus_reward_json, available_from, available_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          season.id,
          q.quest_type,
          q.quest_key,
          q.description_fr,
          q.description_en,
          q.goal_value,
          q.xp_reward,
          q.bonus_reward_json,
          toMysqlDatetime(q.available_from),
          toMysqlDatetime(q.available_until),
        ]
      );
      insertedDaily += 1;
    }
  }
  if (needWeekly) {
    await query(`DELETE FROM battle_pass_quests WHERE season_id = ? AND quest_type = 'weekly'`, [
      season.id,
    ]);
    for (const q of defs.filter(d => d.quest_type === 'weekly')) {
      await query(
        `INSERT INTO battle_pass_quests (season_id, quest_type, quest_key, description_fr, description_en, goal_value, xp_reward, bonus_reward_json, available_from, available_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          season.id,
          q.quest_type,
          q.quest_key,
          q.description_fr,
          q.description_en,
          q.goal_value,
          q.xp_reward,
          q.bonus_reward_json,
          toMysqlDatetime(q.available_from),
          toMysqlDatetime(q.available_until),
        ]
      );
      insertedWeekly += 1;
    }
  }
  return {
    seasonId: season.id,
    refreshedDaily: needDaily,
    refreshedWeekly: needWeekly,
    insertedDaily,
    insertedWeekly,
  };
}

/**
 * Actions jeu → clés de quêtes seedées (idempotent si clé absente / déjà done).
 * Garder aligné avec buildSeason1QuestDefs.
 */
export const BATTLE_PASS_QUEST_ACTIONS = Object.freeze({
  combat_win: ['win_3_combats', 'win_15_combats', 'season_win_100_combats'],
  play_card: ['play_20_cards'],
  deal_damage: ['deal_500_damage'],
  booster_open: ['open_1_booster', 'open_5_boosters', 'season_open_25_boosters'],
  card_upgrade: ['upgrade_1_card', 'upgrade_5_cards', 'season_upgrade_20_cards'],
  pvp_queue: ['join_pvp_queue', 'join_pvp_queue_5'],
  mission_run: ['complete_1_run', 'complete_3_runs', 'season_complete_50_missions'],
  mission_rank_b: ['complete_5_missions_b'],
  card_collect: ['collect_10_cards', 'season_collect_50_cards'],
});

const RANK_ORDER = Object.freeze({ D: 0, C: 1, B: 2, A: 3, S: 4 });

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
      [tableName]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Hook silencieux : incrémente toutes les quêtes actives liées à une action jeu.
 * Ne jette jamais (combat / shop / PvP ne doivent pas échouer si BP absent).
 */
export async function onBattlePassAction(userId, action, value = 1) {
  if (!userId || !action) return { skipped: true, reason: 'bad_args' };
  const keys = BATTLE_PASS_QUEST_ACTIONS[action];
  if (!keys?.length) return { skipped: true, reason: 'unknown_action' };

  const amount = Math.max(0, Math.floor(Number(value) || 0));
  if (amount <= 0) return { skipped: true, reason: 'no_amount' };

  try {
    if (!(await tableExists('battle_pass_quests'))) {
      return { skipped: true, reason: 'bp_table_missing' };
    }
  } catch {
    return { skipped: true, reason: 'bp_check_failed' };
  }

  const results = [];
  for (const questKey of keys) {
    try {
      results.push(await progressQuest(userId, questKey, amount));
    } catch (err) {
      if (err?.statusCode && err.statusCode !== 404) {
        results.push({ questKey, error: err.message });
      }
      // 404 = pas de saison / pas de quête active pour cette clé — ignore
    }
  }
  return { action, amount, results };
}

/** Helper rang mission B+ pour quête weekly. */
export function isMissionRankBOrHigher(rank) {
  const key = String(rank || '').toUpperCase();
  return (RANK_ORDER[key] ?? -1) >= RANK_ORDER.B;
}

function nonCosmeticBonus(raw) {
  const bonus = parseJsonSafe(raw, null);
  if (!bonus) return null;
  const rewards = (Array.isArray(bonus) ? bonus : [bonus]).filter(
    reward => reward?.type !== 'cosmetic'
  );
  return Array.isArray(bonus) ? rewards : (rewards[0] ?? null);
}

function serializeQuest(row, progress = null) {
  return {
    id: row.id,
    seasonId: row.season_id,
    questType: row.quest_type,
    questKey: row.quest_key,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    goalValue: row.goal_value,
    xpReward: row.xp_reward,
    bonusReward: nonCosmeticBonus(row.bonus_reward_json),
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    progress: progress
      ? {
          current: progress.current_progress,
          isCompleted: Boolean(progress.is_completed),
          isClaimed: Boolean(progress.is_claimed),
          completedAt: progress.completed_at,
        }
      : { current: 0, isCompleted: false, isClaimed: false, completedAt: null },
  };
}

async function getOrCreateQuestProgress(userId, questId) {
  const existing = await query(
    'SELECT * FROM user_battle_pass_quests WHERE user_id = ? AND quest_id = ? LIMIT 1',
    [userId, questId]
  );
  if (existing[0]) return existing[0];

  const result = await query(
    `INSERT INTO user_battle_pass_quests (user_id, quest_id, current_progress)
     VALUES (?, ?, 0)`,
    [userId, questId]
  );
  const rows = await query('SELECT * FROM user_battle_pass_quests WHERE id = ? LIMIT 1', [
    result.insertId,
  ]);
  return rows[0];
}

/**
 * Quêtes actives de la saison (fenêtre temporelle courante) + progression joueur.
 */
export async function getActiveQuests(userId) {
  const season = await getActiveSeason();
  if (!season) return { season: null, quests: [] };

  try {
    await ensureFreshQuestWindows(season.id);
  } catch (err) {
    console.error('[battle-pass] ensureFreshQuestWindows failed:', err?.message || err);
  }

  await getOrCreateUserBattlePass(userId, season.id);

  const rows = await query(
    `SELECT * FROM battle_pass_quests
     WHERE season_id = ?
       AND available_from <= CURRENT_TIMESTAMP
       AND available_until >= CURRENT_TIMESTAMP
     ORDER BY
       FIELD(quest_type, 'daily', 'weekly', 'milestone'),
       id ASC`,
    [season.id]
  );

  const quests = [];
  for (const row of rows) {
    const progress = await getOrCreateQuestProgress(userId, row.id);
    quests.push(serializeQuest(row, progress));
  }

  return { seasonId: season.id, quests };
}

/**
 * Incrémente la progression d'une quête par clé (hook combat/missions futurs).
 */
export async function progressQuest(userId, questKey, value = 1) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  if (!questKey || typeof questKey !== 'string') {
    throw httpError(400, 'questKey requis.');
  }
  if (amount <= 0) throw httpError(400, 'value doit être positif.');

  const season = await getActiveSeason();
  if (!season) throw httpError(404, 'Aucune saison Battle Pass active.');

  const quests = await query(
    `SELECT * FROM battle_pass_quests
     WHERE season_id = ?
       AND quest_key = ?
       AND available_from <= CURRENT_TIMESTAMP
       AND available_until >= CURRENT_TIMESTAMP
     ORDER BY id DESC`,
    [season.id, questKey]
  );
  if (!quests.length) {
    throw httpError(404, `Aucune quête active pour la clé ${questKey}.`);
  }

  const updated = [];
  for (const quest of quests) {
    const progress = await getOrCreateQuestProgress(userId, quest.id);
    if (progress.is_completed) {
      updated.push(serializeQuest(quest, progress));
      continue;
    }

    const next = Math.min(quest.goal_value, Number(progress.current_progress) + amount);
    const completed = next >= quest.goal_value;
    await query(
      `UPDATE user_battle_pass_quests
       SET current_progress = ?,
           is_completed = ?,
           completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = ?`,
      [next, completed, completed, progress.id]
    );
    const refreshed = await query('SELECT * FROM user_battle_pass_quests WHERE id = ? LIMIT 1', [
      progress.id,
    ]);
    updated.push(serializeQuest(quest, refreshed[0]));
  }

  return { questKey, quests: updated };
}

export async function claimQuestReward(userId, questId) {
  const id = Number(questId);
  if (!Number.isFinite(id) || id <= 0) throw httpError(400, 'questId invalide.');

  const season = await getActiveSeason();
  if (!season) throw httpError(404, 'Aucune saison Battle Pass active.');

  const questRows = await query(
    'SELECT * FROM battle_pass_quests WHERE id = ? AND season_id = ? LIMIT 1',
    [id, season.id]
  );
  if (!questRows[0]) throw httpError(404, 'Quête introuvable.');
  const quest = questRows[0];

  const progress = await getOrCreateQuestProgress(userId, quest.id);
  if (!progress.is_completed) throw httpError(400, 'Quête non complétée.');
  if (progress.is_claimed) throw httpError(409, 'Récompense déjà réclamée.');

  const xpResult = await addBattlePassXP(userId, quest.xp_reward, `quest:${quest.quest_key}`);

  const bonusGranted = [];
  const bonus = nonCosmeticBonus(quest.bonus_reward_json);
  if (bonus) {
    const list = Array.isArray(bonus) ? bonus : [bonus];
    for (const reward of list) {
      bonusGranted.push(await grantBattlePassReward(userId, reward));
    }
  }

  await query('UPDATE user_battle_pass_quests SET is_claimed = TRUE WHERE id = ?', [progress.id]);

  // Stats saison (missions_completed si clé missions)
  if (quest.quest_key.includes('mission')) {
    await query(
      `UPDATE user_battle_pass SET missions_completed = missions_completed + 1
       WHERE user_id = ? AND season_id = ?`,
      [userId, season.id]
    );
  }
  if (quest.quest_key.includes('combat') || quest.quest_key.includes('win')) {
    await query(
      `UPDATE user_battle_pass SET combats_won = combats_won + ?
       WHERE user_id = ? AND season_id = ?`,
      [quest.goal_value, userId, season.id]
    );
  }

  const refreshed = await query('SELECT * FROM user_battle_pass_quests WHERE id = ? LIMIT 1', [
    progress.id,
  ]);

  return {
    quest: serializeQuest(quest, refreshed[0]),
    xp: xpResult,
    bonusRewards: bonusGranted,
  };
}

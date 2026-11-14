/**
 * Quêtes Battle Pass — daily / weekly / milestone (stubs MVP).
 */
import { query } from '../config/database.js';
import {
  addBattlePassXP,
  getActiveSeason,
  getOrCreateUserBattlePass,
  grantBattlePassReward,
} from './battlePassService.js';
import { parseJsonSafe } from './cardService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
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
    bonusReward: parseJsonSafe(row.bonus_reward_json, null),
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
    [userId, questId],
  );
  if (existing[0]) return existing[0];

  const result = await query(
    `INSERT INTO user_battle_pass_quests (user_id, quest_id, current_progress)
     VALUES (?, ?, 0)`,
    [userId, questId],
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

  await getOrCreateUserBattlePass(userId, season.id);

  const rows = await query(
    `SELECT * FROM battle_pass_quests
     WHERE season_id = ?
       AND available_from <= CURRENT_TIMESTAMP
       AND available_until >= CURRENT_TIMESTAMP
     ORDER BY
       FIELD(quest_type, 'daily', 'weekly', 'milestone'),
       id ASC`,
    [season.id],
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
    [season.id, questKey],
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
      [next, completed, completed, progress.id],
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
    [id, season.id],
  );
  if (!questRows[0]) throw httpError(404, 'Quête introuvable.');
  const quest = questRows[0];

  const progress = await getOrCreateQuestProgress(userId, quest.id);
  if (!progress.is_completed) throw httpError(400, 'Quête non complétée.');
  if (progress.is_claimed) throw httpError(409, 'Récompense déjà réclamée.');

  const xpResult = await addBattlePassXP(userId, quest.xp_reward, `quest:${quest.quest_key}`);

  const bonusGranted = [];
  const bonus = parseJsonSafe(quest.bonus_reward_json, null);
  if (bonus) {
    const list = Array.isArray(bonus) ? bonus : [bonus];
    for (const reward of list) {
      bonusGranted.push(await grantBattlePassReward(userId, reward, season.id));
    }
  }

  await query('UPDATE user_battle_pass_quests SET is_claimed = TRUE WHERE id = ?', [progress.id]);

  // Stats saison (missions_completed si clé missions)
  if (quest.quest_key.includes('mission')) {
    await query(
      `UPDATE user_battle_pass SET missions_completed = missions_completed + 1
       WHERE user_id = ? AND season_id = ?`,
      [userId, season.id],
    );
  }
  if (quest.quest_key.includes('combat') || quest.quest_key.includes('win')) {
    await query(
      `UPDATE user_battle_pass SET combats_won = combats_won + ?
       WHERE user_id = ? AND season_id = ?`,
      [quest.goal_value, userId, season.id],
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

import { getConnection } from '../../src/config/database.js';
import { SEASON_1_META, buildSeason1QuestDefs, buildSeason1Rewards } from '../data/battlePassSeason1.js';
import { assertE2eDatabase } from './e2eGuard.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function mysqlUtc(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function seedE2eBattlePass() {
  await assertE2eDatabase();
  const connection = await getConnection();
  let transactionStarted = false;
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    await connection.beginTransaction();
    transactionStarted = true;

    const now = new Date(Date.now());
    const nowSql = mysqlUtc(now);
    // Lock the empty range as well as existing seasons to prevent concurrent seeds.
    const [seasons] = await connection.execute(
      `SELECT id, is_active, start_date <= ? AND end_date > ? AS current_window
       FROM battle_pass_seasons ORDER BY season_number DESC FOR UPDATE`,
      [nowSql, nowSql],
    );
    if (seasons.length) {
      const active = seasons.find((season) => season.is_active);
      if (!active || !active.current_window) {
        throw new Error('Saison Battle Pass existante inactive ou hors dates : conservée sans modification ; utiliser une nouvelle base E2E.');
      }
      const [quests] = await connection.execute(
        `SELECT id FROM battle_pass_quests
         WHERE season_id = ? AND quest_key = 'open_5_boosters'
           AND available_from <= ? AND available_until >= ? LIMIT 1`,
        [active.id, nowSql, nowSql],
      );
      if (!quests.length) {
        throw new Error('Quête E2E Battle Pass absente ou expirée : saison conservée sans modification ; utiliser une nouvelle base E2E.');
      }
      await connection.commit();
      transactionStarted = false;
      console.log('Saison Battle Pass existante conservée (quêtes et progression intactes).');
      return;
    }

    const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const start = new Date(midnight - 30 * DAY_MS);
    const end = new Date(midnight + 90 * DAY_MS);
    const [result] = await connection.execute(
      `INSERT INTO battle_pass_seasons
        (season_number, name, theme, start_date, end_date, max_level, base_xp_per_level, is_active, rewards_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        SEASON_1_META.seasonNumber, SEASON_1_META.name, SEASON_1_META.theme,
        mysqlUtc(start), mysqlUtc(end), SEASON_1_META.maxLevel,
        SEASON_1_META.baseXpPerLevel, JSON.stringify(buildSeason1Rewards()),
      ],
    );
    const quests = buildSeason1QuestDefs(start, end);
    for (const q of quests) {
      await connection.execute(
        `INSERT INTO battle_pass_quests
          (season_id, quest_type, quest_key, description_fr, description_en,
           goal_value, xp_reward, bonus_reward_json, available_from, available_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId, q.quest_type, q.quest_key, q.description_fr, q.description_en,
          q.goal_value, q.xp_reward, q.bonus_reward_json,
          mysqlUtc(new Date(q.available_from)), mysqlUtc(new Date(q.available_until)),
        ],
      );
    }
    await connection.commit();
    transactionStarted = false;
    console.log(`Saison Battle Pass E2E créée (${mysqlUtc(start)} à ${mysqlUtc(end)}, ${quests.length} quêtes).`);
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

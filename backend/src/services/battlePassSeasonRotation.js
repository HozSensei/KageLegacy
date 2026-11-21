/**
 * Rotation automatique des saisons Battle Pass (90 jours).
 */
import { query, getConnection } from '../config/database.js';
import { BATTLE_PASS } from '../config/economyConfig.js';
import {
  buildSeasonMeta,
  buildSeasonQuestDefs,
  buildSeasonRewards,
} from './battlePassSeasonTemplate.js';

function toMysqlDatetime(d) {
  return new Date(d).toISOString().slice(0, 19).replace('T', ' ');
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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

async function insertQuestDefs(seasonId, defs, connection) {
  for (const q of defs) {
    await connection.execute(
      `INSERT INTO battle_pass_quests
        (season_id, quest_type, quest_key, description_fr, description_en,
         goal_value, xp_reward, bonus_reward_json, available_from, available_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seasonId,
        q.quest_type,
        q.quest_key,
        q.description_fr,
        q.description_en,
        q.goal_value,
        q.xp_reward,
        q.bonus_reward_json,
        toMysqlDatetime(q.available_from),
        toMysqlDatetime(q.available_until),
      ],
    );
  }
}

/**
 * Crée une saison (numéro N) active sur [start, end).
 * @param {{ seasonNumber: number, startDate?: Date, activate?: boolean }} opts
 */
export async function createSeasonFromTemplate({
  seasonNumber,
  startDate = new Date(),
  activate = true,
} = {}) {
  if (!(await tableExists('battle_pass_seasons'))) {
    return { skipped: true, reason: 'bp_table_missing' };
  }

  const n = Math.max(1, Number(seasonNumber) || 1);
  const meta = buildSeasonMeta(n);
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = addDays(start, BATTLE_PASS.seasonDurationDays);
  const rewards = buildSeasonRewards({ seasonNumber: n, theme: meta.theme });

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    if (activate) {
      await connection.execute('UPDATE battle_pass_seasons SET is_active = FALSE WHERE is_active = TRUE');
    }

    const [existing] = await connection.execute(
      'SELECT id FROM battle_pass_seasons WHERE season_number = ? LIMIT 1',
      [n],
    );

    let seasonId;
    if (existing[0]) {
      seasonId = existing[0].id;
      await connection.execute(
        `UPDATE battle_pass_seasons
         SET name = ?, theme = ?, start_date = ?, end_date = ?,
             max_level = ?, base_xp_per_level = ?, is_active = ?, rewards_json = ?
         WHERE id = ?`,
        [
          meta.name,
          meta.theme,
          toMysqlDatetime(start),
          toMysqlDatetime(end),
          meta.maxLevel,
          meta.baseXpPerLevel,
          activate ? 1 : 0,
          JSON.stringify(rewards),
          seasonId,
        ],
      );
      await connection.execute('DELETE FROM battle_pass_quests WHERE season_id = ?', [seasonId]);
    } else {
      const [result] = await connection.execute(
        `INSERT INTO battle_pass_seasons
          (season_number, name, theme, start_date, end_date, max_level, base_xp_per_level, is_active, rewards_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          meta.seasonNumber,
          meta.name,
          meta.theme,
          toMysqlDatetime(start),
          toMysqlDatetime(end),
          meta.maxLevel,
          meta.baseXpPerLevel,
          activate ? 1 : 0,
          JSON.stringify(rewards),
        ],
      );
      seasonId = result.insertId;
    }

    const defs = buildSeasonQuestDefs(start, end);
    await insertQuestDefs(seasonId, defs, connection);

    await connection.commit();
    return {
      created: true,
      seasonId,
      seasonNumber: n,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      nicknameId: meta.nicknameId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Tick de rotation : clôture les saisons expirées, active / crée la suivante.
 */
export async function rotateBattlePassSeasons(now = new Date()) {
  if (!(await tableExists('battle_pass_seasons'))) {
    return { skipped: true, reason: 'bp_table_missing' };
  }

  const at = new Date(now);
  const actions = [];

  const expired = await query(
    `SELECT id, season_number, end_date FROM battle_pass_seasons
     WHERE is_active = TRUE AND end_date <= ?
     ORDER BY season_number ASC`,
    [toMysqlDatetime(at)],
  );

  for (const row of expired) {
    await query('UPDATE battle_pass_seasons SET is_active = FALSE WHERE id = ?', [row.id]);
    actions.push({ action: 'deactivate', seasonId: row.id, seasonNumber: row.season_number });
  }

  const calendarActive = await query(
    `SELECT id, season_number FROM battle_pass_seasons
     WHERE start_date <= ? AND end_date > ?
     ORDER BY season_number DESC
     LIMIT 1`,
    [toMysqlDatetime(at), toMysqlDatetime(at)],
  );

  if (calendarActive[0]) {
    await query('UPDATE battle_pass_seasons SET is_active = FALSE WHERE is_active = TRUE AND id <> ?', [
      calendarActive[0].id,
    ]);
    await query('UPDATE battle_pass_seasons SET is_active = TRUE WHERE id = ?', [calendarActive[0].id]);
    actions.push({
      action: 'activate',
      seasonId: calendarActive[0].id,
      seasonNumber: calendarActive[0].season_number,
    });
    return { ok: true, actions };
  }

  const flagged = await query(
    `SELECT id, season_number, end_date FROM battle_pass_seasons
     WHERE is_active = TRUE
     ORDER BY season_number DESC
     LIMIT 1`,
  );

  if (flagged[0] && new Date(flagged[0].end_date) > at) {
    return { ok: true, actions, reason: 'active_flag_ok' };
  }

  const latest = await query(
    'SELECT season_number, end_date FROM battle_pass_seasons ORDER BY season_number DESC LIMIT 1',
  );

  const nextNumber = latest[0] ? Number(latest[0].season_number) + 1 : 1;
  const start =
    latest[0] && new Date(latest[0].end_date) > at
      ? new Date(latest[0].end_date)
      : at;

  const created = await createSeasonFromTemplate({
    seasonNumber: nextNumber,
    startDate: start,
    activate: true,
  });
  actions.push({ action: 'create', ...created });
  return { ok: true, actions, created };
}

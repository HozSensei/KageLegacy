import { getConnection, query } from '../config/database.js';
import { ASYNC_DUEL_WEEKLY_VILLAGE_REWARD_RYOS } from '../config/economyConfig.js';
import { inTransaction } from '../db/transaction.js';
import {
  lockWeeklyVillageWrites,
  rankVillagePoints,
  uniqueVillageWinner,
  UTC_WEEK_START,
} from './asyncDuelWeeklyRewards.js';
import { isValidFactionId } from './factionCatalog.js';

const DUEL_MODES = ['friend', 'random', 'enemy_faction'];
const WIN_REWARD = 10;
const DAILY_REWARD_LIMIT = 3;
const DAILY_FACTION_LIMIT = 3;
const OVERVIEW_LIMIT = 20;
const UTC_FINISHED_AT = "CONCAT(LEFT(DATE_FORMAT(d.finished_at, '%Y-%m-%dT%H:%i:%s.%f'), 23), 'Z')";

function duelError(code, message) {
  return Object.assign(new Error(message), { code });
}

function encodeState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('Le snapshot du duel doit être un objet.');
  }
  let outcome;
  switch (state.state) {
    case 'in_progress':
      outcome = null;
      break;
    case 'victory':
    case 'defeat':
      outcome = state.endReason === 'forfeit' ? 'forfeited' : state.state;
      break;
    case 'forfeit':
    case 'forfeited':
      outcome = 'forfeited';
      break;
    default:
      throw new TypeError('État du duel inconnu.');
  }
  return { json: JSON.stringify(state), outcome };
}

export async function getDuelOverview(userId) {
  const rows = await query(
    `SELECT active.id AS activeDuelId,
            d.id, d.attacker_name AS opponentName, COALESCE(r.ryos, 0) AS reward,
            ${UTC_FINISHED_AT} AS finishedAt, d.outcome
     FROM (SELECT ? AS user_id) me
     LEFT JOIN async_duels active ON active.active_attacker_id = me.user_id
     LEFT JOIN (
       SELECT id, attacker_name, finished_at, outcome
       FROM async_duels
       WHERE defender_id = ? AND finished_at IS NOT NULL
       ORDER BY finished_at DESC, id DESC
       LIMIT ${OVERVIEW_LIMIT}
     ) d ON TRUE
     LEFT JOIN async_duel_reward_ledger r ON r.duel_id = d.id AND r.beneficiary_id = me.user_id
     ORDER BY d.finished_at DESC, d.id DESC`,
    [userId, userId]
  );
  return {
    activeDuelId: rows[0].activeDuelId,
    defenses: rows
      .filter(({ id }) => id !== null)
      .map(({ id, opponentName, reward, finishedAt, outcome }) => ({
        id,
        opponentName,
        reward,
        finishedAt,
        outcome,
      })),
  };
}

export async function getFactionStandings() {
  const rows = await query(
    `WITH current_week AS (
       SELECT ${UTC_WEEK_START} AS week_start
     ), periods AS (
       SELECT week_start, 0 AS is_previous FROM current_week
       UNION ALL
       SELECT DATE_SUB(week_start, INTERVAL 7 DAY), 1 FROM current_week
     ), totals AS (
       SELECT p.week_start, p.faction_id, COUNT(*) AS points
       FROM async_duel_faction_points p JOIN periods w ON w.week_start = p.week_start
       GROUP BY p.week_start, p.faction_id
     )
     SELECT DATE_FORMAT(w.week_start, '%Y-%m-%d') AS weekStart,
            DATE_FORMAT(DATE_ADD(w.week_start, INTERVAL 7 DAY), '%Y-%m-%d') AS weekEnd,
            DATE_FORMAT(s.first_week_start, '%Y-%m-%d') AS firstRewardWeekStart,
            w.is_previous AS isPrevious, p.faction_id AS id, p.points,
            x.week_start IS NOT NULL AS settled, x.winner_faction_id AS settledWinner,
            x.reward_ryos AS settledReward
     FROM periods w
     LEFT JOIN totals p ON p.week_start = w.week_start
     LEFT JOIN async_duel_weekly_state s ON s.id = 1
     LEFT JOIN async_duel_weekly_settlements x ON w.is_previous = 1 AND x.week_start = w.week_start`
  );

  function standings(isPrevious) {
    const week = rows.filter(row => row.isPrevious === Number(isPrevious));
    const { weekStart, weekEnd } = week[0];
    return { weekStart, weekEnd, factions: rankVillagePoints(week) };
  }

  const current = standings(false);
  const previous = standings(true);
  const { firstRewardWeekStart } = rows[0];
  const { settled, settledWinner, settledReward } = rows.find(row => row.isPrevious === 1);
  current.rewardRyos = ASYNC_DUEL_WEEKLY_VILLAGE_REWARD_RYOS;
  current.firstRewardWeekStart = firstRewardWeekStart;
  if (
    previous.factions[0].points > 0 ||
    (firstRewardWeekStart && previous.weekStart >= firstRewardWeekStart)
  ) {
    current.previousWeek = {
      ...previous,
      winnerId: settled ? settledWinner : uniqueVillageWinner(previous.factions),
      settled: Boolean(settled),
      rewardRyos: settledReward ?? 0,
    };
  }
  return current;
}

export async function insertAsyncDuel({
  id,
  attackerId,
  defenderId,
  attackerName,
  defenderName,
  mode,
  attackerFaction = null,
  defenderFaction = null,
  state,
}) {
  if (Number(attackerId) === Number(defenderId)) {
    throw duelError('ASYNC_DUEL_SELF', 'Un joueur ne peut pas affronter sa propre défense.');
  }
  if (!DUEL_MODES.includes(mode)) throw new TypeError('Mode de duel inconnu.');
  for (const faction of [attackerFaction, defenderFaction]) {
    if (faction !== null && !isValidFactionId(faction))
      throw new TypeError('Faction de duel inconnue.');
  }
  const { json, outcome } = encodeState(state);
  if (outcome !== null) throw new TypeError('Un nouveau duel doit être en cours.');

  return inTransaction(async connection => {
    try {
      await connection.execute(
        `INSERT INTO async_duels (id, attacker_id, defender_id, attacker_name, defender_name,
                                 mode, attacker_faction, defender_faction, state_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          attackerId,
          defenderId,
          attackerName,
          defenderName,
          mode,
          attackerFaction,
          defenderFaction,
          json,
        ]
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      throw duelError('ASYNC_DUEL_CONFLICT', 'Un duel actif ou cet identifiant existe déjà.');
    }
    return readDuel(connection, id, attackerId);
  });
}

async function readDuel(connection, id, attackerId) {
  const [[duel]] = await connection.execute(
    `SELECT d.id, d.attacker_id AS attackerId, d.defender_id AS defenderId,
            d.attacker_name AS attackerName, d.defender_name AS defenderName, d.mode,
            d.revision, d.state_json AS state, d.outcome, ${UTC_FINISHED_AT} AS finishedAt,
            COALESCE(r.ryos, 0) AS reward
     FROM async_duels d
     LEFT JOIN async_duel_reward_ledger r ON r.duel_id = d.id AND r.beneficiary_id = d.attacker_id
     WHERE d.id = ? AND d.attacker_id = ?`,
    [id, attackerId]
  );
  return duel ?? null;
}

export async function loadAsyncDuel(id, attackerId) {
  const connection = await getConnection();
  try {
    return await readDuel(connection, id, attackerId);
  } finally {
    connection.release();
  }
}

async function creditWinner(connection, duel, win) {
  const { winnerId, winnerSide, day, pairLow, pairHigh } = win;
  const [[{ slot, pairAlreadyCredited }]] = await connection.execute(
    `SELECT COALESCE(MAX(beneficiary_slot), 0) + 1 AS slot,
            EXISTS (SELECT 1 FROM async_duel_reward_ledger
                    WHERE pair_low_id = ? AND pair_high_id = ? AND credited_on = ?) AS pairAlreadyCredited
     FROM async_duel_reward_ledger WHERE beneficiary_id = ? AND credited_on = ?`,
    [pairLow, pairHigh, day, winnerId, day]
  );
  if (slot > DAILY_REWARD_LIMIT || pairAlreadyCredited) return;

  try {
    await connection.execute(
      `INSERT INTO async_duel_reward_ledger
         (duel_id, attacker_id, defender_id, credited_on, beneficiary_slot, ryos, winner_side)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [duel.id, duel.attackerId, duel.defenderId, day, slot, WIN_REWARD, winnerSide]
    );
  } catch (error) {
    // Deux vainqueurs différents peuvent concourir pour la même paire : l'index tranche.
    if (error.code === 'ER_DUP_ENTRY') return;
    throw error;
  }

  const [result] = await connection.execute(
    `UPDATE player_profiles SET ryos = ryos + ?
     WHERE user_id = ? AND ryos <= 2147483647 - ?`,
    [WIN_REWARD, winnerId, WIN_REWARD]
  );
  if (result.affectedRows !== 1) {
    throw duelError('ASYNC_DUEL_REWARD_FAILED', `Crédit impossible pour le duel ${duel.id}.`);
  }
}

function canScoreFaction(duel) {
  return (
    (duel.mode === 'random' || duel.mode === 'enemy_faction') &&
    duel.attackerFaction &&
    duel.defenderFaction &&
    duel.attackerFaction !== duel.defenderFaction
  );
}

async function scoreFaction(connection, duel, win) {
  const { winnerId, day, week, pairLow, pairHigh, winnerSide } = win;
  const faction = winnerSide === 'attacker' ? duel.attackerFaction : duel.defenderFaction;
  const [[{ slot }]] = await connection.execute(
    `SELECT COALESCE(MAX(winner_slot), 0) + 1 AS slot
     FROM async_duel_faction_points WHERE winner_id = ? AND scored_on = ?`,
    [winnerId, day]
  );
  if (slot > DAILY_FACTION_LIMIT) return;

  try {
    await connection.execute(
      `INSERT INTO async_duel_faction_points
         (duel_id, week_start, pair_low_id, pair_high_id, winner_id, faction_id, scored_on, winner_slot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [duel.id, week, pairLow, pairHigh, winnerId, faction, day, slot]
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
  }
}

export async function updateAsyncDuel({ id, attackerId, revision, state }) {
  if (!Number.isInteger(revision) || revision < 0)
    throw new TypeError('Révision du duel invalide.');
  const { json, outcome } = encodeState(state);
  return inTransaction(async connection => {
    const match = 'id = ? AND attacker_id = ? AND revision = ? AND finished_at IS NULL';
    const identity = [id, attackerId, revision];
    const [[duel]] = await connection.execute(
      `SELECT id, attacker_id AS attackerId, defender_id AS defenderId, mode,
              attacker_faction AS attackerFaction, defender_faction AS defenderFaction
       FROM async_duels WHERE ${match} FOR UPDATE`,
      identity
    );
    if (!duel) return null;

    const winnerSide =
      outcome === 'victory' ? 'attacker' : outcome === 'defeat' ? 'defender' : null;
    const winnerId = winnerSide === 'attacker' ? duel.attackerId : duel.defenderId;
    const scoresFaction = winnerSide && canScoreFaction(duel);
    if (scoresFaction) await lockWeeklyVillageWrites(connection);
    if (winnerSide) {
      // Sérialise les deux plafonds quotidiens avant la première lecture cohérente InnoDB.
      await connection.execute('SELECT user_id FROM player_profiles WHERE user_id = ? FOR UPDATE', [
        winnerId,
      ]);
    }
    await connection.execute(
      `UPDATE async_duels
       SET revision = revision + 1, state_json = ?, outcome = ?, finished_at = IF(? IS NULL, NULL, UTC_TIMESTAMP(3))
       WHERE ${match}`,
      [json, outcome, outcome, ...identity]
    );
    if (winnerSide) {
      const [[{ day, week }]] = await connection.execute(
        `SELECT DATE_FORMAT(finished_at, '%Y-%m-%d') AS day,
                DATE_FORMAT(DATE_SUB(DATE(finished_at), INTERVAL WEEKDAY(finished_at) DAY), '%Y-%m-%d') AS week
         FROM async_duels WHERE id = ?`,
        [id]
      );
      const win = {
        winnerId,
        winnerSide,
        day,
        week,
        pairLow: Math.min(duel.attackerId, duel.defenderId),
        pairHigh: Math.max(duel.attackerId, duel.defenderId),
      };
      await creditWinner(connection, duel, win);
      if (scoresFaction) await scoreFaction(connection, duel, win);
    }
    return readDuel(connection, id, attackerId);
  });
}

/**
 * Persistence des combats duo de mission coop (tours async + deadline).
 */
import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import { COOP_TURN_DEADLINE_MS } from '../config/coopMissionConfig.js';
import { applyCoopAction, createCoopCombat, publicCoopCombat } from './deckCombat/coopCombat.js';
import { buildCoopMissionEnemy } from './coopEnemyScale.js';

function httpError(statusCode, message, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function deadlineSql() {
  return `DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ${Number(COOP_TURN_DEADLINE_MS) * 1000} MICROSECOND)`;
}

function mapSessionState(combatState) {
  if (combatState === 'victory') return 'victory';
  if (combatState === 'defeat') return 'defeat';
  return 'in_progress';
}

export async function loadCombatRow(combatId) {
  const rows = await query('SELECT * FROM coop_combat_sessions WHERE id = ? LIMIT 1', [combatId]);
  return rows[0] || null;
}

export async function getPublicCombat(combatId, userId) {
  const row = await loadCombatRow(combatId);
  if (!row) throw httpError(404, 'Combat introuvable.');
  const combat = parseJson(row.combat_state_json, null);
  if (!combat) throw httpError(500, 'État de combat corrompu.');
  const pub = publicCoopCombat(combat, userId);
  return {
    ...pub,
    id: row.id,
    revision: Number(row.revision) || 0,
    turnDeadlineAt: row.turn_deadline_at
      ? new Date(row.turn_deadline_at).toISOString()
      : null,
    coopRunId: row.coop_run_id,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.coopRunId
 * @param {object[]} opts.fighters — [hostFighter, guestFighter] avec startingHp optionnel
 * @param {string} opts.templateId
 * @param {number} opts.difficulty
 */
export async function startCoopCombatSession({
  coopRunId,
  fighters,
  templateId,
  difficulty = 1,
}) {
  const enemy = buildCoopMissionEnemy(templateId, difficulty);
  let combat = createCoopCombat(fighters, { enemy });

  // Reporter les PV de run sur chaque siège.
  combat = {
    ...combat,
    players: combat.players.map((player, index) => {
      const src = fighters[index];
      const maxHp = Number(src.startingMaxHp) || player.maxHp;
      const hp = Math.max(1, Math.min(maxHp, Number(src.startingHp) || maxHp));
      return { ...player, hp, maxHp };
    }),
  };

  const id = randomUUID();
  combat = { ...combat, id };

  await query(
    `INSERT INTO coop_combat_sessions
      (id, coop_run_id, state, combat_state_json, active_player_id, turn_deadline_at, revision)
     VALUES (?, ?, 'in_progress', ?, ?, ${deadlineSql()}, 0)`,
    [
      id,
      coopRunId,
      JSON.stringify(combat),
      combat.activePlayerId,
    ],
  );

  return { id, combat, revision: 0 };
}

async function persistCombatRow(row, combat) {
  const state = mapSessionState(combat.state);
  const active =
    combat.state === 'in_progress' ? combat.activePlayerId : null;
  await query(
    `UPDATE coop_combat_sessions
     SET state = ?, combat_state_json = ?, active_player_id = ?,
         turn_deadline_at = IF(? IS NULL, NULL, ${deadlineSql()}),
         revision = revision + 1
     WHERE id = ?`,
    [state, JSON.stringify(combat), active, active, row.id],
  );
  const updated = await loadCombatRow(row.id);
  return updated;
}

export async function applyCombatAction(combatId, userId, action) {
  const row = await loadCombatRow(combatId);
  if (!row) throw httpError(404, 'Combat introuvable.');
  if (row.state !== 'in_progress') throw httpError(400, 'Combat terminé.');

  if (action?.revision != null && Number(action.revision) !== Number(row.revision)) {
    throw httpError(409, 'Le combat a avancé. Rechargez avant de rejouer.', 'REVISION_MISMATCH');
  }

  const combat = parseJson(row.combat_state_json, null);
  if (!combat) throw httpError(500, 'État de combat corrompu.');

  const next = applyCoopAction(combat, userId, action);
  const updated = await persistCombatRow(row, next);
  return {
    row: updated,
    combat: next,
    public: await getPublicCombat(combatId, userId),
  };
}

/** Auto fin de tour si deadline dépassée (anti-blocage async). */
export async function autoEndExpiredTurns({ limit = 20 } = {}) {
  const rows = await query(
    `SELECT * FROM coop_combat_sessions
     WHERE state = 'in_progress'
       AND turn_deadline_at IS NOT NULL
       AND turn_deadline_at < UTC_TIMESTAMP(6)
     ORDER BY turn_deadline_at ASC
     LIMIT ?`,
    [limit],
  );

  const results = [];
  for (const row of rows) {
    const combat = parseJson(row.combat_state_json, null);
    if (!combat?.activePlayerId || combat.state !== 'in_progress') continue;
    try {
      const next = applyCoopAction(combat, combat.activePlayerId, { type: 'end_turn' });
      const updated = await persistCombatRow(row, next);
      results.push({
        combatId: row.id,
        coopRunId: row.coop_run_id,
        state: updated.state,
        combat: next,
      });
    } catch (error) {
      results.push({ combatId: row.id, error: error.message });
    }
  }
  return results;
}

export const __test = { mapSessionState, parseJson };

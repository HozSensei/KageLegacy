/**
 * File d'attente PvP + jumelage ± niveau.
 * Le serveur crée le match et désigne Host/Guest — il ne simule pas le combat.
 */
import { randomUUID } from 'node:crypto';
import { query, getConnection } from '../../config/database.js';
import {
  designateHost,
  findBestMatch,
  isLevelInWindow,
} from '../../../../shared/pvp/matchmaking.js';
import {
  ANTI_CHEAT_MODE,
  DEFAULT_LEVEL_WINDOW,
  normalizeLevelWindow,
} from './config.js';
import { buildMatchBootstrap } from './pvpDuelBootstrap.js';

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
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function assertPvpTables() {
  if (!(await tableExists('pvp_queue')) || !(await tableExists('pvp_matches'))) {
    throw httpError(503, 'Tables PvP absentes — lancez la migration 106.');
  }
}

async function loadPlayerLevel(userId) {
  const rows = await query(
    'SELECT level FROM player_character WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!rows[0]) throw httpError(400, 'Créez un personnage avant le PvP.');
  return Number(rows[0].level) || 1;
}

function serializeQueueEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    level: row.player_level,
    deckId: row.deck_id,
    levelWindow: row.level_window,
    status: row.status,
    matchedMatchId: row.matched_match_id,
    enqueuedAt: row.enqueued_at,
  };
}

function serializeMatch(row, { includeBootstrap = false } = {}) {
  if (!row) return null;
  let bootstrap = null;
  if (includeBootstrap && row.bootstrap_json) {
    bootstrap =
      typeof row.bootstrap_json === 'string'
        ? JSON.parse(row.bootstrap_json)
        : row.bootstrap_json;
  }
  return {
    id: row.id,
    hostUserId: row.host_user_id,
    guestUserId: row.guest_user_id,
    hostLevel: row.host_level,
    guestLevel: row.guest_level,
    levelWindow: row.level_window,
    status: row.status,
    seed: row.seed,
    hostDeckId: row.host_deck_id,
    guestDeckId: row.guest_deck_id,
    hostReady: Boolean(row.host_ready),
    guestReady: Boolean(row.guest_ready),
    winnerUserId: row.winner_user_id,
    winnerSeat: row.winner_seat,
    endReason: row.end_reason,
    antiCheatMode: row.anti_cheat_mode,
    hostChecksum: row.host_checksum,
    guestChecksum: row.guest_checksum,
    resultSummary:
      row.result_summary_json == null
        ? null
        : typeof row.result_summary_json === 'string'
          ? JSON.parse(row.result_summary_json)
          : row.result_summary_json,
    bootstrap: includeBootstrap ? bootstrap : undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

/**
 * Rejoint la file. Si un adversaire compatible existe → crée le match immédiatement.
 */
export async function enqueue(userId, opts = {}) {
  await assertPvpTables();
  if (!userId) throw httpError(400, 'userId requis.');

  const level = await loadPlayerLevel(userId);
  const levelWindow = normalizeLevelWindow(opts.levelWindow, DEFAULT_LEVEL_WINDOW);
  const deckId = opts.deckId != null ? Number(opts.deckId) : null;

  // Déjà en match actif ?
  const activeMatch = await query(
    `SELECT * FROM pvp_matches
     WHERE (host_user_id = ? OR guest_user_id = ?)
       AND status IN ('pending', 'ready', 'in_progress')
     ORDER BY created_at DESC LIMIT 1`,
    [userId, userId],
  );
  if (activeMatch[0]) {
    return {
      status: 'already_matched',
      queue: null,
      match: serializeMatch(activeMatch[0], { includeBootstrap: true }),
      role: roleForUser(activeMatch[0], userId),
    };
  }

  // Quête BP : entrée volontaire en file (pas already_matched)
  try {
    const { onBattlePassAction } = await import('../battlePassQuestService.js');
    await onBattlePassAction(userId, 'pvp_queue', 1);
  } catch {
    /* BP optionnel */
  }

  // Annuler d'anciennes entrées waiting
  await query(
    'UPDATE pvp_queue SET status = \'cancelled\' WHERE user_id = ? AND status = \'waiting\'',
    [userId],
  );

  const waiting = await query(
    'SELECT * FROM pvp_queue WHERE status = \'waiting\' AND user_id <> ? ORDER BY enqueued_at ASC',
    [userId],
  );

  const seeker = { userId, level, enqueuedAt: Date.now() };
  const candidates = waiting.map((row) => ({
    userId: row.user_id,
    level: row.player_level,
    enqueuedAt: row.enqueued_at,
    queueId: row.id,
    deckId: row.deck_id,
    levelWindow: row.level_window,
  }));

  // Fenêtre effective = min des deux fenêtres demandées (plus strict)
  const best = findBestMatch(seeker, candidates, { levelWindow });

  if (!best) {
    const result = await query(
      `INSERT INTO pvp_queue (user_id, player_level, deck_id, level_window, status)
       VALUES (?, ?, ?, ?, 'waiting')`,
      [userId, level, deckId, levelWindow],
    );
    const rows = await query('SELECT * FROM pvp_queue WHERE id = ?', [result.insertId]);
    return {
      status: 'queued',
      queue: serializeQueueEntry(rows[0]),
      match: null,
      role: null,
    };
  }

  // Vérifier aussi la fenêtre du candidat
  const candidateWindow = normalizeLevelWindow(best.levelWindow, levelWindow);
  if (!isLevelInWindow(level, best.level, Math.min(levelWindow, candidateWindow))) {
    const result = await query(
      `INSERT INTO pvp_queue (user_id, player_level, deck_id, level_window, status)
       VALUES (?, ?, ?, ?, 'waiting')`,
      [userId, level, deckId, levelWindow],
    );
    const rows = await query('SELECT * FROM pvp_queue WHERE id = ?', [result.insertId]);
    return {
      status: 'queued',
      queue: serializeQueueEntry(rows[0]),
      match: null,
      role: null,
    };
  }

  const match = await createMatchFromPair({
    userA: { userId, level, deckId },
    userB: {
      userId: Number(best.userId),
      level: best.level,
      deckId: best.deckId,
    },
    levelWindow: Math.min(levelWindow, candidateWindow),
    queueIdB: best.queueId,
  });

  return {
    status: 'matched',
    queue: null,
    match: serializeMatch(match, { includeBootstrap: true }),
    role: roleForUser(match, userId),
  };
}

export async function leaveQueue(userId) {
  await assertPvpTables();
  await query(
    'UPDATE pvp_queue SET status = \'cancelled\' WHERE user_id = ? AND status = \'waiting\'',
    [userId],
  );
  return { ok: true };
}

export async function getQueueStatus(userId) {
  await assertPvpTables();

  const activeMatch = await query(
    `SELECT * FROM pvp_matches
     WHERE (host_user_id = ? OR guest_user_id = ?)
       AND status IN ('pending', 'ready', 'in_progress')
     ORDER BY created_at DESC LIMIT 1`,
    [userId, userId],
  );
  if (activeMatch[0]) {
    return {
      status: 'matched',
      queue: null,
      match: serializeMatch(activeMatch[0], { includeBootstrap: true }),
      role: roleForUser(activeMatch[0], userId),
    };
  }

  const waiting = await query(
    `SELECT * FROM pvp_queue WHERE user_id = ? AND status = 'waiting'
     ORDER BY enqueued_at DESC LIMIT 1`,
    [userId],
  );
  if (waiting[0]) {
    // Tenter un rematch si quelqu'un a rejoint entre-temps
    const rematch = await tryMatchWaitingEntry(waiting[0]);
    if (rematch) {
      return {
        status: 'matched',
        queue: null,
        match: serializeMatch(rematch, { includeBootstrap: true }),
        role: roleForUser(rematch, userId),
      };
    }
    return {
      status: 'queued',
      queue: serializeQueueEntry(waiting[0]),
      match: null,
      role: null,
    };
  }

  return { status: 'idle', queue: null, match: null, role: null };
}

async function tryMatchWaitingEntry(row) {
  const others = await query(
    'SELECT * FROM pvp_queue WHERE status = \'waiting\' AND user_id <> ? ORDER BY enqueued_at ASC',
    [row.user_id],
  );
  const seeker = {
    userId: row.user_id,
    level: row.player_level,
    enqueuedAt: row.enqueued_at,
  };
  const candidates = others.map((o) => ({
    userId: o.user_id,
    level: o.player_level,
    enqueuedAt: o.enqueued_at,
    queueId: o.id,
    deckId: o.deck_id,
    levelWindow: o.level_window,
  }));
  const window = normalizeLevelWindow(row.level_window);
  const best = findBestMatch(seeker, candidates, { levelWindow: window });
  if (!best) return null;

  const candidateWindow = normalizeLevelWindow(best.levelWindow, window);
  const effective = Math.min(window, candidateWindow);
  if (!isLevelInWindow(row.player_level, best.level, effective)) return null;

  return createMatchFromPair({
    userA: { userId: row.user_id, level: row.player_level, deckId: row.deck_id },
    userB: {
      userId: Number(best.userId),
      level: best.level,
      deckId: best.deckId,
    },
    levelWindow: effective,
    queueIdA: row.id,
    queueIdB: best.queueId,
  });
}

async function createMatchFromPair({ userA, userB, levelWindow, queueIdA, queueIdB }) {
  const { hostUserId, guestUserId } = designateHost(userA.userId, userB.userId);
  const host = String(userA.userId) === hostUserId ? userA : userB;
  const guest = String(userA.userId) === guestUserId ? userA : userB;

  const matchId = randomUUID();
  const seed = `${matchId.slice(0, 8)}-${Date.now().toString(36)}`;
  const bootstrap = await buildMatchBootstrap({
    matchId,
    hostUserId: Number(host.userId),
    guestUserId: Number(guest.userId),
    hostDeckId: host.deckId,
    guestDeckId: guest.deckId,
    seed,
  });

  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO pvp_matches
        (id, host_user_id, guest_user_id, host_level, guest_level, level_window,
         status, seed, host_deck_id, guest_deck_id, bootstrap_json, anti_cheat_mode)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        matchId,
        Number(host.userId),
        Number(guest.userId),
        Number(host.level) || 1,
        Number(guest.level) || 1,
        levelWindow,
        seed,
        host.deckId || null,
        guest.deckId || null,
        JSON.stringify(bootstrap),
        ANTI_CHEAT_MODE,
      ],
    );

    if (queueIdA) {
      await conn.execute(
        'UPDATE pvp_queue SET status = \'matched\', matched_match_id = ? WHERE id = ?',
        [matchId, queueIdA],
      );
    }
    if (queueIdB) {
      await conn.execute(
        'UPDATE pvp_queue SET status = \'matched\', matched_match_id = ? WHERE id = ?',
        [matchId, queueIdB],
      );
    }
    // Entrée seeker si pas encore en queue (cas enqueue immédiat)
    if (!queueIdA) {
      await conn.execute(
        `INSERT INTO pvp_queue (user_id, player_level, deck_id, level_window, status, matched_match_id)
         VALUES (?, ?, ?, ?, 'matched', ?)`,
        [userA.userId, userA.level, userA.deckId, levelWindow, matchId],
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const rows = await query('SELECT * FROM pvp_matches WHERE id = ? LIMIT 1', [matchId]);
  return rows[0];
}

export function roleForUser(matchRow, userId) {
  if (!matchRow) return null;
  const uid = Number(userId);
  if (Number(matchRow.host_user_id) === uid) return 'host';
  if (Number(matchRow.guest_user_id) === uid) return 'guest';
  return null;
}

export async function getMatch(matchId, userId) {
  await assertPvpTables();
  const rows = await query('SELECT * FROM pvp_matches WHERE id = ? LIMIT 1', [matchId]);
  if (!rows[0]) throw httpError(404, 'Match PvP introuvable.');
  const role = roleForUser(rows[0], userId);
  if (!role) throw httpError(403, 'Vous n’êtes pas participant de ce match.');
  return {
    match: serializeMatch(rows[0], { includeBootstrap: true }),
    role,
  };
}

export { serializeMatch, isLevelInWindow, findBestMatch, designateHost };

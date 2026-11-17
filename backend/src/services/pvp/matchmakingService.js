/**
 * File d'attente PvP + jumelage ± niveau.
 * Le serveur crée le match et désigne Host/Guest — il ne simule pas le combat.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { query, getConnection } from '../../config/database.js';
import {
  designateHost,
  findBestMatch,
  isLevelInWindow,
} from '../../../../shared/pvp/matchmaking.js';
import { ANTI_CHEAT_MODE, DEFAULT_LEVEL_WINDOW, normalizeLevelWindow } from './config.js';
import { buildMatchBootstrap } from './pvpDuelBootstrap.js';
import { getPlayableDeckForCombat } from '../deckService.js';
import { assertValidBootstrap } from './pvpBootstrapValidation.js';
import { checkPvpRateLimit } from './pvpRateLimit.js';
import { logPvpAnomaly } from './pvpAnomalyLog.js';
import { evaluateResultConfirmation } from '../../../../shared/pvp/antiCheat.js';

function httpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
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

async function assertPvpTables() {
  if (!(await tableExists('pvp_queue')) || !(await tableExists('pvp_matches'))) {
    throw httpError(503, 'Tables PvP absentes — lancez la migration 109.');
  }
}

async function assertInviteTable() {
  if (!(await tableExists('pvp_invites'))) {
    throw httpError(503, 'Table des invitations PvP absente — lancez la migration 121.');
  }
}

async function loadPlayerLevel(userId) {
  const rows = await query('SELECT level FROM player_character WHERE user_id = ? LIMIT 1', [
    userId,
  ]);
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
  const resultSummary =
    row.result_summary_json == null
      ? null
      : typeof row.result_summary_json === 'string'
        ? JSON.parse(row.result_summary_json)
        : row.result_summary_json;
  const pendingConfirmation = resultSummary?.pendingConfirmation || null;
  const resultConfirmation = evaluateResultConfirmation({
    hostChecksum: row.host_checksum,
    guestChecksum: row.guest_checksum,
    confirmationExpiresAt: pendingConfirmation?.expiresAt,
  });
  if (includeBootstrap && row.bootstrap_json) {
    bootstrap =
      typeof row.bootstrap_json === 'string' ? JSON.parse(row.bootstrap_json) : row.bootstrap_json;
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
    voided: ['void_checksum_mismatch', 'void_confirmation_timeout'].includes(row.end_reason),
    antiCheatMode: row.anti_cheat_mode,
    hostChecksum: row.host_checksum,
    guestChecksum: row.guest_checksum,
    resultConfirmation: {
      state: resultConfirmation.state,
      expiresAt: pendingConfirmation?.expiresAt || null,
    },
    resultSummary,
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

  const rate = checkPvpRateLimit('queue', userId);
  if (!rate.allowed) {
    logPvpAnomaly('rate_limit_queue', { userId, retryAfterMs: rate.retryAfterMs });
    throw httpError(429, 'Trop d’entrées en file PvP — réessayez plus tard.', {
      retryAfterMs: rate.retryAfterMs,
    });
  }

  const level = await loadPlayerLevel(userId);
  const levelWindow = normalizeLevelWindow(opts.levelWindow, DEFAULT_LEVEL_WINDOW);
  const requestedDeckId = opts.deckId != null ? Number(opts.deckId) : null;

  // Déjà en match actif ?
  const activeMatch = await query(
    `SELECT * FROM pvp_matches
     WHERE (host_user_id = ? OR guest_user_id = ?)
       AND status IN ('pending', 'ready', 'in_progress')
     ORDER BY created_at DESC LIMIT 1`,
    [userId, userId]
  );
  if (activeMatch[0]) {
    return {
      status: 'already_matched',
      queue: null,
      match: serializeMatch(activeMatch[0], { includeBootstrap: true }),
      role: roleForUser(activeMatch[0], userId),
    };
  }

  // Snapshot the exact valid deck selected for this queue entry. The bootstrap
  // validates it again immediately before the match is created.
  const deck = await getPlayableDeckForCombat(userId, requestedDeckId);
  const deckId = deck.id;

  // Quête BP : entrée volontaire en file (pas already_matched)
  try {
    const { onBattlePassAction } = await import('../battlePassQuestService.js');
    await onBattlePassAction(userId, 'pvp_queue', 1);
  } catch {
    /* BP optionnel */
  }

  // Annuler d'anciennes entrées waiting
  await query(
    "UPDATE pvp_queue SET status = 'cancelled' WHERE user_id = ? AND status = 'waiting'",
    [userId]
  );

  const waiting = await query(
    "SELECT * FROM pvp_queue WHERE status = 'waiting' AND user_id <> ? ORDER BY enqueued_at ASC",
    [userId]
  );

  const seeker = { userId, level, enqueuedAt: Date.now() };
  const candidates = waiting.map(row => ({
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
      [userId, level, deckId, levelWindow]
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
      [userId, level, deckId, levelWindow]
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

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode() {
  const bytes = randomBytes(8);
  return [...bytes].map(byte => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]).join('');
}

export async function createInvitation(userId, opts = {}) {
  await assertPvpTables();
  await assertInviteTable();
  if (!userId) throw httpError(400, 'userId requis.');

  const activeMatch = await query(
    `SELECT id FROM pvp_matches
     WHERE (host_user_id = ? OR guest_user_id = ?)
       AND status IN ('pending', 'ready', 'in_progress')
     LIMIT 1`,
    [userId, userId]
  );
  if (activeMatch[0]) throw httpError(409, 'Vous avez déjà un duel PvP en cours.');

  const level = await loadPlayerLevel(userId);
  const deck = await getPlayableDeckForCombat(userId, opts.deckId ?? null);
  const levelWindow = normalizeLevelWindow(opts.levelWindow, DEFAULT_LEVEL_WINDOW);

  await query(
    "UPDATE pvp_queue SET status = 'cancelled' WHERE user_id = ? AND status = 'waiting'",
    [userId]
  );
  await query(
    "UPDATE pvp_invites SET status = 'cancelled' WHERE user_id = ? AND status = 'pending'",
    [userId]
  );

  let code;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    code = generateInviteCode();
    try {
      await query(
        `INSERT INTO pvp_invites (code, user_id, player_level, deck_id, level_window, expires_at)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
        [code, userId, level, deck.id, levelWindow]
      );
      break;
    } catch (error) {
      if (attempt === 2 || error.code !== 'ER_DUP_ENTRY') throw error;
    }
  }

  const rows = await query('SELECT expires_at FROM pvp_invites WHERE code = ? LIMIT 1', [code]);
  return { code, expiresAt: rows[0]?.expires_at || null };
}

export async function acceptInvitation(userId, rawCode) {
  await assertPvpTables();
  await assertInviteTable();
  if (!userId) throw httpError(400, 'userId requis.');
  const code = String(rawCode || '')
    .trim()
    .toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw httpError(400, 'Code d’invitation invalide.');

  const inviteRows = await query(
    `SELECT *, (expires_at <= UTC_TIMESTAMP()) AS is_expired
     FROM pvp_invites WHERE code = ? LIMIT 1`,
    [code]
  );
  const invitation = inviteRows[0];
  if (!invitation || invitation.status !== 'pending') {
    throw httpError(404, 'Invitation PvP introuvable ou déjà utilisée.');
  }
  if (Number(invitation.user_id) === Number(userId)) {
    throw httpError(400, 'Vous ne pouvez pas accepter votre propre invitation.');
  }
  if (Number(invitation.is_expired)) {
    await query("UPDATE pvp_invites SET status = 'expired' WHERE code = ? AND status = 'pending'", [
      code,
    ]);
    throw httpError(410, 'Cette invitation PvP a expiré.');
  }

  const activeMatches = await query(
    `SELECT id FROM pvp_matches
     WHERE (host_user_id IN (?, ?) OR guest_user_id IN (?, ?))
       AND status IN ('pending', 'ready', 'in_progress')
     LIMIT 1`,
    [invitation.user_id, invitation.user_id, userId, userId]
  );
  if (activeMatches[0]) throw httpError(409, 'Un des joueurs a déjà un duel PvP en cours.');

  const guestLevel = await loadPlayerLevel(userId);
  const guestDeck = await getPlayableDeckForCombat(userId);
  const match = await createMatchFromPair({
    userA: {
      userId: Number(invitation.user_id),
      level: Number(invitation.player_level),
      deckId: invitation.deck_id,
    },
    userB: { userId, level: guestLevel, deckId: guestDeck.id },
    levelWindow: Number(invitation.level_window),
    invitationCode: code,
  });

  return {
    status: 'matched',
    match: serializeMatch(match, { includeBootstrap: true }),
    role: roleForUser(match, userId),
  };
}

export async function leaveQueue(userId) {
  await assertPvpTables();
  await query(
    "UPDATE pvp_queue SET status = 'cancelled' WHERE user_id = ? AND status = 'waiting'",
    [userId]
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
    [userId, userId]
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
    [userId]
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
    "SELECT * FROM pvp_queue WHERE status = 'waiting' AND user_id <> ? ORDER BY enqueued_at ASC",
    [row.user_id]
  );
  const seeker = {
    userId: row.user_id,
    level: row.player_level,
    enqueuedAt: row.enqueued_at,
  };
  const candidates = others.map(o => ({
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

async function createMatchFromPair({
  userA,
  userB,
  levelWindow,
  queueIdA,
  queueIdB,
  invitationCode,
}) {
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
  assertValidBootstrap(bootstrap, {
    hostUserId: Number(host.userId),
    guestUserId: Number(guest.userId),
    hostLevel: Number(host.level) || 1,
    guestLevel: Number(guest.level) || 1,
  });

  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    if (invitationCode) {
      const [claim] = await conn.execute(
        `UPDATE pvp_invites SET status = 'accepted', match_id = ?
         WHERE code = ? AND status = 'pending' AND expires_at > UTC_TIMESTAMP()`,
        [matchId, invitationCode]
      );
      if (claim.affectedRows !== 1) {
        throw httpError(409, 'Cette invitation a déjà été utilisée ou a expiré.');
      }
      await conn.execute(
        "UPDATE pvp_queue SET status = 'cancelled' WHERE user_id IN (?, ?) AND status = 'waiting'",
        [userA.userId, userB.userId]
      );
    }
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
      ]
    );

    if (queueIdA) {
      await conn.execute(
        "UPDATE pvp_queue SET status = 'matched', matched_match_id = ? WHERE id = ?",
        [matchId, queueIdA]
      );
    }
    if (queueIdB) {
      await conn.execute(
        "UPDATE pvp_queue SET status = 'matched', matched_match_id = ? WHERE id = ?",
        [matchId, queueIdB]
      );
    }
    // Entrée seeker si pas encore en queue (cas enqueue immédiat)
    if (!queueIdA) {
      await conn.execute(
        `INSERT INTO pvp_queue (user_id, player_level, deck_id, level_window, status, matched_match_id)
         VALUES (?, ?, ?, ?, 'matched', ?)`,
        [userA.userId, userA.level, userA.deckId, levelWindow, matchId]
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

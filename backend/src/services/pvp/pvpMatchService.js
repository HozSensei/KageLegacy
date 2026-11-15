/**
 * Cycle de vie match PvP : ready, start, report fin de match.
 * Anti-triche MVP : validations impossibles + guest challenge checksum —
 * pas de resimulation carte-par-carte.
 */
import { query } from '../../config/database.js';
import { fingerprint, normalizeResultSummary } from '../../../../shared/pvp/checksum.js';
import {
  compareHostGuestChecksums,
  validateMatchResultReport,
} from '../../../../shared/pvp/antiCheat.js';
import { ANTI_CHEAT_MODE } from './config.js';
import { roleForUser, serializeMatch } from './matchmakingService.js';
import { logPvpAnomaly } from './pvpAnomalyLog.js';
import { checkPvpRateLimit } from './pvpRateLimit.js';

function httpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

async function loadMatch(matchId) {
  const rows = await query('SELECT * FROM pvp_matches WHERE id = ? LIMIT 1', [matchId]);
  if (!rows[0]) throw httpError(404, 'Match PvP introuvable.');
  return rows[0];
}

function parseSummaryJson(row) {
  if (row.result_summary_json == null) return null;
  return typeof row.result_summary_json === 'string'
    ? JSON.parse(row.result_summary_json)
    : row.result_summary_json;
}

/**
 * Marque le joueur prêt. Quand Host + Guest prêts → status ready (ou in_progress).
 */
export async function markReady(matchId, userId) {
  const row = await loadMatch(matchId);
  const role = roleForUser(row, userId);
  if (!role) throw httpError(403, 'Pas participant.');
  if (!['pending', 'ready'].includes(row.status)) {
    throw httpError(409, `Match non prêtifiable (${row.status}).`);
  }

  if (role === 'host') {
    await query('UPDATE pvp_matches SET host_ready = 1 WHERE id = ?', [matchId]);
  } else {
    await query('UPDATE pvp_matches SET guest_ready = 1 WHERE id = ?', [matchId]);
  }

  const updated = await loadMatch(matchId);
  const bothReady = Boolean(updated.host_ready) && Boolean(updated.guest_ready);
  if (bothReady && updated.status === 'pending') {
    await query(
      `UPDATE pvp_matches
       SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
       WHERE id = ?`,
      [matchId],
    );
  }

  const final = await loadMatch(matchId);
  return {
    match: serializeMatch(final, { includeBootstrap: true }),
    role,
  };
}

/**
 * Void un match pour mismatch checksum Host/Guest (guest challenge).
 */
async function voidMatchForChecksumMismatch(matchId, row, detail = {}) {
  const existing = parseSummaryJson(row) || {};
  const payload = {
    ...existing,
    voided: true,
    voidReason: 'checksum_host_guest_mismatch',
    anomalyFlags: [
      ...new Set([...(existing.anomalyFlags || []), 'checksum_host_guest_mismatch']),
    ],
    guestChallenge: detail,
  };
  logPvpAnomaly('checksum_host_guest_mismatch', {
    matchId,
    hostUserId: row.host_user_id,
    guestUserId: row.guest_user_id,
    hostChecksum: detail.hostChecksum || row.host_checksum,
    guestChecksum: detail.guestChecksum || row.guest_checksum,
  });
  await query(
    `UPDATE pvp_matches
     SET status = 'cancelled',
         end_reason = 'void_checksum_mismatch',
         winner_seat = NULL,
         winner_user_id = NULL,
         result_summary_json = ?,
         ended_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [JSON.stringify(payload), matchId],
  );
  return loadMatch(matchId);
}

/**
 * Applique / compare le checksum guest (guest challenge).
 * @returns {{ voided: boolean, match: object, compared: object }}
 */
async function applyGuestChecksum(matchId, row, checksum) {
  await query('UPDATE pvp_matches SET guest_checksum = ? WHERE id = ?', [checksum, matchId]);
  const hostCs = row.host_checksum;
  const compared = compareHostGuestChecksums(hostCs, checksum);
  if (compared.voidMatch) {
    const voided = await voidMatchForChecksumMismatch(matchId, row, {
      hostChecksum: hostCs,
      guestChecksum: checksum,
    });
    return { voided: true, match: voided, compared };
  }
  const updated = await loadMatch(matchId);
  return { voided: false, match: updated, compared };
}

/**
 * Report de fin de match (Host obligatoire pour le résultat ; Guest peut confirmer checksum).
 *
 * Mode trust_host (MVP renforcé) :
 * - Valide bornes HP / tours / durée / participants
 * - Guest challenge : checksum différent → match void (cancelled + flag)
 * - PAS de recalcul moteur PvE carte-par-carte
 */
export async function reportMatchResult(matchId, userId, body = {}) {
  const rate = checkPvpRateLimit('report', userId);
  if (!rate.allowed) {
    logPvpAnomaly('rate_limit_report', { userId, matchId, retryAfterMs: rate.retryAfterMs });
    throw httpError(429, 'Trop de reports PvP — réessayez plus tard.', {
      retryAfterMs: rate.retryAfterMs,
    });
  }

  const row = await loadMatch(matchId);
  const role = roleForUser(row, userId);
  if (!role) throw httpError(403, 'Pas participant.');

  if (['completed', 'forfeited', 'cancelled'].includes(row.status)) {
    // Guest challenge tardif : si match completed et guest confirme checksum différent → void
    if (
      role === 'guest' &&
      row.status === 'completed' &&
      body.checksum &&
      (body.confirmOnly || !body.winnerSeat)
    ) {
      const applied = await applyGuestChecksum(matchId, row, String(body.checksum).slice(0, 32));
      return {
        match: serializeMatch(applied.match),
        role,
        alreadyEnded: !applied.voided,
        voided: applied.voided,
        guestChallenge: applied.compared,
        antiCheatMode: ANTI_CHEAT_MODE,
      };
    }
    return {
      match: serializeMatch(row),
      role,
      alreadyEnded: true,
    };
  }

  if (!['pending', 'ready', 'in_progress'].includes(row.status)) {
    throw httpError(409, `Match non reportable (${row.status}).`);
  }

  const checksum = body.checksum ? String(body.checksum).slice(0, 32) : null;
  const summary = body.summary || body.resultSummary || null;
  const winnerSeat = body.winnerSeat === 'host' || body.winnerSeat === 'guest' ? body.winnerSeat : null;
  const endReason = body.endReason ? String(body.endReason).slice(0, 40) : 'report';

  // Guest : confirmation checksum seulement (ne clôture pas seul sauf forfeit)
  if (role === 'guest' && body.confirmOnly) {
    const applied = await applyGuestChecksum(matchId, row, checksum);
    return {
      match: serializeMatch(applied.match),
      role,
      confirmed: true,
      voided: applied.voided,
      guestChallenge: applied.compared,
      antiCheatMode: ANTI_CHEAT_MODE,
    };
  }

  // Forfeit déclaré par n'importe quel participant
  if (endReason === 'forfeit' || body.forfeit) {
    const forfeitSeat = role;
    const winSeat = forfeitSeat === 'host' ? 'guest' : 'host';
    const winnerUserId = winSeat === 'host' ? row.host_user_id : row.guest_user_id;
    await query(
      `UPDATE pvp_matches
       SET status = 'forfeited',
           winner_seat = ?,
           winner_user_id = ?,
           end_reason = 'forfeit',
           host_checksum = CASE WHEN ? = 'host' THEN ? ELSE host_checksum END,
           guest_checksum = CASE WHEN ? = 'guest' THEN ? ELSE guest_checksum END,
           result_summary_json = ?,
           ended_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        winSeat,
        winnerUserId,
        role,
        checksum,
        role,
        checksum,
        summary ? JSON.stringify(summary) : null,
        matchId,
      ],
    );
    // Si l’autre checksum est déjà là et mismatch → void
    const after = await loadMatch(matchId);
    if (after.host_checksum && after.guest_checksum) {
      const compared = compareHostGuestChecksums(after.host_checksum, after.guest_checksum);
      if (compared.voidMatch) {
        const voided = await voidMatchForChecksumMismatch(matchId, after, {
          hostChecksum: after.host_checksum,
          guestChecksum: after.guest_checksum,
        });
        return {
          match: serializeMatch(voided),
          role,
          voided: true,
          guestChallenge: compared,
          antiCheatMode: ANTI_CHEAT_MODE,
        };
      }
    }
    return { match: serializeMatch(after), role, antiCheatMode: ANTI_CHEAT_MODE };
  }

  // Clôture normale : Host (trust-host) ; Guest sans winnerSeat = checksum only
  if (role !== 'host' && row.anti_cheat_mode === 'trust_host') {
    if (!winnerSeat) {
      const applied = await applyGuestChecksum(matchId, row, checksum);
      return {
        match: serializeMatch(applied.match),
        role,
        message: applied.voided
          ? 'Checksum guest ≠ host — match void.'
          : 'Checksum guest enregistré — en attente du report Host.',
        voided: applied.voided,
        guestChallenge: applied.compared,
        antiCheatMode: ANTI_CHEAT_MODE,
      };
    }
  }

  if (role === 'host' && !winnerSeat) {
    throw httpError(400, 'winnerSeat requis (host|guest).');
  }

  const effectiveWinnerSeat = winnerSeat || row.winner_seat;
  if (!effectiveWinnerSeat) throw httpError(400, 'winnerSeat manquant.');

  const validation = validateMatchResultReport({
    matchRow: row,
    role,
    winnerSeat: effectiveWinnerSeat,
    checksum,
    summary,
    endReason,
  });

  if (!validation.ok) {
    logPvpAnomaly('result_rejected', {
      matchId,
      userId,
      role,
      errors: validation.errors,
      flags: validation.flags,
    });
    throw httpError(400, `Résultat PvP rejeté : ${validation.errors[0]}`, {
      flags: validation.flags,
      errors: validation.errors,
    });
  }

  // Checksum guest déjà présent → comparer avant clôture
  const guestCs = row.guest_checksum;
  const hostCs = role === 'host' ? checksum : row.host_checksum;
  const compared = compareHostGuestChecksums(hostCs, guestCs);
  if (compared.voidMatch) {
    await query(
      `UPDATE pvp_matches
       SET host_checksum = COALESCE(?, host_checksum),
           guest_checksum = COALESCE(guest_checksum, ?)
       WHERE id = ?`,
      [role === 'host' ? checksum : null, role === 'guest' ? checksum : null, matchId],
    );
    const voided = await voidMatchForChecksumMismatch(matchId, row, {
      hostChecksum: hostCs,
      guestChecksum: guestCs,
    });
    return {
      match: serializeMatch(voided),
      role,
      voided: true,
      validation: {
        mode: ANTI_CHEAT_MODE,
        checksumOk: false,
        flags: compared.flags,
      },
      guestChallenge: compared,
      antiCheatMode: ANTI_CHEAT_MODE,
    };
  }

  const winnerUserId =
    effectiveWinnerSeat === 'host' ? row.host_user_id : row.guest_user_id;

  const normalized = validation.normalized;
  const checksumOk =
    normalized && checksum
      ? fingerprint(normalized) === String(checksum).slice(0, 16) ||
        fingerprint(summary) === String(checksum).slice(0, 16) ||
        fingerprint(summary) === String(checksum)
      : null;

  const resultPayload = {
    ...(normalized || summary || {}),
    validation: {
      mode: ANTI_CHEAT_MODE,
      checksumOk,
      flags: validation.flags,
      guestChecksumMatch: compared.match,
    },
  };

  await query(
    `UPDATE pvp_matches
     SET status = 'completed',
         winner_seat = ?,
         winner_user_id = ?,
         end_reason = ?,
         host_checksum = CASE WHEN ? = 'host' THEN COALESCE(?, host_checksum) ELSE host_checksum END,
         guest_checksum = CASE WHEN ? = 'guest' THEN COALESCE(?, guest_checksum) ELSE guest_checksum END,
         result_summary_json = COALESCE(?, result_summary_json),
         ended_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      effectiveWinnerSeat,
      winnerUserId,
      endReason,
      role,
      checksum,
      role,
      checksum,
      JSON.stringify(resultPayload),
      matchId,
    ],
  );

  const updated = await loadMatch(matchId);
  try {
    if (updated?.status === 'completed' && row.status !== 'completed') {
      const { onAchievementAction } = await import('../achievementService.js');
      const hostId = updated.host_user_id ?? row.host_user_id;
      const guestId = updated.guest_user_id ?? row.guest_user_id;
      if (hostId) await onAchievementAction(hostId, 'pvp_match', 1);
      if (guestId) await onAchievementAction(guestId, 'pvp_match', 1);
      if (winnerUserId) await onAchievementAction(winnerUserId, 'pvp_win', 1);
    }
  } catch { /* exploits optionnels */ }
  return {
    match: serializeMatch(updated),
    role,
    validation: {
      mode: ANTI_CHEAT_MODE,
      checksumOk,
      flags: validation.flags,
      guestChecksumMatch: compared.match,
    },
    antiCheatMode: ANTI_CHEAT_MODE,
  };
}

export async function cancelMatch(matchId, userId) {
  const row = await loadMatch(matchId);
  const role = roleForUser(row, userId);
  if (!role) throw httpError(403, 'Pas participant.');
  if (!['pending', 'ready'].includes(row.status)) {
    throw httpError(409, 'Seul un match non démarré peut être annulé.');
  }
  await query(
    `UPDATE pvp_matches SET status = 'cancelled', end_reason = 'cancel', ended_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [matchId],
  );
  const updated = await loadMatch(matchId);
  return { match: serializeMatch(updated), role };
}

export { normalizeResultSummary };

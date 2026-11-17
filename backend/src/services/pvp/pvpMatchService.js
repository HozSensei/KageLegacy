/**
 * Cycle de vie match PvP : ready, start, report fin de match.
 * Anti-triche MVP : validations impossibles + guest challenge checksum —
 * pas de resimulation carte-par-carte.
 */
import { query } from '../../config/database.js';
import { fingerprint, normalizeResultSummary } from '../../../../shared/pvp/checksum.js';
import {
  compareHostGuestChecksums,
  evaluateResultConfirmation,
  validateMatchResultReport,
} from '../../../../shared/pvp/antiCheat.js';
import { ANTI_CHEAT_MODE, RESULT_CONFIRMATION_TIMEOUT_MS } from './config.js';
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

function getPendingConfirmation(row) {
  return parseSummaryJson(row)?.pendingConfirmation || null;
}

function getConfirmation(row, now = Date.now()) {
  return evaluateResultConfirmation({
    hostChecksum: row.host_checksum,
    guestChecksum: row.guest_checksum,
    confirmationExpiresAt: getPendingConfirmation(row)?.expiresAt,
    now,
  });
}

async function voidMatchForConfirmationTimeout(matchId, row) {
  const existing = parseSummaryJson(row) || {};
  const payload = {
    ...existing,
    voided: true,
    voidReason: 'confirmation_timeout',
    pendingConfirmation: undefined,
  };
  logPvpAnomaly('result_confirmation_timeout', {
    matchId,
    hostUserId: row.host_user_id,
    guestUserId: row.guest_user_id,
  });
  await query(
    `UPDATE pvp_matches
     SET status = 'cancelled',
         end_reason = 'void_confirmation_timeout',
         winner_seat = NULL,
         winner_user_id = NULL,
         result_summary_json = ?,
         ended_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [JSON.stringify(payload), matchId]
  );
  return loadMatch(matchId);
}

async function expirePendingConfirmation(matchId, row) {
  if (!getPendingConfirmation(row) || getConfirmation(row).state !== 'expired') return null;
  return voidMatchForConfirmationTimeout(matchId, row);
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
      [matchId]
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
    anomalyFlags: [...new Set([...(existing.anomalyFlags || []), 'checksum_host_guest_mismatch'])],
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
    [JSON.stringify(payload), matchId]
  );
  return loadMatch(matchId);
}

/**
 * Applique / compare le checksum guest (guest challenge).
 * @returns {{ voided: boolean, match: object, compared: object }}
 */
async function applyGuestChecksum(matchId, row, checksum) {
  if (!checksum) throw httpError(400, 'checksum Guest requis pour confirmer le résultat.');
  await query('UPDATE pvp_matches SET guest_checksum = ? WHERE id = ?', [checksum, matchId]);
  const updated = await loadMatch(matchId);
  const confirmation = getConfirmation(updated);
  if (confirmation.state === 'checksum_mismatch') {
    const voided = await voidMatchForChecksumMismatch(matchId, updated, {
      hostChecksum: updated.host_checksum,
      guestChecksum: checksum,
    });
    return { voided: true, match: voided, compared: confirmation.compared };
  }
  if (confirmation.state === 'expired') {
    const voided = await voidMatchForConfirmationTimeout(matchId, updated);
    return { voided: true, match: voided, compared: confirmation.compared, expired: true };
  }
  if (confirmation.state === 'confirmed' && getPendingConfirmation(updated)) {
    const completed = await finalizeConfirmedResult(matchId, updated);
    return { voided: false, match: completed, compared: confirmation.compared, completed: true };
  }
  return { voided: false, match: updated, compared: confirmation.compared };
}

async function finalizeConfirmedResult(matchId, row, resultPayload = null) {
  const pending = getPendingConfirmation(row);
  const winnerSeat = pending?.winnerSeat;
  if (!pending || !winnerSeat) {
    throw httpError(409, 'Aucun résultat PvP en attente de confirmation.');
  }
  const winnerUserId = winnerSeat === 'host' ? row.host_user_id : row.guest_user_id;
  const payload = resultPayload || parseSummaryJson(row) || {};
  const finalPayload = { ...payload };
  delete finalPayload.pendingConfirmation;
  finalPayload.confirmation = {
    hostChecksum: row.host_checksum,
    guestChecksum: row.guest_checksum,
    confirmedAt: new Date().toISOString(),
  };
  const result = await query(
    `UPDATE pvp_matches
     SET status = 'completed',
         winner_seat = ?,
         winner_user_id = ?,
         end_reason = ?,
         result_summary_json = ?,
         ended_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'in_progress'`,
    [winnerSeat, winnerUserId, pending.endReason, JSON.stringify(finalPayload), matchId]
  );
  const completed = await loadMatch(matchId);
  if (result.affectedRows === 1) {
    try {
      const { onAchievementAction } = await import('../achievementService.js');
      await onAchievementAction(completed.host_user_id, 'pvp_match', 1);
      await onAchievementAction(completed.guest_user_id, 'pvp_match', 1);
      await onAchievementAction(winnerUserId, 'pvp_win', 1);
    } catch {
      /* exploits optionnels */
    }
  }
  return completed;
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

  const expired = await expirePendingConfirmation(matchId, row);
  if (expired) {
    return {
      match: serializeMatch(expired),
      role,
      voided: true,
      expired: true,
      antiCheatMode: ANTI_CHEAT_MODE,
    };
  }

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
  const winnerSeat =
    body.winnerSeat === 'host' || body.winnerSeat === 'guest' ? body.winnerSeat : null;
  const endReason = body.endReason ? String(body.endReason).slice(0, 40) : 'report';

  // Guest : checksum de confirmation uniquement. Il ne choisit jamais le résultat.
  if (role === 'guest' && body.confirmOnly) {
    const applied = await applyGuestChecksum(matchId, row, checksum);
    return {
      match: serializeMatch(applied.match),
      role,
      confirmed: applied.completed === true,
      awaitingHostReport: applied.match.status === 'in_progress' && !applied.match.host_checksum,
      voided: applied.voided,
      expired: applied.expired === true,
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
      ]
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

  // Guest : seulement la confirmation checksum, jamais un résultat déclaré.
  if (role !== 'host' && row.anti_cheat_mode === 'trust_host') {
    if (winnerSeat) throw httpError(403, 'Seul le Host peut déclarer le résultat normal.');
    const applied = await applyGuestChecksum(matchId, row, checksum);
    return {
      match: serializeMatch(applied.match),
      role,
      message: applied.voided
        ? 'Checksum Guest différent — match annulé.'
        : applied.completed
          ? 'Résultat confirmé par les deux joueurs.'
          : 'Checksum Guest enregistré — en attente du report Host.',
      confirmed: applied.completed === true,
      voided: applied.voided,
      expired: applied.expired === true,
      guestChallenge: applied.compared,
      antiCheatMode: ANTI_CHEAT_MODE,
    };
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

  // Le Host propose le résultat validé, puis le Guest doit confirmer le même checksum.
  const confirmation = evaluateResultConfirmation({
    hostChecksum: checksum,
    guestChecksum: row.guest_checksum,
  });
  if (confirmation.state === 'checksum_mismatch') {
    await query('UPDATE pvp_matches SET host_checksum = ? WHERE id = ?', [checksum, matchId]);
    const persisted = await loadMatch(matchId);
    const voided = await voidMatchForChecksumMismatch(matchId, persisted, {
      hostChecksum: checksum,
      guestChecksum: row.guest_checksum,
    });
    return {
      match: serializeMatch(voided),
      role,
      voided: true,
      validation: { mode: ANTI_CHEAT_MODE, checksumOk: false, flags: confirmation.compared.flags },
      guestChallenge: confirmation.compared,
      antiCheatMode: ANTI_CHEAT_MODE,
    };
  }

  const normalized = validation.normalized;
  const checksumOk =
    normalized && checksum
      ? fingerprint(normalized) === String(checksum).slice(0, 16) ||
        fingerprint(summary) === String(checksum).slice(0, 16) ||
        fingerprint(summary) === String(checksum)
      : null;
  const expiresAt = new Date(Date.now() + RESULT_CONFIRMATION_TIMEOUT_MS).toISOString();
  const resultPayload = {
    ...(normalized || summary || {}),
    validation: {
      mode: ANTI_CHEAT_MODE,
      checksumOk,
      flags: validation.flags,
      guestChecksumMatch: confirmation.compared.match,
    },
    pendingConfirmation: {
      winnerSeat: effectiveWinnerSeat,
      endReason,
      requestedAt: new Date().toISOString(),
      expiresAt,
    },
  };

  await query(
    `UPDATE pvp_matches
     SET host_checksum = ?, result_summary_json = ?
     WHERE id = ? AND status = 'in_progress'`,
    [checksum, JSON.stringify(resultPayload), matchId]
  );
  const pending = await loadMatch(matchId);
  if (getConfirmation(pending).state === 'confirmed') {
    const completed = await finalizeConfirmedResult(matchId, pending, resultPayload);
    return {
      match: serializeMatch(completed),
      role,
      confirmed: true,
      validation: {
        mode: ANTI_CHEAT_MODE,
        checksumOk,
        flags: validation.flags,
        guestChecksumMatch: true,
      },
      antiCheatMode: ANTI_CHEAT_MODE,
    };
  }
  return {
    match: serializeMatch(pending),
    role,
    awaitingGuestConfirmation: true,
    confirmationExpiresAt: expiresAt,
    validation: {
      mode: ANTI_CHEAT_MODE,
      checksumOk,
      flags: validation.flags,
      guestChecksumMatch: null,
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
    [matchId]
  );
  const updated = await loadMatch(matchId);
  return { match: serializeMatch(updated), role };
}

export { normalizeResultSummary };

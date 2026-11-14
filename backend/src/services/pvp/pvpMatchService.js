/**
 * Cycle de vie match PvP : ready, start, report fin de match.
 * Validation sommaire (checksums) — pas de resimulation carte-par-carte.
 */
import { query } from '../../config/database.js';
import { duelChecksum } from '../../../../shared/pvp/checksum.js';
import { ANTI_CHEAT_MODE } from './config.js';
import { roleForUser, serializeMatch } from './matchmakingService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function loadMatch(matchId) {
  const rows = await query('SELECT * FROM pvp_matches WHERE id = ? LIMIT 1', [matchId]);
  if (!rows[0]) throw httpError(404, 'Match PvP introuvable.');
  return rows[0];
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
 * Report de fin de match (Host obligatoire pour le résultat ; Guest peut confirmer checksum).
 *
 * Mode trust_host (MVP) :
 * - Le Host envoie winnerSeat + checksum + summary
 * - Le serveur vérifie que le reporter est participant et que le match est actif
 * - Checksum Guest optionnel stocké pour audit futur
 * - PAS de recalcul moteur PvE
 */
export async function reportMatchResult(matchId, userId, body = {}) {
  const row = await loadMatch(matchId);
  const role = roleForUser(row, userId);
  if (!role) throw httpError(403, 'Pas participant.');

  if (['completed', 'forfeited', 'cancelled'].includes(row.status)) {
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
    await query('UPDATE pvp_matches SET guest_checksum = ? WHERE id = ?', [checksum, matchId]);
    const updated = await loadMatch(matchId);
    return { match: serializeMatch(updated), role, confirmed: true };
  }

  // Forfeit déclaré par n'importe quel participant
  if (endReason === 'forfeit' || body.forfeit) {
    const forfeitSeat = role;
    const winSeat = forfeitSeat === 'host' ? 'guest' : 'host';
    const winnerUserId =
      winSeat === 'host' ? row.host_user_id : row.guest_user_id;
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
    const updated = await loadMatch(matchId);
    return { match: serializeMatch(updated), role, antiCheatMode: ANTI_CHEAT_MODE };
  }

  // Clôture normale : Host (trust-host) ou Guest si Host a déjà checksum
  if (role !== 'host' && row.anti_cheat_mode === 'trust_host') {
    // Guest peut seulement confirmer ; sans host report on refuse la clôture
    if (!winnerSeat) {
      await query('UPDATE pvp_matches SET guest_checksum = ? WHERE id = ?', [checksum, matchId]);
      const updated = await loadMatch(matchId);
      return {
        match: serializeMatch(updated),
        role,
        message: 'Checksum guest enregistré — en attente du report Host.',
      };
    }
  }

  if (role === 'host' && !winnerSeat) {
    throw httpError(400, 'winnerSeat requis (host|guest).');
  }

  const effectiveWinnerSeat = winnerSeat || row.winner_seat;
  if (!effectiveWinnerSeat) throw httpError(400, 'winnerSeat manquant.');

  const winnerUserId =
    effectiveWinnerSeat === 'host' ? row.host_user_id : row.guest_user_id;

  // Validation sommaire : si summary fourni, recalculer fingerprint localement
  const validation = { mode: ANTI_CHEAT_MODE, checksumOk: null };
  if (summary && checksum) {
    const recomputed = duelChecksum({
      matchId,
      turn: summary.turn,
      activeSeat: summary.activeSeat,
      phase: summary.phase,
      status: summary.status,
      winnerSeat: summary.winnerSeat || effectiveWinnerSeat,
      fighters: {
        host: summary.host,
        guest: summary.guest,
      },
    });
    // summary host/guest are already summarized shapes — fingerprint of body.summary
    const { fingerprint } = await import('../../../../shared/pvp/checksum.js');
    const local = fingerprint(summary);
    validation.checksumOk = local === checksum || recomputed.checksum === checksum;
  }

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
      summary ? JSON.stringify({ ...summary, validation }) : null,
      matchId,
    ],
  );

  const updated = await loadMatch(matchId);
  return {
    match: serializeMatch(updated),
    role,
    validation,
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

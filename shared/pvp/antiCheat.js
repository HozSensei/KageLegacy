/**
 * Validations anti-triche PvP (pures, sans DB).
 * Trust-host MVP : rejette l’impossible, compare checksums Host/Guest,
 * ne resimule pas carte-par-carte.
 */

import { BASE_CHAKRA, BASE_MAX_HP, MAX_HAND_SIZE } from './duelEngine.js';
import { fingerprint, normalizeResultSummary } from './checksum.js';

/** Bornes pragmatiques pour un duel Host-simulé. */
export const PVP_AC_LIMITS = {
  minDeckCards: 4,
  maxDeckCards: 80,
  minLevel: 1,
  maxLevel: 100,
  minMaxHp: BASE_MAX_HP,
  maxMaxHp: BASE_MAX_HP + 400,
  maxHpAbs: 600,
  maxBlock: 200,
  maxChakra: BASE_CHAKRA + 10,
  maxHandCount: MAX_HAND_SIZE,
  maxPileCount: 80,
  minTurns: 1,
  maxTurns: 200,
  /** Durée minimale hors forfeit (ms) — rejette les wins instantanés. */
  minDurationMs: 3_000,
  /** Durée maximale d’un match (ms). */
  maxDurationMs: 2 * 60 * 60 * 1000,
  /** Stats numériques absurdes. */
  maxStatValue: 500,
};

/**
 * Valide un snapshot bootstrap (fighters + decks) avant duel.
 * @param {object} bootstrap
 * @param {{ hostUserId?: number, guestUserId?: number, hostLevel?: number, guestLevel?: number }} [expected]
 * @returns {{ ok: boolean, errors: string[], flags: string[] }}
 */
export function validateBootstrap(bootstrap, expected = {}) {
  const errors = [];
  const flags = [];

  if (!bootstrap?.fighters?.host || !bootstrap?.fighters?.guest) {
    return {
      ok: false,
      errors: ['bootstrap.fighters host/guest requis'],
      flags: ['bootstrap_missing_fighters'],
    };
  }

  for (const seat of ['host', 'guest']) {
    const f = bootstrap.fighters[seat];
    const label = seat;
    const expectedUserId = seat === 'host' ? expected.hostUserId : expected.guestUserId;
    const expectedLevel = seat === 'host' ? expected.hostLevel : expected.guestLevel;

    if (expectedUserId != null && Number(f.userId) !== Number(expectedUserId)) {
      errors.push(`${label}.userId ≠ attendu`);
      flags.push('bootstrap_userid_mismatch');
    }
    if (expectedLevel != null && Number(f.level) !== Number(expectedLevel)) {
      errors.push(`${label}.level ≠ niveau personnage`);
      flags.push('bootstrap_level_mismatch');
    }

    const level = Number(f.level);
    if (
      !Number.isFinite(level) ||
      level < PVP_AC_LIMITS.minLevel ||
      level > PVP_AC_LIMITS.maxLevel
    ) {
      errors.push(`${label}.level hors plage`);
      flags.push('bootstrap_level_bounds');
    }

    const maxHp = Number(f.maxHp);
    const hp = Number(f.hp);
    if (
      !Number.isFinite(maxHp) ||
      maxHp < PVP_AC_LIMITS.minMaxHp ||
      maxHp > PVP_AC_LIMITS.maxMaxHp
    ) {
      errors.push(`${label}.maxHp hors plage`);
      flags.push('bootstrap_maxhp_bounds');
    }
    if (!Number.isFinite(hp) || hp !== maxHp) {
      errors.push(`${label}.hp doit égaler maxHp au bootstrap`);
      flags.push('bootstrap_hp_init');
    }

    const chakra = Number(f.chakra);
    if (!Number.isFinite(chakra) || chakra < 0 || chakra > PVP_AC_LIMITS.maxChakra) {
      errors.push(`${label}.chakra hors plage`);
      flags.push('bootstrap_chakra');
    }

    const pile = f.drawPile || f.cards || [];
    if (!Array.isArray(pile) || pile.length < PVP_AC_LIMITS.minDeckCards) {
      errors.push(`${label}.drawPile trop court`);
      flags.push('bootstrap_deck_short');
    }
    if (Array.isArray(pile) && pile.length > PVP_AC_LIMITS.maxDeckCards) {
      errors.push(`${label}.drawPile trop long`);
      flags.push('bootstrap_deck_long');
    }

    if (Array.isArray(pile)) {
      for (let i = 0; i < pile.length; i += 1) {
        const card = pile[i];
        if (!card || (card.slug == null && card.id == null)) {
          errors.push(`${label}.carte[${i}] sans id/slug`);
          flags.push('bootstrap_card_invalid');
          break;
        }
        const cost = Number(card.cost);
        if (!Number.isFinite(cost) || cost < 0 || cost > 10) {
          errors.push(`${label}.carte[${i}] cost invalide`);
          flags.push('bootstrap_card_cost');
          break;
        }
      }
    }

    const stats = f.stats || {};
    for (const [key, value] of Object.entries(stats)) {
      const n = Number(value);
      if (!Number.isFinite(n) || Math.abs(n) > PVP_AC_LIMITS.maxStatValue) {
        errors.push(`${label}.stats.${key} absurde`);
        flags.push('bootstrap_stats');
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors, flags: [...new Set(flags)] };
}

/**
 * Valide un report de fin de match (résumé + métadonnées).
 * @param {object} opts
 * @returns {{ ok: boolean, errors: string[], flags: string[], normalized: object|null }}
 */
export function validateMatchResultReport({
  matchRow,
  role,
  winnerSeat,
  checksum,
  summary,
  endReason = 'report',
  now = Date.now(),
} = {}) {
  const errors = [];
  const flags = [];
  const isForfeit = endReason === 'forfeit';

  if (!matchRow) {
    return { ok: false, errors: ['match manquant'], flags: ['no_match'], normalized: null };
  }

  if (winnerSeat && winnerSeat !== 'host' && winnerSeat !== 'guest') {
    errors.push('winnerSeat invalide');
    flags.push('winner_seat_invalid');
  }

  const hostId = Number(matchRow.host_user_id);
  const guestId = Number(matchRow.guest_user_id);
  if (winnerSeat === 'host' || winnerSeat === 'guest') {
    const winnerUserId = winnerSeat === 'host' ? hostId : guestId;
    if (!Number.isFinite(winnerUserId)) {
      errors.push('winner non participant');
      flags.push('winner_not_participant');
    }
  }

  const startedAt = matchRow.started_at ? new Date(matchRow.started_at).getTime() : null;
  if (startedAt && Number.isFinite(startedAt) && !isForfeit) {
    const durationMs = now - startedAt;
    if (durationMs < PVP_AC_LIMITS.minDurationMs) {
      errors.push(`durée trop courte (${durationMs}ms)`);
      flags.push('duration_too_short');
    }
    if (durationMs > PVP_AC_LIMITS.maxDurationMs) {
      errors.push(`durée trop longue (${durationMs}ms)`);
      flags.push('duration_too_long');
    }
  }

  // Match jamais démarré : report normal suspect (forfeit OK)
  if (!startedAt && !isForfeit && matchRow.status === 'pending') {
    flags.push('report_before_start');
    errors.push('report avant démarrage');
  }

  let normalized = null;
  if (summary && typeof summary === 'object') {
    normalized = normalizeResultSummary(summary, {
      matchId: matchRow.id,
      winnerSeat: winnerSeat || summary.winnerSeat || null,
    });

    const turn = Number(normalized.turn);
    if (!Number.isFinite(turn) || turn < PVP_AC_LIMITS.minTurns || turn > PVP_AC_LIMITS.maxTurns) {
      errors.push(`tours hors plage (${turn})`);
      flags.push('turn_bounds');
    }

    if (normalized.winnerSeat && winnerSeat && normalized.winnerSeat !== winnerSeat) {
      errors.push('summary.winnerSeat ≠ winnerSeat reporté');
      flags.push('winner_summary_mismatch');
    }

    for (const seat of ['host', 'guest']) {
      const f = normalized[seat];
      if (!f) {
        errors.push(`summary.${seat} manquant`);
        flags.push('summary_fighter_missing');
        continue;
      }
      validateFighterSummary(f, seat, errors, flags);
      if (f.userId != null) {
        const expected = seat === 'host' ? hostId : guestId;
        if (Number(f.userId) !== expected) {
          errors.push(`summary.${seat}.userId ≠ participant`);
          flags.push('summary_userid_mismatch');
        }
      }
    }

    // Victoire HP : le perdant doit être à 0 HP (hors forfeit)
    if (!isForfeit && winnerSeat && normalized.host && normalized.guest) {
      const loser = winnerSeat === 'host' ? normalized.guest : normalized.host;
      const winner = winnerSeat === 'host' ? normalized.host : normalized.guest;
      if (Number(loser.hp) > 0) {
        errors.push('perdant HP > 0 sans forfeit');
        flags.push('loser_hp_positive');
      }
      if (Number(winner.hp) < 0) {
        errors.push('gagnant HP négatif');
        flags.push('winner_hp_negative');
      }
    }

    if (checksum) {
      const local = fingerprint(normalized);
      if (local !== String(checksum).slice(0, 16)) {
        // Aussi accepter empreinte de summary brut (rétrocompat clients)
        const rawFp = fingerprint(summary);
        if (rawFp !== String(checksum).slice(0, 16) && rawFp !== String(checksum)) {
          flags.push('checksum_recompute_mismatch');
          // Soft flag : ne bloque pas seul si le reste est cohérent — hard si host
          if (role === 'host') {
            errors.push('checksum ≠ empreinte du summary');
          }
        }
      }
    }
  } else if (role === 'host' && !isForfeit) {
    errors.push('summary requis pour clôture Host');
    flags.push('summary_required');
  }

  if (role === 'host' && !isForfeit && !checksum) {
    errors.push('checksum Host requis');
    flags.push('checksum_required');
  }

  return {
    ok: errors.length === 0,
    errors,
    flags: [...new Set(flags)],
    normalized,
  };
}

function validateFighterSummary(f, seat, errors, flags) {
  const hp = Number(f.hp);
  const maxHp = Number(f.maxHp);
  if (!Number.isFinite(hp) || hp < 0 || hp > PVP_AC_LIMITS.maxHpAbs) {
    errors.push(`${seat}.hp absurde (${f.hp})`);
    flags.push('hp_absurd');
  }
  if (!Number.isFinite(maxHp) || maxHp < 1 || maxHp > PVP_AC_LIMITS.maxHpAbs) {
    errors.push(`${seat}.maxHp absurde`);
    flags.push('maxhp_absurd');
  }
  if (Number.isFinite(hp) && Number.isFinite(maxHp) && hp > maxHp) {
    errors.push(`${seat}.hp > maxHp`);
    flags.push('hp_above_max');
  }
  const block = Number(f.block || 0);
  if (!Number.isFinite(block) || block < 0 || block > PVP_AC_LIMITS.maxBlock) {
    errors.push(`${seat}.block absurde`);
    flags.push('block_absurd');
  }
  const chakra = Number(f.chakra);
  if (
    f.chakra != null &&
    (!Number.isFinite(chakra) || chakra < 0 || chakra > PVP_AC_LIMITS.maxChakra)
  ) {
    errors.push(`${seat}.chakra absurde`);
    flags.push('chakra_absurd');
  }
  for (const key of ['handCount', 'drawCount', 'discardCount']) {
    if (f[key] == null) continue;
    const n = Number(f[key]);
    const max = key === 'handCount' ? PVP_AC_LIMITS.maxHandCount : PVP_AC_LIMITS.maxPileCount;
    if (!Number.isFinite(n) || n < 0 || n > max) {
      errors.push(`${seat}.${key} absurde`);
      flags.push('pile_count_absurd');
    }
  }
}

/**
 * Compare checksums Host vs Guest.
 * @returns {{ match: boolean|null, voidMatch: boolean, flags: string[] }}
 */
export function compareHostGuestChecksums(hostChecksum, guestChecksum) {
  if (!hostChecksum || !guestChecksum) {
    return { match: null, voidMatch: false, flags: [] };
  }
  const a = String(hostChecksum).trim().toLowerCase();
  const b = String(guestChecksum).trim().toLowerCase();
  if (a === b) {
    return { match: true, voidMatch: false, flags: [] };
  }
  return {
    match: false,
    voidMatch: true,
    flags: ['checksum_host_guest_mismatch'],
  };
}

/**
 * État pur de la confirmation bilatérale d'un résultat normal.
 * Le checksum du Host porte le résultat validé par le serveur ; celui du Guest
 * ne peut que confirmer ce même état, jamais le remplacer.
 */
export function evaluateResultConfirmation({
  hostChecksum,
  guestChecksum,
  confirmationExpiresAt = null,
  now = Date.now(),
} = {}) {
  const compared = compareHostGuestChecksums(hostChecksum, guestChecksum);
  if (compared.voidMatch) return { state: 'checksum_mismatch', compared };
  if (!hostChecksum) return { state: 'awaiting_host_report', compared };
  if (compared.match) return { state: 'confirmed', compared };
  if (confirmationExpiresAt && new Date(confirmationExpiresAt).getTime() <= now) {
    return { state: 'expired', compared };
  }
  return { state: 'awaiting_guest_confirmation', compared };
}

/**
 * Empreinte indépendante depuis une vue publique (Guest challenge).
 * Utilise les champs visibles (hp, counts…) — pas les mains secrètes.
 * @param {object} publicState
 * @returns {{ checksum: string, summary: object }|null}
 */
export function independentChecksumFromPublic(publicState) {
  if (!publicState) return null;
  if (publicState.summary && typeof publicState.summary === 'object') {
    const summary = normalizeResultSummary(publicState.summary, {
      matchId: publicState.matchId,
      winnerSeat: publicState.winnerSeat,
    });
    return { checksum: fingerprint(summary), summary };
  }
  const fighters = publicState.fighters || {};
  const summarize = (f, seat) => {
    if (!f) return null;
    return {
      seat: f.seat || seat,
      userId: f.userId,
      hp: f.hp,
      maxHp: f.maxHp,
      block: f.block || 0,
      chakra: f.chakra,
      handCount: f.handCount != null ? f.handCount : (f.hand || []).length,
      drawCount: f.drawCount != null ? f.drawCount : (f.drawPile || []).length,
      discardCount: f.discardCount != null ? f.discardCount : (f.discardPile || []).length,
    };
  };
  const summary = normalizeResultSummary(
    {
      matchId: publicState.matchId || null,
      turn: publicState.turn || 0,
      activeSeat: publicState.activeSeat || null,
      phase: publicState.phase || null,
      status: publicState.status || null,
      winnerSeat: publicState.winnerSeat || null,
      host: summarize(fighters.host, 'host'),
      guest: summarize(fighters.guest, 'guest'),
    },
    {}
  );
  return { checksum: fingerprint(summary), summary };
}

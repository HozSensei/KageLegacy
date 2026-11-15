/**
 * Checksums / résumés de fin de match (anti-triche MVP).
 * Empreinte FNV-1a 64-bit (hex 16) sur JSON canonique — comparaison Host/Guest.
 */

/**
 * Résumé compact d'un état de duel (sans mains secrètes).
 * @param {object} state
 * @returns {object}
 */
export function duelSummary(state) {
  if (!state) return { empty: true };
  const fighters = state.fighters || {};
  const summarizeFighter = (f) => {
    if (!f) return null;
    return {
      seat: f.seat,
      userId: f.userId,
      hp: f.hp,
      maxHp: f.maxHp,
      block: f.block || 0,
      chakra: f.chakra,
      handCount: (f.hand || []).length,
      drawCount: (f.drawPile || []).length,
      discardCount: (f.discardPile || []).length,
    };
  };

  return normalizeResultSummary({
    matchId: state.matchId || null,
    seed: state.seed || null,
    turn: state.turn || 0,
    activeSeat: state.activeSeat || null,
    phase: state.phase || null,
    status: state.status || null,
    winnerSeat: state.winnerSeat || null,
    host: summarizeFighter(fighters.host),
    guest: summarizeFighter(fighters.guest),
  });
}

/**
 * Normalise un summary de report (Host ou Guest) vers une forme stable.
 * Accepte soit la forme duelSummary, soit { host, guest, turn, … } aplatie.
 * @param {object} raw
 * @param {{ matchId?: string, winnerSeat?: string|null }} [overrides]
 * @returns {object}
 */
export function normalizeResultSummary(raw = {}, overrides = {}) {
  const host = coerceFighterSummary(raw.host || raw.fighters?.host, 'host');
  const guest = coerceFighterSummary(raw.guest || raw.fighters?.guest, 'guest');
  return {
    matchId: overrides.matchId ?? raw.matchId ?? null,
    seed: raw.seed ?? null,
    turn: Number(raw.turn) || 0,
    activeSeat: raw.activeSeat || null,
    phase: raw.phase || null,
    status: raw.status || null,
    winnerSeat: overrides.winnerSeat !== undefined ? overrides.winnerSeat : raw.winnerSeat || null,
    host,
    guest,
  };
}

function coerceFighterSummary(f, seat) {
  if (!f) return null;
  return {
    seat: f.seat || seat,
    userId: f.userId != null ? Number(f.userId) : null,
    hp: Number(f.hp),
    maxHp: Number(f.maxHp),
    block: Number(f.block) || 0,
    chakra: f.chakra != null ? Number(f.chakra) : null,
    handCount: Number(f.handCount != null ? f.handCount : (f.hand || []).length) || 0,
    drawCount: Number(f.drawCount != null ? f.drawCount : (f.drawPile || []).length) || 0,
    discardCount:
      Number(f.discardCount != null ? f.discardCount : (f.discardPile || []).length) || 0,
  };
}

/**
 * Empreinte FNV-1a 64-bit (deux passes 32-bit) → hex 16 chars.
 * @param {unknown} value
 * @returns {string}
 */
export function fingerprint(value) {
  const json = canonicalize(value);
  const h1 = fnv1a32(json, 0x811c9dc5);
  const h2 = fnv1a32(json, 0x811c9dc5 ^ 0xa5a5a5a5);
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

function fnv1a32(str, seed) {
  let hash = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Checksum d'état de duel pour report fin de match.
 * @param {object} state
 * @returns {{ checksum: string, summary: object }}
 */
export function duelChecksum(state) {
  const summary = duelSummary(state);
  return {
    checksum: fingerprint(summary),
    summary,
  };
}

function canonicalize(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys(value[key]);
    }
    return out;
  }
  return value;
}

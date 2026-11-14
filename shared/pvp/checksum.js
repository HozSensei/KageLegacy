/**
 * Checksums / résumés de fin de match (anti-triche MVP).
 * Pas de crypto lourde : empreinte stable pour comparaison Host/Guest.
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

  return {
    matchId: state.matchId || null,
    turn: state.turn || 0,
    activeSeat: state.activeSeat || null,
    phase: state.phase || null,
    status: state.status || null,
    winnerSeat: state.winnerSeat || null,
    host: summarizeFighter(fighters.host),
    guest: summarizeFighter(fighters.guest),
  };
}

/**
 * Empreinte simple (FNV-1a 32-bit) d'un objet JSON canonique.
 * @param {unknown} value
 * @returns {string} hex 8 chars
 */
export function fingerprint(value) {
  const json = canonicalize(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
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

/**
 * Matchmaking pur : jumelage par fenêtre de niveau (±N).
 * Aucune I/O — testable unitairement.
 */

import { DEFAULT_LEVEL_WINDOW, normalizeLevelWindow } from './config.js';

/**
 * @param {number} seekerLevel
 * @param {number} candidateLevel
 * @param {number} [window]
 * @returns {boolean}
 */
export function isLevelInWindow(seekerLevel, candidateLevel, window = DEFAULT_LEVEL_WINDOW) {
  const a = Number(seekerLevel);
  const b = Number(candidateLevel);
  const w = normalizeLevelWindow(window);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= w;
}

/**
 * Distance de niveau (plus petit = meilleur match).
 * @param {number} seekerLevel
 * @param {number} candidateLevel
 * @returns {number}
 */
export function levelDistance(seekerLevel, candidateLevel) {
  return Math.abs(Number(seekerLevel) - Number(candidateLevel));
}

/**
 * Choisit le meilleur adversaire dans la file.
 * Critères : dans la fenêtre, puis plus proche en niveau, puis plus ancien en file.
 *
 * @param {{ userId: number|string, level: number, enqueuedAt?: number|string|Date }} seeker
 * @param {Array<{ userId: number|string, level: number, enqueuedAt?: number|string|Date }>} queue
 * @param {{ levelWindow?: number }} [opts]
 * @returns {object|null}
 */
export function findBestMatch(seeker, queue, opts = {}) {
  if (!seeker || !Array.isArray(queue) || queue.length === 0) return null;

  const window = normalizeLevelWindow(opts.levelWindow);
  const seekerId = String(seeker.userId);

  const eligible = queue.filter((entry) => {
    if (!entry) return false;
    if (String(entry.userId) === seekerId) return false;
    return isLevelInWindow(seeker.level, entry.level, window);
  });

  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const dA = levelDistance(seeker.level, a.level);
    const dB = levelDistance(seeker.level, b.level);
    if (dA !== dB) return dA - dB;

    const tA = toMs(a.enqueuedAt);
    const tB = toMs(b.enqueuedAt);
    if (tA !== tB) return tA - tB;

    return String(a.userId).localeCompare(String(b.userId));
  });

  return eligible[0];
}

/**
 * Désigne le Host de façon déterministe (plus petit userId).
 * Documenté : le Host porte la simu ; le Guest envoie des intentions.
 *
 * @param {number|string} userIdA
 * @param {number|string} userIdB
 * @returns {{ hostUserId: string, guestUserId: string }}
 */
export function designateHost(userIdA, userIdB) {
  const a = String(userIdA);
  const b = String(userIdB);
  if (a === b) {
    throw new Error('Impossible de désigner un Host : même joueur.');
  }
  // Comparaison numérique si possible, sinon lexicographique
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    return na < nb
      ? { hostUserId: a, guestUserId: b }
      : { hostUserId: b, guestUserId: a };
  }
  return a < b
    ? { hostUserId: a, guestUserId: b }
    : { hostUserId: b, guestUserId: a };
}

function toMs(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

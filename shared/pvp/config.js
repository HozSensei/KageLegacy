/**
 * Configuration PvP (Host architecture).
 * Fenêtre de niveau configurable pour le matchmaking.
 */

/** ± niveaux acceptés pour jumeler deux joueurs (défaut MVP). */
export const DEFAULT_LEVEL_WINDOW = 3;

/** Alternates documentés : 3 ou 5. */
export const ALLOWED_LEVEL_WINDOWS = [3, 5];

/** Mode anti-triche MVP : confiance au Host + checksum fin de match. */
export const ANTI_CHEAT_MODE = 'trust_host';

export const PVP_MATCH_STATES = [
  'pending',
  'ready',
  'in_progress',
  'completed',
  'cancelled',
  'forfeited',
];

export const PVP_QUEUE_STATES = ['waiting', 'matched', 'cancelled'];

export const PVP_ROLES = ['host', 'guest'];

export function normalizeLevelWindow(value, fallback = DEFAULT_LEVEL_WINDOW) {
  const n = Number(value);
  if (ALLOWED_LEVEL_WINDOWS.includes(n)) return n;
  if (Number.isFinite(n) && n >= 0 && n <= 20) return Math.floor(n);
  return fallback;
}

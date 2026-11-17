/**
 * Rate-limit in-memory pour file PvP / report (anti-spam).
 * Pas de Redis : suffisant pour un playtest mono-process.
 */

const buckets = new Map();

const DEFAULTS = {
  queue: { limit: 8, windowMs: 60_000 },
  invite: { limit: 5, windowMs: 60_000 },
  inviteAccept: { limit: 8, windowMs: 60_000 },
  report: { limit: 12, windowMs: 60_000 },
};

/**
 * @param {string} action — 'queue' | 'invite' | 'inviteAccept' | 'report'
 * @param {number|string} userId
 * @param {{ limit?: number, windowMs?: number }} [opts]
 * @returns {{ allowed: boolean, retryAfterMs: number, remaining: number }}
 */
export function checkPvpRateLimit(action, userId, opts = {}) {
  const conf = {
    ...(DEFAULTS[action] || { limit: 10, windowMs: 60_000 }),
    ...opts,
  };
  const key = `${action}:${userId}`;
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.windowStart >= conf.windowMs) {
    entry = { windowStart: now, count: 0 };
    buckets.set(key, entry);
  }
  entry.count += 1;
  const allowed = entry.count <= conf.limit;
  const retryAfterMs = allowed ? 0 : conf.windowMs - (now - entry.windowStart);
  return {
    allowed,
    retryAfterMs: Math.max(0, retryAfterMs),
    remaining: Math.max(0, conf.limit - entry.count),
  };
}

/** Test helper — reset buckets. */
export function resetPvpRateLimits() {
  buckets.clear();
}

export { DEFAULTS as PVP_RATE_LIMITS };

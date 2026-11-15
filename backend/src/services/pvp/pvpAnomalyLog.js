/**
 * Logs structurés d’anomalies PvP (anti-triche).
 * Sortie stdout JSON-ligne — greppable `[pvp-anomaly]`.
 */

/**
 * @param {string} kind
 * @param {object} detail
 */
export function logPvpAnomaly(kind, detail = {}) {
  const payload = {
    ts: new Date().toISOString(),
    kind: String(kind),
    ...detail,
  };
  // eslint-disable-next-line no-console
  console.warn(`[pvp-anomaly] ${JSON.stringify(payload)}`);
  return payload;
}

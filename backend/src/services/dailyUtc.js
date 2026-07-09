/** Utilitaires calendrier UTC — minuit UTC pour la rétention quotidienne. */

export function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function nextUtcMidnightDate(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

export function nextUtcMidnightIso(date = new Date()) {
  return nextUtcMidnightDate(date).toISOString();
}

export function msUntilNextUtcMidnight(date = new Date()) {
  return Math.max(0, nextUtcMidnightDate(date).getTime() - date.getTime());
}

import { randomInt } from 'node:crypto';

/** Tire un bonus entier % inclusif entre min et max (ex. 0.01–0.20 → 1–20). */
export function rollTechniqueBonusPct(minPct, maxPct) {
  const min = Number(minPct);
  const max = Number(maxPct);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0.15;
  const lo = Math.round(Math.min(min, max) * 100);
  const hi = Math.round(Math.max(min, max) * 100);
  if (hi <= lo) return lo / 100;
  return (randomInt(hi - lo + 1) + lo) / 100;
}

export function formatBonusRange(minPct, maxPct, locale = 'fr') {
  const lo = Math.round(Number(minPct) * 100);
  const hi = Math.round(Number(maxPct) * 100);
  if (lo === hi) return locale === 'en' ? `+${lo}%` : `+${lo} %`;
  return locale === 'en' ? `+${lo}–${hi}%` : `+${lo}–${hi} %`;
}

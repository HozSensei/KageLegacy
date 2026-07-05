/** Plafonds des effets match utilitaires */
export const MATCH_CAPS = {
  pvRestore: 22,
  chakraRestore: 18,
};

export const CONSUMABLE_USES_PER_MATCH = 1;

export function describeUsageLimits(effects, category) {
  const parsed = typeof effects === 'string' ? JSON.parse(effects) : effects;
  const parts = [];

  if (category === 'bureau') {
    parts.push({ label: 'bureau', uses: 1 });
    return parts;
  }

  if (category === 'match' && parsed.match) {
    parts.push({
      label: 'match',
      uses: parsed.match.usesPerMatch ?? CONSUMABLE_USES_PER_MATCH,
    });
    return parts;
  }

  if (category === 'cycle') {
    parts.push({ label: 'cycle', uses: 'cycle' });
    return parts;
  }

  return parts;
}

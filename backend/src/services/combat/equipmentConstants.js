/** Plafonds globaux par ninja et par match (équilibrage M4) */
export const GEAR_CAPS = {
  attackBonus: 2,
  defenseBonus: 2,
  pvBonus: 20,
  consumableChakra: 18,
  consumablePv: 22,
  firstTourSpeed: 2,
};

/** Utilisations max par match si non précisé sur l'objet */
export const DEFAULT_USES_PER_MATCH = {
  attack: 3,
  defense: 3,
  element_resist: 2,
  pv: 1,
};

/** Tout consommable : 1 activation par match, puis détruit */
export const CONSUMABLE_USES_PER_MATCH = 1;

export function resolveModifierMaxUses(mod) {
  if (mod.maxUsesPerMatch != null) return mod.maxUsesPerMatch;
  return DEFAULT_USES_PER_MATCH[mod.kind] ?? 1;
}

export function describeUsageLimits(effects, category) {
  const parsed = typeof effects === 'string' ? JSON.parse(effects) : effects;
  const parts = [];

  if (category === 'consumable' && parsed.consumable) {
    parts.push({ label: 'consumable', uses: CONSUMABLE_USES_PER_MATCH });
    return parts;
  }

  for (const mod of parsed.modifiers || []) {
    parts.push({
      label: mod.kind,
      uses: resolveModifierMaxUses(mod),
    });
  }
  return parts;
}

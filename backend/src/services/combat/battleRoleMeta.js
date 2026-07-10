/**
 * Comportements liés aux consignes de combat (hors cercle de composition).
 */

/** Bonus de provocation pour les ninjas en consigne Tank. */
export const TANK_TARGET_BONUS = 0.15;

export function getEffectiveTankTargetChance(baseChance, fighters) {
  const hasTank = fighters.some((f) => !f.ko && f.pv > 0 && f.battle_strategy === 'Tank');
  if (!hasTank) return baseChance;
  return Math.min(0.92, baseChance + TANK_TARGET_BONUS);
}

/** Biais genjutsu pour consigne Protect. */
export const PROTECT_GENJUTSU_BIAS = 0.35;

/** Bonus soin pour consigne Protect. */
export const PROTECT_HEAL_BONUS = 1.06;

export function shouldBiasGenjutsu(attacker) {
  return attacker.battle_strategy === 'Protect' && attacker.stats.genjutsu >= 5;
}

export function healMultiplierFor(attacker) {
  return attacker.battle_strategy === 'Protect' ? PROTECT_HEAL_BONUS : 1;
}

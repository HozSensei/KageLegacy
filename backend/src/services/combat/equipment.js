/**
 * Ancien module d'équipement cycle/match — conservé vide pour compatibilité imports résiduels.
 */

export function getTrainingBoostMultiplier() {
  return 1;
}

export function getSalaryDiscountPercent() {
  return 0;
}

export function getCycleSpeedPenalty() {
  return 0;
}

export function applyEquipmentToFighter(fighter) {
  fighter.equipment = { cycle: [], slugs: [] };
  fighter.cycleSpeedPenalty = 0;
  return fighter;
}

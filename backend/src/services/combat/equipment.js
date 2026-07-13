/**
 * Effets d'objets cycle (entraînement, salaire) — plus d'objets match en combat.
 */

function parseEffects(raw) {
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export function getCycleSpeedPenalty(fighter) {
  return fighter.cycleSpeedPenalty || 0;
}

export function applyEquipmentToFighter(fighter, equipmentRows) {
  const equipment = { cycle: [], slugs: [] };
  fighter.cycleSpeedPenalty = 0;

  for (const row of equipmentRows) {
    const effects = parseEffects(row.effects);
    equipment.slugs.push(row.slug);

    if (effects.cycle) {
      equipment.cycle.push({
        userItemId: row.user_item_id,
        slug: row.slug,
        ...effects.cycle,
      });
      if (effects.cycle.speedPenalty) {
        fighter.cycleSpeedPenalty += effects.cycle.speedPenalty;
      }
    }
  }

  fighter.equipment = equipment;
  return fighter;
}

export function getTrainingBoostMultiplier(ninja, cycleItems = []) {
  let mult = 1;
  for (const item of cycleItems) {
    const effects = parseEffects(item.effects);
    if (effects.cycle?.trigger === 'training_boost') {
      mult *= effects.cycle.multiplier || 1;
    }
  }
  return mult;
}

export function getSalaryDiscountPercent(ninja, cycleItems = []) {
  let discount = 0;
  for (const item of cycleItems) {
    const effects = parseEffects(item.effects);
    if (effects.cycle?.trigger === 'salary_discount') {
      discount += effects.cycle.percent || 0;
    }
  }
  return Math.min(discount, 50);
}

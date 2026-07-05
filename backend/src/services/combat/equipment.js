function parseEffects(raw) {
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export function applyEquipmentToFighter(fighter, equipmentRows) {
  const bonuses = {
    matchPvBonus: 0,
    attackBonuses: {},
    defenseBonuses: {},
    consumables: [],
    firstTourSpeedBonus: 0,
  };

  for (const row of equipmentRows) {
    const effects = parseEffects(row.effects);
    if (effects.matchPvBonus) bonuses.matchPvBonus += effects.matchPvBonus;
    if (effects.attackStat && effects.attackBonus) {
      bonuses.attackBonuses[effects.attackStat] =
        (bonuses.attackBonuses[effects.attackStat] || 0) + effects.attackBonus;
    }
    if (effects.defenseStat && effects.defenseBonus) {
      bonuses.defenseBonuses[effects.defenseStat] =
        (bonuses.defenseBonuses[effects.defenseStat] || 0) + effects.defenseBonus;
    }
    if (effects.consumable) {
      bonuses.consumables.push({
        userItemId: row.user_item_id,
        ...effects.consumable,
      });
    }
    if (effects.consumable?.trigger === 'match_start' && effects.consumable.firstTourSpeedBonus) {
      bonuses.firstTourSpeedBonus += effects.consumable.firstTourSpeedBonus;
    }
  }

  fighter.maxPv += bonuses.matchPvBonus;
  fighter.pv += bonuses.matchPvBonus;
  fighter.equipment = bonuses;
  return fighter;
}

export function getAttackStatBonus(fighter, stat) {
  return fighter.equipment?.attackBonuses?.[stat] || 0;
}

export function getDefenseStatBonus(fighter, stat) {
  return fighter.equipment?.defenseBonuses?.[stat] || 0;
}

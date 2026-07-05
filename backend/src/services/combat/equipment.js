import { GEAR_CAPS } from './equipmentConstants.js';

function parseEffects(raw) {
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function clamp(value, max) {
  return Math.min(value, max);
}

function matchesWhen(fighter, when = {}) {
  if (when.strategy && fighter.battle_strategy !== when.strategy) return false;
  if (when.strategyNot && fighter.battle_strategy === when.strategyNot) return false;
  if (when.technique && when._techniqueType !== when.technique) return false;
  return true;
}

/**
 * Parse les effets d'objet en modificateurs situationnels (jamais de bonus plat universel).
 * Chaque objet ne couvre qu'une faiblesse ou un rôle tactique précis.
 */
export function applyEquipmentToFighter(fighter, equipmentRows) {
  const equipment = {
    modifiers: [],
    consumables: [],
    itemSlugs: [],
  };

  for (const row of equipmentRows) {
    const effects = parseEffects(row.effects);
    equipment.itemSlugs.push(row.slug);

    if (Array.isArray(effects.modifiers)) {
      equipment.modifiers.push(...effects.modifiers);
    }

    if (effects.consumable) {
      equipment.consumables.push({
        userItemId: row.user_item_id,
        slug: row.slug,
        ...effects.consumable,
      });
    }
  }

  let pvBonus = 0;
  for (const mod of equipment.modifiers) {
    if (mod.kind !== 'pv') continue;
    if (!matchesWhen(fighter, mod.when)) continue;
    pvBonus += mod.bonus || 0;
  }
  pvBonus = clamp(pvBonus, GEAR_CAPS.pvBonus);
  fighter.maxPv += pvBonus;
  fighter.pv += pvBonus;

  fighter.equipment = equipment;
  return fighter;
}

export function getSituationalAttackBonus(attacker, technique) {
  let bonus = 0;
  for (const mod of attacker.equipment?.modifiers || []) {
    if (mod.kind !== 'attack') continue;
    const when = { ...mod.when, _techniqueType: technique.type };
    if (mod.stat && mod.stat !== technique.stat) continue;
    if (!matchesWhen(attacker, when)) continue;
    bonus += mod.bonus || 0;
  }
  return clamp(bonus, GEAR_CAPS.attackBonus);
}

export function getSituationalDefenseBonus(defender, technique, attacker) {
  let bonus = 0;
  for (const mod of defender.equipment?.modifiers || []) {
    if (mod.kind === 'defense') {
      const when = { ...mod.when, _techniqueType: technique.type };
      if (mod.stat && mod.stat !== technique.stat) continue;
      if (!matchesWhen(defender, when)) continue;
      bonus += mod.bonus || 0;
    }
    if (mod.kind === 'element_resist') {
      if (technique.type !== 'ninjutsu') continue;
      if (mod.element && attacker?.element_affinity !== mod.element) continue;
      bonus += mod.bonus || 0;
    }
  }
  return clamp(bonus, GEAR_CAPS.defenseBonus);
}

export function tryConsumables(fighter) {
  const used = [];
  if (!fighter.equipment?.consumables?.length || fighter.consumableUsed) return used;

  for (const consumable of fighter.equipment.consumables) {
    if (fighter.consumableUsed) break;

    if (consumable.when?.strategy && fighter.battle_strategy !== consumable.when.strategy) {
      continue;
    }
    if (
      consumable.when?.strategyNot &&
      fighter.battle_strategy === consumable.when.strategyNot
    ) {
      continue;
    }

    const pvPct = fighter.maxPv ? (fighter.pv / fighter.maxPv) * 100 : 100;
    const chakraPct = fighter.maxChakra ? (fighter.chakra / fighter.maxChakra) * 100 : 100;

    if (consumable.trigger === 'pv_below_pct' && pvPct <= consumable.threshold) {
      const restore = clamp(consumable.pvRestore || 0, GEAR_CAPS.consumablePv);
      fighter.pv = Math.min(fighter.maxPv, fighter.pv + restore);
      fighter.consumableUsed = true;
      used.push(consumable.userItemId);
    } else if (
      consumable.trigger === 'chakra_below_pct' &&
      chakraPct <= consumable.threshold
    ) {
      const restore = clamp(consumable.chakraRestore || 0, GEAR_CAPS.consumableChakra);
      fighter.chakra = Math.min(fighter.maxChakra, fighter.chakra + restore);
      fighter.consumableUsed = true;
      used.push(consumable.userItemId);
    }
  }
  return used;
}

export function getFirstTourSpeedBonus(fighter, tour) {
  if (tour !== 1) return 0;
  let bonus = 0;
  for (const consumable of fighter.equipment?.consumables || []) {
    if (consumable.trigger !== 'match_start') continue;
    if (
      consumable.when?.strategyNot &&
      fighter.battle_strategy === consumable.when.strategyNot
    ) {
      continue;
    }
    bonus += consumable.firstTourSpeedBonus || 0;
  }
  return clamp(bonus, GEAR_CAPS.firstTourSpeed);
}

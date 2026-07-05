import {
  CONSUMABLE_USES_PER_MATCH,
  DEFAULT_USES_PER_MATCH,
  GEAR_CAPS,
  resolveModifierMaxUses,
} from './equipmentConstants.js';

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

function initEquipmentUsage(fighter) {
  if (!fighter.equipmentUsage) {
    fighter.equipmentUsage = {
      modifierUses: {},
      consumableUses: {},
      consumedItemIds: [],
    };
  }
  return fighter.equipmentUsage;
}

function modifierUseKey(slug, mod, index) {
  return `${slug}:${mod.kind}:${mod.stat || mod.element || index}`;
}

function getModifierUseCount(fighter, key) {
  return fighter.equipmentUsage?.modifierUses[key] || 0;
}

function canUseModifier(fighter, mod, key) {
  initEquipmentUsage(fighter);
  const max = resolveModifierMaxUses(mod);
  return getModifierUseCount(fighter, key) < max;
}

function recordModifierUse(fighter, key) {
  initEquipmentUsage(fighter);
  fighter.equipmentUsage.modifierUses[key] = getModifierUseCount(fighter, key) + 1;
}

function canUseConsumable(fighter, consumable) {
  initEquipmentUsage(fighter);
  const key = String(consumable.userItemId);
  const used = fighter.equipmentUsage.consumableUses[key] || 0;
  const max = consumable.usesPerMatch ?? CONSUMABLE_USES_PER_MATCH;
  return used < max;
}

function recordConsumableUse(fighter, userItemId) {
  initEquipmentUsage(fighter);
  const key = String(userItemId);
  fighter.equipmentUsage.consumableUses[key] =
    (fighter.equipmentUsage.consumableUses[key] || 0) + 1;
  if (!fighter.equipmentUsage.consumedItemIds.includes(userItemId)) {
    fighter.equipmentUsage.consumedItemIds.push(userItemId);
  }
}

/**
 * Parse les effets d'objet en modificateurs situationnels.
 * Chaque effet a un nombre d'activations limité par match.
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
      for (const mod of effects.modifiers) {
        equipment.modifiers.push({ ...mod, _slug: row.slug });
      }
    }

    if (effects.consumable) {
      equipment.consumables.push({
        userItemId: row.user_item_id,
        slug: row.slug,
        usesPerMatch: effects.consumable.usesPerMatch ?? CONSUMABLE_USES_PER_MATCH,
        ...effects.consumable,
      });
    }
  }

  initEquipmentUsage(fighter);

  let pvBonus = 0;
  for (let i = 0; i < equipment.modifiers.length; i += 1) {
    const mod = equipment.modifiers[i];
    if (mod.kind !== 'pv') continue;
    if (!matchesWhen(fighter, mod.when)) continue;
    const key = modifierUseKey(mod._slug, mod, i);
    if (!canUseModifier(fighter, mod, key)) continue;
    pvBonus += mod.bonus || 0;
    recordModifierUse(fighter, key);
  }
  pvBonus = clamp(pvBonus, GEAR_CAPS.pvBonus);
  fighter.maxPv += pvBonus;
  fighter.pv += pvBonus;

  fighter.equipment = equipment;
  return fighter;
}

export function getSituationalAttackBonus(attacker, technique) {
  initEquipmentUsage(attacker);
  let bonus = 0;

  for (let i = 0; i < (attacker.equipment?.modifiers || []).length; i += 1) {
    const mod = attacker.equipment.modifiers[i];
    if (mod.kind !== 'attack') continue;
    const when = { ...mod.when, _techniqueType: technique.type };
    if (mod.stat && mod.stat !== technique.stat) continue;
    if (!matchesWhen(attacker, when)) continue;

    const key = modifierUseKey(mod._slug, mod, i);
    if (!canUseModifier(attacker, mod, key)) continue;

    bonus += mod.bonus || 0;
    recordModifierUse(attacker, key);
  }

  return clamp(bonus, GEAR_CAPS.attackBonus);
}

export function getSituationalDefenseBonus(defender, technique, attacker) {
  initEquipmentUsage(defender);
  let bonus = 0;

  for (let i = 0; i < (defender.equipment?.modifiers || []).length; i += 1) {
    const mod = defender.equipment.modifiers[i];
    const key = modifierUseKey(mod._slug, mod, i);

    if (mod.kind === 'defense') {
      const when = { ...mod.when, _techniqueType: technique.type };
      if (mod.stat && mod.stat !== technique.stat) continue;
      if (!matchesWhen(defender, when)) continue;
      if (!canUseModifier(defender, mod, key)) continue;
      bonus += mod.bonus || 0;
      recordModifierUse(defender, key);
    }

    if (mod.kind === 'element_resist') {
      if (technique.type !== 'ninjutsu') continue;
      if (mod.element && attacker?.element_affinity !== mod.element) continue;
      if (!canUseModifier(defender, mod, key)) continue;
      bonus += mod.bonus || 0;
      recordModifierUse(defender, key);
    }
  }

  return clamp(bonus, GEAR_CAPS.defenseBonus);
}

export function tryConsumables(fighter) {
  const used = [];
  if (!fighter.equipment?.consumables?.length) return used;

  initEquipmentUsage(fighter);

  for (const consumable of fighter.equipment.consumables) {
    if (!canUseConsumable(fighter, consumable)) continue;

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
      recordConsumableUse(fighter, consumable.userItemId);
      used.push(consumable.userItemId);
    } else if (
      consumable.trigger === 'chakra_below_pct' &&
      chakraPct <= consumable.threshold
    ) {
      const restore = clamp(consumable.chakraRestore || 0, GEAR_CAPS.consumableChakra);
      fighter.chakra = Math.min(fighter.maxChakra, fighter.chakra + restore);
      recordConsumableUse(fighter, consumable.userItemId);
      used.push(consumable.userItemId);
    }
  }
  return used;
}

export function getFirstTourSpeedBonus(fighter, tour) {
  if (tour !== 1) return 0;

  initEquipmentUsage(fighter);
  let bonus = 0;

  for (const consumable of fighter.equipment?.consumables || []) {
    if (consumable.trigger !== 'match_start') continue;
    if (!canUseConsumable(fighter, consumable)) continue;
    if (
      consumable.when?.strategyNot &&
      fighter.battle_strategy === consumable.when.strategyNot
    ) {
      continue;
    }
    bonus += consumable.firstTourSpeedBonus || 0;
    recordConsumableUse(fighter, consumable.userItemId);
  }

  return clamp(bonus, GEAR_CAPS.firstTourSpeed);
}

/** IDs d'objets consommables à retirer de l'inventaire après le match */
export function collectConsumedItemIds(fighters) {
  const ids = [];
  for (const fighter of fighters) {
    if (fighter.equipmentUsage?.consumedItemIds?.length) {
      ids.push(...fighter.equipmentUsage.consumedItemIds);
    }
  }
  return [...new Set(ids)];
}

export { DEFAULT_USES_PER_MATCH, CONSUMABLE_USES_PER_MATCH, resolveModifierMaxUses };

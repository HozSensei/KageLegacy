import { randomInt } from 'node:crypto';
import { CONSUMABLE_USES_PER_MATCH, MATCH_CAPS } from './equipmentConstants.js';

function roll(max) {
  return randomInt(max);
}

function parseEffects(raw) {
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function clamp(value, max) {
  return Math.min(value, max);
}

function initEquipmentUsage(fighter) {
  if (!fighter.equipmentUsage) {
    fighter.equipmentUsage = {
      matchUses: {},
      consumedItemIds: [],
      eventLog: [],
    };
  }
  return fighter.equipmentUsage;
}

function matchUseKey(userItemId) {
  return String(userItemId);
}

function canUseMatchEffect(fighter, effect) {
  initEquipmentUsage(fighter);
  const key = matchUseKey(effect.userItemId);
  const used = fighter.equipmentUsage.matchUses[key] || 0;
  const max = effect.usesPerMatch ?? CONSUMABLE_USES_PER_MATCH;
  return used < max;
}

function recordMatchUse(fighter, userItemId, eventType) {
  initEquipmentUsage(fighter);
  const key = matchUseKey(userItemId);
  fighter.equipmentUsage.matchUses[key] = (fighter.equipmentUsage.matchUses[key] || 0) + 1;
  if (!fighter.equipmentUsage.consumedItemIds.includes(userItemId)) {
    fighter.equipmentUsage.consumedItemIds.push(userItemId);
  }
  if (eventType) {
    fighter.equipmentUsage.eventLog.push({ type: eventType, userItemId });
  }
}

/**
 * Attache les effets match/cycle — pas de bonus de stats permanentes.
 */
export function applyEquipmentToFighter(fighter, equipmentRows) {
  const equipment = { match: [], cycle: [], slugs: [] };
  fighter.cycleSpeedPenalty = 0;

  for (const row of equipmentRows) {
    const effects = parseEffects(row.effects);
    equipment.slugs.push(row.slug);

    if (effects.match) {
      equipment.match.push({
        userItemId: row.user_item_id,
        slug: row.slug,
        usesPerMatch: effects.match.usesPerMatch ?? CONSUMABLE_USES_PER_MATCH,
        ...effects.match,
      });
    }

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

  initEquipmentUsage(fighter);
  fighter.equipment = equipment;
  return fighter;
}

export function getCycleSpeedPenalty(fighter) {
  return fighter.cycleSpeedPenalty || 0;
}

export function getGenjutsuDefenseBonus(defender) {
  if (!defender.equipment?.match?.length) return 0;

  for (const effect of defender.equipment.match) {
    if (effect.trigger !== 'genjutsu_defense') continue;
    if (!canUseMatchEffect(defender, effect)) continue;
    recordMatchUse(defender, effect.userItemId, 'item_rupture_scroll');
    return effect.bonus || 0;
  }
  return 0;
}

export function tryLethalMitigation(defender, damage) {
  if (damage <= 0 || defender.pv - damage > 0) {
    return { damage, mitigated: false };
  }

  for (const effect of defender.equipment?.match || []) {
    if (effect.trigger !== 'lethal_mitigation') continue;
    if (!canUseMatchEffect(defender, effect)) continue;
    const reduction = effect.damageReduction ?? 0.5;
    const mitigatedDamage = Math.max(0, Math.floor(damage * (1 - reduction)));
    recordMatchUse(defender, effect.userItemId, 'item_smoke_save');
    return { damage: mitigatedDamage, mitigated: true };
  }

  return { damage, mitigated: false };
}

export function tryDecoyRedirect(initialDefender, defenders, attacker) {
  for (const effect of initialDefender.equipment?.match || []) {
    if (effect.trigger !== 'on_targeted') continue;
    if (!canUseMatchEffect(initialDefender, effect)) continue;

    const chance = effect.redirectChance ?? 30;
    if (roll(100) >= chance) continue;

    const others = defenders.filter((d) => d.id !== initialDefender.id);
    if (!others.length) continue;

    recordMatchUse(initialDefender, effect.userItemId, 'item_decoy');
    return others[roll(others.length)];
  }
  return null;
}

export function tryConsumables(fighter) {
  const used = [];
  if (!fighter.equipment?.match?.length) return used;

  initEquipmentUsage(fighter);

  const pvPct = fighter.maxPv ? (fighter.pv / fighter.maxPv) * 100 : 100;
  const chakraPct = fighter.maxChakra ? (fighter.chakra / fighter.maxChakra) * 100 : 100;

  for (const effect of fighter.equipment.match) {
    if (!canUseMatchEffect(fighter, effect)) continue;

    if (effect.trigger === 'pv_below_pct' && pvPct <= effect.threshold) {
      const restore = clamp(effect.pvRestore || 0, MATCH_CAPS.pvRestore);
      fighter.pv = Math.min(fighter.maxPv, fighter.pv + restore);
      recordMatchUse(fighter, effect.userItemId, 'item_heal');
      used.push(effect.userItemId);
    } else if (effect.trigger === 'chakra_below_pct' && chakraPct <= effect.threshold) {
      const restore = clamp(effect.chakraRestore || 0, MATCH_CAPS.chakraRestore);
      fighter.chakra = Math.min(fighter.maxChakra, fighter.chakra + restore);
      recordMatchUse(fighter, effect.userItemId, 'item_chakra');
      used.push(effect.userItemId);
    }
  }

  return used;
}

/** IDs d'objets consommés en match à retirer de l'inventaire */
export function collectConsumedItemIds(fighters) {
  const ids = [];
  for (const fighter of fighters) {
    if (fighter.equipmentUsage?.consumedItemIds?.length) {
      ids.push(...fighter.equipmentUsage.consumedItemIds);
    }
  }
  return [...new Set(ids)];
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

export { CONSUMABLE_USES_PER_MATCH };

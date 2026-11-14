/**
 * Formules de scaling combat (docs/COMBAT_SYSTEM.md).
 * Module pur — pas de DB.
 */
import {
  CRIT_DAMAGE_MULT,
  ELEMENT_ADVANTAGE_MULT,
  ELEMENT_BEATS,
  ELEMENT_DISADVANTAGE_MULT,
  MAX_CRIT_CHANCE,
  TYPE_ADVANTAGE,
  TYPE_ADVANTAGE_MULTIPLIER,
} from './constants.js';

/** Dégâts_Finaux = Dégâts_Base × (1 + Stat / 100) */
export function scaleByStat(base, stat) {
  const b = Math.max(0, Number(base) || 0);
  const s = Number(stat) || 0;
  return Math.round(b * (1 + s / 100));
}

export function scaleDamage(baseDamage, attackStat) {
  return scaleByStat(baseDamage, attackStat);
}

export function scaleBlock(baseBlock, medicine) {
  return scaleByStat(baseBlock, medicine);
}

export function scaleHeal(baseHeal, medicine) {
  return scaleByStat(baseHeal, medicine);
}

/** Chance crit = min(50, Vitesse / 10) */
export function critChanceFromSpeed(vitesse) {
  return Math.min(MAX_CRIT_CHANCE, Math.floor((Number(vitesse) || 0) / 10));
}

export function rollCrit(vitesse, rng = Math.random) {
  const chance = critChanceFromSpeed(vitesse);
  const roll = typeof rng === 'function' ? rng() : Math.random();
  const isCrit = roll * 100 < chance;
  return { isCrit, chance, mult: isCrit ? CRIT_DAMAGE_MULT : 1 };
}

export function typeAdvantageMultiplier(attackerStatType, defenderPosture) {
  if (!attackerStatType || !defenderPosture) return 1;
  if (TYPE_ADVANTAGE[attackerStatType] === defenderPosture) {
    return TYPE_ADVANTAGE_MULTIPLIER;
  }
  return 1;
}

export function elementMultiplier(attackerElement, defenderAffinity) {
  if (!attackerElement || !defenderAffinity) return 1;
  const atk = String(attackerElement).toLowerCase();
  const def = String(defenderAffinity).toLowerCase();
  if (ELEMENT_BEATS[atk] === def) return ELEMENT_ADVANTAGE_MULT;
  if (ELEMENT_BEATS[def] === atk) return ELEMENT_DISADVANTAGE_MULT;
  return 1;
}

/**
 * Applique les dégâts à une entité avec armure.
 * @returns {{ damageDealt: number, hp: number, block: number, overkill: number }}
 */
export function applyDamageThroughBlock(entity, rawDamage) {
  const incoming = Math.max(0, Math.floor(Number(rawDamage) || 0));
  let block = Math.max(0, Number(entity.block) || 0);
  let hp = Math.max(0, Number(entity.hp) || 0);

  const absorbed = Math.min(block, incoming);
  block -= absorbed;
  const toHp = incoming - absorbed;
  const damageDealt = Math.min(hp, toHp);
  hp -= damageDealt;

  return {
    damageDealt: toHp,
    hpAbsorbed: damageDealt,
    hp,
    block,
    overkill: Math.max(0, toHp - damageDealt),
  };
}

/** Multiplicateurs de statut sur dégâts sortants / entrants */
export function outgoingDamageMultiplier(statuses = []) {
  let mult = 1;
  if (hasStatus(statuses, 'weak')) mult *= 0.75;
  return mult;
}

export function incomingDamageMultiplier(statuses = []) {
  let mult = 1;
  if (hasStatus(statuses, 'vulnerable')) mult *= 1.5;
  if (hasStatus(statuses, 'intangible')) mult = Math.min(mult, 0); // handled specially
  return mult;
}

export function hasStatus(statuses, key) {
  return (statuses || []).some((s) => s.key === key && (s.duration == null || s.duration > 0));
}

export function getStatusValue(statuses, key) {
  const found = (statuses || []).find((s) => s.key === key && (s.duration == null || s.duration > 0));
  return found ? Number(found.value) || 0 : 0;
}

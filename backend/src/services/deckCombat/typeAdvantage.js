/**
 * Triade tactique + roue élémentaire (docs/COMBAT_SYSTEM.md).
 *
 * Module pur — pas de DB / RNG.
 *
 * Multiplicateurs (choix documenté = valeurs du design doc) :
 * - Triade : avantage ×1.2, sinon ×1 (pas de malus réciproque)
 * - Éléments : avantage ×1.5, désavantage ×0.7, neutre ×1
 */
import {
  ELEMENT_ADVANTAGE_MULT,
  ELEMENT_BEATS,
  ELEMENT_DISADVANTAGE_MULT,
  TYPE_ADVANTAGE,
  TYPE_ADVANTAGE_MULTIPLIER,
} from './constants.js';

const TYPE_KEYS = new Set(['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']);
const ELEMENT_KEYS = new Set(Object.keys(ELEMENT_BEATS));

function normalizeKey(value) {
  if (value == null || value === '') return null;
  return String(value).trim().toLowerCase();
}

/**
 * @param {string|null|undefined} attackerStatType
 * @param {string|null|undefined} defenderPosture
 * @returns {{ relation: 'advantage'|'neutral', multiplier: number, attacker: string|null, defender: string|null }}
 */
export function getTypeAdvantage(attackerStatType, defenderPosture) {
  const attacker = normalizeKey(attackerStatType);
  const defender = normalizeKey(defenderPosture);

  if (!attacker || !defender || !TYPE_KEYS.has(attacker) || !TYPE_KEYS.has(defender)) {
    return { relation: 'neutral', multiplier: 1, attacker, defender };
  }
  // Médecine : toujours neutre (ni avantage ni désavantage).
  if (attacker === 'medicine' || defender === 'medicine') {
    return { relation: 'neutral', multiplier: 1, attacker, defender };
  }
  if (TYPE_ADVANTAGE[attacker] === defender) {
    return {
      relation: 'advantage',
      multiplier: TYPE_ADVANTAGE_MULTIPLIER,
      attacker,
      defender,
    };
  }
  return { relation: 'neutral', multiplier: 1, attacker, defender };
}

/**
 * @param {string|null|undefined} attackerElement
 * @param {string|null|undefined} defenderAffinity
 * @returns {{ relation: 'advantage'|'disadvantage'|'neutral', multiplier: number, attacker: string|null, defender: string|null }}
 */
export function getElementAdvantage(attackerElement, defenderAffinity) {
  const attacker = normalizeKey(attackerElement);
  const defender = normalizeKey(defenderAffinity);

  if (!attacker || !defender || !ELEMENT_KEYS.has(attacker) || !ELEMENT_KEYS.has(defender)) {
    return { relation: 'neutral', multiplier: 1, attacker, defender };
  }
  if (ELEMENT_BEATS[attacker] === defender) {
    return {
      relation: 'advantage',
      multiplier: ELEMENT_ADVANTAGE_MULT,
      attacker,
      defender,
    };
  }
  if (ELEMENT_BEATS[defender] === attacker) {
    return {
      relation: 'disadvantage',
      multiplier: ELEMENT_DISADVANTAGE_MULT,
      attacker,
      defender,
    };
  }
  return { relation: 'neutral', multiplier: 1, attacker, defender };
}

/** Multiplicateur triade (compat formulas / cardEffects). */
export function typeAdvantageMultiplier(attackerStatType, defenderPosture) {
  return getTypeAdvantage(attackerStatType, defenderPosture).multiplier;
}

/** Multiplicateur élémentaire (compat formulas / cardEffects). */
export function elementMultiplier(attackerElement, defenderAffinity) {
  return getElementAdvantage(attackerElement, defenderAffinity).multiplier;
}

/** Tables exposées pour tests / tooling. */
export const TYPE_ADVANTAGE_TABLE = TYPE_ADVANTAGE;
export const ELEMENT_BEATS_TABLE = ELEMENT_BEATS;
export const TYPE_ADVANTAGE_MULT = TYPE_ADVANTAGE_MULTIPLIER;
export const ELEMENT_ADV_MULT = ELEMENT_ADVANTAGE_MULT;
export const ELEMENT_DISADV_MULT = ELEMENT_DISADVANTAGE_MULT;

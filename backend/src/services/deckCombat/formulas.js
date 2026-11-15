/**
 * Formules de scaling combat (docs/COMBAT_SYSTEM.md).
 * Module pur — pas de DB.
 *
 * Triade / éléments : voir `typeAdvantage.js` (réexportés ici pour compat).
 */
import { CRIT_DAMAGE_MULT, MAX_CRIT_CHANCE } from './constants.js';
export {
  elementMultiplier,
  getElementAdvantage,
  getTypeAdvantage,
  typeAdvantageMultiplier,
} from './typeAdvantage.js';

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

/**
 * Applique les dégâts à une entité avec armure.
 * @param {object} [opts]
 * @param {number} [opts.armorIgnore] — armure ignorée (non consommée) pour ce coup
 * @returns {{ damageDealt: number, hp: number, block: number, overkill: number }}
 */
export function applyDamageThroughBlock(entity, rawDamage, opts = {}) {
  const incoming = Math.max(0, Math.floor(Number(rawDamage) || 0));
  let block = Math.max(0, Number(entity.block) || 0);
  let hp = Math.max(0, Number(entity.hp) || 0);
  const armorIgnore = Math.max(0, Number(opts.armorIgnore) || 0);
  const effectiveBlock = Math.max(0, block - armorIgnore);

  const absorbed = Math.min(effectiveBlock, incoming);
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

const TYPED_DAMAGE_PCT_KEYS = {
  taijutsu: 'taijutsu_pct',
  ninjutsu: 'ninjutsu_pct',
  genjutsu: 'genjutsu_pct',
};

/**
 * Multiplicateurs de statut sur dégâts sortants.
 * - weak : ×0.75
 * - damage_pct : +X % tous types
 * - {statType}_pct : +X % pour ce type (taijutsu/ninjutsu/genjutsu)
 * @param {object} [opts]
 * @param {string|null} [opts.statType]
 */
export function outgoingDamageMultiplier(statuses = [], opts = {}) {
  let mult = 1;
  if (hasStatus(statuses, 'weak')) mult *= 0.75;
  const globalPct = getStatusValue(statuses, 'damage_pct');
  if (globalPct) mult *= 1 + globalPct / 100;
  const typedKey = TYPED_DAMAGE_PCT_KEYS[opts.statType];
  if (typedKey) {
    const typedPct = getStatusValue(statuses, typedKey);
    if (typedPct) mult *= 1 + typedPct / 100;
  }
  return mult;
}

/** +X % armure gagnée (block_pct). */
export function outgoingBlockMultiplier(statuses = []) {
  const pct = getStatusValue(statuses, 'block_pct');
  return pct ? 1 + pct / 100 : 1;
}

/** +X % soins (heal_pct). */
export function outgoingHealMultiplier(statuses = []) {
  const pct = getStatusValue(statuses, 'heal_pct');
  return pct ? 1 + pct / 100 : 1;
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

export { TYPED_DAMAGE_PCT_KEYS };

/**
 * Formules de scaling combat (docs/CARDS_AND_COMBAT.md).
 * Module pur — pas de DB.
 *
 * Triade / éléments : voir `typeAdvantage.js` (réexportés ici pour compat).
 */
import {
  CRIT_DAMAGE_MULT,
  DOT_ART_BY_KEY,
  DOT_BASES,
  DOT_DURATION_MAX,
  DOT_DURATION_MIN,
  DOT_STAT_FACTOR,
  DOT_STATUS_KEYS,
  MAX_CRIT_CHANCE,
} from './constants.js';
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

/** Intensité DoT = base + round(stat × 0.09) — distinct du scaling attaque. */
export function scaleDotIntensity(base, artStat) {
  const b = Math.max(0, Number(base) || 0);
  const s = Math.max(0, Number(artStat) || 0);
  return b + Math.round(s * DOT_STAT_FACTOR);
}

export function isDotStatusKey(key) {
  return DOT_STATUS_KEYS.has(String(key || '').toLowerCase());
}

export function clampDotDuration(duration) {
  const d = Math.floor(Number(duration) || DOT_DURATION_MIN);
  return Math.min(DOT_DURATION_MAX, Math.max(DOT_DURATION_MIN, d));
}

/**
 * Intensité DoT à la pose.
 * @param {string} statusKey
 * @param {object} [opts]
 * @param {object} [opts.stats] — stats du poseur (joueur) ; absent → base pure (ennemis)
 * @param {number} [opts.talentFlat]
 */
export function computeDotIntensity(statusKey, { stats = null, talentFlat = 0 } = {}) {
  const key = String(statusKey || '').toLowerCase();
  const base = DOT_BASES[key];
  if (base == null) return 0;
  const art = DOT_ART_BY_KEY[key];
  const artStat = stats && art ? Number(stats[art]) || 0 : 0;
  const scaled = stats ? scaleDotIntensity(base, artStat) : base;
  return Math.max(0, scaled + (Number(talentFlat) || 0));
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

/**
 * Critique basé sur une chance explicite (mot-clé / carte), plus sur Vitesse.
 * @param {number} chancePercent 0–50
 */
export function clampCritChance(chancePercent) {
  return Math.min(MAX_CRIT_CHANCE, Math.max(0, Math.floor(Number(chancePercent) || 0)));
}

/** @deprecated Alias — l’ancienne formule Vitesse/10 n’est plus utilisée. */
export function critChanceFromSpeed(vitesse) {
  return clampCritChance(Math.floor((Number(vitesse) || 0) / 10));
}

export function rollCrit(chancePercent, rng = Math.random) {
  const chance = clampCritChance(chancePercent);
  const roll = typeof rng === 'function' ? rng() : Math.random();
  const isCrit = chance > 0 && roll * 100 < chance;
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

/**
 * Un allié avec Provocation encaisse d'abord les dégâts ; le surplus reste pour le joueur.
 * @returns {{ entity: object, remaining: number, logs: object[] }}
 */
export function absorbDamageWithTauntAlly(entity, rawDamage) {
  const logs = [];
  let remaining = Math.max(0, Math.floor(Number(rawDamage) || 0));
  const ally = entity?.ally;
  if (!ally?.taunt || (Number(ally.hp) || 0) <= 0 || remaining <= 0) {
    return { entity, remaining, logs };
  }

  const allyHpBefore = Number(ally.hp) || 0;
  const absorbed = Math.min(allyHpBefore, remaining);
  const allyHp = allyHpBefore - absorbed;
  remaining -= absorbed;

  return {
    entity: {
      ...entity,
      ally: allyHp > 0 ? { ...ally, hp: allyHp } : null,
    },
    remaining,
    logs: [
      {
        type: 'ally_damage',
        amount: absorbed,
        allyHp: allyHp > 0 ? allyHp : 0,
        fallen: allyHp <= 0,
      },
    ],
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
  return (statuses || []).some(s => s.key === key && (s.duration == null || s.duration > 0));
}

export function getStatusValue(statuses, key) {
  const found = (statuses || []).find(s => s.key === key && (s.duration == null || s.duration > 0));
  return found ? Number(found.value) || 0 : 0;
}

export { TYPED_DAMAGE_PCT_KEYS };

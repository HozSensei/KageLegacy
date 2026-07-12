import { ninjaOverallRating } from './ninjaStats.js';

/** Ordre d'affichage des rangs de mission (D → A). */
export const MISSION_TIER_ORDER = ['D', 'C', 'B', 'A'];

/** Alias legacy (avant refonte rangs). */
export const LEGACY_TIER_ALIASES = {
  routine: 'D',
  infiltration: 'C',
  cyclone: 'B',
};

export function normalizeMissionTier(tier) {
  if (!tier) return null;
  const upper = String(tier).toUpperCase();
  if (MISSION_TIER_ORDER.includes(upper)) return upper;
  return LEGACY_TIER_ALIASES[tier] ?? null;
}

export const MISSION_TIERS = {
  D: {
    tier: 'D',
    rank: 'D',
    targetRating: 4,
    resolvesAtHour: 72,
    baseRewardMin: 300,
    baseRewardMax: 500,
    baseInjuryChance: 0,
    baseDeathChance: 0,
    injurySeverity: 'light',
    statGainOnSuccess: 0.25,
    benchStatGainBonus: 1.5,
    moralGain: 1,
  },
  C: {
    tier: 'C',
    rank: 'C',
    targetRating: 6,
    resolvesAtHour: 72,
    baseRewardMin: 600,
    baseRewardMax: 800,
    baseInjuryChance: 25,
    baseDeathChance: 0,
    injurySeverity: 'light',
    statGainOnSuccess: 0.5,
    benchStatGainBonus: 1.5,
    moralGain: 2,
  },
  B: {
    tier: 'B',
    rank: 'B',
    targetRating: 8,
    resolvesAtHour: 72,
    baseRewardMin: 1000,
    baseRewardMax: 1000,
    baseInjuryChance: 40,
    baseDeathChance: 5,
    injurySeverity: 'grave',
    statGainOnSuccess: 0.75,
    benchStatGainBonus: 1.25,
    moralGain: 1,
  },
  A: {
    tier: 'A',
    rank: 'A',
    targetRating: 10,
    resolvesAtHour: 72,
    baseRewardMin: 1500,
    baseRewardMax: 2000,
    baseInjuryChance: 50,
    baseDeathChance: 10,
    injurySeverity: 'grave',
    statGainOnSuccess: 1.0,
    benchStatGainBonus: 1.0,
    moralGain: 2,
  },
};

const STAT_COLUMNS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

const SUCCESS_SLOPE = 12;
const INJURY_SLOPE = 8;
const DEATH_SLOPE = 3;

export function clampPercent(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function ninjaStatsFromRow(ninja) {
  return Object.fromEntries(STAT_COLUMNS.map((key) => [key, ninja[key]]));
}

export function getMissionTierConfig(tier) {
  const normalized = normalizeMissionTier(tier);
  return normalized ? MISSION_TIERS[normalized] : null;
}

/**
 * Probabilités affichées et utilisées à la résolution.
 * Blessure / mort s'appliquent en cas d'échec de mission (pas sur succès).
 */
export function computeMissionOddsForTier(ninja, tier) {
  const config = getMissionTierConfig(tier);
  if (!config) return null;

  const rating = ninjaOverallRating(ninja);
  const delta = rating - config.targetRating;

  return {
    tier: config.tier,
    rank: config.rank,
    targetRating: config.targetRating,
    ninjaRating: rating,
    successChance: clampPercent(50 + delta * SUCCESS_SLOPE, 5, 95),
    injuryChance: clampPercent(config.baseInjuryChance - delta * INJURY_SLOPE, 0, 80),
    deathChance: clampPercent(config.baseDeathChance - delta * DEATH_SLOPE, 0, 25),
    rewardMin: config.baseRewardMin,
    rewardMax: config.baseRewardMax,
    statGainOnSuccess: config.statGainOnSuccess,
    benchStatGainBonus: config.benchStatGainBonus,
  };
}

export function computeMissionOdds(ninja) {
  return Object.fromEntries(
    MISSION_TIER_ORDER.map((tier) => [tier, computeMissionOddsForTier(ninja, tier)])
  );
}

/** Tous les rangs sont envoyables ; la recommandation dépend du % de réussite. */
export function getEligibleTiersForNinja(_ninja) {
  return [...MISSION_TIER_ORDER];
}

export function getRecommendedTiersForNinja(ninja) {
  return MISSION_TIER_ORDER.filter((tier) => {
    const odds = computeMissionOddsForTier(ninja, tier);
    return odds && odds.successChance >= 50;
  });
}

/** @deprecated Utiliser getRecommendedTiersForNinja */
export function meetsTierRequirement(tier, ninja) {
  const odds = computeMissionOddsForTier(ninja, tier);
  return odds ? odds.successChance >= 50 : false;
}

export function missionGuaranteedRyos(tier) {
  const config = getMissionTierConfig(tier);
  if (!config) return { min: 0, max: 0 };
  return { min: config.baseRewardMin, max: config.baseRewardMax };
}

export function missionNetProfit(tier) {
  return missionGuaranteedRyos(tier).max;
}

export function rollPercent() {
  return Math.floor(Math.random() * 100) + 1;
}

/** Clé narrative legacy (pools existants). */
export function narrativeTierKey(tier) {
  const map = { D: 'routine', C: 'infiltration', B: 'cyclone', A: 'cyclone' };
  const normalized = normalizeMissionTier(tier);
  return map[normalized] ?? 'routine';
}

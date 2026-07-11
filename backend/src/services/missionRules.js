export const MISSION_TIERS = {
  routine: {
    tier: 'routine',
    label: 'Contrat de Routine',
    resolvesAtHour: 72,
    baseRewardMin: 300,
    baseRewardMax: 500,
    lightInjuryChance: 0,
    graveInjuryChance: 0,
    deathChance: 0,
    requirement: null,
    requirementText: 'Ouvert à tous',
  },
  infiltration: {
    tier: 'infiltration',
    label: 'Infiltration tactique',
    resolvesAtHour: 72,
    baseRewardMin: 600,
    baseRewardMax: 800,
    lightInjuryChance: 0.2,
    graveInjuryChance: 0,
    deathChance: 0,
    requirement: (stats) => stats.intelligence >= 8 || stats.vitesse >= 8,
    requirementText: 'Intelligence ≥ 8 ou Vitesse ≥ 8',
  },
  cyclone: {
    tier: 'cyclone',
    label: 'Opération Cyclone',
    resolvesAtHour: 72,
    baseReward: 1000,
    lightInjuryChance: 0,
    graveInjuryChance: 0.4,
    deathChance: 0.05,
    requirement: (stats) =>
      stats.taijutsu >= 12 ||
      stats.ninjutsu >= 12 ||
      stats.genjutsu >= 12 ||
      stats.medecine >= 12,
    requirementText: 'Une stat de combat ≥ 12',
  },
};

const STAT_COLUMNS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

export function ninjaStatsFromRow(ninja) {
  return Object.fromEntries(STAT_COLUMNS.map((key) => [key, ninja[key]]));
}

export function meetsTierRequirement(tier, ninja) {
  const config = MISSION_TIERS[tier];
  if (!config?.requirement) return true;
  return config.requirement(ninjaStatsFromRow(ninja));
}

export function getEligibleTiersForNinja(ninja) {
  return Object.keys(MISSION_TIERS).filter((tier) => meetsTierRequirement(tier, ninja));
}

export function missionGuaranteedRyos(tier) {
  const config = MISSION_TIERS[tier];
  if (!config) return 0;
  if (tier === 'routine' || tier === 'infiltration') {
    return { min: config.baseRewardMin, max: config.baseRewardMax };
  }
  return { min: config.baseReward, max: config.baseReward };
}

export function missionNetProfit(tier) {
  const guaranteed = missionGuaranteedRyos(tier);
  return guaranteed.max;
}

export function getRiskPenalties(tier, ninja) {
  const underQualified = !meetsTierRequirement(tier, ninja);
  if (!underQualified || tier !== 'cyclone') {
    return { graveBonus: 0, deathChance: 0 };
  }
  return { graveBonus: 0.2, deathChance: 0.05 };
}

export function rollPercent() {
  return Math.floor(Math.random() * 100) + 1;
}

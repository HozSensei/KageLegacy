export const MISSION_RANKS = {
  D: { sendCost: 0, reward: 500, label: 'Rang D', paid: false },
  C: {
    sendCost: 100,
    reward: 1200,
    label: 'Rang C',
    paid: true,
    requirement: (stats) => stats.intelligence >= 8 || stats.vitesse >= 8,
  },
  B: {
    sendCost: 300,
    reward: 2800,
    label: 'Rang B',
    paid: true,
    requirement: (stats) =>
      stats.taijutsu >= 12 ||
      stats.ninjutsu >= 12 ||
      stats.genjutsu >= 12 ||
      stats.medecine >= 12,
  },
};

export function ninjaStatsFromRow(ninja) {
  return {
    taijutsu: ninja.taijutsu,
    ninjutsu: ninja.ninjutsu,
    genjutsu: ninja.genjutsu,
    medecine: ninja.medecine,
    vitesse: ninja.vitesse,
    intelligence: ninja.intelligence,
  };
}

export function evaluateMissionSuccess(rank, ninja) {
  if (rank === 'D') return true;
  const config = MISSION_RANKS[rank];
  if (!config?.requirement) return true;
  return config.requirement(ninjaStatsFromRow(ninja));
}

export function meetsRankRequirement(rank, ninja) {
  return evaluateMissionSuccess(rank, ninja);
}

export function getEligibleRanksForNinja(ninja) {
  return Object.keys(MISSION_RANKS).filter((rank) => meetsRankRequirement(rank, ninja));
}

export function missionRequirementText(rank) {
  if (rank === 'D') return 'Ouvert à tous';
  if (rank === 'C') return 'Intelligence ≥ 8 ou Vitesse ≥ 8';
  return 'Une stat de combat ≥ 12';
}

export function missionNetProfit(rank) {
  const config = MISSION_RANKS[rank];
  return config.reward - config.sendCost;
}

export function isPaidMissionRank(rank) {
  return Boolean(MISSION_RANKS[rank]?.paid);
}

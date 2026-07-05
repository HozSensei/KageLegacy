export const MISSION_RANKS = {
  D: { sendCost: 0, reward: 500, label: 'Rang D' },
  C: {
    sendCost: 100,
    reward: 1200,
    label: 'Rang C',
    requirement: (stats) => stats.intelligence >= 8 || stats.vitesse >= 8,
  },
  B: {
    sendCost: 300,
    reward: 2800,
    label: 'Rang B',
    requirement: (stats) =>
      stats.taijutsu >= 12 ||
      stats.ninjutsu >= 12 ||
      stats.genjutsu >= 12 ||
      stats.medecine >= 12,
  },
};

export function evaluateMissionSuccess(rank, ninja) {
  if (rank === 'D') return true;
  const config = MISSION_RANKS[rank];
  if (!config?.requirement) return true;
  return config.requirement(ninja);
}

export function missionRequirementText(rank) {
  if (rank === 'D') return 'Ouvert à tous';
  if (rank === 'C') return 'Intelligence ≥ 8 ou Vitesse ≥ 8';
  return 'Une stat de combat ≥ 12';
}

export function computeSalaryCost(grade, stats) {
  const sum = stats.taijutsu + stats.ninjutsu + stats.genjutsu + stats.medecine + stats.vitesse + stats.intelligence;
  const bases = { Genin: 200, Chunin: 500, Jonin: 800 };
  const multipliers = { Genin: 10, Chunin: 15, Jonin: 20 };
  return (bases[grade] || 200) + sum * (multipliers[grade] || 10);
}

export function computeMatchPv(taijutsu, equipmentBonus = 0) {
  return taijutsu * 10 + equipmentBonus;
}

/** PV de match basés sur la note globale (somme des 6 stats / 6, arrondi). */
export function computeMatchPvFromRating(statsOrNinja, equipmentBonus = 0) {
  const stats = statsOrNinja.stats || statsOrNinja;
  const sum = NINJA_STAT_COLUMNS.reduce((acc, col) => acc + (Number(stats[col]) || 0), 0);
  const rating = Math.round(sum / NINJA_STAT_COLUMNS.length);
  return Math.max(10, rating * 10 + equipmentBonus);
}

export function computeMatchChakraMax(grade, ninjutsu) {
  const base = { Genin: 50, Chunin: 80, Jonin: 120 };
  return (base[grade] || 50) + ninjutsu * 2;
}

export function applyClanBonuses(stats, clan) {
  const result = { ...stats };
  result.intelligence = clampStat(result.intelligence + (clan.intelligence_bonus || 0));
  result.vitesse = clampStat(result.vitesse + (clan.speed_bonus || 0));
  result.genjutsu = clampStat(result.genjutsu + (clan.genjutsu_bonus || 0));
  result.ninjutsu = clampStat(result.ninjutsu + (clan.ninjutsu_bonus || 0));
  return result;
}

export function clampStat(value) {
  return Math.max(1, Math.min(20, value));
}

export const NINJA_STAT_COLUMNS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medecine',
  'vitesse',
  'intelligence',
];

export function ninjaStatSum(ninja) {
  return NINJA_STAT_COLUMNS.reduce((sum, column) => sum + (Number(ninja[column]) || 0), 0);
}

/** Note moyenne globale (même calcul que l'UI : somme des 6 stats / 6, arrondi). */
export function ninjaOverallAverage(ninja) {
  return ninjaStatSum(ninja) / NINJA_STAT_COLUMNS.length;
}

export function ninjaOverallRating(ninja) {
  return Math.round(ninjaOverallAverage(ninja));
}

export function computeMoralWithClanVariance(baseMoral, clan) {
  if (!clan.moral_variance) return baseMoral;
  const variance = Math.floor(Math.random() * (clan.moral_variance * 2 + 1)) - clan.moral_variance;
  return clampStat(baseMoral + variance);
}

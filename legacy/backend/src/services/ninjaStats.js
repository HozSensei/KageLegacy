/** Salaires retirés (juil. 2026) — l'économie repose sur l'entraînement et les achats. */
export function computeSalaryCost(_grade, _stats) {
  return 0;
}

export function computeMatchPv(taijutsu, equipmentBonus = 0) {
  return taijutsu * 10 + equipmentBonus;
}

/** PV de match basés sur la note globale (somme des 6 stats / 6, arrondi). */
export const MATCH_PV_PER_RATING = 5;

export function computeMatchPvFromRating(statsOrNinja, equipmentBonus = 0) {
  const stats = statsOrNinja.stats || statsOrNinja;
  const sum = NINJA_STAT_COLUMNS.reduce((acc, col) => acc + (Number(stats[col]) || 0), 0);
  const rating = Math.round(sum / NINJA_STAT_COLUMNS.length);
  return Math.max(10, rating * MATCH_PV_PER_RATING + equipmentBonus);
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

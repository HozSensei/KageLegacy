export function computeSalaryCost(grade, stats) {
  const sum = stats.taijutsu + stats.ninjutsu + stats.genjutsu + stats.medecine + stats.vitesse + stats.intelligence;
  const bases = { Genin: 200, Chunin: 500, Jonin: 800 };
  const multipliers = { Genin: 10, Chunin: 15, Jonin: 20 };
  return (bases[grade] || 200) + sum * (multipliers[grade] || 10);
}

export function computeMatchPv(taijutsu, equipmentBonus = 0) {
  return taijutsu * 10 + equipmentBonus;
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

export function computeMoralWithClanVariance(baseMoral, clan) {
  if (!clan.moral_variance) return baseMoral;
  const variance = Math.floor(Math.random() * (clan.moral_variance * 2 + 1)) - clan.moral_variance;
  return clampStat(baseMoral + variance);
}

/** Labels et inférence de profil ninja (voie + potentiel). */

import { clanTierLabel, getClanTier } from './clanRecruitment.js';

const COMBAT_STATS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

const ART_LABELS_FR = {
  taijutsu: 'Spécialiste Taijutsu',
  ninjutsu: 'Spécialiste Ninjutsu',
  genjutsu: 'Spécialiste Genjutsu',
  medecine: 'Spécialiste Médecine',
};

const ART_LABELS_EN = {
  taijutsu: 'Taijutsu specialist',
  ninjutsu: 'Ninjutsu specialist',
  genjutsu: 'Genjutsu specialist',
  medecine: 'Medicine specialist',
};

const POTENTIAL_LABELS_FR = {
  ordinaire: 'Talent ordinaire',
  prometteur: 'Profil prometteur',
  prodige: 'Prodige',
};

const POTENTIAL_LABELS_EN = {
  ordinaire: 'Average talent',
  prometteur: 'Promising profile',
  prodige: 'Prodigy',
};

export function inferPrimaryArt(stats) {
  return COMBAT_STATS.reduce((best, stat) =>
    stats[stat] > stats[best] ? stat : best
  );
}

/** Estime le potentiel à partir de la répartition des stats (génération ou lecture BDD). */
export function inferPotential(stats, grade = 'Genin') {
  const combat = Math.max(...COMBAT_STATS.map((s) => stats[s]));
  const support = stats.vitesse + stats.intelligence;
  const total = COMBAT_STATS.reduce((s, k) => s + stats[k], 0) + support;

  const thresholds =
    grade === 'Genin'
      ? { prodige: { combat: 9, total: 38 }, prometteur: { combat: 7, total: 34 } }
      : { prodige: { combat: 14, total: 48 }, prometteur: { combat: 11, total: 42 } };

  if (combat >= thresholds.prodige.combat || total >= thresholds.prodige.total) return 'prodige';
  if (combat >= thresholds.prometteur.combat || total >= thresholds.prometteur.total) {
    return 'prometteur';
  }
  return 'ordinaire';
}

export function describeNinjaProfile(ninja, language = 'fr') {
  const stats = {
    taijutsu: ninja.taijutsu,
    ninjutsu: ninja.ninjutsu,
    genjutsu: ninja.genjutsu,
    medecine: ninja.medecine,
    vitesse: ninja.vitesse,
    intelligence: ninja.intelligence,
  };

  const primaryArt = ninja.primary_art || inferPrimaryArt(stats);
  const potential = ninja.potential || inferPotential(stats, ninja.grade);
  const labelsFr = ART_LABELS_FR;
  const labelsEn = ART_LABELS_EN;
  const potFr = POTENTIAL_LABELS_FR;
  const potEn = POTENTIAL_LABELS_EN;

  const clanTier = getClanTier({
    name: ninja.clan_name,
    is_noble: ninja.clan_is_noble,
  });

  return {
    primaryArt,
    potential,
    clanTier,
    clanTierLabel: clanTierLabel(clanTier, language),
    artLabel: language === 'en' ? labelsEn[primaryArt] : labelsFr[primaryArt],
    potentialLabel: language === 'en' ? potEn[potential] : potFr[potential],
    combatPeak: Math.max(...COMBAT_STATS.map((s) => stats[s])),
    isNobleBloodline: clanTier === 'noble',
  };
}

export { COMBAT_STATS, ART_LABELS_FR, POTENTIAL_LABELS_FR };

import { ELEMENTS } from '../validators/ninja.js';
import {
  applyClanBonuses,
  computeMatchChakraMax,
  computeMatchPv,
  computeMoralWithClanVariance,
  computeSalaryCost,
} from './ninjaStats.js';
import { pickClanForRecruitment } from './clanRecruitment.js';
import { pickUniqueCivName } from './ninjaNameGenerator.js';
import { loadGlobalIdentityKeySet } from '../models/ninja.js';
import {
  applyTraitBoost,
  distributeCharacterTraits,
  resolveTraitPayload,
  rollCharacterTrait,
} from './characterTraits.js';

export { CHARACTER_TRAITS, distributeCharacterTraits } from './characterTraits.js';

const CLAN_NAMES = ['Roturier', 'Shizumori', 'Benigiri', 'Kazamine', 'Nagihara', 'Kumatani', 'Yukisawa'];

const FORMES = ['Passable', 'Excellent', 'Divin'];

const PRIMARY_ARTS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

const SECONDARY_STAT = {
  taijutsu: 'vitesse',
  ninjutsu: 'intelligence',
  genjutsu: 'intelligence',
  medecine: 'intelligence',
};

const POTENTIAL_BUDGET = {
  ordinaire: 6,
  prometteur: 9,
  prodige: 12,
};

const POTENTIAL_WEIGHTS = [
  { tier: 'ordinaire', weight: 55 },
  { tier: 'prometteur', weight: 35 },
  { tier: 'prodige', weight: 10 },
];

/** Genin : chaque stat démarre entre baseMin et baseMin + spread (ex. 2–4). */
const GENIN_BASE_SPREAD = 2;
const CHUNIN_BASE_SPREAD = 1;

/** Biais de voie par nom de clan (poids relatifs). */
const CLAN_ART_BIAS = {
  Shizumori: { genjutsu: 3, intelligence: 2 },
  Benigiri: { ninjutsu: 3, genjutsu: 2 },
  Kazamine: { taijutsu: 3, vitesse: 2 },
  Nagihara: { taijutsu: 1, ninjutsu: 1, genjutsu: 1, medecine: 1 },
  Kumatani: { taijutsu: 4, medecine: 1 },
  Yukisawa: { genjutsu: 4, intelligence: 2 },
};

export function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rollWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = Math.floor(Math.random() * total);
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item.tier;
  }
  return items[items.length - 1].tier;
}

export function rollPotential(clan) {
  let weights = [...POTENTIAL_WEIGHTS];
  if (clan?.is_noble) {
    weights = weights.map((w) =>
      w.tier === 'ordinaire' ? { ...w, weight: w.weight - 8 } : { ...w, weight: w.weight + 4 }
    );
  }
  return rollWeighted(weights);
}

export function pickPrimaryArt(clan) {
  const bias = CLAN_ART_BIAS[clan?.name] || {};
  const weighted = PRIMARY_ARTS.map((art) => ({
    art,
    weight: 1 + (bias[art] || 0),
  }));
  return rollWeighted(weighted.map((w) => ({ tier: w.art, weight: w.weight })));
}

const STAT_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

/** Plancher aléatoire par stat — évite que tous les Genin aient le même profil chiffré. */
export function rollStatBases(grade = 'Genin') {
  const baseMin = grade === 'Genin' ? 2 : 4;
  const spread = grade === 'Genin' ? GENIN_BASE_SPREAD : CHUNIN_BASE_SPREAD;
  return Object.fromEntries(
    STAT_KEYS.map((key) => [key, baseMin + Math.floor(Math.random() * (spread + 1))])
  );
}

/**
 * Génère des stats avec une voie dominante et un écart de niveau selon le potentiel.
 * Chaque stat a un plancher variable (Genin : 2–4) avant répartition du budget voie/potentiel.
 */
export function generateSpecializedStats(grade = 'Genin', primaryArt, potential) {
  const statCap = grade === 'Genin' ? 10 : 14;
  const stats = rollStatBases(grade);

  const budget = POTENTIAL_BUDGET[potential] || POTENTIAL_BUDGET.ordinaire;
  const secondary = SECONDARY_STAT[primaryArt];
  let remaining = budget;

  const addPoint = (key, max = statCap) => {
    if (remaining <= 0 || stats[key] >= max) return false;
    stats[key] += 1;
    remaining -= 1;
    return true;
  };

  const primaryShare = Math.ceil(budget * 0.65);
  let primaryAdded = 0;
  while (primaryAdded < primaryShare && remaining > 0) {
    if (addPoint(primaryArt)) primaryAdded += 1;
    else break;
  }

  const secondaryShare = Math.ceil(budget * 0.2);
  let secondaryAdded = 0;
  while (secondaryAdded < secondaryShare && remaining > 0) {
    if (addPoint(secondary)) secondaryAdded += 1;
    else break;
  }

  const others = STAT_KEYS.filter((k) => k !== primaryArt && k !== secondary);
  while (remaining > 0) {
    const key = pickRandom(others);
    if (!addPoint(key)) break;
  }

  return stats;
}

export async function generateNinjaProfile({
  clan,
  clans,
  grade = 'Genin',
  characterTrait,
  language = 'fr',
  recruitmentOptions,
  forcedPotential = null,
  forbiddenIdentityKeys = null,
  forbiddenGlobalKeys = null,
}) {
  const forbidden = forbiddenIdentityKeys || new Set();
  const globalForbidden = forbiddenGlobalKeys ?? (await loadGlobalIdentityKeySet());
  const resolvedClan =
    clan || (clans?.length ? pickClanForRecruitment(clans, recruitmentOptions) : null);
  if (!resolvedClan) {
    throw new Error('generateNinjaProfile: clan ou liste clans requis.');
  }

  const name = pickUniqueCivName({
    forbiddenIdentityKeys: forbidden,
    globalForbiddenKeys: globalForbidden,
    clan: resolvedClan,
  });

  const primaryArt = pickPrimaryArt(resolvedClan);
  const potential = forcedPotential || rollPotential(resolvedClan);
  let stats = generateSpecializedStats(grade, primaryArt, potential);
  stats = applyClanBonuses(stats, resolvedClan);

  let resolvedTrait;
  if (characterTrait === undefined) {
    resolvedTrait = rollCharacterTrait();
  } else if (characterTrait == null) {
    resolvedTrait = { character_trait: null, trait_boost: null };
  } else if (typeof characterTrait === 'object') {
    resolvedTrait = resolveTraitPayload(characterTrait.character_trait, characterTrait.trait_boost);
  } else {
    resolvedTrait = resolveTraitPayload(characterTrait, null);
  }

  stats = applyTraitBoost(stats, resolvedTrait.character_trait, resolvedTrait.trait_boost, grade);

  const moral = computeMoralWithClanVariance(12 + Math.floor(Math.random() * 6), resolvedClan);
  const weeklyForme = pickRandom(FORMES);

  const salary_cost = computeSalaryCost(grade, stats);
  const current_pv_match = computeMatchPv(stats.taijutsu);
  const current_chakra_match = computeMatchChakraMax(grade, stats.ninjutsu);

  return {
    name,
    age: grade === 'Genin' ? 15 : 16,
    grade,
    clan_trait_id: resolvedClan.id,
    element_affinity: pickRandom(ELEMENTS),
    character_trait: resolvedTrait.character_trait,
    trait_boost: resolvedTrait.trait_boost,
    language,
    salary_cost,
    weekly_forme: weeklyForme,
    moral,
    current_pv_match,
    current_chakra_match,
    primary_art: primaryArt,
    potential,
    ...stats,
  };
}

export { CLAN_NAMES, PRIMARY_ARTS };

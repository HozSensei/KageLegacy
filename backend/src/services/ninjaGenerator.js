import { CHARACTER_TRAITS, ELEMENTS } from '../validators/ninja.js';
import {
  applyClanBonuses,
  computeMatchChakraMax,
  computeMatchPv,
  computeMoralWithClanVariance,
  computeSalaryCost,
} from './ninjaStats.js';
import { pickClanForRecruitment } from './clanRecruitment.js';
import { ninjaIdentityKey } from './ninjaNaming.js';

const FIRST_NAMES = ['Haru', 'Sora', 'Rei', 'Kenji', 'Yuki', 'Akira', 'Hana', 'Rin', 'Takeshi', 'Mio'];
const CLAN_NAMES = ['Roturier', 'Nara', 'Uchiwa', 'Hyuga', 'Sarutobi', 'Akimichi', 'Yamanaka'];

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

/** Biais de voie par nom de clan (poids relatifs). */
const CLAN_ART_BIAS = {
  Nara: { genjutsu: 3, intelligence: 2 },
  Uchiwa: { ninjutsu: 3, genjutsu: 2 },
  Hyuga: { taijutsu: 3, vitesse: 2 },
  Sarutobi: { taijutsu: 1, ninjutsu: 1, genjutsu: 1, medecine: 1 },
  Akimichi: { taijutsu: 4, medecine: 1 },
  Yamanaka: { genjutsu: 4, intelligence: 2 },
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

/**
 * Génère des stats avec une voie dominante et un écart de niveau selon le potentiel.
 * Tous les Genin ne se ressemblent plus : prodige tai 9 / gen 3 vs ordinaire 6 / 5 / 5…
 */
export function generateSpecializedStats(grade = 'Genin', primaryArt, potential) {
  const baseMin = grade === 'Genin' ? 2 : 4;
  const statCap = grade === 'Genin' ? 10 : 14;
  const keys = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];
  const stats = Object.fromEntries(keys.map((k) => [k, baseMin]));

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

  const others = keys.filter((k) => k !== primaryArt && k !== secondary);
  while (remaining > 0) {
    const key = pickRandom(others);
    if (!addPoint(key)) break;
  }

  return stats;
}

/** @deprecated Utiliser generateSpecializedStats — conservé pour tests de régression. */
export function generateBaseStats(grade = 'Genin') {
  return generateSpecializedStats(grade, pickRandom(PRIMARY_ARTS), 'ordinaire');
}

export function generateNinjaProfile({
  clan,
  clans,
  grade = 'Genin',
  characterTrait,
  language = 'fr',
  recruitmentOptions,
  forcedPotential = null,
  forbiddenIdentityKeys = null,
}) {
  const forbidden = forbiddenIdentityKeys || new Set();
  const maxAttempts = 80;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const resolvedClan =
      clan || (clans?.length ? pickClanForRecruitment(clans, recruitmentOptions) : null);
    if (!resolvedClan) {
      throw new Error('generateNinjaProfile: clan ou liste clans requis.');
    }

    const firstName = pickRandom(FIRST_NAMES);
    const name =
      resolvedClan.name === 'Roturier' ? firstName : `${firstName} ${resolvedClan.name}`;

    if (forbidden.has(ninjaIdentityKey(name, resolvedClan.name))) {
      continue;
    }

    const primaryArt = pickPrimaryArt(resolvedClan);
    const potential = forcedPotential || rollPotential(resolvedClan);
    let stats = generateSpecializedStats(grade, primaryArt, potential);
    stats = applyClanBonuses(stats, resolvedClan);

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
      character_trait: characterTrait || pickRandom(CHARACTER_TRAITS),
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

  throw new Error('Impossible de générer un prénom et une lignée uniques pour ce ninja.');
}

export function distributeCharacterTraits(count) {
  const traits = [];
  const repeats = Math.floor(count / CHARACTER_TRAITS.length);
  const remainder = count % CHARACTER_TRAITS.length;

  for (const trait of CHARACTER_TRAITS) {
    for (let i = 0; i < repeats; i += 1) traits.push(trait);
  }

  const extra = shuffle(CHARACTER_TRAITS).slice(0, remainder);
  return shuffle([...traits, ...extra]);
}

export { CLAN_NAMES, FIRST_NAMES, PRIMARY_ARTS };

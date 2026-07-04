import { CHARACTER_TRAITS, ELEMENTS } from '../validators/ninja.js';
import {
  applyClanBonuses,
  clampStat,
  computeMatchChakraMax,
  computeMatchPv,
  computeMoralWithClanVariance,
  computeSalaryCost,
} from './ninjaStats.js';

const FIRST_NAMES = ['Haru', 'Sora', 'Rei', 'Kenji', 'Yuki', 'Akira', 'Hana', 'Rin', 'Takeshi', 'Mio'];
const CLAN_NAMES = ['Nara', 'Uchiwa', 'Hyuga', 'Sarutobi', 'Akimichi', 'Yamanaka'];

const FORMES = ['Passable', 'Excellent', 'Divin'];

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

export function generateBaseStats(grade = 'Genin') {
  const min = grade === 'Genin' ? 2 : 4;
  const max = grade === 'Genin' ? 8 : 12;
  const keys = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];
  const stats = Object.fromEntries(keys.map((k) => [k, min]));

  let points = min * keys.length + Math.floor(Math.random() * (max - min + 1) * 2);
  const cap = max * keys.length;

  while (points < cap) {
    const key = pickRandom(keys);
    if (stats[key] < max) {
      stats[key] += 1;
      points += 1;
    }
  }

  return stats;
}

export function generateNinjaProfile({ clan, grade = 'Genin', characterTrait, language = 'fr' }) {
  const firstName = pickRandom(FIRST_NAMES);
  const name = `${firstName} ${clan.name}`;

  let stats = generateBaseStats(grade);
  stats = applyClanBonuses(stats, clan);

  const moral = computeMoralWithClanVariance(12 + Math.floor(Math.random() * 6), clan);
  const weeklyForme = pickRandom(FORMES);

  const salary_cost = computeSalaryCost(grade, stats);
  const current_pv_match = computeMatchPv(stats.taijutsu);
  const current_chakra_match = computeMatchChakraMax(grade, stats.ninjutsu);

  return {
    name,
    age: grade === 'Genin' ? 15 : 16,
    grade,
    clan_trait_id: clan.id,
    element_affinity: pickRandom(ELEMENTS),
    character_trait: characterTrait || pickRandom(CHARACTER_TRAITS),
    language,
    salary_cost,
    weekly_forme: weeklyForme,
    moral,
    current_pv_match,
    current_chakra_match,
    ...stats,
  };
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

export { CLAN_NAMES, FIRST_NAMES };

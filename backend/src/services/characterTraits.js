import { clampStatToGradeCap } from './gradeProgression.js';

/** Profils de caractère — boost permanent d'une stat à la génération. */
export const CHARACTER_TRAITS = [
  'Brute',
  'Canaliseur',
  'Illusionniste',
  'Guerisseur',
  'Veloce',
  'Stratege',
];

export const TRAIT_STAT = {
  Brute: 'taijutsu',
  Canaliseur: 'ninjutsu',
  Illusionniste: 'genjutsu',
  Guerisseur: 'medecine',
  Veloce: 'vitesse',
  Stratege: 'intelligence',
};

/** ~30 % sans profil. */
export const NO_TRAIT_CHANCE = 0.3;

/** Parmi les profils, ~30 % en +2. */
export const BOOST_TWO_CHANCE = 0.3;

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * @returns {{ character_trait: string|null, trait_boost: 1|2|null }}
 */
export function rollCharacterTrait() {
  if (Math.random() < NO_TRAIT_CHANCE) {
    return { character_trait: null, trait_boost: null };
  }
  const character_trait = pickRandom(CHARACTER_TRAITS);
  const trait_boost = Math.random() < BOOST_TWO_CHANCE ? 2 : 1;
  return { character_trait, trait_boost };
}

/**
 * Répartit des profils pour une escouade de départ (mélange avec sans profil).
 * @param {number} count
 * @returns {Array<{ character_trait: string|null, trait_boost: 1|2|null }>}
 */
export function distributeCharacterTraits(count) {
  const slots = [];
  const withTrait = Math.max(1, Math.round(count * (1 - NO_TRAIT_CHANCE)));
  const traits = [];
  for (let i = 0; i < withTrait; i += 1) {
    traits.push(CHARACTER_TRAITS[i % CHARACTER_TRAITS.length]);
  }
  // Shuffle traits then pad with nulls
  for (let i = traits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [traits[i], traits[j]] = [traits[j], traits[i]];
  }
  for (let i = 0; i < count; i += 1) {
    if (i < traits.length) {
      slots.push({
        character_trait: traits[i],
        trait_boost: Math.random() < BOOST_TWO_CHANCE ? 2 : 1,
      });
    } else {
      slots.push({ character_trait: null, trait_boost: null });
    }
  }
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

/**
 * Applique le boost de profil sur un objet stats (mutation + retour).
 */
export function applyTraitBoost(stats, characterTrait, traitBoost, grade = 'Genin') {
  if (!characterTrait || !traitBoost) return stats;
  const statKey = TRAIT_STAT[characterTrait];
  if (!statKey) return stats;
  const next = { ...stats };
  const current = Number(next[statKey]) || 0;
  next[statKey] = clampStatToGradeCap({ grade }, statKey, current + Number(traitBoost));
  return next;
}

export function resolveTraitPayload(characterTrait, traitBoost) {
  if (!characterTrait || !CHARACTER_TRAITS.includes(characterTrait)) {
    return { character_trait: null, trait_boost: null };
  }
  const boost = Number(traitBoost) === 2 ? 2 : 1;
  return { character_trait: characterTrait, trait_boost: boost };
}

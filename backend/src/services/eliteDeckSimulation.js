import { defaultTechniquesForFighter } from './combat/pli/deckBuilder.js';
import { DECK_ELEMENTS_COUNT } from './combat/pli/constants.js';
import { applyFormeToStats } from './combat/forme.js';

export const OPPONENT_DECK_PROFILE_IDS = ['complete', 'element_heavy', 'domain_ninjutsu', 'sparse'];

const ELEMENT_STUBS = {
  'nin-eclair-discret': {
    slug: 'nin-eclair-discret',
    name_fr: 'Éclair discret',
    name_en: 'Subtle bolt',
    stat_type: 'ninjutsu',
    element_affinity: 'Raiton',
  },
  'raiton-surcharge': {
    slug: 'raiton-surcharge',
    name_fr: 'Surcharge Raiton',
    name_en: 'Lightning surge',
    stat_type: 'ninjutsu',
    element_affinity: 'Raiton',
  },
  'futon-lame-retour': {
    slug: 'futon-lame-retour',
    name_fr: 'Lame de retour',
    name_en: 'Returning blade',
    stat_type: 'taijutsu',
    element_affinity: 'Futon',
  },
  'tai-parade-ecole': {
    slug: 'tai-parade-ecole',
    name_fr: 'Parade d\'école',
    name_en: 'School parry',
    stat_type: 'taijutsu',
    element_affinity: 'Doton',
  },
  'gen-kage-bunshin': {
    slug: 'gen-kage-bunshin',
    name_fr: 'Kage Bunshin',
    name_en: 'Shadow clone',
    stat_type: 'genjutsu',
    element_affinity: 'Futon',
  },
  'doton-racines': {
    slug: 'doton-racines',
    name_fr: 'Racines Doton',
    name_en: 'Earth roots',
    stat_type: 'ninjutsu',
    element_affinity: 'Doton',
  },
  'med-pansement-rapide': {
    slug: 'med-pansement-rapide',
    name_fr: 'Pansement rapide',
    name_en: 'Quick bandage',
    stat_type: 'medecine',
    element_affinity: 'Suiton',
  },
  'med-soin-zone': {
    slug: 'med-soin-zone',
    name_fr: 'Soin de zone',
    name_en: 'Area heal',
    stat_type: 'medecine',
    element_affinity: 'Suiton',
  },
};

const PROFILE_ELEMENT_LOADOUTS = {
  complete: ['nin-eclair-discret', 'tai-parade-ecole', 'med-pansement-rapide', 'raiton-surcharge', 'futon-lame-retour'],
  element_heavy: ['med-pansement-rapide', 'med-soin-zone', 'raiton-surcharge', 'doton-racines', 'futon-lame-retour'],
  domain_ninjutsu: ['nin-eclair-discret', 'raiton-surcharge', 'doton-racines', 'futon-lame-retour'],
  sparse: ['tai-parade-ecole', 'med-pansement-rapide'],
};

/** @deprecated Alias historiques consignes Assaut/Mur/Flux */
const LEGACY_PROFILE_ALIASES = {
  offensive: 'domain_ninjutsu',
  assaut: 'domain_ninjutsu',
  tank: 'complete',
  mur: 'complete',
  protect: 'element_heavy',
  flux: 'element_heavy',
  mixed: 'complete',
  equilibre: 'complete',
};

export const OPPONENT_DECK_PROFILE_LABELS = {
  fr: {
    complete: 'Deck complet (5 éléments)',
    element_heavy: 'Deck riche en éléments',
    domain_ninjutsu: 'Orientation Ninjutsu',
    sparse: 'Deck incomplet (relais)',
  },
  en: {
    complete: 'Full deck (5 elements)',
    element_heavy: 'Element-heavy deck',
    domain_ninjutsu: 'Ninjutsu-focused',
    sparse: 'Sparse deck (relays)',
  },
};

export function normalizeOpponentDeckProfile(profile) {
  if (OPPONENT_DECK_PROFILE_IDS.includes(profile)) return profile;
  return LEGACY_PROFILE_ALIASES[profile] || 'complete';
}

function fighterStats(ninja) {
  return applyFormeToStats(ninja);
}

function defaultTechniquesForNinjas(ninjas) {
  const techniquesByNinjaId = {};
  for (const ninja of ninjas) {
    techniquesByNinjaId[ninja.id] = defaultTechniquesForFighter({ stats: fighterStats(ninja) });
  }
  return techniquesByNinjaId;
}

function buildElementCards(slugs = []) {
  return slugs.map((slug) => ELEMENT_STUBS[slug]).filter(Boolean);
}

/**
 * Deck synthétique adverse pour le simulateur Élite (pas un vrai joueur).
 */
export function buildSyntheticOpponentDeck(ninjas, profileInput = 'complete') {
  const profile = normalizeOpponentDeckProfile(profileInput);
  const elementSlugs = PROFILE_ELEMENT_LOADOUTS[profile] || PROFILE_ELEMENT_LOADOUTS.complete;
  let techniquesByNinjaId = {};

  if (profile === 'sparse') {
    techniquesByNinjaId = {};
  } else if (profile === 'domain_ninjutsu') {
    for (const ninja of ninjas) {
      techniquesByNinjaId[ninja.id] = { primary: 'ninjutsu', secondary: 'genjutsu' };
    }
  } else {
    techniquesByNinjaId = defaultTechniquesForNinjas(ninjas);
  }

  const elementCount =
    profile === 'sparse'
      ? Math.min(2, elementSlugs.length)
      : profile === 'domain_ninjutsu'
        ? Math.min(4, DECK_ELEMENTS_COUNT)
        : DECK_ELEMENTS_COUNT;

  return {
    techniquesByNinjaId,
    rawTechniquesByNinjaId: techniquesByNinjaId,
    elementCards: buildElementCards(elementSlugs.slice(0, elementCount)),
  };
}

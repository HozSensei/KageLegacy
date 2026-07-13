import { defaultTechniquesForFighter } from './combat/pli/deckBuilder.js';
import { DECK_ELEMENTS_COUNT, DOMAINS, DOMAIN_LABELS } from './combat/pli/constants.js';
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

function orderedNinjas(ninjas) {
  return [...ninjas]
    .filter((n) => n.squad_position != null)
    .sort((a, b) => a.squad_position - b.squad_position)
    .slice(0, 3);
}

function fighterStats(ninja) {
  return applyFormeToStats(ninja);
}

export function getSimulatorDomainOptions(locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  return DOMAINS.map((value) => ({
    value,
    label: DOMAIN_LABELS[value] || value,
    labelKey: `squad.deck.domains.${value}`,
  }));
}

export function getSimulatorElementOptions(locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  return Object.entries(ELEMENT_STUBS).map(([slug, stub]) => ({
    slug,
    label: lang === 'en' ? stub.name_en : stub.name_fr,
    statType: stub.stat_type,
    elementAffinity: stub.element_affinity,
  }));
}

function buildElementCards(slugs = []) {
  return slugs.map((slug) => ELEMENT_STUBS[slug]).filter(Boolean);
}

function defaultTechniquesForNinjas(ninjas) {
  const techniquesByNinjaId = {};
  for (const ninja of ninjas) {
    techniquesByNinjaId[ninja.id] = defaultTechniquesForFighter({ stats: fighterStats(ninja) });
  }
  return techniquesByNinjaId;
}

function normalizeSlotConfig(raw) {
  if (!raw || raw.configured === false) {
    return { configured: false, primary: null, secondary: null };
  }
  const primary = DOMAINS.includes(raw.primary) ? raw.primary : 'taijutsu';
  const secondary = DOMAINS.includes(raw.secondary) ? raw.secondary : 'ninjutsu';
  return { configured: true, primary, secondary };
}

/**
 * Construit un deck adverse personnalisé (simulateur Élite).
 * slots[i].configured=false → relais de comblement pour ce ninja.
 */
export function buildCustomOpponentDeck(ninjas, { slots = [], elementSlugs = [] } = {}) {
  const ordered = orderedNinjas(ninjas);
  const techniquesByNinjaId = {};

  for (let i = 0; i < ordered.length; i += 1) {
    const slot = normalizeSlotConfig(slots[i]);
    if (slot.configured) {
      techniquesByNinjaId[ordered[i].id] = {
        primary: slot.primary,
        secondary: slot.secondary,
      };
    }
  }

  const safeSlugs = (elementSlugs || [])
    .filter((slug) => ELEMENT_STUBS[slug])
    .slice(0, DECK_ELEMENTS_COUNT);

  return {
    techniquesByNinjaId,
    rawTechniquesByNinjaId: techniquesByNinjaId,
    elementCards: buildElementCards(safeSlugs),
  };
}

export function getPresetDeckConfig(ninjas, profileInput = 'complete') {
  const profile = normalizeOpponentDeckProfile(profileInput);
  const deck = buildSyntheticOpponentDeck(ninjas, profile);
  const ordered = orderedNinjas(ninjas);
  const slots = ordered.map((ninja) => {
    const tech = deck.techniquesByNinjaId[ninja.id];
    return tech
      ? { configured: true, primary: tech.primary, secondary: tech.secondary }
      : { configured: false, primary: 'taijutsu', secondary: 'ninjutsu' };
  });
  return {
    slots,
    elementSlugs: (deck.elementCards || []).map((card) => card.slug).filter(Boolean),
  };
}

export function describeOpponentDeck(deck, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const configured = Object.keys(deck?.techniquesByNinjaId || {}).length;
  const elements = deck?.elementCards?.length ?? 0;
  return lang === 'en'
    ? `Custom deck · ${configured}/3 techniques · ${elements}/5 elements`
    : `Deck personnalisé · ${configured}/3 techniques · ${elements}/5 éléments`;
}

export function isCustomOpponentDeckInput(input) {
  if (!input || typeof input !== 'object') return false;
  return Array.isArray(input.slots) || Array.isArray(input.elementSlugs);
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

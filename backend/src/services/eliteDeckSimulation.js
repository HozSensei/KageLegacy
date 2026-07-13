import { TECHNIQUE_CARDS_PER_NINJA, DOMAINS, DOMAIN_LABELS } from './combat/pli/constants.js';
import { defaultTechniquesForFighter } from './combat/pli/deckBuilder.js';

export const OPPONENT_DECK_PROFILE_IDS = ['complete', 'technique_heavy', 'domain_ninjutsu', 'sparse'];

const TECHNIQUE_STUBS = {
  'tai-lame-chakras': {
    slug: 'tai-lame-chakras',
    name_fr: 'Lame de chakra',
    name_en: 'Chakra Blade',
    stat_type: 'taijutsu',
    pli_secondary_stat: 'ninjutsu',
    pli_bonus_pct: 0.15,
    element_affinity: null,
  },
  'nin-afflux-chakra': {
    slug: 'nin-afflux-chakra',
    name_fr: 'Afflux de chakra',
    name_en: 'Chakra Surge',
    stat_type: 'ninjutsu',
    pli_secondary_stat: null,
    pli_bonus_pct: 0.15,
    element_affinity: null,
  },
  'gen-mirage-simple': {
    slug: 'gen-mirage-simple',
    name_fr: 'Mirage simple',
    name_en: 'Simple Mirage',
    stat_type: 'genjutsu',
    pli_secondary_stat: null,
    pli_bonus_pct: 0.15,
    element_affinity: null,
  },
  'nin-katon-boule': {
    slug: 'nin-katon-boule',
    name_fr: 'Boule de feu',
    name_en: 'Fireball',
    stat_type: 'ninjutsu',
    pli_secondary_stat: null,
    pli_bonus_pct: 0.3,
    element_affinity: 'Katon',
  },
  'nin-raiton-eclair': {
    slug: 'nin-raiton-eclair',
    name_fr: 'Éclair raiton',
    name_en: 'Lightning Bolt',
    stat_type: 'ninjutsu',
    pli_secondary_stat: null,
    pli_bonus_pct: 0.3,
    element_affinity: 'Raiton',
  },
  'tai-lame-suiton': {
    slug: 'tai-lame-suiton',
    name_fr: 'Lame suiton',
    name_en: 'Water Blade',
    stat_type: 'taijutsu',
    pli_secondary_stat: 'ninjutsu',
    pli_bonus_pct: 0.3,
    element_affinity: 'Suiton',
  },
  'med-scalpel-chakra': {
    slug: 'med-scalpel-chakra',
    name_fr: 'Scalpel de chakra',
    name_en: 'Chakra Scalpel',
    stat_type: 'medecine',
    pli_secondary_stat: 'taijutsu',
    pli_bonus_pct: 0.2,
    element_affinity: null,
  },
  'nin-chidori': {
    slug: 'nin-chidori',
    name_fr: 'Chidori',
    name_en: 'Chidori',
    stat_type: 'ninjutsu',
    pli_secondary_stat: 'taijutsu',
    pli_bonus_pct: 0.32,
    element_affinity: 'Raiton',
  },
};

const PROFILE_LOADOUTS = {
  complete: {
    slugs: [['tai-lame-chakras'], ['nin-afflux-chakra'], ['gen-mirage-simple']],
    domains: [
      { primary: 'taijutsu', secondary: 'ninjutsu' },
      { primary: 'ninjutsu', secondary: 'genjutsu' },
      { primary: 'genjutsu', secondary: 'taijutsu' },
    ],
  },
  technique_heavy: {
    slugs: [['nin-katon-boule'], ['tai-lame-suiton'], ['nin-chidori']],
    domains: [
      { primary: 'ninjutsu', secondary: 'taijutsu' },
      { primary: 'taijutsu', secondary: 'medecine' },
      { primary: 'ninjutsu', secondary: 'taijutsu' },
    ],
  },
  domain_ninjutsu: {
    slugs: [['nin-afflux-chakra'], ['nin-katon-boule'], ['nin-raiton-eclair']],
    domains: [
      { primary: 'ninjutsu', secondary: 'ninjutsu' },
      { primary: 'ninjutsu', secondary: 'ninjutsu' },
      { primary: 'ninjutsu', secondary: 'ninjutsu' },
    ],
  },
  sparse: {
    slugs: [['tai-lame-chakras'], [], []],
    domains: [
      { primary: 'taijutsu', secondary: 'ninjutsu' },
      null,
      null,
    ],
  },
};

const LEGACY_PROFILE_ALIASES = {
  offensive: 'domain_ninjutsu',
  assaut: 'domain_ninjutsu',
  tank: 'complete',
  mur: 'complete',
  protect: 'technique_heavy',
  flux: 'technique_heavy',
  element_heavy: 'technique_heavy',
  mixed: 'complete',
  equilibre: 'complete',
};

export const OPPONENT_DECK_PROFILE_LABELS = {
  fr: {
    complete: 'Deck complet (9 plis)',
    technique_heavy: 'Deck riche en techniques',
    domain_ninjutsu: 'Orientation Ninjutsu',
    sparse: 'Deck incomplet (relais)',
  },
  en: {
    complete: 'Full deck (9 pli)',
    technique_heavy: 'Technique-heavy deck',
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

function stubToCard(id, stub) {
  return {
    userTacticCardId: id,
    slug: stub.slug,
    nameFr: stub.name_fr,
    nameEn: stub.name_en,
    statType: stub.stat_type,
    pliSecondaryStat: stub.pli_secondary_stat,
    pliBonusPct: stub.pli_bonus_pct,
    elementAffinity: stub.element_affinity,
  };
}

function buildDeckFromLoadout(ninjas, loadout = {}) {
  const ordered = orderedNinjas(ninjas);
  const techniqueSlotsByNinjaId = {};
  const techniquesByNinjaId = {};
  const techniqueCardsById = {};
  let fakeId = 1;
  const slugRows = loadout.slugs || [];
  const domainRows = loadout.domains || [];

  for (let i = 0; i < ordered.length; i += 1) {
    const ninja = ordered[i];
    const slugs = (slugRows[i] || []).filter((slug) => TECHNIQUE_STUBS[slug]).slice(0, TECHNIQUE_CARDS_PER_NINJA);
    const ids = [];
    for (const slug of slugs) {
      const stub = TECHNIQUE_STUBS[slug];
      techniqueCardsById[fakeId] = stubToCard(fakeId, stub);
      ids.push(fakeId);
      fakeId += 1;
    }
    if (ids.length) techniqueSlotsByNinjaId[ninja.id] = ids;

    const domainPick = domainRows[i];
    if (domainPick?.primary && domainPick?.secondary) {
      techniquesByNinjaId[ninja.id] = domainPick;
    } else {
      const defaults = defaultTechniquesForFighter({ stats: ninja });
      techniquesByNinjaId[ninja.id] = defaults;
    }
  }

  return { techniqueSlotsByNinjaId, techniquesByNinjaId, techniqueCardsById };
}

export function getSimulatorTechniqueOptions(locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  return Object.values(TECHNIQUE_STUBS).map((stub) => ({
    slug: stub.slug,
    label: lang === 'en' ? stub.name_en : stub.name_fr,
    statType: stub.stat_type,
    bonusPct: stub.pli_bonus_pct,
    elementAffinity: stub.element_affinity,
  }));
}

/** @deprecated — simulateur Élite utilise les slugs de techniques */
export function getSimulatorDomainOptions(locale = 'fr') {
  return DOMAINS.map((value) => ({
    value,
    label: DOMAIN_LABELS[value] || value,
    labelKey: `squad.deck.domains.${value}`,
  }));
}

/** @deprecated */
export function getSimulatorElementOptions(locale = 'fr') {
  return getSimulatorTechniqueOptions(locale);
}

export function buildCustomOpponentDeck(ninjas, { techniqueSlugsByNinja = [] } = {}) {
  const loadout = {
    slugs: techniqueSlugsByNinja,
    domains: orderedNinjas(ninjas).map((ninja) => defaultTechniquesForFighter({ stats: ninja })),
  };
  return buildDeckFromLoadout(ninjas, loadout);
}

export function getPresetDeckConfig(ninjas, profileInput = 'complete') {
  const profile = normalizeOpponentDeckProfile(profileInput);
  const loadout = PROFILE_LOADOUTS[profile] || PROFILE_LOADOUTS.complete;
  const deck = buildDeckFromLoadout(ninjas, loadout);
  const ordered = orderedNinjas(ninjas);
  const techniqueSlugsByNinja = ordered.map((ninja) => {
    const ids = deck.techniqueSlotsByNinjaId[ninja.id] || [];
    return ids
      .map((id) => deck.techniqueCardsById[id]?.slug)
      .filter(Boolean);
  });
  return { techniqueSlugsByNinja };
}

export function describeOpponentDeck(deck, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const configured = Object.values(deck?.techniqueSlotsByNinjaId || {}).reduce(
    (sum, ids) => sum + (ids?.length || 0),
    0
  );
  return lang === 'en'
    ? `Custom deck · ${configured}/3 technique cards`
    : `Deck personnalisé · ${configured}/3 cartes technique`;
}

export function isCustomOpponentDeckInput(input) {
  if (!input || typeof input !== 'object') return false;
  return Array.isArray(input.techniqueSlugsByNinja) || Array.isArray(input.slots) || Array.isArray(input.elementSlugs);
}

export function buildSyntheticOpponentDeck(ninjas, profileInput = 'complete') {
  const profile = normalizeOpponentDeckProfile(profileInput);
  const loadout = PROFILE_LOADOUTS[profile] || PROFILE_LOADOUTS.complete;
  return buildDeckFromLoadout(ninjas, loadout);
}

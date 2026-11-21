/**
 * Catalogue marketing minimal pour la landing (hors API auth).
 * Les slugs doivent exister dans `cardArt.js` pour résoudre l’illustration.
 */
export const LANDING_SHOWCASE_CARD_POOL = [
  {
    slug: 'assaut-de-l-aube',
    nameFr: "Assaut de l'aube",
    nameEn: 'Dawn Assault',
    type: 'attack',
    rarity: 'rare',
    element: 'Katon',
    cost: 2,
    statType: 'taijutsu',
    effects: [{ type: 'damage', value: 9 }],
  },
  {
    slug: 'colonne-de-feu',
    nameFr: 'Colonne de feu',
    nameEn: 'Pillar of Fire',
    type: 'attack',
    rarity: 'legendary',
    element: 'Katon',
    cost: 3,
    statType: 'ninjutsu',
    effects: [{ type: 'damage', value: 14 }],
  },
  {
    slug: 'dome-d-eau',
    nameFr: "Dôme d'eau",
    nameEn: 'Water Dome',
    type: 'defense',
    rarity: 'rare',
    element: 'Suiton',
    cost: 2,
    statType: 'ninjutsu',
    effects: [{ type: 'block', value: 10 }],
  },
  {
    slug: 'faucon-de-foudre',
    nameFr: 'Faucon de foudre',
    nameEn: 'Thunder Falcon',
    type: 'summon',
    rarity: 'legendary',
    element: 'Raiton',
    cost: 3,
    statType: 'ninjutsu',
    effects: [{ type: 'damage', value: 8 }, { type: 'draw', value: 1 }],
  },
  {
    slug: 'citadelle-de-pierre',
    nameFr: 'Citadelle de pierre',
    nameEn: 'Stone Citadel',
    type: 'defense',
    rarity: 'legendary',
    element: 'Doton',
    cost: 3,
    statType: 'ninjutsu',
    effects: [{ type: 'block', value: 14 }],
  },
  {
    slug: 'danse-des-lames',
    nameFr: 'Danse des lames',
    nameEn: 'Blade Dance',
    type: 'attack',
    rarity: 'rare',
    element: 'Futon',
    cost: 2,
    statType: 'taijutsu',
    effects: [{ type: 'damage', value: 7 }],
  },
  {
    slug: 'elixir-clair',
    nameFr: 'Élixir clair',
    nameEn: 'Clear Elixir',
    type: 'item',
    rarity: 'common',
    element: null,
    cost: 1,
    statType: 'medicine',
    effects: [{ type: 'heal', value: 6 }],
  },
  {
    slug: 'echo-hypnotique',
    nameFr: 'Écho hypnotique',
    nameEn: 'Hypnotic Echo',
    type: 'skill',
    rarity: 'rare',
    element: 'Futon',
    cost: 2,
    statType: 'genjutsu',
    effects: [{ type: 'status', status: 'damage_pct', statusValue: -15 }],
  },
  {
    slug: 'corbeau-spectre',
    nameFr: 'Corbeau spectre',
    nameEn: 'Specter Crow',
    type: 'summon',
    rarity: 'mythic',
    element: 'Futon',
    cost: 4,
    statType: 'genjutsu',
    effects: [{ type: 'damage', value: 11 }],
  },
  {
    slug: 'clan-benigiri',
    nameFr: 'Héritage Benigiri',
    nameEn: 'Benigiri Heritage',
    type: 'skill',
    rarity: 'legendary',
    element: 'Katon',
    cost: 0,
    statType: 'ninjutsu',
    effects: [{ type: 'draw', value: 1 }],
  },
  {
    slug: 'garde-croisee',
    nameFr: 'Garde croisée',
    nameEn: 'Cross Guard',
    type: 'defense',
    rarity: 'common',
    element: null,
    cost: 1,
    statType: 'taijutsu',
    effects: [{ type: 'block', value: 5 }],
  },
  {
    slug: 'esprit-du-renard',
    nameFr: 'Esprit du renard',
    nameEn: 'Fox Spirit',
    type: 'skill',
    rarity: 'rare',
    element: 'Futon',
    cost: 2,
    statType: 'genjutsu',
    effects: [{ type: 'draw', value: 2 }],
  },
  {
    slug: 'faille-sismique',
    nameFr: 'Faille sismique',
    nameEn: 'Seismic Rift',
    type: 'attack',
    rarity: 'rare',
    element: 'Doton',
    cost: 2,
    statType: 'ninjutsu',
    effects: [{ type: 'damage', value: 8 }],
  },
  {
    slug: 'concentration',
    nameFr: 'Concentration',
    nameEn: 'Focus',
    type: 'skill',
    rarity: 'common',
    element: null,
    cost: 1,
    statType: 'medicine',
    effects: [{ type: 'chakra', value: 1 }],
  },
  {
    slug: 'barrage-de-lames',
    nameFr: 'Barrage de lames',
    nameEn: 'Blade Barrage',
    type: 'attack',
    rarity: 'legendary',
    element: 'Futon',
    cost: 3,
    statType: 'taijutsu',
    effects: [{ type: 'damage', value: 12 }],
  },
];

/** Tirage aléatoire sans doublon. */
export function pickLandingShowcaseCards(count = 8) {
  const pool = [...LANDING_SHOWCASE_CARD_POOL];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Sets fixes (variété de types / éléments) pour hero et section deck. */
export const LANDING_HERO_CARDS = [
  LANDING_SHOWCASE_CARD_POOL[0],
  LANDING_SHOWCASE_CARD_POOL[2],
  LANDING_SHOWCASE_CARD_POOL[3],
];

export const LANDING_DECK_CARDS = [
  LANDING_SHOWCASE_CARD_POOL[1],
  LANDING_SHOWCASE_CARD_POOL[4],
  LANDING_SHOWCASE_CARD_POOL[5],
];

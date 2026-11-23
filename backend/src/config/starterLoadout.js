/**
 * Cartes de base accordées à la création (slugs alignés sur seedCards + vagues).
 * La collection couvre les quatre voies et des neutres ; deux decks starter
 * (Taijutsu / Ninjutsu) respectent la règle 15 + 5.
 */

/** Quantités accordées à la collection (plafond 3 = MAX_COPIES_PER_CARD). */
export const STARTER_GRANT_QUANTITIES = Object.freeze({
  'poing-rapide': 3,
  'poing-du-dragon': 2,
  'barrage-de-lames': 3,
  'garde-haute': 3,
  'contre-tranchant': 3,
  'frappe-opportuniste': 1,
  'souffle-ardent': 3,
  'lance-de-foudre': 1,
  'vague-brumeuse': 3,
  'mur-de-pierre': 3,
  'vent-porteur': 3,
  'etincelle-seche': 2,
  'goutte-perforante': 1,
  'voile-d-ombre': 1,
  concentration: 1,
  'mirage-persistant': 1,
  'paume-apaisante': 1,
  'pilule-du-soldat': 2,
  'parchemin-de-scellement': 1,
  'ampoule-de-chakra': 1,
  'clone-de-combat': 1,
  'esprit-du-renard': 1,
  'kunai-de-fer': 1,
  'bande-de-soie': 1,
});

export const STARTER_CARD_SLUGS = Object.freeze(Object.keys(STARTER_GRANT_QUANTITIES));

export function getStarterGrantQuantity(slug) {
  return STARTER_GRANT_QUANTITIES[slug] || 1;
}

/**
 * Presets des deux decks de départ (quantités ≤ exemplaires offerts).
 * Chacun : 15 voie principale + 5 voie secondaire, taille 20.
 */
export const STARTER_DECK_PRESETS = Object.freeze([
  Object.freeze({
    id: 'taijutsu',
    nameFr: 'Deck Taijutsu',
    nameEn: 'Taijutsu Deck',
    archetype: 'aggro',
    cards: Object.freeze({
      'poing-rapide': 3,
      'barrage-de-lames': 3,
      'garde-haute': 3,
      'contre-tranchant': 3,
      'poing-du-dragon': 2,
      'frappe-opportuniste': 1,
      'vague-brumeuse': 3,
      'souffle-ardent': 1,
      'vent-porteur': 1,
    }),
  }),
  Object.freeze({
    id: 'ninjutsu',
    nameFr: 'Deck Ninjutsu',
    nameEn: 'Ninjutsu Deck',
    archetype: 'midrange',
    cards: Object.freeze({
      'vague-brumeuse': 3,
      'souffle-ardent': 3,
      'mur-de-pierre': 3,
      'vent-porteur': 3,
      'etincelle-seche': 2,
      'goutte-perforante': 1,
      'poing-rapide': 3,
      'garde-haute': 2,
    }),
  }),
]);

/**
 * Construit les entrées d’un preset à partir de la collection possédée.
 * Omet les cartes absentes ; plafonne aux exemplaires réellement possédés.
 */
export function selectStarterDeckEntries(collection, preset = STARTER_DECK_PRESETS[0]) {
  const bySlug = new Map(
    collection.filter(entry => entry?.card?.slug).map(entry => [entry.card.slug, entry]),
  );
  const entries = [];
  for (const [slug, want] of Object.entries(preset.cards)) {
    const owned = bySlug.get(slug);
    if (!owned) continue;
    const quantity = Math.min(Number(owned.quantity) || 0, want);
    if (quantity < 1) continue;
    entries.push({ ...owned, quantity });
  }
  return entries;
}

/** @deprecated Prefer STARTER_DECK_PRESETS[0].nameFr */
export const STARTER_DECK_NAME_FR = STARTER_DECK_PRESETS[0].nameFr;
/** @deprecated Prefer STARTER_DECK_PRESETS[0].nameEn */
export const STARTER_DECK_NAME_EN = STARTER_DECK_PRESETS[0].nameEn;

/**
 * Cartes de base accordées à la création (slugs alignés sur seedCards + vagues).
 * Uniquement rareté « common » (affichée Normal) — pas de rare / légendaire / mythique.
 * Deux decks starter (Taijutsu / Ninjutsu) respectent la règle 15 + 5.
 */

/** Quantités accordées à la collection (plafond 3 = MAX_COPIES_PER_CARD). */
export const STARTER_GRANT_QUANTITIES = Object.freeze({
  // Taijutsu
  'poing-rapide': 3,
  'barrage-de-lames': 3,
  'garde-haute': 3,
  'contre-tranchant': 3,
  'lame-crespusculaire': 3,
  'serres-de-fer': 2,
  'coup-de-talon': 2,
  // Ninjutsu
  'vague-brumeuse': 3,
  'vent-porteur': 3,
  'etincelle-seche': 3,
  'goutte-perforante': 3,
  'lame-de-braise': 2,
  'cendre-spiralee': 2,
  // Autres voies / neutres (collection, hors decks starter)
  concentration: 2,
  'paume-apaisante': 2,
  'kunai-de-fer': 2,
  'pilule-du-soldat': 2,
  'ampoule-de-chakra': 2,
  'bande-de-soie': 2,
});

export const STARTER_CARD_SLUGS = Object.freeze(Object.keys(STARTER_GRANT_QUANTITIES));

export function getStarterGrantQuantity(slug) {
  return STARTER_GRANT_QUANTITIES[slug] || 1;
}

/**
 * Presets des deux decks de départ (quantités ≤ exemplaires offerts).
 * Chacun : 15 voie principale + 5 voie secondaire, taille 20, rareté normale uniquement.
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
      'lame-crespusculaire': 3,
      'vague-brumeuse': 3,
      'vent-porteur': 2,
    }),
  }),
  Object.freeze({
    id: 'ninjutsu',
    nameFr: 'Deck Ninjutsu',
    nameEn: 'Ninjutsu Deck',
    archetype: 'midrange',
    cards: Object.freeze({
      'vague-brumeuse': 3,
      'vent-porteur': 3,
      'etincelle-seche': 3,
      'goutte-perforante': 3,
      'lame-de-braise': 2,
      'cendre-spiralee': 1,
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

/**
 * Cartes de base accordées à la création (slugs alignés sur seedCards STARTER_CARDS).
 * La collection couvre les quatre voies ; le deck starter n’en utilise que deux.
 */
export const STARTER_CARD_SLUGS = [
  'poing-rapide',
  'poing-du-dragon',
  'barrage-de-lames',
  'souffle-ardent',
  'lance-de-foudre',
  'vague-brumeuse',
  'garde-haute',
  'mur-de-pierre',
  'voile-d-ombre',
  'contre-tranchant',
  'paume-apaisante',
  'concentration',
  'mirage-persistant',
  'vent-porteur',
  'kunai-de-fer',
  'pilule-du-soldat',
  'parchemin-de-scellement',
  'ampoule-de-chakra',
  'clone-de-combat',
  'esprit-du-renard',
  'frappe-opportuniste',
  'bande-de-soie',
];

const STARTER_DECK_ARTS = new Set(['taijutsu', 'ninjutsu', 'common']);
const STARTER_DOUBLE_COPIES = new Set([
  'poing-rapide',
  'garde-haute',
  'vague-brumeuse',
  'pilule-du-soldat',
]);

export function getStarterGrantQuantity(slug) {
  return STARTER_DOUBLE_COPIES.has(slug) ? 2 : 1;
}

/** Sous-ensemble du lot starter, sans dépasser les exemplaires réellement possédés. */
export function selectStarterDeckEntries(collection) {
  return collection
    .filter(
      ({ card, quantity }) =>
        quantity > 0 &&
        STARTER_CARD_SLUGS.includes(card.slug) &&
        STARTER_DECK_ARTS.has(card.statType),
    )
    .map(entry => ({
      ...entry,
      quantity: Math.min(entry.quantity, getStarterGrantQuantity(entry.card.slug)),
    }));
}

export const STARTER_DECK_NAME_FR = 'Deck de départ';
export const STARTER_DECK_NAME_EN = 'Starter deck';

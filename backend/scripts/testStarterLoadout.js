/**
 * Tests starter loadout (collection offerte et presets des deux decks).
 * Usage: node scripts/testStarterLoadout.js
 */
import {
  getStarterGrantQuantity,
  selectStarterDeckEntries,
  STARTER_CARD_SLUGS,
  STARTER_DECK_PRESETS,
  STARTER_GRANT_QUANTITIES,
} from '../src/config/starterLoadout.js';
import { ALL_CARDS } from './seedCards.js';
import { validateDeck, DECK_CONSTRAINTS } from '../src/services/deckService.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`OK: ${message}`);
  }
}

assert(
  STARTER_CARD_SLUGS.length === Object.keys(STARTER_GRANT_QUANTITIES).length,
  'slug list matches grant map',
);
assert(STARTER_DECK_PRESETS.length === 2, 'two starter deck presets');

const bySlug = new Map(ALL_CARDS.map(card => [card.slug, card]));
for (const slug of STARTER_CARD_SLUGS) {
  assert(bySlug.has(slug), `slug ${slug} present in catalogue`);
  assert(
    getStarterGrantQuantity(slug) >= 1 && getStarterGrantQuantity(slug) <= 3,
    `grant qty for ${slug} in 1..3`,
  );
}

assert(new Set(STARTER_CARD_SLUGS).size === STARTER_CARD_SLUGS.length, 'unique starter slugs');

const collection = STARTER_CARD_SLUGS.map(slug => ({
  card: bySlug.get(slug),
  quantity: getStarterGrantQuantity(slug),
  collectionId: slug,
}));
assert(
  ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine', 'common'].every(statType =>
    collection.some(entry => entry.card.statType === statType),
  ),
  'fresh collection still grants all arts and neutral cards',
);

for (const preset of STARTER_DECK_PRESETS) {
  const deck = selectStarterDeckEntries(collection, preset);
  const validation = validateDeck(deck);
  assert(
    validation.valid && validation.size === DECK_CONSTRAINTS.min,
    `${preset.id} starter deck valid (${validation.errors.join(' ') || validation.size})`,
  );
  assert(
    validation.primaryCount >= DECK_CONSTRAINTS.minPrimaryArtCards &&
      validation.secondaryCount >= DECK_CONSTRAINTS.minSecondaryArtCards,
    `${preset.id}: meets 15+5 (${validation.primaryArt} ${validation.primaryCount}, ${validation.secondaryArt} ${validation.secondaryCount})`,
  );
  for (const [slug, want] of Object.entries(preset.cards)) {
    const entry = deck.find(row => row.card.slug === slug);
    assert(entry?.quantity === want, `${preset.id} includes ${slug} x${want}`);
  }
}

const legacyCollection = collection.map(entry => ({ ...entry, quantity: 1 }));
const draft = selectStarterDeckEntries(legacyCollection, STARTER_DECK_PRESETS[0]);
assert(
  draft.every(entry => entry.quantity === 1),
  'no unowned copies in a partial starter',
);
assert(
  validateDeck(draft).codes.includes('deck_too_small') ||
    validateDeck(draft).codes.includes('insufficient_primary_art'),
  'legacy partial preset stays a draft',
);

if (failed) {
  console.error(`\n❌ testStarterLoadout: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\n✅ testStarterLoadout passed');

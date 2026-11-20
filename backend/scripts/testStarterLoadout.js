/**
 * Tests starter loadout (collection offerte et preset du deck).
 * Usage: node scripts/testStarterLoadout.js
 */
import {
  getStarterGrantQuantity,
  selectStarterDeckEntries,
  STARTER_CARD_SLUGS,
} from '../src/config/starterLoadout.js';
import { ALL_CARDS, STARTER_CARDS } from './seedCards.js';
import { validateDeck } from '../src/services/deckService.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`OK: ${message}`);
  }
}

assert(STARTER_CARD_SLUGS.length === 22, `22 starter slugs, got ${STARTER_CARD_SLUGS.length}`);

const starterBySlug = new Map(STARTER_CARDS.map(card => [card.slug, card]));
for (const slug of STARTER_CARD_SLUGS) {
  assert(starterBySlug.has(slug), `slug ${slug} present in seed STARTER_CARDS`);
}

assert(new Set(STARTER_CARD_SLUGS).size === STARTER_CARD_SLUGS.length, 'unique starter slugs');
const collection = STARTER_CARD_SLUGS.map(slug => ({
  card: ALL_CARDS.find(card => card.slug === slug),
  quantity: getStarterGrantQuantity(slug),
}));
assert(
  ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine', 'common'].every(statType =>
    collection.some(entry => entry.card.statType === statType)
  ),
  'fresh collection still grants all arts and neutral cards'
);
const deck = selectStarterDeckEntries(collection);
const validation = validateDeck(deck);
assert(
  validation.valid && validation.size === 22,
  `fresh starter deck: ${validation.errors.join(' ')}`
);
assert(
  validation.artCounts.taijutsu === 8 &&
    validation.artCounts.ninjutsu === 6 &&
    validation.nonNeutralCount === 14 &&
    validation.minArtCards === 4,
  'fresh deck has 8 Taijutsu, 6 Ninjutsu and 8 neutral cards'
);
const legacyCollection = collection.map(entry => ({ ...entry, quantity: 1 }));
const draft = selectStarterDeckEntries(legacyCollection);
assert(
  draft.length === 18 && draft.every(entry => entry.quantity === 1),
  'no unowned copies in a partial starter'
);
assert(
  validateDeck(draft).codes.join(',') === 'deck_too_small',
  'legacy partial preset stays a draft'
);

if (failed) {
  console.error(`\n❌ testStarterLoadout: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\n✅ testStarterLoadout passed');

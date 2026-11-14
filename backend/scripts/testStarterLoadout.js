/**
 * Tests starter loadout (slugs + idempotence helpers).
 * Usage: node scripts/testStarterLoadout.js
 */
import { STARTER_CARD_SLUGS } from '../src/config/starterLoadout.js';
import { STARTER_CARDS } from './seedCards.js';
import { DECK_MIN_SIZE, DECK_MAX_SIZE } from '../src/services/deckService.js';

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
assert(
  STARTER_CARD_SLUGS.length >= DECK_MIN_SIZE && STARTER_CARD_SLUGS.length <= DECK_MAX_SIZE,
  `starter count fits deck size ${DECK_MIN_SIZE}–${DECK_MAX_SIZE}`,
);

const seedSlugs = new Set(STARTER_CARDS.map((c) => c.slug));
for (const slug of STARTER_CARD_SLUGS) {
  assert(seedSlugs.has(slug), `slug ${slug} present in seed STARTER_CARDS`);
}

assert(new Set(STARTER_CARD_SLUGS).size === STARTER_CARD_SLUGS.length, 'unique starter slugs');

if (failed) {
  console.error(`\n❌ testStarterLoadout: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\n✅ testStarterLoadout passed');

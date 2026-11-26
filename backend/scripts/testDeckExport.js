/**
 * Tests purs — format export deck + profils missions réelles.
 *
 * npm run test:deck-export --prefix backend
 */
import {
  DECK_EXPORT_SCHEMA,
  DECK_EXPORT_VERSION,
  parseDeckExport,
  serializeDeckExport,
} from '../src/services/deckExportService.js';
import { REAL_MISSION_PROFILES } from '../src/config/realMissionBalanceProfiles.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('=== deck export serialize / parse ===');
{
  const fakeDeck = {
    id: 42,
    userId: 7,
    name: 'Mon Deck',
    archetype: 'aggro',
    cards: [
      {
        quantity: 3,
        upgradeLevel: 1,
        card: {
          slug: 'poing-rapide',
          nameFr: 'Poing rapide',
          rarity: 'common',
          type: 'attack',
          statType: 'taijutsu',
          upgradeLevel: 1,
        },
      },
      {
        quantity: 2,
        upgradeLevel: 0,
        card: { slug: 'garde-haute', nameFr: 'Garde haute', upgradeLevel: 0 },
      },
    ],
  };
  const exported = serializeDeckExport(fakeDeck, {
    userId: 7,
    username: 'alice',
    characterName: 'Sakura',
  });
  assert(exported.schema === DECK_EXPORT_SCHEMA, 'schema id');
  assert(exported.schemaVersion === DECK_EXPORT_VERSION, 'schema version');
  assert(exported.deck.size === 5, 'size = sum quantities');
  assert(exported.deck.cards[0].slug === 'poing-rapide', 'slug conservé');
  assert(exported.deck.cards[0].upgradeLevel === 1, 'upgradeLevel');
  assert(exported.player.username === 'alice', 'meta joueur');

  const parsed = parseDeckExport(JSON.stringify(exported));
  assert(parsed.cards.length === 2, 'parse cards');
  assert(parsed.cards[0].slug === 'poing-rapide' && parsed.cards[0].quantity === 3, 'parse qty');

  let threw = false;
  try {
    parseDeckExport({ schema: 'other', schemaVersion: 1, deck: { cards: [{ slug: 'x' }] } });
  } catch {
    threw = true;
  }
  assert(threw, 'refuse schéma inconnu');
}

console.log('\n=== real mission profiles ===');
{
  for (const [id, profile] of Object.entries(REAL_MISSION_PROFILES)) {
    const spent = profile.investment.reduce((s, n) => s + n.ranks, 0);
    assert(spent === profile.talentPoints, `${id}: investment = ${profile.talentPoints} pts`);
    assert(profile.level === profile.talentPoints, `${id}: level = talent points`);
    assert(Array.isArray(profile.talentCodes), `${id}: talentCodes`);
    assert(typeof profile.stats.taijutsu === 'number', `${id}: stats.taijutsu`);
  }
  assert(
    REAL_MISSION_PROFILES.faible.talentCodes.includes('relentless_press'),
    'faible a relentless_press',
  );
  assert(
    REAL_MISSION_PROFILES.haut.talentCodes.includes('combo_master'),
    'haut a combo_master',
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

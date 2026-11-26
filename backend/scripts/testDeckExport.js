/**
 * Tests purs — format export deck + profils missions réelles + inférence art.
 *
 * npm run test:deck-export --prefix backend
 */
import {
  DECK_EXPORT_SCHEMA,
  DECK_EXPORT_VERSION,
  parseDeckExport,
  serializeDeckExport,
} from '../src/services/deckExportService.js';
import {
  REAL_MISSION_BRANCHES,
  REAL_MISSION_STRENGTHS,
  getRealMissionProfile,
} from '../src/config/realMissionBalanceProfiles.js';
import {
  inferDeckArtBreakdown,
  runRealMissionBalanceSim,
} from '../src/services/realMissionBalanceService.js';
import { serializeCardDefinition } from '../src/services/cardService.js';
import { ALL_CARDS } from './seedCards.js';

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

console.log('\n=== real mission profiles (voie × force) ===');
{
  for (const branch of REAL_MISSION_BRANCHES) {
    for (const strength of REAL_MISSION_STRENGTHS) {
      const profile = getRealMissionProfile(branch, strength);
      const spent = profile.investment.reduce((s, n) => s + n.ranks, 0);
      assert(spent === profile.talentPoints, `${branch}/${strength}: investment = ${profile.talentPoints} pts`);
      assert(profile.branch === branch, `${branch}/${strength}: branch`);
      assert(Array.isArray(profile.talentCodes), `${branch}/${strength}: talentCodes`);
    }
  }
  const alias = getRealMissionProfile('moyen');
  assert(alias.branch === 'taijutsu' && alias.strength === 'moyen', 'alias CLI force → taijutsu');
}

console.log('\n=== infer art + sim smoke ===');
{
  const art = inferDeckArtBreakdown([
    { quantity: 15, card: { statType: 'taijutsu' } },
    { quantity: 5, card: { statType: 'ninjutsu' } },
  ]);
  assert(art.dominant === 'taijutsu' && art.secondary === 'ninjutsu', 'dominante taijutsu');

  const seed = ALL_CARDS.find(c => c.slug === 'poing-rapide');
  const card = serializeCardDefinition(
    {
      id: seed.slug,
      slug: seed.slug,
      name_fr: seed.name_fr,
      name_en: seed.name_en,
      type: seed.type,
      stat_type: seed.stat_type,
      rarity: seed.rarity,
      base_cost: seed.base_cost,
      base_damage: seed.base_damage,
      base_block: seed.base_block ?? 0,
      base_heal: seed.base_heal ?? 0,
      effects_json: seed.effects_json ?? seed.effects ?? [],
      exhaust: seed.exhaust ? 1 : 0,
      passive_bonus_json: seed.passive_bonus_json ?? {},
      upgrade_bonuses_json: seed.upgrade_bonuses_json ?? {},
    },
    { upgradeLevel: 0 },
  );
  // Mini-deck artificiel pour smoke (pas une contrainte live) — 20 copies.
  const entries = [{ quantity: 20, card }];
  const result = runRealMissionBalanceSim({
    deckEntries: entries,
    branch: null,
    strengths: 'faible',
    ranks: ['D'],
    runs: 2,
  });
  assert(result.branch === 'taijutsu' && result.branchAuto, 'sim auto-branche taijutsu');
  assert(result.rows.length === 1 && result.rows[0].rank === 'D', 'sim 1 cellule D');
  assert(typeof result.rows[0].clearanceRate === 'number', 'clearance numérique');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

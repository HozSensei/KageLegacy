/**
 * Tests purs — construction de parcours mission (sans DB).
 *
 * npm run test:mission-run --prefix backend
 */
import { __test } from '../src/services/missionRunService.js';

const { buildRunNodes, unlockNext, healPercent, EVENT_TYPES } = __test;

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

console.log('=== buildRunNodes ===');
const encounters = [
  { templateId: 'ronin_bandit', difficulty: 1 },
  { templateId: 'marsh_cutpurse', difficulty: 1 },
  { templateId: 'scrapyard_dog', difficulty: 1 },
];
const nodes = buildRunNodes(encounters, { rng: () => 0 });
assert(nodes.length === 5, `3 combats + 2 events = 5 nodes (got ${nodes.length})`);
assert(nodes[0].type === 'combat' && nodes[0].status === 'available', 'first combat available');
assert(nodes[1].type === 'event' && nodes[1].status === 'locked', 'event locked between fights');
assert(nodes[2].type === 'combat' && nodes[2].status === 'locked', 'second combat locked');
assert(EVENT_TYPES.includes(nodes[1].eventType), 'event type from MVP set');
assert(EVENT_TYPES.length >= 10, `≥10 event types (got ${EVENT_TYPES.length})`);
assert(EVENT_TYPES.includes('whisper_grove'), 'whisper_grove event');
assert(EVENT_TYPES.includes('crow_perch'), 'crow_perch event');
assert(EVENT_TYPES.includes('sealed_scroll'), 'sealed_scroll event');
assert(EVENT_TYPES.includes('mist_bridge'), 'mist_bridge event');
assert(EVENT_TYPES.includes('spirit_lantern'), 'spirit_lantern event');
assert(EVENT_TYPES.includes('ash_camp'), 'ash_camp event');

const bossPath = buildRunNodes(
  [
    { templateId: 'ashen_captain', difficulty: 1 },
    { templateId: 'ironroot_warden', difficulty: 1 },
    { templateId: 'stormcaller_adept', difficulty: 1 },
    { templateId: 'duskblade_ronin', difficulty: 1, boss: true },
  ],
  { rng: () => 0 },
);
assert(bossPath.filter((n) => n.type === 'combat').length === 4, '4 combats on B/A path');
assert(bossPath[bossPath.length - 1].boss === true, 'last combat marked boss');
assert(bossPath.filter((n) => n.type === 'event').length === 3, '3 events interleaved');

console.log('=== unlockNext ===');
const unlocked = unlockNext(nodes, 0);
assert(unlocked[0].status === 'cleared', 'cleared current');
assert(unlocked[1].status === 'available', 'next unlocked');

console.log('=== healPercent ===');
const healed = healPercent({ hp: 40, maxHp: 100 }, 0.3);
assert(healed.hp === 70, `heal 30% max → 70 (got ${healed.hp})`);
assert(healPercent({ hp: 95, maxHp: 100 }, 0.3).hp === 100, 'heal caps at maxHp');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

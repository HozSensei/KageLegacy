/**
 * Tests purs — construction de parcours mission (sans DB).
 *
 * npm run test:mission-run --prefix backend
 */
import {
  HARD_MODE_DIFFICULTY_MULT,
  HARD_MODE_REWARD_MULT,
  RANK_PATH_CONFIG,
} from '../src/config/missionPathConfig.js';
import { __test } from '../src/services/missionRunService.js';
import {
  applyHardModeToNodes,
  buildRandomRunPath,
  ensureRecoveryMystery,
  isRecoveryOutcome,
} from '../src/services/missionPathBuilder.js';

const {
  buildRunNodes,
  sanitizeNodesForClient,
  unlockNext,
  healPercent,
  getCurrentEvent,
  EVENT_TYPES,
} = __test;

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

function makeRng(seq) {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return v;
  };
}

console.log('=== buildRandomRunPath ===');
const pathD = buildRandomRunPath('D', { rng: makeRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) });
const combatsD = pathD.filter(n => n.type === 'combat');
const mysteriesD = pathD.filter(n => n.type === 'mystery');
assert(combatsD.length === 3, `D: 3 combats (got ${combatsD.length})`);
assert(mysteriesD.length >= 1 && mysteriesD.length <= 2, `D: 1–2 mystery (got ${mysteriesD.length})`);
assert(pathD[0].type === 'combat' && pathD[0].status === 'available', 'first combat available');
assert(pathD[1]?.type === 'mystery', 'D: mystery always after first combat');
assert(isRecoveryOutcome(pathD[1]?.outcome), 'D: first mystery is recovery');
assert(
  mysteriesD.every(m => m.revealed === false && m.outcome?.kind),
  'mysteries hidden with pre-rolled outcome',
);
assert(
  mysteriesD.every(m =>
    ['heal', 'merchant', 'loot', 'nothing', 'combat'].includes(m.outcome.kind),
  ),
  'mystery outcomes in {heal,merchant,loot,nothing,combat}',
);
assert(
  mysteriesD.some(m => isRecoveryOutcome(m.outcome)),
  'D: at least one recovery mystery (heal/merchant)',
);
assert(
  Math.abs(combatsD[0].difficulty - RANK_PATH_CONFIG.D.difficulties[0]) < 1e-9,
  `D early difficulty ${combatsD[0].difficulty} matches curve`,
);
assert(
  Math.abs(combatsD[2].difficulty - RANK_PATH_CONFIG.D.difficulties[2]) < 1e-9,
  `D final difficulty ${combatsD[2].difficulty} matches curve`,
);

const pathB = buildRandomRunPath('B', {
  rng: makeRng([0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85]),
});
assert(pathB.filter(n => n.type === 'combat').length === 4, 'B: 4 combats');
assert(pathB.filter(n => n.type === 'combat').at(-1)?.boss === true, 'B: last combat boss');
assert(pathB.filter(n => n.type === 'mystery').length >= 1, 'B: at least one mystery');
assert(
  pathB.filter(n => n.type === 'mystery').some(m => isRecoveryOutcome(m.outcome)),
  'B: recovery mystery guaranteed',
);

const pathS = buildRandomRunPath('S', { rng: () => 0.2 });
assert(pathS.filter(n => n.type === 'combat').length === 5, 'S: 5 combats');
assert(pathS.filter(n => n.type === 'mystery').length === 2, 'S: exactly 2 mysteries');
assert(
  pathS.filter(n => n.type === 'mystery').some(m => isRecoveryOutcome(m.outcome)),
  'S: recovery mystery guaranteed',
);

console.log('=== hard mode path scale ===');
const hardPath = buildRandomRunPath('D', {
  rng: makeRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]),
  hardMode: true,
});
const normalDiff = combatsD[0].difficulty;
const hardDiff = hardPath.filter(n => n.type === 'combat')[0].difficulty;
assert(
  Math.abs(hardDiff - normalDiff * HARD_MODE_DIFFICULTY_MULT) < 1e-6,
  `hard mode scales difficulty ×${HARD_MODE_DIFFICULTY_MULT}`,
);
assert(HARD_MODE_REWARD_MULT === 1.2, 'reward mult is +20%');

const scaled = applyHardModeToNodes([
  { type: 'combat', difficulty: 1.5 },
  { type: 'mystery', outcome: { kind: 'combat', difficulty: 2 } },
]);
assert(scaled[0].difficulty === 1.8, 'applyHardModeToNodes combat');
assert(scaled[1].outcome.difficulty === 2.4, 'applyHardModeToNodes mystery combat');

console.log('=== ensureRecoveryMystery ===');
const forced = ensureRecoveryMystery(
  [
    { type: 'combat', difficulty: 1 },
    { type: 'mystery', outcome: { kind: 'nothing' } },
    { type: 'combat', difficulty: 1 },
  ],
  () => 0.1,
);
assert(isRecoveryOutcome(forced[1].outcome), 'forces recovery when missing');

console.log('=== sanitizeNodesForClient ===');
const sanitized = sanitizeNodesForClient(pathD);
const hidden = sanitized.find(n => n.type === 'mystery');
assert(hidden && !hidden.outcome && hidden.revealed === false, 'client does not see mystery outcome');

console.log('=== buildRunNodes (compat) ===');
const encounters = [
  { templateId: 'ronin_bandit', difficulty: 1 },
  { templateId: 'marsh_cutpurse', difficulty: 1 },
  { templateId: 'scrapyard_dog', difficulty: 1 },
];
const nodes = buildRunNodes(encounters, { rng: () => 0 });
assert(nodes.length === 5, `3 combats + 2 mystery = 5 nodes (got ${nodes.length})`);
assert(nodes[0].type === 'combat' && nodes[0].status === 'available', 'compat first combat');
assert(nodes[1].type === 'mystery', 'compat mystery between fights');
assert(EVENT_TYPES.includes('mystery_heal'), 'mystery_heal event type');
assert(EVENT_TYPES.includes('mystery_loot'), 'mystery_loot event type');
assert(EVENT_TYPES.includes('mystery_nothing'), 'mystery_nothing event type');
assert(EVENT_TYPES.includes('merchant'), 'merchant event type');

console.log('=== unlockNext ===');
const unlocked = unlockNext(nodes, 0);
assert(unlocked[0].status === 'cleared', 'cleared current');
assert(unlocked[1].status === 'available', 'next unlocked');

console.log('=== current event persistence ===');
const eventRun = {
  state: 'in_progress',
  current_node_index: 1,
};
const eventNodes = [
  { id: 'combat-0', type: 'combat', status: 'cleared' },
  {
    id: 'mystery-0',
    type: 'mystery',
    eventType: 'mystery_heal',
    status: 'available',
    eventOpen: true,
    revealed: true,
    outcome: { kind: 'heal' },
  },
];
const restoredEvent = getCurrentEvent(eventRun, eventNodes, { hp: 40, maxHp: 100, scrap: 0 });
assert(restoredEvent?.eventType === 'mystery_heal', 'opened mystery heal restored');
assert(restoredEvent?.choices?.[0]?.id === 'rest_here', 'heal choice exposed');

const merchantNodes = [
  { id: 'combat-0', type: 'combat', status: 'cleared' },
  {
    id: 'mystery-0',
    type: 'mystery',
    eventType: 'merchant',
    status: 'available',
    eventOpen: true,
    revealed: true,
    outcome: { kind: 'merchant' },
  },
];
const merchantEvent = getCurrentEvent(eventRun, merchantNodes, { hp: 40, maxHp: 100, scrap: 4 });
assert(merchantEvent?.eventType === 'merchant', 'merchant event restored');
assert(
  merchantEvent?.choices?.some(c => c.id === 'buy_bandage'),
  'merchant bandage choice',
);

console.log('=== healPercent ===');
const healed = healPercent({ hp: 40, maxHp: 100 }, 0.3);
assert(healed.hp === 70, `heal 30% max → 70 (got ${healed.hp})`);
assert(healPercent({ hp: 95, maxHp: 100 }, 0.3).hp === 100, 'heal caps at maxHp');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

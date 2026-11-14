/**
 * Tests unitaires — boss multi-phases + charge / summon / shield break.
 *
 * npm run test:boss-phases --prefix backend
 */
import { applyDamageThroughBlock, hasStatus } from '../src/services/deckCombat/formulas.js';
import {
  applyDamageThroughBarrier,
  findTargetPhaseIndex,
  getEnemyHpPct,
  hitEnemy,
  maybeAdvanceBossPhase,
  canApplyStatus,
} from '../src/services/deckCombat/bossPhases.js';
import {
  generateEnemyFromTemplate,
  executeEnemyIntent,
  getNextIntent,
} from '../src/services/combatAIService.js';
import { listBossTemplates, listEnemyTemplates } from '../src/services/deckCombat/enemyTemplates.js';
import { applyCardPlay } from '../src/services/deckCombat/cardEffects.js';

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

console.log('=== Catalog bosses ===');
const bosses = listBossTemplates();
assert(bosses.length >= 5, `≥5 boss templates (got ${bosses.length})`);
assert(
  bosses.every((b) => b.phases >= 1),
  'each boss declares ≥1 phase threshold',
);
assert(
  ['B', 'A', 'S'].every((r) => bosses.some((b) => b.rank === r)),
  'boss ranks cover B, A, S',
);
assert(listEnemyTemplates().length >= 15, 'catalog includes prior mobs + bosses');

console.log('\n=== Phase thresholds ===');
const warden = generateEnemyFromTemplate('hollow_bell_warden');
assert(warden.boss === true && warden.barrier === 22, 'warden spawns with barrier');
assert(warden.phaseIndex === -1 && warden.phases.length === 2, 'phaseIndex base = -1');
assert(getEnemyHpPct(warden) === 1, 'full HP = 100%');
assert(findTargetPhaseIndex(warden) === -1, 'full HP → no phase yet');

const mid = { ...warden, hp: Math.floor(warden.maxHp * 0.5) };
assert(findTargetPhaseIndex(mid) === 0, '50% HP → cracked_bell (index 0)');
const low = { ...warden, hp: Math.floor(warden.maxHp * 0.2) };
assert(findTargetPhaseIndex(low) === 1, '20% HP → shattered_peal (index 1)');

console.log('\n=== Phase transition onEnter ===');
const advanced = maybeAdvanceBossPhase(
  { ...warden, hp: Math.floor(warden.maxHp * 0.5) },
  { announceIntent: (e) => getNextIntent(e) },
);
assert(advanced.changed === true, 'phase advances at 50%');
assert(advanced.enemy.phaseIndex === 0, 'phaseIndex = 0');
assert(advanced.enemy.phaseId === 'cracked_bell', 'phaseId cracked_bell');
assert(advanced.enemy.barrier === 28, 'onEnter sets barrier 28');
assert(
  (advanced.enemy.immunities || []).includes('weak'),
  'onEnter grants weak immunity',
);
assert(
  hasStatus(advanced.enemy.statuses, 'force'),
  'onEnter applies force buff',
);
assert(
  advanced.logs.some((l) => l.type === 'boss_phase'),
  'logs boss_phase event',
);
assert(advanced.enemy.intent?.type, 'intent re-announced after phase');

const noBack = maybeAdvanceBossPhase({
  ...advanced.enemy,
  hp: advanced.enemy.maxHp,
});
assert(noBack.changed === false, 'phases never regress on heal');

console.log('\n=== Multi-step skip to final phase ===');
const skip = maybeAdvanceBossPhase({
  ...warden,
  hp: Math.floor(warden.maxHp * 0.1),
});
assert(skip.enemy.phaseIndex === 1, 'deep HP jump lands on final phase');
assert(
  (skip.enemy.immunities || []).includes('poison'),
  'final phase immunities applied',
);

console.log('\n=== Shield break (barrier) ===');
const barred = {
  hp: 100,
  maxHp: 100,
  block: 0,
  barrier: 15,
  statuses: [],
};
const absorbed = applyDamageThroughBarrier(barred, 10, {}, applyDamageThroughBlock);
assert(absorbed.barrier === 5 && absorbed.hp === 100, 'barrier absorbs before HP');
assert(absorbed.barrierBroken === false, 'partial absorb ≠ break');

const broken = applyDamageThroughBarrier(
  { ...barred, barrier: 8 },
  20,
  {},
  applyDamageThroughBlock,
);
assert(broken.barrier === 0 && broken.barrierBroken === true, 'barrier breaks');
assert(broken.hp === 88, 'overflow after break hits HP (20-8=12)');
assert(hasStatus(broken.statuses, 'vulnerable'), 'shield_break applies vulnerable');
assert(broken.logs.some((l) => l.type === 'shield_break'), 'shield_break log');

console.log('\n=== Charge intent ===');
const matron = generateEnemyFromTemplate('embercoil_matron');
matron.intent = { type: 'charge', releaseDamage: 34 };
const hero = { hp: 120, maxHp: 120, block: 0, statuses: [] };
const charged = executeEnemyIntent(matron, hero, () => 0.99);
assert(
  charged.logs.some((l) => l.type === 'charge'),
  'charge logs wind-up',
);
assert(
  charged.enemy.intent?.type === 'attack' && charged.enemy.intent?.fromCharge === true,
  'next intent is charged attack',
);
assert(charged.player.hp === 120, 'charge turn deals no damage yet');
const release = executeEnemyIntent(charged.enemy, charged.player, () => 0.99);
assert(release.player.hp < 120, 'charged attack releases damage');
assert(
  release.logs.some((l) => l.type === 'damage' && l.fromCharge),
  'damage tagged fromCharge',
);

console.log('\n=== Enemy summon + minion taunt ===');
const seer = generateEnemyFromTemplate('grave_orchid_seer');
seer.intent = {
  type: 'summon',
  minion: { nameFr: 'Petale', nameEn: 'Petal', hp: 20, attack: 6 },
};
const summoned = executeEnemyIntent(seer, { ...hero }, () => 0.5);
assert(summoned.enemy.minion?.hp === 20, 'minion spawned');
assert(
  summoned.logs.some((l) => l.type === 'enemy_summon'),
  'enemy_summon log',
);

const withMinion = {
  ...summoned.enemy,
  intent: { type: 'defend', block: 5 },
};
const minionHit = executeEnemyIntent(
  withMinion,
  { hp: 100, maxHp: 100, block: 0, statuses: [] },
  () => 0.99,
);
assert(minionHit.player.hp === 94, 'minion attacks for 6 before defend');

const hit = hitEnemy(
  summoned.enemy,
  12,
  {},
  applyDamageThroughBlock,
);
assert(hit.enemy.minion === null || hit.enemy.minion.hp < 20, 'taunt minion absorbs hits');
assert(hit.logs.some((l) => l.type === 'minion_damage'), 'minion_damage log');

console.log('\n=== Immunities ===');
const colossus = generateEnemyFromTemplate('mirrorfracture_colossus');
assert(!canApplyStatus(colossus, 'vulnerable'), 'colossus immune to vulnerable at spawn');
assert(canApplyStatus(colossus, 'burn'), 'burn still applies');

const poisonCard = {
  slug: 'test-poison',
  type: 'skill',
  cost: 0,
  damage: 0,
  block: 0,
  heal: 0,
  effects: [{ type: 'apply_status', status: 'vulnerable', value: 1, duration: 2, target: 'enemy' }],
};
const immunePlay = applyCardPlay({
  player: {
    hp: 100,
    maxHp: 100,
    block: 0,
    chakra: 3,
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
    statuses: [],
  },
  enemy: colossus,
  card: poisonCard,
  stats: {},
});
assert(
  immunePlay.logs.some((l) => l.type === 'status_immune'),
  'status_immune when applying vulnerable to colossus',
);
assert(!hasStatus(immunePlay.enemy.statuses, 'vulnerable'), 'vulnerable not applied');

console.log('\n=== hitEnemy triggers phase ===');
const phased = hitEnemy(
  { ...warden, hp: Math.floor(warden.maxHp * 0.56), barrier: 0, block: 0 },
  40,
  { announceIntent: (e) => getNextIntent(e) },
  applyDamageThroughBlock,
);
assert(phased.phaseChanged === true, 'hitEnemy advances phase when crossing threshold');
assert(phased.enemy.phaseId === 'cracked_bell', 'phase id after hit');

console.log('\n=== S-rank voidspire ===');
const regent = generateEnemyFromTemplate('voidspire_regent');
assert(regent.rank === 'S' && regent.phases.length === 3, 'voidspire 3 phases');
const p1 = maybeAdvanceBossPhase({ ...regent, hp: Math.floor(regent.maxHp * 0.65) });
assert(p1.enemy.phaseId === 'spire_awakens', '70% threshold → spire_awakens');
const p2 = maybeAdvanceBossPhase({ ...regent, hp: Math.floor(regent.maxHp * 0.35) });
assert(p2.enemy.phaseId === 'regent_unmasked', '40% → regent_unmasked');
const p3 = maybeAdvanceBossPhase({ ...regent, hp: Math.floor(regent.maxHp * 0.1) });
assert(p3.enemy.phaseId === 'eclipse_core', '15% → eclipse_core');

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
console.log('✅ testBossPhases passed');

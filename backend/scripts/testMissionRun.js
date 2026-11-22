/**
 * Tests purs — parcours mission branché + inventaire / bourse.
 *
 * npm run test:mission-run --prefix backend
 */
import {
  HARD_MODE_DIFFICULTY_MULT,
  RANK_PATH_CONFIG,
} from '../src/config/missionPathConfig.js';
import {
  BRANCH_XP_MULT,
  PURSE_STAKES,
  RUN_INVENTORY_SLOTS,
  RUN_PURSE_GAINS,
  getShopItem,
  rollShopOffer,
} from '../src/config/missionRunEconomy.js';
import { __test } from '../src/services/missionRunService.js';
import {
  applyHardModeToNodes,
  buildRandomRunPath,
} from '../src/services/missionPathBuilder.js';
import {
  createRunPlayerState,
  placeInventoryItem,
  useInventorySlot,
  discardInventorySlot,
  spendPurse,
  grantCombatPurse,
  grantNodePurse,
  getPurse,
} from '../src/services/missionRunInventory.js';

const { sanitizeNodesForClient, unlockNext, applyBranchChoice, healPercent } = __test;

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

console.log('=== economy constants ===');
assert(PURSE_STAKES.join(',') === '0,100,200,300', 'purse stakes 0/100/200/300');
assert(RUN_INVENTORY_SLOTS === 4, '4 inventory slots');
assert(RUN_PURSE_GAINS.combat === 50 && RUN_PURSE_GAINS.node === 25, 'purse gains');
assert(BRANCH_XP_MULT.long > BRANCH_XP_MULT.short, 'long branch pays more XP');
assert(getShopItem('heal_bandage')?.price === 40, 'bandage price');
assert(rollShopOffer(() => 0.1).length === 4, 'shop offer size 4');
assert(rollShopOffer(() => 0.2).some(i => i.id === 'heal_bandage'), 'shop always has bandage');

console.log('=== buildRandomRunPath branched ===');
const pathD = buildRandomRunPath('D', { rng: makeRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) });
assert(pathD[0].type === 'combat' && pathD[0].status === 'available', 'first combat available');
assert(pathD.some(n => n.type === 'shop'), 'D has shop');
assert(pathD.some(n => n.type === 'branch'), 'D has branch');
assert(pathD.some(n => n.type === 'rest' && n.branch === 'long'), 'D long has rest');
assert(
  pathD.filter(n => n.type === 'combat' && n.branch === 'short').length ===
    RANK_PATH_CONFIG.D.shortFightCount - 1,
  'D short remaining combats',
);
assert(
  pathD.filter(n => n.type === 'combat' && (n.branch === 'long' || n.branch == null)).length >=
    RANK_PATH_CONFIG.D.fightCount - 1,
  'D long remaining + opening',
);

const pathB = buildRandomRunPath('B', {
  rng: makeRng([0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85]),
});
assert(pathB.some(n => n.type === 'branch'), 'B has branch');
assert(
  pathB.filter(n => n.type === 'combat' && n.boss).length >= 1,
  'B has boss on at least one finale',
);

const hardPath = applyHardModeToNodes(buildRandomRunPath('D', { rng: () => 0.2 }));
assert(
  hardPath[0].difficulty > RANK_PATH_CONFIG.D.difficulties[0] * 0.99,
  'hard mode scales difficulty',
);
assert(Math.abs(HARD_MODE_DIFFICULTY_MULT - 1.2) < 1e-9, 'hard mode mult 1.2');

console.log('=== unlockNext + branch ===');
let nodes = buildRandomRunPath('D', { rng: makeRng([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) });
nodes = unlockNext(nodes, 0);
assert(nodes[0].status === 'cleared', 'combat-0 cleared');
assert(nodes.find(n => n.id === 'shop-1')?.status === 'available', 'shop unlocked via nextNodeId');

const branchIdx = nodes.findIndex(n => n.type === 'branch');
nodes[branchIdx] = { ...nodes[branchIdx], status: 'available' };
const branched = applyBranchChoice(nodes, branchIdx, 'short');
assert(branched.branchId === 'short', 'chose short');
assert(branched.xpMult === BRANCH_XP_MULT.short, 'short xp mult');
assert(
  branched.nodes.filter(n => n.branch === 'long').every(n => n.status === 'skipped'),
  'long branch skipped',
);
assert(
  branched.nodes.find(n => n.id === 'combat-s-0')?.status === 'available',
  'short first combat available',
);

const sanitized = sanitizeNodesForClient(
  buildRandomRunPath('D', { rng: () => 0.3 }).map(n =>
    n.type === 'shop' ? { ...n, status: 'locked' } : n,
  ),
);
assert(
  sanitized.filter(n => n.type === 'shop').every(n => n.offer == null && n.hasOffer),
  'locked shop hides offer details',
);

console.log('=== inventory / purse ===');
let player = createRunPlayerState({ maxHp: 100, purseStake: 100 });
assert(getPurse(player) === 100, 'stake becomes purse');
assert(player.inventory.length === 4, '4 slots created');

player = grantCombatPurse(player);
assert(getPurse(player) === 150, 'combat purse gain');
player = grantNodePurse(player);
assert(getPurse(player) === 175, 'node purse gain');

const spent = spendPurse(player, 40);
assert(spent.ok && getPurse(spent.player) === 135, 'spend purse');
player = spent.player;

const bandage = getShopItem('heal_bandage');
const placed = placeInventoryItem(player.inventory, bandage);
assert(placed.ok && placed.slot === 0, 'place bandage');
player.inventory = placed.inventory;
player.hp = 40;

const used = useInventorySlot(player, 0);
assert(used.ok, 'use bandage');
assert(used.player.hp > 40, 'heal applied');
assert(!used.player.inventory[0].itemId, 'slot emptied after use');

player = used.player;
player = { ...player, purse: 300 };
const sealed = getShopItem('card_mystery_rare');
for (let i = 0; i < 4; i += 1) {
  const p = placeInventoryItem(player.inventory, sealed);
  assert(p.ok, `fill slot ${i}`);
  player.inventory = p.inventory;
}
const full = placeInventoryItem(player.inventory, bandage);
assert(!full.ok && full.code === 'INVENTORY_FULL', 'inventory full');
const replaced = placeInventoryItem(player.inventory, bandage, { replaceSlot: 2 });
assert(replaced.ok && replaced.replaced, 'replace slot 2');
const discarded = discardInventorySlot(replaced.inventory, 1);
assert(discarded.ok && !discarded.inventory[1].itemId, 'discard slot');

const sealedUse = useInventorySlot(
  { ...player, inventory: discarded.inventory },
  0,
);
assert(!sealedUse.ok && sealedUse.code === 'SEALED_UNTIL_FINISH', 'sealed until finish');

assert(healPercent({ hp: 10, maxHp: 100 }, 0.5).hp === 60, 'healPercent');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

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
  buildRunCombatMods,
  createRunPlayerState,
  placeInventoryItem,
  useInventorySlot,
  discardInventorySlot,
  spendPurse,
  grantCombatPurse,
  grantNodePurse,
  getPurse,
  trackPendingCard,
  untrackPendingCard,
  collectPendingCardsFromInventory,
} from '../src/services/missionRunInventory.js';

const {
  sanitizeNodesForClient,
  unlockNext,
  applyBranchChoice,
  healPercent,
  buildLootCards,
  applyPouchLoadout,
  collectRunInventoryDeposits,
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

console.log('=== N-way branch + nested skip ===');
const triple = [
  { id: 'root', type: 'combat', status: 'cleared', nextNodeId: 'fork' },
  {
    id: 'fork',
    type: 'branch',
    status: 'available',
    choices: [
      { id: 'a', nextNodeId: 'a1', xpMult: 1 },
      { id: 'b', nextNodeId: 'b1', xpMult: 1.2 },
      { id: 'c', nextNodeId: 'c1', xpMult: 1.5 },
    ],
  },
  { id: 'a1', type: 'combat', status: 'locked', nextNodeId: 'a2' },
  { id: 'a2', type: 'combat', status: 'locked' },
  { id: 'b1', type: 'rest', status: 'locked', nextNodeId: 'b-fork' },
  {
    id: 'b-fork',
    type: 'branch',
    status: 'locked',
    choices: [
      { id: 'b-x', nextNodeId: 'bx', xpMult: 1 },
      { id: 'b-y', nextNodeId: 'by', xpMult: 1 },
    ],
  },
  { id: 'bx', type: 'combat', status: 'locked' },
  { id: 'by', type: 'combat', status: 'locked' },
  { id: 'c1', type: 'shop', status: 'locked', nextNodeId: 'c2' },
  { id: 'c2', type: 'combat', status: 'locked', boss: true },
];
const pickedB = applyBranchChoice(triple, 1, 'b');
assert(pickedB.branchId === 'b', 'chose mid branch b');
assert(
  ['a1', 'a2', 'c1', 'c2'].every(id => pickedB.nodes.find(n => n.id === id)?.status === 'skipped'),
  'rejected sibling subtrees skipped',
);
assert(
  ['b1', 'b-fork', 'bx', 'by'].every(id => pickedB.nodes.find(n => n.id === id)?.status !== 'skipped'),
  'chosen subtree kept (incl. nested fork)',
);
assert(pickedB.nodes.find(n => n.id === 'b1')?.status === 'available', 'b entry unlocked');

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

console.log('=== run consumable effects ===');
let boosted = createRunPlayerState({ maxHp: 100, purseStake: 100 });
for (const itemId of [
  'run_purse_charm',
  'run_xp_scroll',
  'run_card_omen',
  'run_second_wind',
  'run_armor_oil',
  'next_draw',
]) {
  const item = getShopItem(itemId);
  const placedItem = placeInventoryItem(boosted.inventory, item);
  assert(placedItem.ok, `place ${itemId}`);
  boosted = { ...boosted, inventory: placedItem.inventory };
  const usedItem = useInventorySlot(boosted, placedItem.slot);
  assert(usedItem.ok, `use ${itemId} (no UNKNOWN_EFFECT)`);
  boosted = usedItem.player;
}
assert(boosted.runMods.purseMult === 1.25, 'purse mult stored');
assert(boosted.runMods.xpMult === 1.25, 'xp mult stored');
assert(boosted.runMods.cardChanceBonus === 15, 'card chance bonus stored');
assert(boosted.runMods.secondWind === 0.3, 'second wind stored');
assert(boosted.runMods.startBlock === 20, 'start block stored');
assert(boosted.nextCombatMods.draw === 1, 'next draw stored');
const beforePurse = getPurse(boosted);
boosted = grantCombatPurse(boosted);
assert(getPurse(boosted) - beforePurse === 63, 'combat purse ×1.25 → 63');
const combatMods = buildRunCombatMods(boosted);
assert(combatMods.block === 20 && combatMods.draw === 1, 'buildRunCombatMods merges run+next');

console.log('=== pendingLoot tracking ===');
let tracked = createRunPlayerState({ maxHp: 100, purseStake: 0 });
const legendary = getShopItem('card_mystery_legendary');
tracked = trackPendingCard(tracked, legendary);
tracked = trackPendingCard(tracked, getShopItem('card_mystery_rare'));
assert(collectPendingCardsFromInventory(tracked).length === 2, 'pendingLoot collects 2');
tracked = untrackPendingCard(tracked, 'card_mystery_legendary');
assert(
  collectPendingCardsFromInventory(tracked).length === 1 &&
    collectPendingCardsFromInventory(tracked)[0].itemId === 'card_mystery_rare',
  'untrack removes one sealed',
);
// Inventaire seul (anciens runs sans pendingLoot)
const invOnly = {
  ...createRunPlayerState({ maxHp: 100 }),
  pendingLoot: { cards: [] },
  inventory: [
    { slot: 0, itemId: 'card_mystery_legendary', qty: 1, meta: { rarity: 'legendary' } },
    { slot: 1, itemId: null, qty: 0, meta: null },
    { slot: 2, itemId: null, qty: 0, meta: null },
    { slot: 3, itemId: null, qty: 0, meta: null },
  ],
};
assert(
  collectPendingCardsFromInventory(invOnly)[0]?.rarity === 'legendary',
  'fallback inventory sealed',
);

console.log('=== loot reveal payload (chance only — scellés → poche) ===');
const fakeCard = { id: 7, nameFr: 'Kunai', rarity: 'rare' };
const loot = buildLootCards({
  collectionId: 11,
  isNew: true,
  rarity: 'rare',
  card: fakeCard,
});
assert(loot.length === 1, 'lootCards = carte chance seule');
assert(loot[0].source === 'mission_reward' && loot[0].card.id === 7, 'chance card');
assert(buildLootCards(null).length === 0, 'empty loot when no cards');

console.log('=== poche → run + dépôts fin ===');
let pouchPlayer = createRunPlayerState({ maxHp: 100, purseStake: 100 });
pouchPlayer = applyPouchLoadout(pouchPlayer, [
  { itemKey: 'card_mystery_rare', quantity: 1 },
  { itemKey: 'heal_bandage', quantity: 1 },
]);
assert(
  pouchPlayer.inventory.filter(s => s.itemId).length === 2,
  'pouch loadout place 2 items',
);
assert(
  (pouchPlayer.pendingLoot?.cards || []).some(c => c.itemId === 'card_mystery_rare'),
  'sealed tracked from pouch',
);
const deposits = collectRunInventoryDeposits(pouchPlayer);
assert(deposits.some(d => d.itemKey === 'card_mystery_rare'), 'deposit includes sealed');
assert(deposits.some(d => d.itemKey === 'heal_bandage'), 'deposit includes leftover consumable');

// Scellé seulement dans pendingLoot (slot perdu) + conso en inventaire → les deux survivent
let ghostPlayer = createRunPlayerState({ maxHp: 100, purseStake: 0 });
const ghostBandage = getShopItem('heal_bandage');
const placedGhostBandage = placeInventoryItem(ghostPlayer.inventory, ghostBandage);
ghostPlayer = { ...ghostPlayer, inventory: placedGhostBandage.inventory };
ghostPlayer = trackPendingCard(ghostPlayer, getShopItem('card_mystery_rare'), {
  rarity: 'rare',
});
const ghostDeposits = collectRunInventoryDeposits(ghostPlayer);
assert(
  ghostDeposits.some(d => d.itemKey === 'heal_bandage'),
  'ghost: consumable from inv',
);
assert(
  ghostDeposits.some(d => d.itemKey === 'card_mystery_rare'),
  'ghost: sealed from pendingLoot even if missing from slots',
);

console.log('=== shop price ×2 ===');
assert(getShopItem('heal_bandage')?.priceShop === 80, 'bandage shop price 80');
assert(getShopItem('card_mystery_legendary')?.priceShop === 420, 'legendary shop ×2');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

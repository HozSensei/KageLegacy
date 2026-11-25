/**
 * Tests purs — catalogue inventaire + helpers économie poche.
 * npm run test:player-inventory --prefix backend
 */
import {
  ITEM_CATALOG,
  RUN_SHOP_CATALOG,
  getItem,
  boosterItemKey,
  rollAccountDailyOffer,
  utcDayKey,
} from '../src/config/itemCatalog.js';
import { PURSE_STAKES, isValidPurseStake } from '../src/config/missionRunEconomy.js';
import {
  CHEST_CAPACITY,
  POUCH_CAPACITY,
  chestSlotsNeededForRewards,
} from '../../shared/inventoryCapacity.js';
import {
  getPouchLockStatus,
  assertPouchEditable,
  __test as invTest,
} from '../src/services/playerInventoryService.js';

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

console.log('=== catalogue ===');
assert(ITEM_CATALOG.length >= 15, 'catalogue size');
assert(RUN_SHOP_CATALOG.every(i => i.kind !== 'booster'), 'run shop sans boosters');
assert(getItem('booster_premium')?.boosterType === 'premium', 'booster premium key');
assert(boosterItemKey('legendary') === 'booster_legendary', 'boosterItemKey legendary');
assert(boosterItemKey('elemental') === 'booster_premium', 'elemental → premium');
assert(invTest.shopPriceFromRun(55) === 110, 'shopPriceFromRun 55→110');
assert(getItem('heal_bandage').priceShop === getItem('heal_bandage').priceRun * 2, '×2 bandage');

console.log('=== paliers poche ===');
assert(PURSE_STAKES.join(',') === '0,100,200,300', 'stakes');
assert(isValidPurseStake(200), '200 ok');
assert(!isValidPurseStake(150), '150 invalide');

console.log('=== offre journalière déterministe ===');
const day = utcDayKey(new Date('2026-11-24T12:00:00Z'));
const a = rollAccountDailyOffer(day);
const b = rollAccountDailyOffer(day);
assert(a.offers.length === 6, '6 offres');
assert(
  a.offers.map(o => o.id).join(',') === b.offers.map(o => o.id).join(','),
  'même jour → même offre',
);
assert(
  a.offers.every(o => o.stockMax >= 1 && o.stockMax <= 2),
  'stock 1–2',
);
assert(
  a.offers.every(o => o.priceShop === o.price),
  'price = priceShop',
);

console.log('=== exports verrouillage poche ===');
assert(typeof getPouchLockStatus === 'function', 'getPouchLockStatus exporté');
assert(typeof assertPouchEditable === 'function', 'assertPouchEditable exporté');

console.log('=== capacité 1 objet = 1 slot ===');
assert(POUCH_CAPACITY === 4, 'poche 4');
assert(CHEST_CAPACITY === 12, 'coffre 12');
assert(chestSlotsNeededForRewards([{ type: 'card' }]) === 0, 'carte → 0 slot coffre');
assert(chestSlotsNeededForRewards([{ type: 'booster' }]) === 1, 'booster → 1 slot');
assert(
  chestSlotsNeededForRewards([{ type: 'booster' }, { type: 'inventory_item', amount: 2 }]) === 3,
  'booster+2 items → 3',
);
assert(invTest.countsTowardPouchCapacity({ kind: 'pending_card' }) === false, 'scellé hors cap');
assert(invTest.countsTowardPouchCapacity({ kind: 'consumable' }) === true, 'conso dans cap');
assert(
  invTest.pouchCapacityUsed([
    { kind: 'pending_card' },
    { kind: 'consumable' },
    { kind: 'consumable' },
  ]) === 2,
  'pouchCapacityUsed ignore scellés',
);

console.log('=== expandRowToSlots ===');
const expanded = invTest.expandRowToSlots({
  id: 9,
  item_key: 'heal_bandage',
  location: 'chest',
  quantity: 3,
  meta_json: null,
});
assert(expanded.length === 3, 'qty 3 → 3 slots');
assert(expanded.every(e => e.quantity === 1), 'chaque slot qty 1');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

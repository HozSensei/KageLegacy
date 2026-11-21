/**
 * Tests catalogue shop (sans DB) — packs coins.
 */
import {
  COIN_PACK_CATALOG,
  COIN_PACK_IDS,
  getCoinPack,
  listCoinPacks,
  serializeCoinPack,
} from '../src/services/shopService.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(COIN_PACK_IDS.length === 4, '4 coin packs');
assert(COIN_PACK_IDS.includes('ember'), 'ember pack');

const packs = listCoinPacks();
assert(packs[0].id === 'spark', 'sorted by price');
assert(
  packs.every(p => p.totalCoins === p.coins + p.bonusCoins),
  'totalCoins'
);

const ember = getCoinPack('ember');
assert(ember.coins === 500 && ember.bonusCoins === 50 && ember.priceEur === 5, 'ember amounts');

const forge = getCoinPack('forge');
assert(forge.coins === 1200 && forge.bonusCoins === 200 && forge.priceEur === 10, 'forge amounts');
const vault = getCoinPack('vault');
assert(vault.coins === 6000 && vault.bonusCoins === 1500 && vault.priceEur === 50, 'vault amounts');

const ser = serializeCoinPack(ember);
assert(ser.totalCoins === 550, 'serialize total');
assert(serializeCoinPack(forge).totalCoins === 1400, 'forge total');
assert(serializeCoinPack(vault).totalCoins === 7500, 'vault total');

let threw = false;
try {
  getCoinPack('hacked');
} catch (e) {
  threw = e.statusCode === 400;
}
assert(threw, 'reject invalid pack');

// Noms originaux — pas de références IP évidentes dans les clés
const banned = /naruto|uchiha|rasengan|sharingan|konoha|akatsuki/i;
for (const key of COIN_PACK_IDS) {
  assert(!banned.test(key), `original key: ${key}`);
}
for (const item of Object.values(COIN_PACK_CATALOG)) {
  assert(!banned.test(item.nameFr) && !banned.test(item.nameEn), `original name: ${item.nameFr}`);
}

console.log('testShopCatalog: OK');

/**
 * Tests catalogue shop élargi (sans DB) — packs coins + cosmétiques.
 */
import {
  COIN_PACK_CATALOG,
  COIN_PACK_IDS,
  COSMETIC_SHOP_CATALOG,
  COSMETIC_SHOP_KEYS,
  getCoinPack,
  getCosmeticDefinition,
  listCoinPacks,
  serializeCoinPack,
  serializeCosmetic,
} from '../src/services/shopService.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(COIN_PACK_IDS.length === 4, '4 coin packs');
assert(COIN_PACK_IDS.includes('ember'), 'ember pack');

const packs = listCoinPacks();
assert(packs[0].id === 'spark', 'sorted by price');
assert(packs.every((p) => p.totalCoins === p.coins + p.bonusCoins), 'totalCoins');

const ember = getCoinPack('ember');
assert(ember.coins === 500 && ember.bonusCoins === 50 && ember.priceEur === 5, 'ember amounts');

const ser = serializeCoinPack(ember);
assert(ser.totalCoins === 550, 'serialize total');

let threw = false;
try {
  getCoinPack('hacked');
} catch (e) {
  threw = e.statusCode === 400;
}
assert(threw, 'reject invalid pack');

assert(COSMETIC_SHOP_KEYS.length >= 9, 'cosmetic catalog size');
const types = new Set(Object.values(COSMETIC_SHOP_CATALOG).map((c) => c.cosmeticType));
assert(types.has('avatar_frame') && types.has('card_back') && types.has('title'), 'cosmetic types');

const frame = getCosmeticDefinition('mist_ring');
assert(frame.cost.ryos === 2500, 'mist_ring ryos');
assert(frame.cosmeticType === 'avatar_frame', 'mist_ring type');

const title = getCosmeticDefinition('dusk_strategist');
assert(title.cost.kageCoins === 200 && title.rarity === 'legendary', 'dusk_strategist');

const cosSer = serializeCosmetic(frame, { owned: true, equipped: true });
assert(cosSer.owned && cosSer.equipped && cosSer.key === 'mist_ring', 'serialize cosmetic');

threw = false;
try {
  getCosmeticDefinition('naruto_headband');
} catch (e) {
  threw = e.statusCode === 400;
}
assert(threw, 'reject unknown cosmetic');

// Noms originaux — pas de références IP évidentes dans les clés
const banned = /naruto|uchiha|rasengan|sharingan|konoha|akatsuki/i;
for (const key of [...COIN_PACK_IDS, ...COSMETIC_SHOP_KEYS]) {
  assert(!banned.test(key), `original key: ${key}`);
}
for (const item of [...Object.values(COIN_PACK_CATALOG), ...Object.values(COSMETIC_SHOP_CATALOG)]) {
  assert(!banned.test(item.nameFr) && !banned.test(item.nameEn), `original name: ${item.nameFr}`);
}

console.log('testShopCatalog: OK');

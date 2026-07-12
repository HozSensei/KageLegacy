#!/usr/bin/env node
/**
 * Smoke test magasin village : promos et catalogue achetable.
 */
import assert from 'node:assert/strict';
import {
  PROMO_DISCOUNT_PCT,
  computeShopItemPrice,
} from '../src/services/villageShopService.js';

assert.equal(PROMO_DISCOUNT_PCT, 50, 'promo cycle à −50 %');

const promo = computeShopItemPrice({
  basePrice: 600,
  category: 'match',
  promoDiscountPct: PROMO_DISCOUNT_PCT,
});
assert.equal(promo.promoPrice, 300);
assert.equal(promo.finalPrice, 300);

const lootCatalogPrice = computeShopItemPrice({
  basePrice: 0,
  category: 'bureau',
  promoDiscountPct: PROMO_DISCOUNT_PCT,
});
assert.equal(lootCatalogPrice.promoPrice, 0, 'prix catalogue 0 ne devient pas 1 ryo');

console.log('testVillageShopCatalog: OK');

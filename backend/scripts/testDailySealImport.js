#!/usr/bin/env node
/**
 * Smoke test import dailySealService (régression countUnconsumedItemsBySlug).
 */
import {
  grantDailySealsForUser,
  getDailySealPayload,
  openChakraSeal,
} from '../src/services/dailySealService.js';
import {
  countUnconsumedItemsBySlug,
  consumeOldestItemBySlug,
} from '../src/services/itemGrantService.js';

console.assert(typeof countUnconsumedItemsBySlug === 'function', 'countUnconsumedItemsBySlug exporté');
console.assert(typeof consumeOldestItemBySlug === 'function', 'consumeOldestItemBySlug exporté');
console.assert(typeof getDailySealPayload === 'function', 'getDailySealPayload exporté');
console.assert(typeof grantDailySealsForUser === 'function', 'grantDailySealsForUser exporté');
console.assert(typeof openChakraSeal === 'function', 'openChakraSeal exporté');

console.log('testDailySealImport: OK');

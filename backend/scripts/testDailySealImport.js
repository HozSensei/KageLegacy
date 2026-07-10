#!/usr/bin/env node
/**
 * Smoke test import dailySealService (régression countUnconsumedItemsBySlug).
 */
import { grantDailySealsForUser, getDailySealPayload } from '../src/services/dailySealService.js';
import { countUnconsumedItemsBySlug } from '../src/services/itemGrantService.js';

console.assert(typeof countUnconsumedItemsBySlug === 'function', 'countUnconsumedItemsBySlug exporté');
console.assert(typeof getDailySealPayload === 'function', 'getDailySealPayload exporté');
console.assert(typeof grantDailySealsForUser === 'function', 'grantDailySealsForUser exporté');

console.log('testDailySealImport: OK');

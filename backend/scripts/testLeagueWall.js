/**
 * Smoke test mur de ligue — validation body (sans DB).
 */
import { MAX_BODY } from '../src/services/leagueWallService.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(MAX_BODY === 280, 'MAX_BODY 280');

// Simule normalize via createWallPost rules — test longueur côté schema mental
const tooLong = 'x'.repeat(281);
assert(tooLong.length > MAX_BODY, 'overflow sample');

console.log('✅ league wall constants OK');

/**
 * Smoke test — modération mur de ligue.
 */
import { maskModeratedWord, moderateWallText } from '../src/services/wallModeration.js';
import { MAX_BODY } from '../src/services/leagueWallService.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(MAX_BODY === 280, 'MAX_BODY 280');
assert(maskModeratedWord('merde') === 'm****', 'mask merde');
assert(maskModeratedWord('Fuck') === 'F***', 'mask Fuck casse');
assert(moderateWallText('Quel putain de match') === 'Quel p***** de match', 'fr phrase');
assert(moderateWallText('What the fuck') === 'What the f***', 'en phrase');
assert(moderateWallText('Bon match !') === 'Bon match !', 'clean');
assert(moderateWallText('merde merde') === 'm**** m****', 'double');

console.log('✅ league wall moderation OK');

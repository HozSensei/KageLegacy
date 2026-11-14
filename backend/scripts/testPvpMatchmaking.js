/**
 * Tests unitaires matchmaking PvP (fenêtre de niveau) — purs, sans DB.
 *
 * npm run test:pvp-matchmaking --prefix backend
 */
import {
  isLevelInWindow,
  levelDistance,
  findBestMatch,
  designateHost,
} from '../../shared/pvp/matchmaking.js';
import {
  DEFAULT_LEVEL_WINDOW,
  normalizeLevelWindow,
  ALLOWED_LEVEL_WINDOWS,
} from '../../shared/pvp/config.js';
import { duelChecksum, fingerprint } from '../../shared/pvp/checksum.js';
import {
  createDuelFromBootstrap,
  applyDuelAction,
  publicDuelState,
} from '../../shared/pvp/duelEngine.js';

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

console.log('=== Config fenêtre ===');
assert(DEFAULT_LEVEL_WINDOW === 3, 'défaut ±3');
assert(ALLOWED_LEVEL_WINDOWS.includes(5), '±5 autorisé');
assert(normalizeLevelWindow(5) === 5, 'normalize 5');
assert(normalizeLevelWindow(4) === 4, 'normalize custom 4 (0–20)');
assert(normalizeLevelWindow(25) === DEFAULT_LEVEL_WINDOW, 'hors plage → défaut');
assert(normalizeLevelWindow(undefined) === 3, 'undefined → 3');

console.log('\n=== isLevelInWindow ===');
assert(isLevelInWindow(10, 10, 3) === true, 'même niveau');
assert(isLevelInWindow(10, 13, 3) === true, '10 vs 13 ±3');
assert(isLevelInWindow(10, 14, 3) === false, '10 vs 14 hors ±3');
assert(isLevelInWindow(10, 15, 5) === true, '10 vs 15 ±5');
assert(isLevelInWindow(10, 16, 5) === false, '10 vs 16 hors ±5');
assert(isLevelInWindow(1, 4, 3) === true, 'bas niveau');
assert(isLevelInWindow(100, 97, 3) === true, 'haut niveau');
assert(levelDistance(10, 7) === 3, 'distance 3');

console.log('\n=== findBestMatch ===');
const seeker = { userId: 1, level: 10, enqueuedAt: 1000 };
assert(findBestMatch(seeker, []) === null, 'file vide');
assert(
  findBestMatch(seeker, [{ userId: 1, level: 10, enqueuedAt: 500 }]) === null,
  'ignore soi-même',
);
assert(
  findBestMatch(seeker, [{ userId: 2, level: 20, enqueuedAt: 500 }], { levelWindow: 3 }) ===
    null,
  'hors fenêtre',
);

const best = findBestMatch(
  seeker,
  [
    { userId: 2, level: 12, enqueuedAt: 2000 },
    { userId: 3, level: 11, enqueuedAt: 3000 },
    { userId: 4, level: 11, enqueuedAt: 1500 },
  ],
  { levelWindow: 3 },
);
assert(best?.userId === 4, 'plus proche niveau puis plus ancien (11@1500)');

const tied = findBestMatch(
  seeker,
  [
    { userId: 5, level: 10, enqueuedAt: 4000 },
    { userId: 6, level: 10, enqueuedAt: 1000 },
  ],
  { levelWindow: 3 },
);
assert(tied?.userId === 6, 'même niveau → plus ancien en file');

console.log('\n=== designateHost ===');
const roles = designateHost(42, 7);
assert(roles.hostUserId === '7' && roles.guestUserId === '42', 'plus petit userId = Host');
let threw = false;
try {
  designateHost(9, 9);
} catch {
  threw = true;
}
assert(threw, 'même joueur → erreur');

console.log('\n=== Checksum + duel engine smoke ===');
const bootstrap = {
  matchId: 'test-match',
  seed: 'seed-abc',
  fighters: {
    host: {
      userId: 1,
      name: 'Akira',
      level: 10,
      stats: { taijutsu: 50, medicine: 20, vitesse: 30 },
      drawPile: [
        {
          instanceId: 'h1',
          slug: 'strike',
          nameFr: 'Frappe',
          cost: 1,
          damage: 6,
          block: 0,
          heal: 0,
          statType: 'taijutsu',
        },
        {
          instanceId: 'h2',
          slug: 'guard',
          nameFr: 'Garde',
          cost: 1,
          damage: 0,
          block: 5,
          heal: 0,
          statType: 'medicine',
        },
      ],
    },
    guest: {
      userId: 2,
      name: 'Ren',
      level: 11,
      stats: { taijutsu: 40, medicine: 10, vitesse: 10 },
      drawPile: [
        {
          instanceId: 'g1',
          slug: 'strike',
          nameFr: 'Frappe',
          cost: 1,
          damage: 6,
          block: 0,
          heal: 0,
          statType: 'taijutsu',
        },
      ],
    },
  },
};

const duel = createDuelFromBootstrap(bootstrap);
assert(duel.activeSeat === 'host', 'Host commence');
assert(duel.fighters.host.hand.length > 0, 'Host a une main');
assert(duel.fighters.guest.hand.length > 0, 'Guest a une main');

const cardId = duel.fighters.host.hand[0].instanceId;
const played = applyDuelAction(duel, { kind: 'play_card', seat: 'host', instanceId: cardId });
assert(!played.error, 'play_card ok');
assert(played.state.fighters.host.hand.length === duel.fighters.host.hand.length - 1, 'carte retirée');

const pubGuest = publicDuelState(played.state, 'guest');
assert(pubGuest.fighters.guest.hand != null, 'guest voit sa main');
assert(pubGuest.fighters.host.hand === undefined, 'guest ne voit pas la main host');

const { checksum, summary } = duelChecksum(played.state);
assert(typeof checksum === 'string' && checksum.length === 8, 'checksum hex 8');
assert(fingerprint(summary) === checksum, 'fingerprint stable');

console.log(`\n=== Résultat : ${passed} ok, ${failed} ko ===`);
if (failed > 0) process.exit(1);

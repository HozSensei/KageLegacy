/**
 * Tests unitaires matchmaking PvP + anti-triche — purs, sans DB.
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
  GUEST_CHALLENGE_ENABLED,
} from '../../shared/pvp/config.js';
import { duelChecksum, fingerprint, normalizeResultSummary } from '../../shared/pvp/checksum.js';
import {
  compareHostGuestChecksums,
  independentChecksumFromPublic,
  PVP_AC_LIMITS,
  validateBootstrap,
  validateMatchResultReport,
} from '../../shared/pvp/antiCheat.js';
import {
  createDuelFromBootstrap,
  applyDuelAction,
  publicDuelState,
  BASE_MAX_HP,
  BASE_CHAKRA,
} from '../../shared/pvp/duelEngine.js';
import {
  checkPvpRateLimit,
  resetPvpRateLimits,
  PVP_RATE_LIMITS,
} from '../src/services/pvp/pvpRateLimit.js';

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
assert(GUEST_CHALLENGE_ENABLED === true, 'guest challenge activé');

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
      hp: BASE_MAX_HP,
      maxHp: BASE_MAX_HP,
      chakra: BASE_CHAKRA,
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
        {
          instanceId: 'h3',
          slug: 'strike2',
          nameFr: 'Frappe 2',
          cost: 1,
          damage: 6,
          block: 0,
          heal: 0,
          statType: 'taijutsu',
        },
        {
          instanceId: 'h4',
          slug: 'blow',
          nameFr: 'Coup',
          cost: 2,
          damage: 10,
          block: 0,
          heal: 0,
          statType: 'taijutsu',
        },
      ],
    },
    guest: {
      userId: 2,
      name: 'Ren',
      level: 11,
      hp: BASE_MAX_HP,
      maxHp: BASE_MAX_HP,
      chakra: BASE_CHAKRA,
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
        {
          instanceId: 'g2',
          slug: 'guard',
          nameFr: 'Garde',
          cost: 1,
          damage: 0,
          block: 5,
          heal: 0,
          statType: 'medicine',
        },
        {
          instanceId: 'g3',
          slug: 'heal',
          nameFr: 'Soin',
          cost: 1,
          damage: 0,
          block: 0,
          heal: 6,
          statType: 'medicine',
        },
        {
          instanceId: 'g4',
          slug: 'blow',
          nameFr: 'Coup',
          cost: 2,
          damage: 10,
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
assert(typeof checksum === 'string' && checksum.length === 16, 'checksum hex 16');
assert(fingerprint(summary) === checksum, 'fingerprint stable');
assert(fingerprint(normalizeResultSummary(summary)) === checksum, 'normalize stable');

console.log('\n=== validateBootstrap ===');
const bootOk = validateBootstrap(bootstrap, {
  hostUserId: 1,
  guestUserId: 2,
  hostLevel: 10,
  guestLevel: 11,
});
assert(bootOk.ok === true, 'bootstrap valide');

const badLevel = structuredClone(bootstrap);
badLevel.fighters.host.level = 99;
const bootBadLevel = validateBootstrap(badLevel, {
  hostUserId: 1,
  guestUserId: 2,
  hostLevel: 10,
  guestLevel: 11,
});
assert(bootBadLevel.ok === false, 'level mismatch rejeté');
assert(bootBadLevel.flags.includes('bootstrap_level_mismatch'), 'flag level_mismatch');

const badHp = structuredClone(bootstrap);
badHp.fighters.guest.hp = -50;
badHp.fighters.guest.maxHp = -50;
const bootBadHp = validateBootstrap(badHp, { hostUserId: 1, guestUserId: 2 });
assert(bootBadHp.ok === false, 'maxHp absurde rejeté');

const shortDeck = structuredClone(bootstrap);
shortDeck.fighters.host.drawPile = shortDeck.fighters.host.drawPile.slice(0, 1);
assert(validateBootstrap(shortDeck).ok === false, 'deck trop court rejeté');

console.log('\n=== validateMatchResultReport ===');
const matchRow = {
  id: 'test-match',
  host_user_id: 1,
  guest_user_id: 2,
  status: 'in_progress',
  started_at: new Date(Date.now() - 30_000).toISOString(),
};

const goodSummary = {
  matchId: 'test-match',
  turn: 12,
  status: 'completed',
  winnerSeat: 'host',
  host: { seat: 'host', userId: 1, hp: 40, maxHp: BASE_MAX_HP, block: 0, chakra: 2, handCount: 2, drawCount: 3, discardCount: 5 },
  guest: { seat: 'guest', userId: 2, hp: 0, maxHp: BASE_MAX_HP, block: 0, chakra: 1, handCount: 1, drawCount: 2, discardCount: 6 },
};
const goodCs = fingerprint(normalizeResultSummary(goodSummary));
const goodReport = validateMatchResultReport({
  matchRow,
  role: 'host',
  winnerSeat: 'host',
  checksum: goodCs,
  summary: goodSummary,
  endReason: 'hp',
});
assert(goodReport.ok === true, 'report cohérent accepté');

const negHp = {
  ...goodSummary,
  guest: { ...goodSummary.guest, hp: -999 },
};
const negReport = validateMatchResultReport({
  matchRow,
  role: 'host',
  winnerSeat: 'host',
  checksum: fingerprint(normalizeResultSummary(negHp)),
  summary: negHp,
});
assert(negReport.ok === false, 'HP négatif rejeté');
assert(negReport.flags.includes('hp_absurd'), 'flag hp_absurd');

const badWinner = validateMatchResultReport({
  matchRow,
  role: 'host',
  winnerSeat: 'host',
  checksum: fingerprint(
    normalizeResultSummary({
      ...goodSummary,
      guest: { ...goodSummary.guest, hp: 50 },
    }),
  ),
  summary: { ...goodSummary, guest: { ...goodSummary.guest, hp: 50 } },
});
assert(badWinner.ok === false, 'perdant HP>0 rejeté');
assert(badWinner.flags.includes('loser_hp_positive'), 'flag loser_hp_positive');

const tooManyTurns = validateMatchResultReport({
  matchRow,
  role: 'host',
  winnerSeat: 'host',
  checksum: 'deadbeefdeadbeef',
  summary: { ...goodSummary, turn: PVP_AC_LIMITS.maxTurns + 5 },
});
assert(tooManyTurns.ok === false, 'trop de tours rejeté');
assert(tooManyTurns.flags.includes('turn_bounds'), 'flag turn_bounds');

const instant = validateMatchResultReport({
  matchRow: {
    ...matchRow,
    started_at: new Date(Date.now() - 100).toISOString(),
  },
  role: 'host',
  winnerSeat: 'host',
  checksum: goodCs,
  summary: goodSummary,
  endReason: 'hp',
});
assert(instant.ok === false, 'durée trop courte rejetée');
assert(instant.flags.includes('duration_too_short'), 'flag duration_too_short');

const wrongUser = validateMatchResultReport({
  matchRow,
  role: 'host',
  winnerSeat: 'host',
  checksum: fingerprint(
    normalizeResultSummary({
      ...goodSummary,
      host: { ...goodSummary.host, userId: 99 },
    }),
  ),
  summary: { ...goodSummary, host: { ...goodSummary.host, userId: 99 } },
});
assert(wrongUser.ok === false, 'userId hors participants rejeté');

console.log('\n=== Guest challenge checksum ===');
const cmpOk = compareHostGuestChecksums('aaaabbbbccccdddd', 'aaaabbbbccccdddd');
assert(cmpOk.match === true && cmpOk.voidMatch === false, 'checksums égaux');
const cmpBad = compareHostGuestChecksums('aaaabbbbccccdddd', 'ffffeeee11112222');
assert(cmpBad.match === false && cmpBad.voidMatch === true, 'mismatch → void');
assert(cmpBad.flags.includes('checksum_host_guest_mismatch'), 'flag mismatch');
assert(compareHostGuestChecksums('abc', null).match === null, 'guest absent → null');

const indep = independentChecksumFromPublic(pubGuest);
assert(indep && indep.checksum.length === 16, 'empreinte indépendante publique');
assert(indep.checksum === pubGuest.checksum, 'publique ≡ checksum host (vue cohérente)');

console.log('\n=== Rate-limit ===');
resetPvpRateLimits();
let allowed = 0;
let blocked = false;
for (let i = 0; i < PVP_RATE_LIMITS.queue.limit + 2; i += 1) {
  const r = checkPvpRateLimit('queue', 42);
  if (r.allowed) allowed += 1;
  else blocked = true;
}
assert(allowed === PVP_RATE_LIMITS.queue.limit, `queue autorise ${PVP_RATE_LIMITS.queue.limit}`);
assert(blocked === true, 'queue bloque au-delà');
resetPvpRateLimits();
const reportBurst = checkPvpRateLimit('report', 7);
assert(reportBurst.allowed === true, 'report autorisé au début');

console.log(`\n=== Résultat : ${passed} ok, ${failed} ko ===`);
if (failed > 0) process.exit(1);

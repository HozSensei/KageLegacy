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
  RESULT_CONFIRMATION_TIMEOUT_MS,
} from '../../shared/pvp/config.js';
import { duelChecksum, fingerprint, normalizeResultSummary } from '../../shared/pvp/checksum.js';
import {
  compareHostGuestChecksums,
  evaluateResultConfirmation,
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
assert(RESULT_CONFIRMATION_TIMEOUT_MS === 5 * 60 * 1000, 'confirmation limitée à 5 min');

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
  'ignore soi-même'
);
assert(
  findBestMatch(seeker, [{ userId: 2, level: 20, enqueuedAt: 500 }], { levelWindow: 3 }) === null,
  'hors fenêtre'
);

const best = findBestMatch(
  seeker,
  [
    { userId: 2, level: 12, enqueuedAt: 2000 },
    { userId: 3, level: 11, enqueuedAt: 3000 },
    { userId: 4, level: 11, enqueuedAt: 1500 },
  ],
  { levelWindow: 3 }
);
assert(best?.userId === 4, 'plus proche niveau puis plus ancien (11@1500)');

const tied = findBestMatch(
  seeker,
  [
    { userId: 5, level: 10, enqueuedAt: 4000 },
    { userId: 6, level: 10, enqueuedAt: 1000 },
  ],
  { levelWindow: 3 }
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
      rank: 'Genin',
      profile: { avatarId: 'genin-1-2', nicknameId: 'genin', unlockedNicknameIds: ['genin'] },
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
      rank: 'Genin',
      profile: { avatarId: 'aspirant-2-8', borderColor: '#123abc' },
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
assert(
  played.state.fighters.host.hand.length === duel.fighters.host.hand.length - 1,
  'carte retirée'
);

const pubGuest = publicDuelState(played.state, 'guest');
assert(pubGuest.fighters.guest.hand != null, 'guest voit sa main');
assert(pubGuest.fighters.host.hand === undefined, 'guest ne voit pas la main host');
assert(pubGuest.fighters.host.stats === undefined, 'guest ne voit pas les stats privées du host');
assert(
  pubGuest.fighters.host.rank === 'Genin' && pubGuest.fighters.host.level === 10,
  'rang et niveau du host visibles'
);
assert(
  JSON.stringify(pubGuest.fighters.host.profile) ===
    JSON.stringify({
      avatarId: 'genin-1-2',
      borderColor: null,
      backgroundColor: null,
      nicknameId: 'genin',
    }),
  'le profil public du host exclut les surnoms déverrouillés'
);
assert(
  pubGuest.fighters.guest.profile.avatarId === 'aspirant-2-8' &&
    pubGuest.fighters.guest.profile.borderColor === '#123ABC',
  'le guest garde son propre profil'
);

const { checksum, summary } = duelChecksum(played.state);
assert(typeof checksum === 'string' && checksum.length === 16, 'checksum hex 16');
assert(fingerprint(summary) === checksum, 'fingerprint stable');
assert(fingerprint(normalizeResultSummary(summary)) === checksum, 'normalize stable');

console.log('\n=== Invocations PvP ===');
const summonDuel = createDuelFromBootstrap({
  matchId: 'summon-match',
  seed: 'summon-seed',
  fighters: {
    host: {
      userId: 1,
      name: 'Akira',
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      hand: [
        {
          instanceId: 'summon-1',
          cardType: 'summon',
          cost: 1,
          summon: { nameFr: 'Clone', hp: 10, attack: 3, duration: 2, abilities: ['taunt'] },
        },
      ],
      drawPile: [],
    },
    guest: {
      userId: 2,
      name: 'Ren',
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      hand: [{ instanceId: 'heavy-hit', cost: 0, damage: 6, statType: 'taijutsu' }],
      drawPile: [],
    },
  },
});
const summoned = applyDuelAction(summonDuel, {
  kind: 'play_card',
  seat: 'host',
  instanceId: 'summon-1',
});
assert(
  summoned.state.fighters.host.ally?.remainingTurns === 2,
  'la carte invoque un allié avec sa durée'
);
assert(summoned.state.fighters.host.ally?.taunt === true, 'Taunt est lu depuis les capacités');
const publicSummon = publicDuelState(summoned.state, 'guest');
assert(
  publicSummon.fighters.host.level === 1 && publicSummon.fighters.host.profile === undefined,
  'un ancien bootstrap garde son niveau par défaut sans profil'
);
assert(publicSummon.fighters.host.ally?.hp === 10, 'l’invocation adverse est visible');
const finishingState = structuredClone(summoned.state);
finishingState.fighters.guest.hp = 3;
const finishingTurn = applyDuelAction(finishingState, { kind: 'end_turn', seat: 'host' });
assert(finishingTurn.state.status === 'in_progress', 'l’invocation n’attaque pas avant son tour');
const hostEnd = applyDuelAction(summoned.state, { kind: 'end_turn', seat: 'host' });
assert(hostEnd.state.fighters.guest.hp === 100, 'l’invocation attend le début du prochain tour');
const guestHit = applyDuelAction(hostEnd.state, {
  kind: 'play_card',
  seat: 'guest',
  instanceId: 'heavy-hit',
});
assert(guestHit.state.fighters.host.ally?.hp === 4, 'Taunt détourne les dégâts vers l’invocation');
assert(guestHit.state.fighters.host.hp === 100, 'la provocation protège les PV du joueur');
const hostTurn = applyDuelAction(guestHit.state, { kind: 'end_turn', seat: 'guest' });
assert(
  hostTurn.state.fighters.guest.hp === 97,
  'l’invocation attaque au début du tour propriétaire'
);

console.log('\n=== Effets de carte PvP alignés sur PvE ===');
const effectDuel = createDuelFromBootstrap({
  matchId: 'effect-match',
  seed: 'effect-seed',
  fighters: {
    host: {
      userId: 1,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      maxChakra: 3,
      stats: { taijutsu: 0 },
      hand: [
        {
          instanceId: 'poison-strike',
          type: 'attack',
          cost: 0,
          damage: 4,
          statType: 'taijutsu',
          effects: [
            { type: 'apply_status', target: 'enemy', status: 'poison', value: 2, duration: 2 },
            { type: 'draw', value: 1 },
          ],
          exhaust: true,
        },
      ],
      drawPile: [{ instanceId: 'drawn-card', type: 'skill', cost: 0 }],
    },
    guest: { userId: 2, hp: 100, maxHp: 100, chakra: 3, stats: {} },
  },
});
const poisonPlayed = applyDuelAction(effectDuel, {
  kind: 'play_card',
  seat: 'host',
  instanceId: 'poison-strike',
});
assert(poisonPlayed.state.fighters.guest.hp === 96, 'dégâts de base résolus');
assert(poisonPlayed.state.fighters.guest.statuses[0]?.key === 'poison', 'statut ennemi appliqué');
assert(poisonPlayed.state.fighters.host.exhaustPile.length === 1, 'carte Exhaust retirée du cycle');
assert(
  poisonPlayed.state.fighters.host.hand[0]?.instanceId === 'drawn-card',
  'effet Pioche résolu'
);
const poisonTurn = applyDuelAction(poisonPlayed.state, { kind: 'end_turn', seat: 'host' });
assert(poisonTurn.state.fighters.guest.hp === 94, 'Poison tick au début du tour adverse');

const reactionDuel = createDuelFromBootstrap({
  matchId: 'reaction-match',
  seed: 'reaction-seed',
  fighters: {
    host: {
      userId: 1,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      hand: [
        {
          instanceId: 'evade-card',
          type: 'skill',
          cost: 0,
          effects: [{ type: 'evade_next', chance: 1 }],
        },
      ],
      drawPile: [],
    },
    guest: {
      userId: 2,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      hand: [{ instanceId: 'attack-card', type: 'attack', cost: 0, damage: 8 }],
      drawPile: [],
    },
  },
});
let reactionState = applyDuelAction(reactionDuel, {
  kind: 'play_card',
  seat: 'host',
  instanceId: 'evade-card',
}).state;
assert(
  reactionState.fighters.host.statuses.find(status => status.key === 'evade')?.duration === null,
  'esquive reste active pendant le tour adverse'
);
reactionState = applyDuelAction(reactionState, { kind: 'end_turn', seat: 'host' }).state;
const evadedAttack = applyDuelAction(reactionState, {
  kind: 'play_card',
  seat: 'guest',
  instanceId: 'attack-card',
});
assert(evadedAttack.state.fighters.host.hp === 100, 'esquive annule l’attaque PvP');
assert(
  !evadedAttack.state.fighters.host.statuses.some(status => status.key === 'evade'),
  'esquive consommée après la prochaine attaque'
);

const counterDuel = createDuelFromBootstrap({
  matchId: 'counter-match',
  seed: 'counter-seed',
  fighters: {
    host: {
      userId: 1,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      hand: [
        {
          instanceId: 'counter-card',
          type: 'skill',
          cost: 0,
          effects: [{ type: 'counter', damage: 5 }],
        },
      ],
      drawPile: [],
    },
    guest: {
      userId: 2,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      hand: [{ instanceId: 'counter-target', type: 'attack', cost: 0, damage: 8 }],
      drawPile: [],
    },
  },
});
let counterState = applyDuelAction(counterDuel, {
  kind: 'play_card',
  seat: 'host',
  instanceId: 'counter-card',
}).state;
counterState = applyDuelAction(counterState, { kind: 'end_turn', seat: 'host' }).state;
const counteredAttack = applyDuelAction(counterState, {
  kind: 'play_card',
  seat: 'guest',
  instanceId: 'counter-target',
});
assert(counteredAttack.state.fighters.guest.hp === 95, 'contre inflige ses dégâts au PvP');

const talentDuel = createDuelFromBootstrap({
  matchId: 'talent-match',
  seed: 'talent-seed',
  fighters: {
    host: {
      userId: 1,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      stats: {},
      talentCodes: ['blade_swift'],
      hand: [
        { instanceId: 'talent-strike', type: 'attack', cost: 1, damage: 4, statType: 'taijutsu' },
      ],
      drawPile: [],
    },
    guest: { userId: 2, hp: 100, maxHp: 100, chakra: 3, stats: {} },
  },
});
const talentStrike = applyDuelAction(talentDuel, {
  kind: 'play_card',
  seat: 'host',
  instanceId: 'talent-strike',
});
assert(talentStrike.state.fighters.guest.hp === 93, 'talent de combat appliqué au PvP');

const expiringDuel = createDuelFromBootstrap({
  matchId: 'expiry-match',
  seed: 'expiry-seed',
  fighters: {
    host: {
      userId: 1,
      hp: 100,
      maxHp: 100,
      chakra: 3,
      hand: [
        {
          instanceId: 'short-summon',
          cardType: 'summon',
          cost: 0,
          summon: { name: 'Esprit', hp: 5, attack: 0, duration: 2 },
        },
      ],
      drawPile: [],
    },
    guest: { userId: 2, hp: 100, maxHp: 100, chakra: 3, hand: [], drawPile: [] },
  },
});
let expiryState = applyDuelAction(expiringDuel, {
  kind: 'play_card',
  seat: 'host',
  instanceId: 'short-summon',
}).state;
expiryState = applyDuelAction(expiryState, { kind: 'end_turn', seat: 'host' }).state;
expiryState = applyDuelAction(expiryState, { kind: 'end_turn', seat: 'guest' }).state;
assert(
  expiryState.fighters.host.ally?.remainingTurns === 1,
  'la durée diminue à la fin du tour propriétaire'
);
const expired = applyDuelAction(expiryState, { kind: 'end_turn', seat: 'host' });
assert(expired.state.fighters.host.ally === null, 'l’invocation disparaît à expiration');
assert(
  expired.logs.some(log => log.type === 'ally_expired'),
  'expiration inscrite dans le journal'
);

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
  host: {
    seat: 'host',
    userId: 1,
    hp: 40,
    maxHp: BASE_MAX_HP,
    block: 0,
    chakra: 2,
    handCount: 2,
    drawCount: 3,
    discardCount: 5,
  },
  guest: {
    seat: 'guest',
    userId: 2,
    hp: 0,
    maxHp: BASE_MAX_HP,
    block: 0,
    chakra: 1,
    handCount: 1,
    drawCount: 2,
    discardCount: 6,
  },
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
    })
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
    })
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
assert(
  evaluateResultConfirmation({ hostChecksum: 'aaaabbbbccccdddd' }).state ===
    'awaiting_guest_confirmation',
  'checksum Host seul → confirmation Guest requise'
);
assert(
  evaluateResultConfirmation({
    hostChecksum: 'aaaabbbbccccdddd',
    guestChecksum: 'aaaabbbbccccdddd',
  }).state === 'confirmed',
  'checksums identiques → résultat confirmable'
);
assert(
  evaluateResultConfirmation({
    hostChecksum: 'aaaabbbbccccdddd',
    confirmationExpiresAt: new Date(Date.now() - 1).toISOString(),
  }).state === 'expired',
  'confirmation dépassant le délai → expirée'
);

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

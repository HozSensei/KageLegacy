/**
 * Tests Phase 1 — playerCharacterService
 * Usage: node scripts/testPlayerCharacter.js
 *
 * Les tests purs (XP, ranks, merge) tournent sans DB.
 * Les tests d'intégration DB sont exécutés si MySQL répond.
 */
import strictAssert from 'node:assert/strict';
import { once } from 'node:events';
import {
  applyXpGain,
  createEmptyStats,
  mergeStatBonuses,
  rankForLevel,
  xpRequiredForLevel,
  createCharacter,
  getCharacter,
  addXP,
  levelUp,
  getComputedStats,
  MAX_LEVEL,
} from '../src/services/playerCharacterService.js';
import { query } from '../src/config/database.js';
import { characterProfilePatchSchema, createCharacterSchema } from '../src/validators/player.js';
import {
  ASPIRANT_RANK,
  DEFAULT_AVATAR_ID,
  isAvatarAvailableToRank,
  isKnownAvatarId,
  serializeCharacterAppearance,
} from '../src/services/characterAppearance.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`OK: ${message}`);
  }
}

function testPureHelpers() {
  console.log('\n=== Pure helpers ===');

  const creation = createCharacterSchema.safeParse({ name: 'Hayato Test' });
  assert(creation.success, 'validation de la création sans affinité élémentaire');
  const legacyCreation = createCharacterSchema.safeParse({
    name: 'Hayato Test',
    elementAffinity: 'Futon',
  });
  assert(legacyCreation.success, 'affinité historique valide acceptée');
  const invalidCreation = createCharacterSchema.safeParse({
    name: 'Hayato Test',
    elementAffinity: 'Invalide',
  });
  assert(!invalidCreation.success, 'affinité historique invalide refusée');

  const empty = createEmptyStats();
  assert(empty.taijutsu === 0 && empty.maxHp === 0, 'stats vides à 0');
  assert(
    JSON.stringify(Object.keys(empty).sort()) ===
      JSON.stringify(
        [
          'taijutsu',
          'ninjutsu',
          'genjutsu',
          'medicine',
          'maxHp',
          'maxChakra',
          'startingBlock',
        ].sort()
      ),
    'sept clés de stats de combat'
  );

  assert(xpRequiredForLevel(1) === 100, 'XP 1→2 = 100');
  assert(xpRequiredForLevel(5) === 500, 'XP 5→6 = 500');
  assert(xpRequiredForLevel(MAX_LEVEL) === 8000, 'XP au cap documentée');

  assert(rankForLevel(1) === ASPIRANT_RANK, 'rang Aspirant ninja au niveau 1');
  assert(rankForLevel(4) === ASPIRANT_RANK, 'rang Aspirant ninja au niveau 4');
  assert(rankForLevel(5) === 'Genin', 'rang Genin au niveau 5');
  assert(rankForLevel(20) === 'Chunin', 'rang Chunin');
  assert(rankForLevel(40) === 'Jonin', 'rang Jonin');
  assert(rankForLevel(60) === 'ANBU', 'rang ANBU');
  assert(rankForLevel(80) === 'Kage', 'rang Kage');

  const merged = mergeStatBonuses(
    { taijutsu: 5 },
    { taijutsu: 10, vitesse: 3, maxChakra: 2, startingBlock: 4 },
    { ninjutsu: 7 }
  );
  assert(merged.taijutsu === 15, 'merge taijutsu');
  assert(!Object.hasOwn(merged, 'vitesse'), 'les anciennes stats ne sont pas ajoutées');
  assert(merged.ninjutsu === 7, 'merge ninjutsu');
  assert(merged.maxChakra === 2 && merged.startingBlock === 4, 'merge character bonuses');
  assert(merged.genjutsu === 0, 'merge génjutsu reste 0');

  const oneLevel = applyXpGain({ level: 1, xp: 0, talentPointsAvailable: 1 }, 100);
  assert(oneLevel.level === 2, 'addXP 100 → level 2');
  assert(oneLevel.xp === 0, 'XP consommée');
  assert(oneLevel.talentPointsAvailable === 2, 'level-up → +1 talent point');
  assert(oneLevel.leveledUp === true, 'leveledUp true');
  assert(oneLevel.levelsGained === 1, '1 niveau gagné');
  assert(oneLevel.rank === ASPIRANT_RANK, 'rang inchangé à 2');

  const multi = applyXpGain({ level: 1, xp: 50, talentPointsAvailable: 1 }, 350);
  // need 100 for L2 (50+350=400 → -100 → 300), need 200 for L3 → 100 left at L3
  assert(multi.level === 3, 'multi level-up → 3');
  assert(multi.xp === 100, 'XP restante 100');
  assert(multi.talentPointsAvailable === 3, '2 level-ups → +2 talent points');
  assert(multi.levelsGained === 2, '2 niveaux');

  const noAutoStats = applyXpGain({ level: 19, xp: 0, talentPointsAvailable: 19 }, 1900);
  assert(noAutoStats.level === 20, 'atteint 20');
  assert(noAutoStats.rank === 'Chunin', 'rang Chunin à 20');
  assert(noAutoStats.talentPointsAvailable === 20, '+1 talent only');

  const atCap = applyXpGain({ level: MAX_LEVEL, xp: 0, talentPointsAvailable: 100 }, 9999);
  assert(atCap.level === MAX_LEVEL, 'cap niveau 80');
  assert(atCap.levelsGained === 0, 'pas de level-up au cap');
}

function testAppearance() {
  for (const [prefix, rank] of [
    ['aspirant', ASPIRANT_RANK],
    ['genin', 'Genin'],
    ['chunin', 'Chunin'],
    ['jonin', 'Jonin'],
    ['anbu', 'ANBU'],
  ]) {
    for (const sheet of [1, 2]) {
      for (let tile = 1; tile <= 16; tile += 1) {
        strictAssert(isAvatarAvailableToRank(`${prefix}-${sheet}-${tile}`, rank));
      }
    }
  }
  for (const id of [
    'aspirant-1-0',
    'aspirant-2-17',
    'aspirant-3-1',
    'aspirant-01-1',
    'aspirant-1-1\n',
    'kage-1-1',
  ]) {
    strictAssert(!isKnownAvatarId(id), id);
  }
  strictAssert(isAvatarAvailableToRank('anbu-2-16', 'Kage'));
  strictAssert(!isAvatarAvailableToRank('anbu-2-16', 'Jonin'));
  strictAssert(!createCharacterSchema.safeParse({ name: 'Hayato', avatarId: 'genin-1-1' }).success);
  for (const id of ['joueur-9', 'bg-joueur', 'url(x)', '']) {
    strictAssert(!characterProfilePatchSchema.safeParse({ backgroundId: id }).success, id);
  }
  for (const id of ['joueur-3', 'joueur-8']) {
    strictAssert(characterProfilePatchSchema.safeParse({ backgroundId: id }).success, id);
  }
  strictAssert(characterProfilePatchSchema.safeParse({ backgroundColor: '#2a3348' }).success);
  strictAssert(characterProfilePatchSchema.safeParse({ backgroundColor: null }).success);
  for (const color of ['#2A33', 'red', '2a3348', '#GG0000']) {
    strictAssert(!characterProfilePatchSchema.safeParse({ backgroundColor: color }).success, color);
  }
  strictAssert(!characterProfilePatchSchema.safeParse({}).success);
  strictAssert(!characterProfilePatchSchema.safeParse({ avatarId: null }).success);
  strictAssert(!characterProfilePatchSchema.safeParse({ unlockedNicknameIds: ['kage'] }).success);
  strictAssert.deepEqual(
    serializeCharacterAppearance({
      character_rank: 'Chunin',
      character_level: 20,
      character_avatar_id: 'genin-2-16',
      character_background_id: 'joueur-1',
      character_background_color: '#2a3348',
      character_nickname_id: 'chunin',
    }),
    {
      avatarId: 'genin-2-16',
      backgroundId: 'joueur-1',
      backgroundColor: '#2A3348',
      nicknameId: 'chunin',
      frameId: null,
    }
  );
  strictAssert.deepEqual(
    serializeCharacterAppearance({
      rank: ASPIRANT_RANK,
      level: 1,
      highest_level: 5,
      avatar_id: 'genin-1-1',
      nickname_id: 'genin',
    }),
    {
      avatarId: DEFAULT_AVATAR_ID,
      backgroundId: null,
      backgroundColor: null,
      nicknameId: 'genin',
      frameId: null,
    }
  );
  strictAssert.equal(
    serializeCharacterAppearance({ level: 1, nickname_id: 'genin' }).nicknameId,
    null
  );
  console.log('OK: catalogue, validation et sérialisation du profil');
}

async function dbAvailable() {
  try {
    await query('SELECT 1 AS ok');
    const columns = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'player_profiles'
         AND column_name = 'character_name'`
    );
    return columns.length > 0;
  } catch (e) {
    console.warn(`DB indisponible (${e.message}) — tests d'intégration ignorés.`);
    return false;
  }
}

async function testIntegration() {
  console.log('\n=== Integration DB ===');
  const prefix = `pc_test_${Date.now()}`;
  const userResult = await query('INSERT INTO users (username) VALUES (?)', [prefix]);
  const userId = userResult.insertId;

  await query(
    `INSERT INTO player_profiles (user_id, display_name, ryos, language)
     VALUES (?, ?, 1000, 'fr')`,
    [userId, prefix]
  );

  const created = await createCharacter(userId, {
    name: 'Hayato Test',
  });
  assert(created?.name === 'Hayato Test', 'création personnage sans affinité élémentaire');
  assert(created.level === 1, 'niveau initial 1');
  assert(created.rank === ASPIRANT_RANK, 'rang initial stocké : Aspirant ninja');
  assert(created.profile.avatarId === DEFAULT_AVATAR_ID, 'portrait par défaut sans avatarId');
  assert(created.talentPointsAvailable === 1, '1 talent point au niveau 1');
  // Starter loadout (cartes + deck) peut déjà contribuer aux passifs deck.
  assert(created.stats?.breakdown?.talents?.taijutsu === 0, 'pas de bonus talents au départ');
  assert(created.stats?.breakdown?.cards, 'breakdown cards présent (starter loadout)');
  assert(
    typeof created.stats?.total?.taijutsu === 'number',
    'stats.total numérique après création'
  );
  assert(!Object.hasOwn(created, 'specialization'), 'spécialisation absente du personnage');

  let threw = false;
  try {
    await createCharacter(userId, { name: 'Dup' });
  } catch (e) {
    threw = e.statusCode === 409;
  }
  assert(threw, 'création double → 409');

  const xpResult = await addXP(userId, 100);
  assert(xpResult.leveledUp === true, 'addXP level-up');
  assert(xpResult.character.level === 2, 'niveau 2 après XP');
  assert(xpResult.character.talentPointsAvailable === 2, '+1 talent point via addXP');
  assert(xpResult.talentPointsGained === 1, 'talentPointsGained = 1');

  // Préparer un level-up manuel
  await query('UPDATE player_profiles SET character_xp = ? WHERE user_id = ?', [
    xpRequiredForLevel(2),
    userId,
  ]);
  const lu = await levelUp(userId);
  assert(lu.leveledUp === true, 'levelUp manuel');
  assert(lu.character.level === 3, 'niveau 3');
  assert(lu.talentPointsGained === 1, 'levelUp → +1 talent point, pas de stats');

  const fetched = await getCharacter(userId);
  assert(fetched?.id === created.id, 'getCharacter');
  assert(
    !Object.hasOwn(fetched, 'specialization'),
    'champ de spécialisation absent du personnage TCG'
  );

  const stats = await getComputedStats(userId);
  assert(stats.breakdown.talents?.taijutsu === 0, 'getComputedStats talents à 0 sans talents');
  assert(stats.breakdown.talents && stats.breakdown.cards, 'breakdown talents + cards');
  assert(typeof stats.total.taijutsu === 'number', 'getComputedStats total numérique');

  // Cleanup (decks / collection créés par starter loadout)
  const deckIds = await query('SELECT id FROM user_decks WHERE user_id = ?', [userId]);
  for (const deck of deckIds) {
    await query('DELETE FROM user_deck_cards WHERE deck_id = ?', [deck.id]);
  }
  await query('DELETE FROM user_decks WHERE user_id = ?', [userId]);
  await query('DELETE FROM user_card_collection WHERE user_id = ?', [userId]);

  await query('DELETE FROM player_profiles WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

async function testProfileRoutes() {
  const { default: app } = await import('../src/app.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const path = '/api/player/character/profile';
  const userIds = [];
  const request = async (method, path, status, { cookie, body } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(cookie && { cookie }), ...(body && { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json();
    strictAssert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(json)}`);
    return { json, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };

  try {
    await request('PATCH', path, 401, { body: { backgroundId: null } });
    const { createSession } = await import('../src/services/authService.js');
    const oldUser = await query('INSERT INTO users (username) VALUES (?)', [
      `pc_old_${Date.now()}`,
    ]);
    userIds.push(oldUser.insertId);
    await query('INSERT INTO player_profiles (user_id, display_name) VALUES (?, ?)', [
      oldUser.insertId,
      'Old Player',
    ]);
    const { token } = await createSession(oldUser.insertId);
    const oldCookie = `kage_session=${token}`;
    await request('PATCH', path, 404, { cookie: oldCookie, body: { backgroundId: null } });
    await request('POST', '/api/player/create', 400, {
      cookie: oldCookie,
      body: { name: 'Old Player', avatarId: 'genin-1-1' },
    });
    const legacy = await request('POST', '/api/player/create', 201, {
      cookie: oldCookie,
      body: { name: 'Old Player', avatarUrl: 'https://example.com/old.png' },
    });
    strictAssert.equal(legacy.json.character.avatarUrl, 'https://example.com/old.png');
    strictAssert.equal(legacy.json.character.profile.avatarId, DEFAULT_AVATAR_ID);

    const signup = await request('POST', '/api/auth/register', 201, {
      body: {
        email: `pc_${Date.now()}@example.com`,
        password: 'fixture-only',
      },
    });
    const userId = signup.json.user.id;
    userIds.push(userId);
    await request('GET', '/api/player', 404, { cookie: signup.cookie });
    await request('POST', '/api/player/create', 201, {
      cookie: signup.cookie,
      body: { name: 'Test Shinobi', avatarId: 'aspirant-1-16' },
    });

    const guest = await request('POST', '/api/auth/guest', 201, {
      body: { language: 'en' },
    });
    userIds.push(guest.json.user.id);
    const cookie = guest.cookie;
    await request('POST', '/api/player/create', 201, {
      cookie,
      body: { name: 'Guest Shinobi', avatarId: 'aspirant-2-16' },
    });
    const character = async () =>
      (await request('GET', '/api/player', 200, { cookie })).json.character;
    const save = (body, status = 200) => request('PATCH', path, status, { cookie, body });
    strictAssert.equal((await character()).profile.avatarId, 'aspirant-2-16');
    await save({ avatarId: 'genin-1-1' }, 400);
    await save({ backgroundId: 'joueur-9' }, 400);
    await save({ nicknameId: 'genin', backgroundId: 'joueur-1' }, 400);
    strictAssert.equal((await character()).profile.backgroundId, null);

    const progress = await addXP(guest.json.user.id, 600);
    strictAssert.equal(progress.character.level, 4);
    strictAssert.equal(progress.character.rank, ASPIRANT_RANK);
    await query('UPDATE player_profiles SET character_xp = 400 WHERE user_id = ?', [
      guest.json.user.id,
    ]);
    const promoted = (await request('POST', '/api/player/level-up', 200, { cookie })).json
      .character;
    strictAssert.equal(promoted.rank, 'Genin');
    strictAssert.equal(promoted.profile.avatarId, 'aspirant-2-16');
    strictAssert.deepEqual(promoted.profile.unlockedNicknameIds, ['genin']);
    strictAssert.deepEqual(promoted.profile.nicknameCatalog[0], {
      id: 'genin',
      name: { en: 'Rising Shinobi', fr: 'Shinobi en devenir' },
      criteria: { minLevel: 5 },
    });
    const saved = await save({
      avatarId: 'genin-2-16',
      backgroundId: 'joueur-2',
      nicknameId: 'genin',
    });
    strictAssert.deepEqual((await character()).profile, saved.json.character.profile);
    strictAssert.equal(saved.json.character.profile.backgroundId, 'joueur-2');
    const cleared = (await save({ backgroundId: null, nicknameId: null })).json.character.profile;
    strictAssert.equal(cleared.backgroundId, null);
    strictAssert.equal(cleared.nicknameId, null);
    strictAssert.equal(cleared.avatarId, 'genin-2-16');
    await save({ nicknameId: 'genin' });

    const converted = await request('POST', '/api/auth/convert', 200, {
      cookie,
      body: { email: `guest_${Date.now()}@example.com`, password: 'fixture-only' },
    });
    strictAssert.equal(converted.json.user.isGuest, false);
    strictAssert.equal((await character()).profile.nicknameId, 'genin');
    strictAssert.equal(
      (await request('GET', '/api/player', 200, { cookie: signup.cookie })).json.character.profile
        .avatarId,
      'aspirant-1-16'
    );

    await query('UPDATE users SET is_admin = TRUE WHERE id = ?', [userId]);
    await request('POST', `/api/admin/players/${guest.json.user.id}/reset`, 200, {
      cookie: signup.cookie,
      body: { level: true },
    });
    const reset = await character();
    strictAssert.equal(reset.rank, ASPIRANT_RANK);
    strictAssert.equal(reset.profile.avatarId, DEFAULT_AVATAR_ID);
    strictAssert.equal(reset.profile.nicknameId, 'genin');
    strictAssert.deepEqual(reset.profile.unlockedNicknameIds, ['genin']);
    console.log('OK: routes de profil, progression, conversion invité et reset admin');
  } finally {
    server.close();
    for (const userId of userIds) await query('DELETE FROM users WHERE id = ?', [userId]);
  }
}

async function main() {
  testPureHelpers();
  testAppearance();

  if (await dbAvailable()) {
    await testIntegration();
    await testProfileRoutes();
  }

  console.log(`\n${failed === 0 ? 'ALL PASSED' : `${failed} FAILED`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

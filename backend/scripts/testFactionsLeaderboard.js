/**
 * Tests factions + leaderboard (purs + DB si MySQL dispo).
 * Usage: node scripts/testFactionsLeaderboard.js
 */
import {
  FACTION_IDS,
  assignFactionFromSeed,
  getFaction,
  isValidFactionId,
  listFactions,
} from '../src/services/factionCatalog.js';
import { LEADERBOARD_BOARDS } from '../src/services/leaderboardService.js';
import { query } from '../src/config/database.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`OK: ${message}`);
  }
}

function testCatalog() {
  console.log('\n=== Faction catalog ===');
  assert(FACTION_IDS.length === 3, '3 factions');
  assert(
    FACTION_IDS.includes('midorihara') &&
      FACTION_IDS.includes('kareno') &&
      FACTION_IDS.includes('oborohama'),
    'noms Midorihara / Kareno / Oborohama'
  );
  assert(!FACTION_IDS.includes('ishikura'), 'Ishikura hors des 3 factions V2');
  assert(isValidFactionId('kareno'), 'kareno valide');
  assert(!isValidFactionId('leaf'), 'ids legacy leaf non exposés');
  assert(listFactions().length === 3, 'listFactions = 3');
  assert(getFaction('midorihara')?.accentColor?.startsWith('#'), 'accent Midorihara');
  assert(assignFactionFromSeed(0) === 'midorihara', 'seed 0 → midorihara');
  assert(assignFactionFromSeed(1) === 'kareno', 'seed 1 → kareno');
  assert(assignFactionFromSeed(2) === 'oborohama', 'seed 2 → oborohama');
  assert(LEADERBOARD_BOARDS.includes('level') && LEADERBOARD_BOARDS.includes('pvp'), 'boards');
}

async function testDb() {
  console.log('\n=== DB integration ===');
  let dbOk = false;
  try {
    await query('SELECT 1 AS ok');
    dbOk = true;
  } catch (e) {
    console.log(`SKIP DB: ${e.message}`);
    return;
  }
  assert(dbOk, 'MySQL joignable');

  const cols = await query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'player_profiles'
       AND column_name IN ('character_faction_id', 'character_faction_retake_used')`
  );
  const names = new Set(cols.map(c => c.name));
  if (!names.has('character_faction_id')) {
    console.log('SKIP: migration 120_factions_leaderboard non appliquée');
    return;
  }
  assert(names.has('character_faction_id'), 'colonne character_faction_id');
  assert(names.has('character_faction_retake_used'), 'colonne character_faction_retake_used');

  const { createCharacter, getCharacter } =
    await import('../src/services/playerCharacterService.js');
  const { setFaction, retakeFaction, getPlayerFaction } =
    await import('../src/services/factionService.js');
  const { getLeaderboard, getFactionStandings } =
    await import('../src/services/leaderboardService.js');

  const prefix = `fac_lb_${Date.now()}`;
  const users = [];
  for (let i = 0; i < 3; i += 1) {
    const userResult = await query('INSERT INTO users (username) VALUES (?)', [`${prefix}_${i}`]);
    const userId = userResult.insertId;
    await query(
      `INSERT INTO player_profiles (user_id, display_name, ryos, language)
       VALUES (?, ?, 500, 'fr')`,
      [userId, `${prefix}_${i}`]
    );
    const factionId = FACTION_IDS[i];
    const character = await createCharacter(userId, {
      name: `Ninja ${factionId}`,
      elementAffinity: 'Katon',
      factionId,
    });
    assert(character.factionId === factionId, `création avec faction ${factionId}`);
    await query(
      'UPDATE player_profiles SET character_level = ?, character_xp = ? WHERE user_id = ?',
      [10 - i, 50 * i, userId]
    );
    users.push(userId);
  }

  // Personnage sans faction → join + retake
  const bare = await query('INSERT INTO users (username) VALUES (?)', [`${prefix}_bare`]);
  const bareId = bare.insertId;
  await query(
    `INSERT INTO player_profiles (user_id, display_name, ryos, language)
     VALUES (?, ?, 100, 'fr')`,
    [bareId, `${prefix}_bare`]
  );
  await createCharacter(bareId, {
    name: 'Sans Choix',
    elementAffinity: 'Suiton',
    factionId: 'midorihara',
  });
  await query('UPDATE player_profiles SET character_faction_id = NULL WHERE user_id = ?', [bareId]);
  const joined = await setFaction(bareId, 'kareno');
  assert(joined.factionId === 'kareno', 'join kareno');
  const retaken = await retakeFaction(bareId, 'oborohama');
  assert(retaken.factionId === 'oborohama' && retaken.retakeUsed === true, 'retake oborohama');

  let threw = false;
  try {
    await retakeFaction(bareId, 'midorihara');
  } catch (e) {
    threw = e.statusCode === 403;
  }
  assert(threw, 'second retake → 403');

  const board = await getLeaderboard({
    board: 'level',
    page: 1,
    limit: 10,
    viewerUserId: users[0],
  });
  assert(board.entries.length >= 1, 'leaderboard level non vide');
  assert(board.me?.userId === users[0], 'me présent sur board level');
  assert(board.entries[0].rank === 1, 'rang 1 en tête');

  const pvpBoard = await getLeaderboard({ board: 'pvp', page: 1, limit: 5 });
  assert(Array.isArray(pvpBoard.entries), 'board pvp renvoie entries');

  const standings = await getFactionStandings({ board: 'level' });
  assert(standings.standings.length === 3, '3 lignes faction');
  assert(
    standings.standings.every(s => typeof s.score === 'number'),
    'scores faction numériques'
  );

  const mine = await getPlayerFaction(bareId);
  assert(mine.factionId === 'oborohama', 'getPlayerFaction');
  assert((await getCharacter(users[0]))?.faction?.id === 'midorihara', 'serialize faction');

  // Cleanup
  for (const uid of [...users, bareId]) {
    await query('DELETE FROM player_profiles WHERE user_id = ?', [uid]);
    await query('DELETE FROM users WHERE id = ?', [uid]);
  }
}

testCatalog();
testDb()
  .then(() => {
    console.log(failed ? `\n${failed} failure(s)` : '\nAll tests passed');
    process.exit(failed ? 1 : 0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

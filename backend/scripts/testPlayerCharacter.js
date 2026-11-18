/**
 * Tests Phase 1 — playerCharacterService
 * Usage: node scripts/testPlayerCharacter.js
 *
 * Les tests purs (XP, ranks, merge) tournent sans DB.
 * Les tests d'intégration DB sont exécutés si MySQL répond.
 */
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
import { createCharacterSchema } from '../src/validators/player.js';

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

  assert(rankForLevel(1) === 'Genin', 'rang Genin');
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
  assert(oneLevel.rank === 'Genin', 'rang inchangé à 2');

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

async function main() {
  testPureHelpers();

  if (await dbAvailable()) {
    await testIntegration();
  }

  console.log(`\n${failed === 0 ? 'ALL PASSED' : `${failed} FAILED`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

/** Tests purs + intégration de l'arbre de talents V3. */
import { query } from '../src/config/database.js';
import {
  FREE_RESPEC_EVERY_LEVELS,
  RESPEC_COST_RYOS,
  getTalentTree,
  canUnlock,
  unlockTalent,
  computeTalentBonuses,
  respecTalents,
  getUserTalents,
} from '../src/services/talentTreeService.js';
import {
  createCharacter,
  getComputedStats,
  addXP,
} from '../src/services/playerCharacterService.js';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

console.log('=== Talent tree unit ===');
assert(FREE_RESPEC_EVERY_LEVELS === 10, 'respec gratuit tous les 10 niveaux');
assert(RESPEC_COST_RYOS === 2000, 'respec payant = 2000 Ryos');

{
  const { TALENT_NODE_DEFS, validateDefs, summarize } = await import('./seedTalentTree.js');
  try {
    validateDefs(TALENT_NODE_DEFS);
    assert(true, 'catalogue V3 valide');
  } catch (error) {
    assert(false, `catalogue V3 valide: ${error.message}`);
  }
  const summary = summarize(TALENT_NODE_DEFS);
  assert(TALENT_NODE_DEFS.length === 72, `72 talents (got ${TALENT_NODE_DEFS.length})`);
  assert(summary.points > 80, 'le catalogue entier coûte plus que les 80 points disponibles');
  assert(!summary.byType.keystone, 'aucun Keystone');
  for (const branch of ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']) {
    const rows = TALENT_NODE_DEFS.filter(node => node.branch === branch);
    assert(rows.length === 18, `${branch} contient 18 talents`);
    assert(new Set(rows.map(node => node.tier)).size === 6, `${branch} contient 6 paliers`);
  }
  const hasChakraTalent = TALENT_NODE_DEFS.some(
    node => node.bonus?.maxChakra || /chakra/i.test(`${node.descFr} ${node.descEn}`),
  );
  assert(!hasChakraTalent, 'aucun talent ne modifie ni ne conditionne le Chakra');
  assert(
    TALENT_NODE_DEFS.every(node => node.maxRank >= 1 && node.maxRank <= 3),
    'rangs limités à 1–3',
  );
}

async function dbAvailable() {
  try {
    await query('SELECT 1 AS ok');
    const tables = await query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name IN ('talent_tree_nodes', 'user_talents')`,
    );
    return tables.length >= 2;
  } catch (error) {
    console.warn(`DB indisponible (${error.message}) — intégration ignorée.`);
    return false;
  }
}

async function seed() {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'seedTalentTree.js')], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  assert(result.status === 0, 'seedTalentTree terminé');
}

async function testIntegration() {
  console.log('\n=== Talent tree integration ===');
  await seed();
  const tree = await getTalentTree();
  assert(tree.length === 72, 'API catalogue → 72 talents actuels');
  assert(
    tree.every(node => node.tier > 0),
    'aucun talent legacy exposé',
  );

  const prefix = `talent_test_${Date.now()}`;
  const userResult = await query('INSERT INTO users (username) VALUES (?)', [prefix]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO player_profiles (user_id, display_name, ryos, language)
     VALUES (?, ?, 5000, 'fr')`,
    [userId, prefix],
  );
  await createCharacter(userId, { name: 'TalentRunner', elementAffinity: 'Katon' });

  const first = await canUnlock(userId, 'taijutsu_stance');
  assert(first.ok, 'premier talent accessible au départ');
  const finalTier = await canUnlock(userId, 'taijutsu_mastery');
  assert(!finalTier.ok, 'dernier palier verrouillé au départ');

  await unlockTalent(userId, 'taijutsu_stance');
  let talents = await getUserTalents(userId);
  assert(talents.nodeRanks.taijutsu_stance === 1, 'rang 1 enregistré');
  assert(talents.spentPoints === 1, 'un point comptabilisé');

  await addXP(userId, 100);
  await unlockTalent(userId, 'taijutsu_stance');
  talents = await getUserTalents(userId);
  assert(talents.nodeRanks.taijutsu_stance === 2, 'même talent amélioré au rang 2');
  const bonuses = await computeTalentBonuses(userId);
  assert(bonuses.stats.taijutsu === 4, 'bonus multiplié par le rang');

  const computed = await getComputedStats(userId);
  assert(
    computed.breakdown.talents.taijutsu === bonuses.stats.taijutsu,
    'stats talents raccordées au personnage',
  );

  await addXP(userId, 5000);
  const respec = await respecTalents(userId);
  assert(respec.pointsRefunded === 2, 'respec rembourse chaque rang');
  assert(respec.talents.unlockedCount === 0, 'aucun talent après respec');

  await query('DELETE FROM user_talent_respec_history WHERE user_id = ?', [userId]);
  await query('DELETE FROM user_talents WHERE user_id = ?', [userId]);
  await query('DELETE FROM player_profiles WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

if (await dbAvailable()) await testIntegration();
else console.log('(intégration ignorée)');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

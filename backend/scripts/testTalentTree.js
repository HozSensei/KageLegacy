/**
 * Tests purs + intégration (si MySQL dispo) pour l'arbre de talents.
 */
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

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('=== Talent tree unit ===');
assert(FREE_RESPEC_EVERY_LEVELS === 10, 'free respec every 10 levels');
assert(RESPEC_COST_RYOS === 2000, 'paid respec = 2000 Ryos');

// Catalogue Phase 2 (~150) — validation offline (sans DB)
{
  const { TALENT_NODE_DEFS, validateDefs, summarize } = await import('./seedTalentTree.js');
  try {
    validateDefs(TALENT_NODE_DEFS);
    assert(true, 'seed catalogue validateDefs OK');
  } catch (e) {
    assert(false, `seed catalogue validateDefs: ${e.message}`);
  }
  const summary = summarize(TALENT_NODE_DEFS);
  assert(TALENT_NODE_DEFS.length >= 140, `catalogue ≥140 nœuds (got ${TALENT_NODE_DEFS.length})`);
  assert(summary.byType.stat >= 90, `≥90 stats (got ${summary.byType.stat})`);
  assert(summary.byType.notable >= 35, `≥35 notables (got ${summary.byType.notable})`);
  assert(summary.byType.keystone >= 8, `≥8 keystones (got ${summary.byType.keystone})`);
  assert(summary.byBranch.ninjutsu >= 25, `ninjutsu branch densified (got ${summary.byBranch.ninjutsu})`);
  assert(summary.byBranch.genjutsu >= 25, `genjutsu branch densified (got ${summary.byBranch.genjutsu})`);
  assert(summary.byBranch.medicine >= 25, `medicine branch densified (got ${summary.byBranch.medicine})`);
  const ids = new Set(TALENT_NODE_DEFS.map((n) => n.id));
  assert(ids.has('intangible'), 'keystone intangible present');
  assert(ids.has('berserker') && ids.has('overload') && ids.has('immortal'), 'MVP keystones preserved');
}

async function dbAvailable() {
  try {
    await query('SELECT 1 AS ok');
    const tables = await query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN ('talent_tree_nodes', 'user_talents', 'player_character')`,
    );
    return tables.length >= 3;
  } catch (e) {
    console.warn(`DB indisponible (${e.message}) — tests d'intégration ignorés.`);
    return false;
  }
}

async function ensureSeed() {
  const countRows = await query('SELECT COUNT(*) AS c FROM talent_tree_nodes');
  const nodeCount = Number(countRows[0]?.c) || 0;
  if (nodeCount >= 140) return nodeCount;

  console.log(`  → seed (${nodeCount} nodes) — running seedTalentTree…`);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'seedTalentTree.js')], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  assert(r.status === 0, 'seedTalentTree exit 0');
  const after = await query('SELECT COUNT(*) AS c FROM talent_tree_nodes');
  return Number(after[0].c);
}

async function testIntegration() {
  console.log('\n=== Talent tree integration ===');
  const n = await ensureSeed();
  assert(n >= 140, `≥140 nœuds seeded (got ${n})`);

  const types = await query(`SELECT type, COUNT(*) AS c FROM talent_tree_nodes GROUP BY type`);
  const byType = Object.fromEntries(types.map((r) => [r.type, Number(r.c)]));
  assert((byType.keystone || 0) >= 8, `≥8 keystones (got ${byType.keystone || 0})`);
  assert((byType.notable || 0) >= 35, `≥35 notables (got ${byType.notable || 0})`);
  assert((byType.stat || 0) >= 90, `≥90 stats (got ${byType.stat || 0})`);

  const tree = await getTalentTree();
  assert(tree.length >= 140, `getTalentTree → ${tree.length} nodes`);

  const prefix = `talent_test_${Date.now()}`;
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    prefix,
  ]);
  const userId = userResult.insertId;

  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language, village_id)
     VALUES (?, ?, 'Genjutsu', 5000, 0, 100, 'fr', 'leaf')`,
    [userId, prefix],
  );

  await createCharacter(userId, {
    name: 'TalentRunner',
    clanTraitId: null,
    elementAffinity: 'Katon',
  });

  const rootCheck = await canUnlock(userId, 'center_root');
  assert(rootCheck.ok === true, 'canUnlock center_root at start');

  const locked = await canUnlock(userId, 'berserker');
  assert(locked.ok === false, 'cannot unlock berserker without prereqs');

  await unlockTalent(userId, 'center_root');
  let talents = await getUserTalents(userId);
  assert(talents.unlockedNodeIds.includes('center_root'), 'center_root unlocked');
  assert(talents.talentPointsAvailable === 0, '0 points after first unlock');

  await addXP(userId, 100);
  await unlockTalent(userId, 'tai_5_a');
  const bonuses = await computeTalentBonuses(userId);
  assert(bonuses.stats.taijutsu >= 6, `taijutsu from talents ≥6 (got ${bonuses.stats.taijutsu})`);

  const computed = await getComputedStats(userId);
  assert(
    computed.breakdown.talents.taijutsu === bonuses.stats.taijutsu,
    'getComputedStats wired to talent bonuses',
  );

  await addXP(userId, 5000);
  talents = await getUserTalents(userId);
  assert(talents.talentPointsAvailable >= 1, 'points after XP');

  const respec = await respecTalents(userId);
  assert(respec.pointsRefunded >= 2, `respec refunded ≥2 (got ${respec.pointsRefunded})`);
  assert(respec.talents.unlockedCount === 0, 'no talents after respec');
  if (respec.talents.level < 10) {
    assert(respec.wasFree === false, 'respec paid under level 10');
    assert(respec.costPaid.ryos === RESPEC_COST_RYOS, 'paid 2000 Ryos');
  }

  await query('DELETE FROM user_talent_respec_history WHERE user_id = ?', [userId]);
  await query('DELETE FROM user_talents WHERE user_id = ?', [userId]);
  await query('DELETE FROM player_character WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

if (await dbAvailable()) {
  await testIntegration();
} else {
  console.log('(intégration ignorée)');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

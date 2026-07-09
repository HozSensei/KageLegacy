/**
 * Tests Pack Élite : identity, abonnement saison, season pass.
 * Usage: node scripts/testSenseiIdentity.js
 */
import { query } from '../src/config/database.js';
import { getLeaguePayload } from '../src/models/league.js';
import { buildSenseiIdentity } from '../src/services/senseiIdentityService.js';
import {
  grantEliteSubscription,
  getEliteMePayload,
} from '../src/services/eliteSubscriptionService.js';
import {
  getSeasonPassPayload,
  recordEliteQuestEvent,
} from '../src/services/eliteSeasonPassService.js';
import { updateEquippedCosmetics } from '../src/services/senseiIdentityService.js';

const PREFIX = `elite_test_${Date.now()}`;

async function createSensei(username) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [username]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Genjutsu', 10000, 0, 100, 'fr')`,
    [userId, username]
  );
  return userId;
}

async function main() {
  const userId = await createSensei(`${PREFIX}_sensei`);
  const poolRows = await query(
    `SELECT p.* FROM pool_members pm JOIN pools p ON p.id = pm.pool_id LIMIT 1`
  );
  if (!poolRows[0]) {
    console.error('SKIP: aucune pool en base — lancez seed/playtest d\'abord.');
    process.exit(0);
  }
  const pool = poolRows[0];

  await query(
    'INSERT IGNORE INTO pool_members (pool_id, user_id) VALUES (?, ?)',
    [pool.id, userId]
  );
  await query(
    'INSERT IGNORE INTO pool_standings (pool_id, user_id) VALUES (?, ?)',
    [pool.id, userId]
  );

  let identity = await buildSenseiIdentity(userId, 'fr', pool);
  console.assert(!identity.isElite, 'non abonné → pas élite');

  await grantEliteSubscription(userId, { poolId: pool.id, seasonNumber: pool.season_number });

  identity = await buildSenseiIdentity(userId, 'fr', pool);
  console.assert(identity.isElite, 'abonné saison courante → élite');
  console.assert(identity.gradeLabel === 'jonin_elite', 'grade Jonin Élite');

  await updateEquippedCosmetics(userId, {
    titleSlug: 'shadow_architect',
    bannerSlug: 'mist',
    nameColor: '#c9a66b',
  });

  identity = await buildSenseiIdentity(userId, 'fr', pool);
  console.assert(identity.title === 'Architecte des Ombres', 'titre équipé');
  console.assert(identity.bannerSlug === 'mist', 'bannière équipée');
  console.assert(identity.nameColor === '#c9a66b', 'couleur équipée');

  await recordEliteQuestEvent(userId, 'league_win');
  await recordEliteQuestEvent(userId, 'league_win');
  const pass = await getSeasonPassPayload(userId, 'fr');
  console.assert(pass.active, 'season pass actif');
  console.assert(pass.quests.length === 4, '4 quêtes saison');
  const winsQuest = pass.quests.find((q) => q.slug === 'wins_2');
  console.assert(winsQuest?.completed, 'quête 2 victoires complétée');
  console.assert(pass.summary.unlockedTitles.includes('promoted_ii'), 'titre promoted_ii débloqué');

  const league = await getLeaguePayload(userId);
  const row = league.standings.find((s) => s.userId === userId);
  console.assert(row?.identity?.isElite, 'ligue expose identity.isElite');

  const me = await getEliteMePayload(userId);
  console.assert(me.subscription.isActive, 'payload /me élite actif');

  await query('DELETE FROM pool_standings WHERE user_id = ?', [userId]);
  await query('DELETE FROM pool_members WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);

  console.log('testSenseiIdentity: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

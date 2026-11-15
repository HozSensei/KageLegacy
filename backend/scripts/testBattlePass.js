/**
 * Tests Battle Pass — XP, claim, premium stub, quêtes.
 */
import { query } from '../src/config/database.js';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  addBattlePassXP,
  claimReward,
  getActiveSeason,
  getBattlePassState,
  getXPForLevel,
  unlockPremium,
  PREMIUM_COST_KAGE_COINS,
} from '../src/services/battlePassService.js';
import {
  claimQuestReward,
  getActiveQuests,
  progressQuest,
} from '../src/services/battlePassQuestService.js';
import { createCharacter } from '../src/services/playerCharacterService.js';

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

console.log('=== Battle Pass unit ===');
assert(getXPForLevel(1) === 1000, 'level 1 = 1000 XP');
assert(getXPForLevel(10) === 1000, 'level 10 = 1000 XP');
assert(getXPForLevel(11) === 1050, 'level 11 = 1050 XP');
assert(getXPForLevel(21) === 1100, 'level 21 = 1100 XP');
assert(PREMIUM_COST_KAGE_COINS === 500, 'premium = 500 Kage Coins');

async function dbAvailable() {
  try {
    await query('SELECT 1 AS ok');
    const tables = await query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN (
           'battle_pass_seasons', 'user_battle_pass',
           'battle_pass_quests', 'user_battle_pass_quests', 'user_cosmetics'
         )`
    );
    return tables.length >= 5;
  } catch (e) {
    console.warn(`DB indisponible (${e.message}) — tests d'intégration ignorés.`);
    return false;
  }
}

async function ensureSeed() {
  const season = await getActiveSeason();
  if (season) return season;
  const seed = path.join(__dirname, 'seedBattlePass.js');
  const result = spawnSync(process.execPath, [seed], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('seedBattlePass failed');
  return getActiveSeason();
}

async function ensureUser() {
  const prefix = `bp_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    prefix,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language, village_id, kage_coins, card_dust, card_essence)
     VALUES (?, ?, 'Genjutsu', 5000, 0, 100, 'fr', 'leaf', 600, 0, 0)`,
    [userId, prefix]
  );
  try {
    await createCharacter(userId, {
      name: `Ninja ${prefix}`,
      clanTraitId: null,
      elementAffinity: 'Katon',
    });
  } catch (e) {
    console.warn(`  (createCharacter skip: ${e.message})`);
  }
  return userId;
}

async function integration() {
  console.log('\n=== Battle Pass integration ===');
  const season = await ensureSeed();
  assert(Boolean(season), 'saison active');
  assert(season.maxLevel === 50, 'maxLevel 50');
  assert(Object.keys(season.rewards.free).length >= 20, '≥20 niveaux free');
  assert(Object.keys(season.rewards.premium).length >= 20, '≥20 niveaux premium');

  const userId = await ensureUser();
  const state0 = await getBattlePassState(userId);
  assert(state0.progress.currentLevel === 0, 'progress starts at 0');
  assert(state0.progress.isPremium === false, 'not premium by default');

  const xp1 = await addBattlePassXP(userId, 1000, 'test');
  assert(xp1.xpGained === 1000, 'gained 1000 XP');
  assert(xp1.currentLevel === 1, 'leveled to 1');

  const claimFree = await claimReward(userId, 1, 'free');
  assert(claimFree.rewards.length >= 1, 'free reward claimed');

  let premiumBlocked = false;
  try {
    await claimReward(userId, 1, 'premium');
  } catch (e) {
    premiumBlocked = e.statusCode === 403;
  }
  assert(premiumBlocked, 'premium claim blocked without pass');

  const unlock = await unlockPremium(userId, { method: 'kage_coins', isAdmin: false });
  assert(unlock.progress.isPremium === true, 'premium via kage coins');

  const coins = await query('SELECT kage_coins FROM sensei WHERE user_id = ?', [userId]);
  assert(Number(coins[0].kage_coins) === 100, '600-500 = 100 coins left');

  const claimPrem = await claimReward(userId, 1, 'premium');
  assert(claimPrem.rewards.length >= 1, 'premium reward claimed');

  const cosmetics = await query(
    'SELECT * FROM user_cosmetics WHERE user_id = ? AND cosmetic_key = ?',
    [userId, 'ancestral_shadows']
  );
  assert(cosmetics.length === 1, 'card_back cosmetic granted');

  // Quests
  const { quests } = await getActiveQuests(userId);
  assert(quests.length >= 10, `≥10 active quests (got ${quests.length})`);
  const dailies = quests.filter((q) => q.questType === 'daily');
  const weeklies = quests.filter((q) => q.questType === 'weekly');
  const milestones = quests.filter((q) => q.questType === 'milestone');
  assert(dailies.length >= 5, `≥5 dailies (got ${dailies.length})`);
  assert(weeklies.length >= 5, `≥5 weeklies (got ${weeklies.length})`);
  assert(milestones.length >= 4, `≥4 milestones (got ${milestones.length})`);
  assert(
    quests.some((q) => q.questKey === 'open_1_booster'),
    'daily booster quest seeded',
  );
  assert(
    quests.some((q) => q.questKey === 'join_pvp_queue'),
    'daily PvP queue quest seeded',
  );
  assert(
    quests.some((q) => q.questKey === 'complete_1_run'),
    'daily run quest seeded',
  );

  const daily = dailies[0];
  assert(Boolean(daily), 'daily quest present');

  await progressQuest(userId, daily.questKey, daily.goalValue);
  const claimedQuest = await claimQuestReward(userId, daily.id);
  assert(claimedQuest.xp.xpGained >= 200, 'quest XP granted (with premium mult)');
  assert(claimedQuest.quest.progress.isClaimed === true, 'quest marked claimed');

  const { onBattlePassAction, isMissionRankBOrHigher } = await import(
    '../src/services/battlePassQuestService.js'
  );
  assert(isMissionRankBOrHigher('B') && isMissionRankBOrHigher('A'), 'rank B+ helper');
  assert(!isMissionRankBOrHigher('C'), 'rank C below B');
  const hook = await onBattlePassAction(userId, 'booster_open', 1);
  assert(Array.isArray(hook.results), 'onBattlePassAction returns results');

  // Stub unlock path for second user
  const userId2 = await ensureUser();
  await addBattlePassXP(userId2, 500, 'test');
  const stub = await unlockPremium(userId2, { method: 'stub', isAdmin: true });
  assert(stub.progress.isPremium === true, 'admin stub unlock');
  assert(String(stub.note || '').includes('Stripe'), 'stub notes Stripe deferral');
}

const ok = await dbAvailable();
if (ok) {
  try {
    await integration();
  } catch (e) {
    failed += 1;
    console.error('  ✗ integration error:', e);
  }
} else {
  console.log('\n(intégration sautée)');
}

console.log(`\nRésultat: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

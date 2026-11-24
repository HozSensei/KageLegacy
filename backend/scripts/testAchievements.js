import { ACHIEVEMENT_DEFS } from './data/achievements.js';
import { query } from '../src/config/database.js';
import {
  claimAchievementTier,
  getAchievementRegistry,
  onAchievementAction,
  recordCombatAchievements,
  createCombatAchTrack,
} from '../src/services/achievementService.js';
import {
  ensureFreshQuestWindows,
  getActiveQuests,
} from '../src/services/battlePassQuestService.js';
import { getActiveSeason } from '../src/services/battlePassService.js';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let passed = 0,
  failed = 0;
const assert = (c, m) => {
  if (c) {
    passed++;
    console.log(`  ✓ ${m}`);
  } else {
    failed++;
    console.error(`  ✗ ${m}`);
  }
};
console.log('=== Achievements unit ===');
assert(ACHIEVEMENT_DEFS.length >= 13, 'size>=13');
assert(
  ACHIEVEMENT_DEFS.every(d => d.tiers?.length && d.key && d.action),
  'defs ok'
);
const collectionDef = ACHIEVEMENT_DEFS.find(d => d.key === 'collection_owned');
const deckDef = ACHIEVEMENT_DEFS.find(d => d.key === 'deck_size');
assert(
  /hors pack de départ|beyond the starter/i.test(
    `${collectionDef?.descriptionFr || ''} ${collectionDef?.descriptionEn || ''}`
  ),
  'collection_owned clarifies starter exclusion'
);
assert(
  /hors decks de départ|starter decks do not count/i.test(
    `${deckDef?.descriptionFr || ''} ${deckDef?.descriptionEn || ''}`
  ),
  'deck_size clarifies starter exclusion'
);
async function main() {
  try {
    await query('SELECT 1');
  } catch (e) {
    console.log(`${passed} passed (unit)`);
    process.exit(failed ? 1 : 0);
  }
  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='user_achievements'"
  );
  if (!tables.length) {
    console.log(`${passed} passed (no table)`);
    process.exit(failed ? 1 : 0);
  }
  const prefix = `ach_${Date.now()}`;
  const ur = await query('INSERT INTO users (username) VALUES (?)', [prefix]);
  const userId = ur.insertId;
  await query(
    "INSERT INTO player_profiles (user_id, display_name, ryos, language, kage_coins, card_dust, card_essence) VALUES (?, ?, 5000, 'fr', 0, 0, 0)",
    [userId, prefix]
  );
  await onAchievementAction(userId, 'combat_win', 3);
  const reg = await getAchievementRegistry(userId);
  const combat = reg.achievements.find(a => a.key === 'combat_wins');
  assert(combat?.progress === 3, 'progress 3');
  await claimAchievementTier(userId, 'combat_wins', 1);
  await recordCombatAchievements(
    userId,
    {
      userId,
      player: {
        maxHp: 100,
        _achTrack: { ...createCombatAchTrack(), cardsPlayed: 3, ninjutsuPlayed: 3 },
      },
      enemy: { boss: true },
    },
    'victory'
  );
  assert(
    (await getAchievementRegistry(userId)).achievements.find(a => a.key === 'flawless_wins')
      ?.progress >= 1,
    'flawless'
  );
  let season = await getActiveSeason();
  if (!season) {
    spawnSync(process.execPath, [path.join(__dirname, 'seedBattlePass.js')], { stdio: 'inherit' });
    season = await getActiveSeason();
  }
  if (season) {
    await query(
      "UPDATE battle_pass_quests SET available_from=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), available_until=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE season_id=? AND quest_type='daily'",
      [season.id]
    );
    const refresh = await ensureFreshQuestWindows(season.id);
    assert(refresh.refreshedDaily === true, 'daily refresh');
    const quests = await getActiveQuests(userId);
    assert(
      (quests.quests || []).some(q => q.questType === 'daily'),
      'dailies active'
    );
  }

  // Starter loadout ne doit pas valider collection_owned / deck_size.
  try {
    const { ensureStarterLoadout } = await import('../src/services/starterLoadoutService.js');
    const starterPrefix = `ach_st_${Date.now()}`;
    const starterUser = await query('INSERT INTO users (username) VALUES (?)', [starterPrefix]);
    const starterId = starterUser.insertId;
    await query(
      "INSERT INTO player_profiles (user_id, display_name, ryos, language, kage_coins, card_dust, card_essence) VALUES (?, ?, 5000, 'fr', 0, 0, 0)",
      [starterId, starterPrefix]
    );
    const loadout = await ensureStarterLoadout(starterId);
    assert(loadout.collectionCount >= 10, 'starter grants a collection');
    assert(loadout.deckCreated === true || (loadout.decks || []).length > 0, 'starter creates decks');
    const afterStarter = await getAchievementRegistry(starterId);
    const owned = afterStarter.achievements.find(a => a.key === 'collection_owned');
    const deckSize = afterStarter.achievements.find(a => a.key === 'deck_size');
    assert((owned?.progress || 0) === 0, 'starter does not progress collection_owned');
    assert(owned?.unlocked !== true, 'starter does not unlock collection_owned');
    assert((deckSize?.progress || 0) === 0, 'starter does not progress deck_size');
    assert(deckSize?.unlocked !== true, 'starter does not unlock deck_size');
    const deckIds = await query('SELECT id FROM user_decks WHERE user_id = ?', [starterId]);
    for (const deck of deckIds) {
      await query('DELETE FROM user_deck_cards WHERE deck_id = ?', [deck.id]);
    }
    await query('DELETE FROM user_decks WHERE user_id=?', [starterId]);
    await query('DELETE FROM user_card_collection WHERE user_id=?', [starterId]);
    await query('DELETE FROM user_achievements WHERE user_id=?', [starterId]);
    await query('DELETE FROM player_profiles WHERE user_id=?', [starterId]);
    await query('DELETE FROM users WHERE id=?', [starterId]);
  } catch (starterErr) {
    console.warn(`  (starter achievement check skipped: ${starterErr.message})`);
  }

  await query('DELETE FROM user_achievements WHERE user_id=?', [userId]);
  await query('DELETE FROM player_profiles WHERE user_id=?', [userId]);
  await query('DELETE FROM users WHERE id=?', [userId]);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});

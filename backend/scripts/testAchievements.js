
import { ACHIEVEMENT_DEFS } from './data/achievements.js';
import { query } from '../src/config/database.js';
import { claimAchievementTier, getAchievementRegistry, onAchievementAction, recordCombatAchievements, createCombatAchTrack } from '../src/services/achievementService.js';
import { ensureFreshQuestWindows, getActiveQuests } from '../src/services/battlePassQuestService.js';
import { getActiveSeason } from '../src/services/battlePassService.js';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let passed=0, failed=0;
const assert=(c,m)=>{ if(c){passed++; console.log('  ✓ '+m);} else {failed++; console.error('  ✗ '+m);} };
console.log('=== Achievements unit ===');
assert(ACHIEVEMENT_DEFS.length>=15, 'size>=15');
assert(ACHIEVEMENT_DEFS.every(d=>d.tiers?.length&&d.key&&d.action), 'defs ok');
async function main(){
  try{ await query('SELECT 1'); } catch(e){ console.log(passed+' passed (unit)'); process.exit(failed?1:0); }
  const tables=await query(`SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='user_achievements'`);
  if(!tables.length){ console.log(passed+' passed (no table)'); process.exit(failed?1:0); }
  const prefix=`ach_${Date.now()}`;
  const ur=await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)',[prefix]);
  const userId=ur.insertId;
  await query(`INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language, village_id, kage_coins, card_dust, card_essence) VALUES (?, ?, 'Genjutsu', 5000, 0, 100, 'fr', 'leaf', 0, 0, 0)`,[userId, prefix]);
  await onAchievementAction(userId,'combat_win',3);
  const reg=await getAchievementRegistry(userId);
  const combat=reg.achievements.find(a=>a.key==='combat_wins');
  assert(combat?.progress===3,'progress 3');
  await claimAchievementTier(userId,'combat_wins',1);
  await recordCombatAchievements(userId,{userId,player:{maxHp:100,_achTrack:{...createCombatAchTrack(),cardsPlayed:3,ninjutsuPlayed:3}},enemy:{boss:true}},'victory');
  assert((await getAchievementRegistry(userId)).achievements.find(a=>a.key==='flawless_wins')?.progress>=1,'flawless');
  let season=await getActiveSeason();
  if(!season){ spawnSync(process.execPath,[path.join(__dirname,'seedBattlePass.js')],{stdio:'inherit'}); season=await getActiveSeason(); }
  if(season){
    await query(`UPDATE battle_pass_quests SET available_from=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), available_until=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE season_id=? AND quest_type='daily'`,[season.id]);
    const refresh=await ensureFreshQuestWindows(season.id);
    assert(refresh.refreshedDaily===true,'daily refresh');
    const quests=await getActiveQuests(userId);
    assert((quests.quests||[]).some(q=>q.questType==='daily'),'dailies active');
  }
  await query('DELETE FROM user_achievements WHERE user_id=?',[userId]);
  await query('DELETE FROM sensei WHERE user_id=?',[userId]);
  await query('DELETE FROM users WHERE id=?',[userId]);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed?1:0);
}
main().catch(e=>{console.error(e); process.exit(1);});

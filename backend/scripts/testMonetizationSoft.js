/**
 * Tests monétisation douce — template BP, titres, courbe KC (sans DB).
 */
import {
  BATTLE_PASS,
  WELCOME_PACK,
  validateEconomyInvariants,
} from '../src/config/economyConfig.js';
import {
  buildSeasonMeta,
  buildSeasonQuestDefs,
  buildSeasonRewards,
} from '../src/services/battlePassSeasonTemplate.js';
import {
  NICKNAME_CATALOG,
  WELCOME_NICKNAME,
  buildSeasonNicknameEntry,
  seasonNicknameId,
  unlockedNicknameIdsFor,
} from '../src/services/characterAppearance.js';
import { COIN_PACK_CATALOG, serializeCoinPack } from '../src/services/shopService.js';
import { serializeWelcomePackOffer } from '../src/services/welcomePackService.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('=== Monetization soft (no DB) ===');

const eco = validateEconomyInvariants();
assert(eco.ok, `economy invariants: ${eco.errors.join('; ')}`);
assert(BATTLE_PASS.seasonDurationDays === 90, 'season 90 days');
assert(WELCOME_PACK.priceEur === 5, 'welcome 5€');
assert(WELCOME_PACK.boosterType === 'standard', 'welcome standard booster');
assert(WELCOME_PACK.boosterCount === 2, 'welcome grants 2 boosters');

const rewards = buildSeasonRewards({ seasonNumber: 2 });
assert(Object.keys(rewards.free).length === 50, 'free 50 levels');
assert(Object.keys(rewards.premium).length === 50, 'premium 50 levels');
for (let i = 1; i <= 50; i += 1) {
  assert(Array.isArray(rewards.free[String(i)]) && rewards.free[String(i)].length > 0, `free ${i}`);
  assert(
    Array.isArray(rewards.premium[String(i)]) && rewards.premium[String(i)].length > 0,
    `premium ${i}`,
  );
}
const nickId = seasonNicknameId(2);
assert(rewards.premium['1'].some(r => r.type === 'nickname' && r.nicknameId === nickId), 'p1 nick');
assert(rewards.premium['50'].some(r => r.type === 'nickname' && r.nicknameId === nickId), 'p50 nick');

const meta = buildSeasonMeta(2);
assert(meta.theme === 'iron_leaf', 'theme cycle');
assert(meta.nicknameId === 'season_2', 'meta nickname');

const quests = buildSeasonQuestDefs(new Date(), new Date(Date.now() + 90 * 86400000));
assert(quests.some(q => q.quest_type === 'daily'), 'daily quests');
assert(quests.some(q => q.quest_type === 'weekly'), 'weekly quests');
assert(quests.some(q => q.quest_type === 'milestone'), 'milestones');

assert(WELCOME_NICKNAME.id === 'welcome', 'welcome nick');
assert(NICKNAME_CATALOG.some(n => n.id === 'welcome'), 'catalog includes welcome');
assert(buildSeasonNicknameEntry(3).id === 'season_3', 'season nick entry');

const unlocked = unlockedNicknameIdsFor({ character_level: 5, character_highest_level: 5 }, [
  'welcome',
  'season_1',
]);
assert(unlocked.includes('genin') && unlocked.includes('welcome') && unlocked.includes('season_1'), 'union');

assert(serializeCoinPack(COIN_PACK_CATALOG.forge).totalCoins === 1400, 'forge 1400');
assert(serializeCoinPack(COIN_PACK_CATALOG.vault).totalCoins === 7500, 'vault 7500');

const offer = serializeWelcomePackOffer({ available: true });
assert(offer.available && offer.contents.boosterType === 'standard', 'welcome offer shape');
assert(offer.contents.boosterCount === 2, 'welcome offer boosterCount');

console.log('testMonetizationSoft: OK');

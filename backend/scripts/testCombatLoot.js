#!/usr/bin/env node
/**
 * Smoke test butin combat unifié (ligue, reconnaissance, sceau).
 */
import {
  LOOT_CONSUMABLE_POOL,
  LOOT_PROFILES,
  rollCombatLootBundle,
} from '../src/services/combatLootService.js';
import { SEAL_ITEM_SLUG } from '../src/services/dailySealService.js';
import { MATCH_LOSS_RYOS } from '../src/services/matchEconomy.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(LOOT_CONSUMABLE_POOL.length >= 5, 'pool objets consommables');
assert(!LOOT_CONSUMABLE_POOL.includes(SEAL_ITEM_SLUG), 'le sceau quotidien ne doit pas tomber en butin');
assert(LOOT_PROFILES.league_win, 'profil league_win');
assert(LOOT_PROFILES.reconnaissance_loss, 'profil reconnaissance_loss');
assert(LOOT_PROFILES.seal_common, 'profil seal_common');

const leagueWin = rollCombatLootBundle('league', 'win');
assert(leagueWin.ryos >= LOOT_PROFILES.league_win.ryos[0], 'ryos league win');
assert(leagueWin.items.length <= 1, 'max 1 objet league win');

const reconLoss = rollCombatLootBundle('reconnaissance', 'loss');
assert(reconLoss.ryos >= LOOT_PROFILES.reconnaissance_loss.ryos[0], 'ryos recon loss');

const seal = rollCombatLootBundle('seal_common', 'win');
assert(seal.ryos >= LOOT_PROFILES.seal_common.ryos[0], 'ryos sceau');

assert(MATCH_LOSS_RYOS > 0, 'consolation défaite ligue');

console.log('testCombatLoot: OK');

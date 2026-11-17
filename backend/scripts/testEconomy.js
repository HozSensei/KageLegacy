/**
 * Verrouille les ratios économiques F2P (sans DB).
 */
import {
  BATTLE_PASS,
  BOOSTER_COSTS,
  COMBAT_DEFAULT_REWARDS,
  COMBAT_REWARDS_BY_RANK,
  DISENCHANT_DUST,
  UPGRADE_COSTS,
  resolveCombatRewards,
  validateEconomyInvariants,
  winsForStandardBooster,
} from '../src/config/economyConfig.js';
import { BOOSTER_CATALOG } from '../src/services/boosterService.js';
import {
  DISENCHANT_DUST as CARD_DISENCHANT,
  UPGRADE_COSTS as CARD_UPGRADE,
} from '../src/services/cardService.js';
import {
  PREMIUM_COST_KAGE_COINS,
  PREMIUM_XP_MULTIPLIER,
} from '../src/services/battlePassService.js';
import { __test as combatRewardTest } from '../src/services/combatRewardService.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('=== Economy config invariants ===');

const check = validateEconomyInvariants();
if (!check.ok) {
  for (const e of check.errors) console.error('  ✗', e);
  throw new Error(`economy invariants failed (${check.errors.length})`);
}
console.log('✓ validateEconomyInvariants');

// Boosters wired
assert(
  BOOSTER_CATALOG.standard.cost.ryos === BOOSTER_COSTS.standard.ryos,
  'booster standard wired'
);
assert(
  BOOSTER_CATALOG.elemental.cost.ryos === BOOSTER_COSTS.elemental.ryos,
  'booster elemental wired'
);
assert(
  BOOSTER_CATALOG.premium.cost.kageCoins === BOOSTER_COSTS.premium.kageCoins,
  'booster premium wired'
);
console.log('✓ boosterService ← economyConfig');

// Card dust/upgrade wired
assert(CARD_DISENCHANT.rare === DISENCHANT_DUST.rare, 'disenchant wired');
assert(CARD_UPGRADE.common[0].ryos === UPGRADE_COSTS.common[0].ryos, 'upgrade wired');
console.log('✓ cardService ← economyConfig');

// BP wired
assert(PREMIUM_COST_KAGE_COINS === BATTLE_PASS.premiumCostKageCoins, 'BP premium cost wired');
assert(PREMIUM_XP_MULTIPLIER === BATTLE_PASS.premiumXpMultiplier, 'BP XP mult wired');
console.log('✓ battlePassService ← economyConfig');

// Combat defaults wired
assert(
  combatRewardTest.DEFAULT_REWARDS.ryos === COMBAT_DEFAULT_REWARDS.ryos,
  'combat default ryos'
);
assert(
  combatRewardTest.DEFAULT_REWARDS.bpPoints === COMBAT_DEFAULT_REWARDS.bpPoints,
  'combat default bp'
);
console.log('✓ combatRewardService ← economyConfig');

// Booster affordability
const dWins = winsForStandardBooster('D');
assert(dWins >= 2 && dWins <= 4, `D wins for pack = ${dWins}`);
console.log(
  `✓ standard pack ≈ ${dWins} D wins (${BOOSTER_COSTS.standard.ryos} / ${COMBAT_REWARDS_BY_RANK.D.ryos})`
);

// Rank floor raises stale seeds (bp was 2–10 pre-tune)
{
  const stale = resolveCombatRewards({ xp: 40, ryos: 120, cardChance: 10, bpPoints: 2 }, 'D');
  assert(stale.bpPoints === 100, `D bp floor (got ${stale.bpPoints})`);
  assert(stale.ryos === 150, `D ryos floor (got ${stale.ryos})`);
  assert(stale.xp === 50, `D xp floor (got ${stale.xp})`);
  const rich = resolveCombatRewards({ xp: 80, ryos: 200, cardChance: 20, bpPoints: 150 }, 'D');
  assert(rich.ryos === 200 && rich.bpPoints === 150, 'keeps values above floor');
  const empty = resolveCombatRewards(null, 'B');
  assert(empty.bpPoints === COMBAT_REWARDS_BY_RANK.B.bpPoints, 'B floor from null');
  assert(empty.ryos === COMBAT_REWARDS_BY_RANK.B.ryos, 'B ryos from null');
}
console.log('✓ resolveCombatRewards rank floors');

// Soft premium — not extreme P2W
assert(BATTLE_PASS.premiumXpMultiplier <= 1.25, 'premium XP ≤ 1.25');
assert(BATTLE_PASS.premiumXpMultiplier >= 1.1, 'premium XP gives a real but soft boost');
assert(BOOSTER_COSTS.premium.ryos === 0, 'premium pack not buyable with soft currency');
console.log('✓ soft premium (no extreme P2W)');

// Early upgrade softer than 500/20
assert(UPGRADE_COSTS.common[0].ryos <= 400, 'common L1 ryos softened');
assert(UPGRADE_COSTS.common[0].dust <= 20, 'common L1 dust softened');
console.log('✓ early upgrade soft');

console.log('\nAll economy ratio tests passed.');

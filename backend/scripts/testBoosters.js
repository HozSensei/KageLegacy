/**
 * Tests probabilités + anti-triche (sans DB) pour les boosters.
 */
import {
  BOOSTER_CATALOG,
  BOOSTER_TYPES,
  getBoosterDefinition,
  planBoosterRarities,
  rollRarity,
  rollRarityAtLeast,
  selectCardsForRarities,
  serializeBooster,
  simulateBoosterOpenings,
  weightsToProbabilities,
} from '../src/services/boosterService.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// --- Catalogue ---
assert(BOOSTER_TYPES.includes('standard'), 'standard type');
assert(BOOSTER_TYPES.includes('path-taijutsu'), 'path-taijutsu type');
assert(BOOSTER_TYPES.includes('path-ninjutsu'), 'path-ninjutsu type');
assert(BOOSTER_TYPES.includes('path-genjutsu'), 'path-genjutsu type');
assert(BOOSTER_TYPES.includes('path-medicine'), 'path-medicine type');
assert(BOOSTER_TYPES.includes('elemental'), 'elemental type');
assert(BOOSTER_TYPES.includes('premium'), 'premium type');
assert(BOOSTER_TYPES.includes('elite'), 'elite type');
assert(BOOSTER_TYPES.includes('ascendant'), 'ascendant type');
assert(BOOSTER_TYPES.length === 9, '9 booster offers');

const standard = getBoosterDefinition('standard');
assert(standard.cost.ryos === 300 && standard.cost.kageCoins === 0, 'standard cost');
assert(standard.cardCount === 5, 'standard card count');

const pathTai = getBoosterDefinition('path-taijutsu');
assert(pathTai.pathOnly === true && pathTai.statType === 'taijutsu', 'path taijutsu filter');
assert(pathTai.cost.ryos === 550, 'path cost');

const elemental = getBoosterDefinition('elemental');
assert(elemental.elementalOnly === true, 'elemental filter');
assert(elemental.cost.ryos === 650, 'elemental cost');

const premium = getBoosterDefinition('premium');
assert(premium.cost.kageCoins === 100 && premium.cost.ryos === 0, 'premium cost');
assert(premium.guaranteedMinRarity === 'rare', 'premium guarantee');

const elite = getBoosterDefinition('elite');
assert(elite.cost.kageCoins === 250 && elite.cost.ryos === 0, 'elite cost');
assert(elite.guaranteedMinRarity === 'legendary', 'elite guarantee');
assert(elite.cardCount === 7, 'elite +2 cards');

const ascendant = getBoosterDefinition('ascendant');
assert(ascendant.cost.kageCoins === 500 && ascendant.cost.ryos === 0, 'ascendant cost');
assert(ascendant.guaranteedMinRarity === 'legendary', 'ascendant guarantee');
assert(ascendant.cardCount === 10, 'ascendant +5 cards');

let threw = false;
try {
  getBoosterDefinition('hacked');
} catch (e) {
  threw = e.statusCode === 400;
}
assert(threw, 'reject invalid booster type');

const serialized = serializeBooster(standard);
assert(serialized.probabilities.common > 0.6, 'serialized common ~70%');
assert(Math.abs(Object.values(serialized.probabilities).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'probs sum 1');

// --- rollRarity distribution ---
{
  const weights = { common: 700, rare: 230, legendary: 55, mythic: 15 };
  const expected = weightsToProbabilities(weights);
  const counts = { common: 0, rare: 0, legendary: 0, mythic: 0 };
  const N = 20000;
  const rng = seededRng(42);
  for (let i = 0; i < N; i += 1) counts[rollRarity(weights, rng)] += 1;

  for (const rarity of Object.keys(expected)) {
    const rate = counts[rarity] / N;
    const err = Math.abs(rate - expected[rarity]);
    assert(err < 0.02, `${rarity} rate ${rate} vs expected ${expected[rarity]} (err ${err})`);
  }
  console.log('✓ rollRarity distribution within 2% (n=20000)');
}

// --- guaranteed min rarity ---
{
  const weights = { common: 700, rare: 230, legendary: 55, mythic: 15 };
  const rng = seededRng(7);
  for (let i = 0; i < 500; i += 1) {
    const r = rollRarityAtLeast(weights, 'rare', rng);
    assert(r === 'rare' || r === 'legendary' || r === 'mythic', `got ${r} below rare`);
  }
  console.log('✓ rollRarityAtLeast never below rare');
}

// --- planBoosterRarities ---
{
  const slots = planBoosterRarities(standard, seededRng(1));
  assert(slots.length === 5, 'standard 5 slots');

  const premSlots = planBoosterRarities(premium, seededRng(99));
  assert(premSlots.length === 5, 'premium 5 slots');
  const last = premSlots[premSlots.length - 1];
  assert(['rare', 'legendary', 'mythic'].includes(last), `premium guarantee got ${last}`);
  console.log('✓ planBoosterRarities slot counts + guarantee');
}

// --- selectCardsForRarities ---
{
  const pools = {
    common: [{ id: 1, rarity: 'common', slug: 'a' }],
    rare: [{ id: 2, rarity: 'rare', slug: 'b' }],
    legendary: [{ id: 3, rarity: 'legendary', slug: 'c' }],
    mythic: [{ id: 4, rarity: 'mythic', slug: 'd' }],
  };
  const picked = selectCardsForRarities(['common', 'rare'], pools, () => 0);
  assert(picked[0].id === 1 && picked[1].id === 2, 'pick from pools');

  // Fallback when mythic empty
  const thin = { common: [{ id: 9, rarity: 'common' }], rare: [], legendary: [], mythic: [] };
  const fallback = selectCardsForRarities(['mythic'], thin, () => 0);
  assert(fallback[0].id === 9, 'fallback to lower rarity');
  console.log('✓ selectCardsForRarities + fallback');
}

// --- simulate openings vs expected (free slots only approx for premium) ---
{
  const sim = simulateBoosterOpenings('standard', 5000, seededRng(123));
  for (const rarity of ['common', 'rare', 'legendary', 'mythic']) {
    const err = Math.abs(sim.rates[rarity] - sim.expected[rarity]);
    assert(err < 0.025, `sim ${rarity}: ${sim.rates[rarity]} vs ${sim.expected[rarity]}`);
  }
  console.log('✓ simulateBoosterOpenings standard within 2.5%');
}

{
  const sim = simulateBoosterOpenings('premium', 2000, seededRng(55));
  assert(sim.guaranteedRate === 1, `premium guarantee rate ${sim.guaranteedRate}`);
  // Avec 1 slot forcé rare+, le taux "common" global doit être < expected free-slot rate
  assert(sim.rates.common < sim.expected.common, 'premium lowers overall common share');
  console.log('✓ premium always has rare+ guarantee');
}

{
  const eliteSlots = planBoosterRarities(elite, seededRng(60));
  assert(eliteSlots.length === 7, 'elite plans 7 slots');
  const ascSlots = planBoosterRarities(ascendant, seededRng(63));
  assert(ascSlots.length === 10, 'ascendant plans 10 slots');

  const eliteSim = simulateBoosterOpenings('elite', 1500, seededRng(61));
  assert(eliteSim.guaranteedRate === 1, `elite guarantee rate ${eliteSim.guaranteedRate}`);
  assert(eliteSim.totalCards === 1500 * 7, 'elite sim card count');
  const ascSim = simulateBoosterOpenings('ascendant', 1500, seededRng(62));
  assert(ascSim.guaranteedRate === 1, `ascendant guarantee rate ${ascSim.guaranteedRate}`);
  assert(ascSim.totalCards === 1500 * 10, 'ascendant sim card count');
  console.log('✓ elite/ascendant card counts + legendary+ guarantee');
}

// --- anti-triche : catalogue costs must be server-side constants ---
{
  const costs = BOOSTER_TYPES.map((t) => BOOSTER_CATALOG[t].cost);
  assert(costs.every((c) => c.ryos >= 0 && c.kageCoins >= 0), 'non-negative costs');
  assert(
    !Object.values(BOOSTER_CATALOG).some((b) => b.cost.ryos === 0 && b.cost.kageCoins === 0),
    'no free booster in catalog'
  );
  console.log('✓ anti-cheat: no free boosters, costs server-defined');
}

console.log('\nAll booster tests passed.');

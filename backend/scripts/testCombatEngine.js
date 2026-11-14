/**
 * Tests unitaires purs du moteur de combat (sans DB).
 *
 * npm run test:combat-engine --prefix backend
 */
import {
  scaleDamage,
  scaleBlock,
  scaleHeal,
  applyDamageThroughBlock,
  critChanceFromSpeed,
  typeAdvantageMultiplier,
  elementMultiplier,
} from '../src/services/deckCombat/formulas.js';
import {
  applyStatus,
  tickStatuses,
  resolveStartOfTurnStatuses,
  resolveEndOfTurnStatuses,
} from '../src/services/deckCombat/statuses.js';
import {
  drawCards,
  buildRuntimeDeck,
  buildPracticeDeckEntries,
  shuffle,
  moveCardFromHand,
} from '../src/services/deckCombat/deckRuntime.js';
import {
  computeCardDamage,
  computeCardBlock,
  applyCardPlay,
} from '../src/services/deckCombat/cardEffects.js';
import {
  applyTalentStartOfTurn,
  classifyTalentEffects,
  computeTalentDamageMods,
} from '../src/services/deckCombat/talentEffects.js';
import {
  generateEnemyFromTemplate,
  getNextIntent,
  executeEnemyIntent,
} from '../src/services/combatAIService.js';
import { BASE_CHAKRA, DRAW_PER_TURN } from '../src/services/deckCombat/constants.js';

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

console.log('=== Formulas ===');
assert(scaleDamage(6, 0) === 6, 'damage no stat = base');
assert(scaleDamage(6, 50) === 9, 'damage 50 tai = ×1.5');
assert(scaleDamage(6, 100) === 12, 'damage 100 tai = ×2');
assert(scaleDamage(6, 200) === 18, 'damage 200 tai = ×3');
assert(scaleBlock(5, 100) === 10, 'block medicine 100 = ×2');
assert(scaleHeal(8, 150) === 20, 'heal medicine 150 = ×2.5');
assert(critChanceFromSpeed(100) === 10, 'crit chance 100 vitesse = 10%');
assert(critChanceFromSpeed(600) === 50, 'crit chance capped at 50');
assert(typeAdvantageMultiplier('taijutsu', 'genjutsu') === 1.2, 'tai > gen');
assert(typeAdvantageMultiplier('taijutsu', 'ninjutsu') === 1, 'tai vs nin neutral');
assert(elementMultiplier('katon', 'futon') === 1.5, 'katon > futon');
assert(elementMultiplier('katon', 'suiton') === 0.7, 'katon < suiton');

const blocked = applyDamageThroughBlock({ hp: 50, block: 10 }, 7);
assert(blocked.hp === 50 && blocked.block === 3, 'armor absorbs first');
const pierce = applyDamageThroughBlock({ hp: 50, block: 3 }, 10);
assert(pierce.hp === 43 && pierce.block === 0, 'overflow to HP');

console.log('\n=== Statuses ===');
let statuses = [];
statuses = applyStatus(statuses, { key: 'poison', value: 5, duration: 3 });
statuses = applyStatus(statuses, { key: 'poison', value: 3, duration: 2 });
assert(statuses[0].value === 8 && statuses[0].duration === 3, 'poison stacks value, max duration');

let entity = { hp: 40, maxHp: 40, block: 5, statuses };
const start = resolveStartOfTurnStatuses(entity);
assert(start.entity.hp === 32, 'poison deals at start');
const end = resolveEndOfTurnStatuses({
  ...start.entity,
  statuses: applyStatus(start.entity.statuses, { key: 'burn', value: 4, duration: 1 }),
});
assert(end.entity.hp === 28, 'burn deals at end');
assert(end.entity.block === 0, 'block fades end of turn');
const persist = resolveEndOfTurnStatuses(
  { hp: 40, maxHp: 40, block: 12, statuses: [] },
  { persistBlock: true },
);
assert(persist.entity.block === 12, 'persistBlock keeps armor (StS-style)');
assert(tickStatuses([{ key: 'force', value: 2, duration: 1 }]).length === 0, 'duration 1 expires');

console.log('\n=== Deck runtime ===');
const entries = buildPracticeDeckEntries();
const pile = buildRuntimeDeck(entries);
assert(pile.length === 24, `practice deck size 24 (got ${pile.length})`);
const fixedRng = (() => {
  let i = 0;
  const seq = [0.1, 0.7, 0.3, 0.9, 0.2, 0.5, 0.4, 0.8, 0.6, 0.15];
  return () => seq[i++ % seq.length];
})();
const shuffled = shuffle([1, 2, 3, 4, 5], fixedRng);
assert(shuffled.length === 5 && shuffled.includes(1), 'shuffle preserves items');

let player = {
  hp: 100,
  maxHp: 100,
  block: 0,
  chakra: BASE_CHAKRA,
  statuses: [],
  hand: [],
  drawPile: pile,
  discardPile: [],
  exhaustPile: [],
};
const drawn = drawCards(player, DRAW_PER_TURN, fixedRng);
assert(drawn.player.hand.length === 5, 'draw 5');
assert(drawn.player.drawPile.length === 19, 'draw pile reduced');

const moved = moveCardFromHand(drawn.player, drawn.player.hand[0].instanceId, 'discard');
assert(moved.player.hand.length === 4 && moved.player.discardPile.length === 1, 'discard from hand');

console.log('\n=== Card effects ===');
const atkCard = {
  slug: 'test-fist',
  type: 'attack',
  statType: 'taijutsu',
  cost: 1,
  damage: 6,
  block: 0,
  heal: 0,
  effects: [],
  exhaust: false,
};
const dmg = computeCardDamage(atkCard, {
  stats: { taijutsu: 50, vitesse: 0 },
  rng: () => 0.99,
});
assert(dmg.total === 9, `scaled damage 9 (got ${dmg.total})`);

const blockAmt = computeCardBlock(
  { block: 5, statType: 'medicine' },
  { medicine: 100 },
  [],
);
assert(blockAmt === 10, 'scaled block');

let p = {
  hp: 100,
  maxHp: 100,
  block: 0,
  chakra: 3,
  statuses: [],
  hand: [],
  drawPile: [],
  discardPile: [],
  exhaustPile: [],
};
let e = { hp: 40, maxHp: 40, block: 0, statuses: [], posture: 'genjutsu' };
const play = applyCardPlay({
  player: p,
  enemy: e,
  card: atkCard,
  stats: { taijutsu: 50, vitesse: 0 },
  rng: () => 0.99,
});
assert(play.player.chakra === 2, 'chakra spent');
assert(play.enemy.hp < 40, 'enemy took damage');
// tai vs gen = 1.2 → 9 * 1.2 = 10.8 → 11
assert(play.enemy.hp === 29, `tai advantage damage (got hp ${play.enemy.hp})`);

console.log('\n=== Talent effects ===');
const classified = classifyTalentEffects(['iron_guard', 'berserker', 'combo_master']);
assert(classified.applied.includes('iron_guard'), 'iron_guard applied');
assert(classified.stubbed.includes('combo_master'), 'combo_master stubbed');
const tStart = applyTalentStartOfTurn({ hp: 50, maxHp: 100, block: 0 }, ['iron_guard', 'boosted_regen']);
assert(tStart.player.block === 3 && tStart.player.hp === 53, 'talent start effects');
const mods = computeTalentDamageMods(['berserker'], { hp: 40, maxHp: 100 });
assert(mods.damageMult === 1.25, 'berserker low hp');

console.log('\n=== Enemy AI ===');
const enemy = generateEnemyFromTemplate('ronin_bandit', 1);
assert(enemy.hp === 42 && enemy.intent, 'ronin spawned with intent');
const captain = generateEnemyFromTemplate('ashen_captain');
assert(captain.ai === 'pattern', 'captain uses pattern AI');
const i1 = getNextIntent({ ...captain, patternIndex: 0 });
const i2 = getNextIntent({ ...captain, patternIndex: 1 });
const i3 = getNextIntent({ ...captain, patternIndex: 2 });
assert(i1.type === 'attack' && i2.type === 'attack' && i3.type === 'defend', 'pattern loop');

let hero = { hp: 100, maxHp: 100, block: 10, statuses: [] };
const foe = { ...enemy, intent: { type: 'attack', damage: 8 } };
const resolved = executeEnemyIntent(foe, hero, () => 0.99);
assert(resolved.player.hp === 100 && resolved.player.block === 2, 'enemy attack vs block');
assert(resolved.enemy.intent, 'next intent set');

const defendFoe = {
  ...enemy,
  intent: { type: 'defend', block: 8 },
  block: 0,
};
const defResolved = executeEnemyIntent(defendFoe, hero, () => 0.5);
assert(defResolved.enemy.block === 8, 'enemy gains block');

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
console.log('✅ testCombatEngine passed');
console.log(`
Comment démarrer un combat de test (avec API + DB) :
  1. npm run db:migrate --prefix backend
  2. POST /api/combat/start  { "templateId": "ronin_bandit" }
     ou POST /api/missions/:id/start
  3. POST /api/combat/:id/play { "instanceId": "<hand card>" }
  4. POST /api/combat/:id/end-turn
`);

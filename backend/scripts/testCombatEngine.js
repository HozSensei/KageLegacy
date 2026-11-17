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
  clampCritChance,
  rollCrit,
  typeAdvantageMultiplier,
  elementMultiplier,
} from '../src/services/deckCombat/formulas.js';
import { getTypeAdvantage } from '../src/services/deckCombat/typeAdvantage.js';
import { remapAbandonedPassives, deriveCritChance } from '../src/services/deckCombat/combatArts.js';
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
  computeCardHeal,
  applyCardPlay,
  resolveAllyAttack,
} from '../src/services/deckCombat/cardEffects.js';
import {
  applyTalentStartOfTurn,
  applyTalentAfterCardPlay,
  applyTalentAfterDamageTaken,
  applyTalentCombatStart,
  applyTalentEndOfPlayerTurn,
  applyTalentAfterHeal,
  applyTalentToStatusPayload,
  applyTalentIncomingAttackMods,
  classifyTalentEffects,
  computeTalentDamageMods,
  applyIncomingTalentCap,
  resolveCardPileDestination,
  countDeckElements,
} from '../src/services/deckCombat/talentEffects.js';
import { TALENT_EFFECT_MVP } from '../src/services/deckCombat/constants.js';
import { TALENT_NODE_DEFS } from './data/talentTreeNodes.js';
import {
  generateEnemyFromTemplate,
  getNextIntent,
  executeEnemyIntent,
} from '../src/services/combatAIService.js';
import { listEnemyTemplates } from '../src/services/deckCombat/enemyTemplates.js';
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
assert(clampCritChance(10) === 10, 'crit chance passthrough');
assert(clampCritChance(600) === 50, 'crit chance capped at 50');
assert(rollCrit(0, () => 0).isCrit === false, '0% crit never procs');
assert(rollCrit(100, () => 0).isCrit === true, '100% clamped crit procs on low roll');
assert(typeAdvantageMultiplier('taijutsu', 'genjutsu') === 1.2, 'tai > gen');
assert(typeAdvantageMultiplier('taijutsu', 'ninjutsu') === 0.85, 'tai vs nin disadvantage');
assert(getTypeAdvantage('ninjutsu', 'taijutsu').relation === 'advantage', 'nin > tai relation');
assert(getTypeAdvantage('taijutsu', 'ninjutsu').relation === 'disadvantage', 'tai < nin relation');
assert(elementMultiplier('katon', 'futon') === 1.5, 'katon > futon');
assert(elementMultiplier('katon', 'suiton') === 0.7, 'katon < suiton');

const remapped = remapAbandonedPassives(
  { vitesse: 2, intelligence: 3, ninjutsu: 1 },
  { statType: 'ninjutsu', secondaryStatType: 'genjutsu' },
);
assert(remapped.ninjutsu === 3 && remapped.genjutsu === 3 && remapped.vitesse == null, 'remap vit→nin int→gen');
assert(deriveCritChance({ passiveBeforeRemap: { vitesse: 2 }, type: 'attack', damage: 4 }) === 15, 'crit from old vit');

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
  { persistBlock: true }
);
assert(persist.entity.block === 12, 'persistBlock keeps armor (StS-style)');
assert(tickStatuses([{ key: 'force', value: 2, duration: 1 }]).length === 0, 'duration 1 expires');

console.log('\n=== Deck runtime ===');
const entries = buildPracticeDeckEntries();
const pile = buildRuntimeDeck(entries);
assert(pile.length === 19, `practice deck size 19 (got ${pile.length})`);
assert(
  pile.some(c => c.type === 'summon'),
  'practice deck includes summon'
);
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
assert(drawn.player.drawPile.length === 14, 'draw pile reduced');

const moved = moveCardFromHand(drawn.player, drawn.player.hand[0].instanceId, 'discard');
assert(
  moved.player.hand.length === 4 && moved.player.discardPile.length === 1,
  'discard from hand'
);

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

const blockAmt = computeCardBlock({ block: 5, statType: 'medicine' }, { medicine: 100 }, []);
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
assert(play.enemy.hp === 29, `tai advantage damage (got hp ${play.enemy.hp})`);

console.log('\n=== Summon ===');
const summonCard = {
  slug: 'test-clone',
  type: 'summon',
  cost: 2,
  summon: { nameFr: 'Clone', nameEn: 'Clone', hp: 20, attack: 6, taunt: true },
};
p = { ...p, chakra: 3, ally: null };
const summoned = applyCardPlay({
  player: p,
  enemy: { hp: 40, maxHp: 40, block: 0, statuses: [] },
  card: summonCard,
  stats: {},
});
assert(summoned.player.ally?.hp === 20 && summoned.player.ally.attack === 6, 'ally summoned');
const allyHit = resolveAllyAttack(summoned.player, { hp: 40, maxHp: 40, block: 0 });
assert(allyHit.enemy.hp === 34, 'ally auto-attacks for 6');

console.log('\n=== Talent effects ===');
const seededEffects = [...new Set(TALENT_NODE_DEFS.filter(n => n.effect).map(n => n.effect))];
const classifiedAll = classifyTalentEffects(seededEffects);
assert(
  classifiedAll.applied.length >= 40,
  `≥40 effects applied (got ${classifiedAll.applied.length})`
);
assert(classifiedAll.stubbed.includes('collector'), 'collector still stubbed (meta)');
assert(classifiedAll.applied.includes('vital_satchel'), 'vital_satchel applied (center keystone)');
assert(classifiedAll.applied.includes('item_armor'), 'item_armor applied');
assert(classifiedAll.applied.includes('item_damage'), 'item_damage applied');
assert(classifiedAll.applied.includes('confusion_tax'), 'confusion_tax applied');
assert(classifiedAll.applied.includes('steady_hands'), 'steady_hands applied');
assert(
  Object.keys(TALENT_EFFECT_MVP).length === classifiedAll.applied.length,
  'MVP map matches applied'
);

const classified = classifyTalentEffects([
  'iron_guard',
  'berserker',
  'combo_master',
  'immortal',
  'illusion_master',
  'collector',
]);
assert(classified.applied.includes('iron_guard'), 'iron_guard applied');
assert(classified.applied.includes('combo_master'), 'combo_master applied');
assert(classified.applied.includes('immortal'), 'immortal applied');
assert(classified.applied.includes('illusion_master'), 'illusion_master applied');
assert(classified.stubbed.includes('collector'), 'collector stubbed');

const tStart = applyTalentStartOfTurn({ hp: 50, maxHp: 100, block: 0 }, [
  'iron_guard',
  'boosted_regen',
  'immortal',
]);
assert(tStart.player.block === 3, 'iron_guard block');
assert(tStart.player.hp === 55, 'boosted_regen +3 and immortal +2% (2)');

const mods = computeTalentDamageMods(['berserker'], { hp: 40, maxHp: 100 });
assert(mods.damageMult === 1.25, 'berserker low hp');

const immortalMods = computeTalentDamageMods(['immortal'], { hp: 100, maxHp: 100 });
assert(immortalMods.damageMult === 0.5, 'immortal halves damage');

const overloadMods = computeTalentDamageMods(
  ['overload'],
  { hp: 100, maxHp: 100 },
  { statType: 'ninjutsu', cost: 2, damage: 10 }
);
assert(overloadMods.costDelta === 1 && overloadMods.damageMult === 2, 'overload nin cost+dmg');

const intangibleMods = computeTalentDamageMods(['intangible'], { hp: 100, maxHp: 100 });
assert(intangibleMods.denyAttack && intangibleMods.incomingDamageCap === 1, 'intangible keystone');
assert(applyIncomingTalentCap(18, ['intangible']) === 1, 'incoming cap 1');

const bladeMods = computeTalentDamageMods(
  ['blade_swift'],
  { hp: 100, maxHp: 100 },
  { statType: 'taijutsu', cost: 1, damage: 6 }
);
assert(bladeMods.damageFlat === 3, 'blade_swift +3 flat');

const comboMods = computeTalentDamageMods(
  ['combo_master'],
  { hp: 100, maxHp: 100, taijutsuPlayedThisTurn: 2 },
  { statType: 'taijutsu', cost: 1 }
);
assert(comboMods.damageMult === 2, 'combo_master doubles the third Taijutsu card');

const tanked = applyTalentAfterDamageTaken(
  { hp: 20, maxHp: 100, block: 0, perfectTankUsed: false },
  ['perfect_tank']
);
assert(tanked.player.block === 5 && tanked.player.perfectTankUsed, 'perfect_tank triggers');

// —— Nouveaux effets ——
console.log('\n=== Talent effects (wave 2) ===');

const counterArmed = applyTalentAfterDamageTaken(
  { hp: 80, maxHp: 100, block: 0 },
  ['counter_strike'],
  { damageDealt: 5 }
);
assert(counterArmed.player.counterStrikeReady, 'counter_strike arms');
const counterMods = computeTalentDamageMods(['counter_strike'], counterArmed.player, {
  statType: 'taijutsu',
  cost: 1,
  damage: 5,
});
assert(counterMods.damageFlat === 4, 'counter_strike +4');

const finishMods = computeTalentDamageMods(
  ['finisher_blow'],
  { hp: 100, maxHp: 100 },
  { statType: 'taijutsu', cost: 2, damage: 8 },
  { enemy: { hp: 20, maxHp: 100 } }
);
assert(finishMods.damageMult === 1.5, 'finisher_blow ×1.5');

const pressMods = computeTalentDamageMods(
  ['relentless_press'],
  { hp: 100, maxHp: 100, taijutsuPlayedThisTurn: 2 },
  { statType: 'taijutsu', cost: 1, damage: 4 }
);
assert(pressMods.damageFlat === 2, 'relentless_press stacks');

const absMods = computeTalentDamageMods(
  ['absolute_guard'],
  { hp: 100, maxHp: 100 },
  { statType: 'taijutsu', cost: 1, damage: 5 }
);
assert(absMods.blockMult === 2 && absMods.costDelta === 1, 'absolute_guard block×2 +tai cost');

const grip = applyDamageThroughBlock({ hp: 50, block: 5 }, 4, { armorIgnore: 2 });
// ignore 2 → effective block 3 ; absorb 3 ; 1 to HP ; block reste 2
assert(grip.damageDealt === 1 && grip.block === 2, 'crushing_grip armor ignore');
const gripMods = computeTalentDamageMods(
  ['crushing_grip'],
  { hp: 100, maxHp: 100 },
  { statType: 'taijutsu', cost: 3, damage: 10 }
);
assert(gripMods.armorIgnore === 2, 'crushing_grip sets ignore');

const surge = applyTalentCombatStart({ hp: 100, maxHp: 100, chakra: 3, block: 0 }, [
  'chakra_surge',
  'mirage_armor',
  'living_bastion',
]);
assert(surge.player.chakra === 4, 'chakra_surge +1');
assert(surge.player.block === 4 && surge.player.mirageArmor === 2, 'mirage + bastion block');
assert(surge.player.maxHp === 140 && surge.player.hp === 140, 'living_bastion +40 maxHp');

const voided = applyTalentCombatStart({ hp: 100, maxHp: 100, chakra: 3 }, ['void_channel']);
assert(voided.player.maxHp === 80 && voided.player.hp === 80, 'void_channel −20% hp');
const voidMods = computeTalentDamageMods(['void_channel'], voided.player, {
  statType: 'ninjutsu',
  cost: 2,
  damage: 8,
});
assert(voidMods.costDelta === -1, 'void_channel nin −1 cost');

const stormP = { hp: 100, maxHp: 100, ninjutsuPlayedThisTurn: 0 };
let storm = stormP;
for (let i = 0; i < 2; i += 1) {
  storm = applyTalentAfterCardPlay(storm, { statType: 'ninjutsu' }, ['storm_weave']).player;
}
assert(storm.stormWeaveReady, 'storm_weave arms after 2 nin');
const stormMods = computeTalentDamageMods(['storm_weave'], storm, {
  statType: 'ninjutsu',
  cost: 2,
  damage: 5,
});
assert(stormMods.costDelta === -1, 'storm_weave discount');

const echoMods = computeTalentDamageMods(
  ['echo_cast'],
  { hp: 100, maxHp: 100, echoCastUsed: false },
  { statType: 'ninjutsu', cost: 1, damage: 10 }
);
assert(echoMods.echoReplayMult === 0.5, 'echo_cast replay');

const cycleArmed = applyTalentAfterCardPlay(
  { hp: 100, maxHp: 100, elementsPlayedThisTurn: ['katon'] },
  { statType: 'ninjutsu', element: 'suiton' },
  ['elemental_cycle']
);
assert(cycleArmed.player.elementalCycleBonus, 'elemental_cycle arms');
const cycleMods = computeTalentDamageMods(['elemental_cycle'], cycleArmed.player, {
  statType: 'ninjutsu',
  element: 'katon',
  damage: 5,
});
assert(cycleMods.damageFlat === 2, 'elemental_cycle +2');

const overEnd = applyTalentEndOfPlayerTurn({ hp: 100, maxHp: 100, chakra: 0 }, [
  'overcharge_spark',
]);
assert(overEnd.player.overchargeReady, 'overcharge_spark arms at 0 chakra');
const overMods = computeTalentDamageMods(['overcharge_spark'], overEnd.player, {
  statType: 'ninjutsu',
  cost: 1,
  damage: 5,
});
assert(overMods.damageFlat === 3, 'overcharge_spark +3');

const focusMods = computeTalentDamageMods(
  ['focus_burn'],
  { hp: 100, maxHp: 100, ninjutsuPlayedThisTurn: 0 },
  { statType: 'ninjutsu', cost: 1, damage: 5 }
);
assert(focusMods.damageFlat === 4, 'focus_burn solo nin');

const dualMods = computeTalentDamageMods(
  ['dual_element'],
  { hp: 100, maxHp: 100 },
  { statType: 'ninjutsu', cost: 1, damage: 5 },
  { deckElementCount: 2 }
);
assert(Math.abs(dualMods.damageMult - 1.1) < 1e-9, 'dual_element ×1.1');

const mana = applyTalentStartOfTurn({ hp: 100, maxHp: 100, chakra: 3 }, ['mana_well'], { turn: 3 });
assert(mana.player.chakra === 4, 'mana_well every 3 turns');

const illu = applyTalentToStatusPayload({
  payload: { key: 'weak', value: 1, duration: 2 },
  card: { statType: 'genjutsu' },
  player: { fearSeedUsed: false },
  enemy: { statuses: [] },
  effectCodes: ['illusion_master', 'phantom_sovereign', 'fear_seed'],
  target: 'enemy',
});
assert(illu.payload.duration === 3, 'illusion_master +1 duration');
assert(illu.payload.value === 2, 'phantom_sovereign +1 intensity');
assert(
  (illu.enemy.statuses || []).some(s => s.key === 'force' && s.value === -2),
  'fear_seed −2 force'
);

const mind = applyTalentIncomingAttackMods(8, {}, { statuses: [{ key: 'weak', duration: 1 }] }, [
  'mind_trap',
  'veil_thick',
]);
assert(mind.damage === 7 && mind.evadeBonus === 0.1, 'mind_trap −1 and veil_thick evade');

const echoPain = applyTalentAfterDamageTaken(
  { hp: 90, maxHp: 100, echoPainUsedThisTurn: false },
  ['echo_pain'],
  { enemy: { hp: 40, maxHp: 40 }, damageDealt: 4 }
);
assert(echoPain.enemy.hp === 39, 'echo_pain reflects 1');

const silentMods = computeTalentDamageMods(
  ['silent_cut'],
  { hp: 100, maxHp: 100 },
  { statType: 'genjutsu', cost: 1, damage: 4 },
  { cardsPlayedThisTurn: 0 }
);
assert(silentMods.damageFlat === 2, 'silent_cut first card');

const purify = applyTalentStartOfTurn(
  { hp: 100, maxHp: 100, statuses: [{ key: 'poison', value: 3, duration: 2 }], purifyUsed: false },
  ['purify']
);
assert(purify.player.statuses.length === 0 && purify.player.purifyUsed, 'purify cleanses');

const triageMods = computeTalentDamageMods(
  ['triage_focus', 'field_surgeon', 'last_stand_heal'],
  { hp: 10, maxHp: 100, triageFocusUsed: false, lastStandHealUsed: false },
  { heal: 6, cost: 2, statType: 'medicine' }
);
assert(triageMods.healFlat === 8, 'triage + field flat');
assert(triageMods.healMult === 2, 'last_stand doubles heal');

const bond = applyTalentAfterHeal(
  { hp: 50, maxHp: 100, block: 0, bloodBondUsed: 0 },
  ['blood_bond', 'vital_overflow'],
  { healAttempted: 20, healApplied: 10 }
);
assert(bond.player.block === 1 + 3, 'blood_bond + vital_overflow armor');

assert(
  resolveCardPileDestination({ type: 'item', exhaust: true }, ['item_master']) === 'discard',
  'item_master no exhaust'
);
const itemDeny = computeTalentDamageMods(['item_master'], { hp: 100, maxHp: 100 });
assert(itemDeny.denyNonItem && itemDeny.itemNoExhaust, 'item_master deny tech');

const adrenalineMods = computeTalentDamageMods(
  ['adrenaline_rush'],
  { hp: 40, maxHp: 100 },
  { statType: 'taijutsu', cost: 1 }
);
assert(adrenalineMods.damageFlat === 3, 'adrenaline_rush adds 3 Taijutsu damage at low HP');

assert(
  countDeckElements([{ element: 'katon' }, { element: 'suiton' }, {}]) === 2,
  'countDeckElements'
);

const sovereignMods = computeTalentDamageMods(['phantom_sovereign'], { hp: 100, maxHp: 100 });
assert(sovereignMods.blockAllowed === false, 'phantom_sovereign denies block');

console.log('\n=== Enemy catalog ===');
const catalog = listEnemyTemplates();
assert(catalog.length >= 15, `≥15 enemy templates incl. bosses (got ${catalog.length})`);
const enemy = generateEnemyFromTemplate('ronin_bandit', 1);
assert(enemy.hp === 124 && enemy.intent, 'ronin spawned with intent');
const captain = generateEnemyFromTemplate('ashen_captain');
assert(captain.ai === 'pattern', 'captain uses pattern AI');
const dusk = generateEnemyFromTemplate('duskblade_ronin');
assert(dusk.hp === 290, 'duskblade A-rank hp');
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

const intangibleHero = { hp: 100, maxHp: 100, block: 0, statuses: [] };
const vsIntangible = executeEnemyIntent(
  { ...enemy, intent: { type: 'attack', damage: 20 } },
  intangibleHero,
  () => 0.99,
  { talentCodes: ['intangible'] }
);
assert(vsIntangible.player.hp === 99, 'keystone intangible caps enemy damage to 1');

// ── Percent support buffs (damage_pct / typed / block_pct / heal_pct) ──
const baseTai = computeCardDamage(
  { ...atkCard, damage: 10 },
  { stats: { taijutsu: 0, vitesse: 0 }, rng: () => 0.99 }
);
assert(baseTai.total === 10, `baseline tai damage 10 (got ${baseTai.total})`);

const pctTai = computeCardDamage(
  { ...atkCard, damage: 10 },
  {
    stats: { taijutsu: 0, vitesse: 0 },
    playerStatuses: [{ key: 'taijutsu_pct', value: 20, duration: 2 }],
    rng: () => 0.99,
  }
);
assert(pctTai.total === 12, `+20% taijutsu → 12 (got ${pctTai.total})`);

const pctGlobal = computeCardDamage(
  { ...atkCard, damage: 10, statType: 'ninjutsu' },
  {
    stats: { ninjutsu: 0, vitesse: 0 },
    playerStatuses: [{ key: 'damage_pct', value: 25, duration: 2 }],
    rng: () => 0.99,
  }
);
assert(pctGlobal.total === 13, `+25% damage_pct → 13 (got ${pctGlobal.total})`);

const typedMiss = computeCardDamage(
  { ...atkCard, damage: 10, statType: 'ninjutsu' },
  {
    stats: { ninjutsu: 0, vitesse: 0 },
    playerStatuses: [{ key: 'taijutsu_pct', value: 50, duration: 2 }],
    rng: () => 0.99,
  }
);
assert(typedMiss.total === 10, 'typed % only applies to matching statType');

const blockPct = computeCardBlock({ block: 10, statType: 'medicine' }, { medicine: 0 }, [
  { key: 'block_pct', value: 20, duration: 2 },
]);
assert(blockPct === 12, `+20% block → 12 (got ${blockPct})`);

const healPct = computeCardHeal({ heal: 10 }, { medicine: 0 }, {}, [
  { key: 'heal_pct', value: 15, duration: 2 },
]);
assert(healPct === 12, `+15% heal → 12 (got ${healPct})`);

const supportPlay = applyCardPlay({
  player: {
    hp: 80,
    maxHp: 100,
    block: 0,
    chakra: 3,
    statuses: [],
    hand: [],
    drawPile: ['x'],
    discardPile: [],
    exhaustPile: [],
  },
  enemy: { hp: 40, maxHp: 40, block: 0, statuses: [] },
  card: {
    slug: 'preparation-martiale',
    type: 'skill',
    statType: 'taijutsu',
    cost: 1,
    effects: [
      { type: 'apply_status', target: 'self', status: 'taijutsu_pct', value: 20, duration: 2 },
      { type: 'draw', value: 1 },
    ],
  },
  stats: { taijutsu: 10 },
  rng: () => 0.5,
});
assert(
  (supportPlay.player.statuses || []).some(s => s.key === 'taijutsu_pct' && s.value === 20),
  'support card applies taijutsu_pct'
);

const gainBlockPlay = applyCardPlay({
  player: {
    hp: 100,
    maxHp: 100,
    block: 0,
    chakra: 2,
    statuses: [{ key: 'block_pct', value: 20, duration: 2 }],
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
  },
  enemy: { hp: 40, maxHp: 40, block: 0, statuses: [] },
  card: {
    slug: 'ancrage-tellurique',
    type: 'skill',
    cost: 1,
    effects: [{ type: 'gain_block', value: 5 }],
  },
  stats: { medicine: 0 },
  rng: () => 0.5,
});
assert(
  gainBlockPlay.player.block === 6,
  `gain_block respects block_pct (got ${gainBlockPlay.player.block})`
);

console.log('\n=== Stub effects resolved ===');
const healSelfPlay = applyCardPlay({
  player: {
    hp: 50,
    maxHp: 100,
    block: 0,
    chakra: 3,
    statuses: [],
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
  },
  enemy: { hp: 40, maxHp: 40, block: 0, statuses: [] },
  card: {
    slug: 'scalpel-de-chakra',
    type: 'attack',
    statType: 'medicine',
    cost: 2,
    damage: 8,
    effects: [{ type: 'heal_self', value: 4 }],
  },
  stats: { medicine: 0 },
  rng: () => 0.99,
});
assert(healSelfPlay.player.hp === 54, `heal_self restores HP (got ${healSelfPlay.player.hp})`);
assert(healSelfPlay.logs.some((l) => l.type === 'heal' && l.amount === 4), 'heal_self logs heal');
assert(!healSelfPlay.logs.some((l) => l.type === 'stub_effect'), 'heal_self not stubbed');

const cleansePlay = applyCardPlay({
  player: {
    hp: 80,
    maxHp: 100,
    block: 0,
    chakra: 2,
    statuses: [{ key: 'weak', value: 1, duration: 2 }],
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
  },
  enemy: { hp: 40, maxHp: 40, block: 0, statuses: [], intent: { type: 'attack', damage: 10 } },
  card: {
    slug: 'purge-test',
    type: 'skill',
    cost: 1,
    effects: [{ type: 'cleanse_self' }],
  },
  stats: { medicine: 0 },
  rng: () => 0.5,
});
assert(cleansePlay.player.statuses.length === 0, 'cleanse removes debuff');
assert(cleansePlay.logs.some((l) => l.type === 'cleanse' && l.removed === 'weak'), 'cleanse log');

const sealPlay = applyCardPlay({
  player: {
    hp: 80,
    maxHp: 100,
    block: 0,
    chakra: 3,
    statuses: [],
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
  },
  enemy: {
    hp: 40,
    maxHp: 40,
    block: 0,
    statuses: [],
    intent: { type: 'attack', damage: 12 },
  },
  card: {
    slug: 'sceau-test',
    type: 'item',
    cost: 2,
    effects: [{ type: 'exile_enemy_card' }],
  },
  stats: { taijutsu: 0 },
  rng: () => 0.5,
});
assert(sealPlay.enemy.intent?.type === 'sealed', 'exile seals intent');
assert(sealPlay.logs.some((l) => l.type === 'intent_sealed'), 'intent_sealed log');

const aoePlay = applyCardPlay({
  player: {
    hp: 80,
    maxHp: 100,
    block: 0,
    chakra: 3,
    statuses: [],
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
  },
  enemy: { hp: 100, maxHp: 100, block: 0, statuses: [], posture: 'genjutsu' },
  card: {
    slug: 'pilier-de-flammes',
    type: 'attack',
    statType: 'ninjutsu',
    cost: 2,
    damage: 9,
    effects: [{ type: 'aoe' }],
  },
  stats: { ninjutsu: 0 },
  rng: () => 0.99,
});
const aoeDmg = aoePlay.logs.find((l) => l.type === 'damage' && l.source === 'player');
assert(aoeDmg && aoeDmg.amount > 9, `aoe mult applied (got ${aoeDmg?.amount})`);

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

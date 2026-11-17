/**
 * Application des effect_code talents (keystones / notables) en combat.
 *
 * Catalogue : docs/TALENT_EFFECTS.md
 */
import { GENJUTSU_DEBUFF_KEYS, TALENT_EFFECT_MVP } from './constants.js';
import { applyStatus, PLAYER_DEBUFF_KEYS } from './statuses.js';

export function classifyTalentEffects(effectCodes = []) {
  const applied = [];
  const stubbed = [];
  for (const code of effectCodes) {
    if (!code) continue;
    if (TALENT_EFFECT_MVP[code]) applied.push(code);
    else stubbed.push(code);
  }
  return { applied, stubbed };
}

export function enemyHasGenjutsuDebuff(enemy) {
  return (enemy?.statuses || []).some(
    s => GENJUTSU_DEBUFF_KEYS.has(s.key) && (s.duration == null || s.duration > 0),
  );
}

export function isGenjutsuDebuffKey(key) {
  return GENJUTSU_DEBUFF_KEYS.has(String(key || '').toLowerCase());
}

/**
 * Mods de dégâts / coût / soin dérivés des talents pour une carte donnée.
 * @param {string[]} effectCodes
 * @param {object} player
 * @param {object|null} card
 * @param {object} [ctx]
 * @param {object} [ctx.enemy]
 * @param {number} [ctx.deckElementCount]
 * @param {number} [ctx.cardsPlayedThisTurn]
 */
export function computeTalentDamageMods(effectCodes, player, card = null, ctx = {}) {
  const mods = {
    damageMult: 1,
    damageFlat: 0,
    costDelta: 0,
    healFlat: 0,
    healMult: 1,
    blockMult: 1,
    blockFlat: 0,
    blockAllowed: true,
    armorIgnore: 0,
    incomingDamageCap: null,
    denyAttack: false,
    denyNonItem: false,
    echoReplayMult: 0,
    itemNoExhaust: false,
  };
  const codes = new Set(effectCodes || []);
  const enemy = ctx.enemy || null;
  const deckElementCount = Number(ctx.deckElementCount) || 0;
  const cardsPlayedThisTurn = Number(ctx.cardsPlayedThisTurn) || 0;

  if (codes.has('berserker')) {
    const cfg = TALENT_EFFECT_MVP.berserker;
    const ratio = (Number(player.hp) || 0) / Math.max(1, Number(player.maxHp) || 1);
    if (ratio < cfg.threshold) mods.damageMult *= cfg.mult;
  }

  if (codes.has('immortal')) {
    mods.damageMult *= TALENT_EFFECT_MVP.immortal.damageMult;
  }

  if (codes.has('intangible')) {
    mods.denyAttack = true;
    mods.incomingDamageCap = TALENT_EFFECT_MVP.intangible.incomingCap;
  }

  if (codes.has('boosted_regen')) {
    mods.healMult *= TALENT_EFFECT_MVP.boosted_regen.healMult || 1.5;
  }

  if (codes.has('phantom_sovereign')) {
    mods.blockAllowed = false;
  }

  if (codes.has('absolute_guard')) {
    mods.blockMult *= TALENT_EFFECT_MVP.absolute_guard.blockMult;
  }

  if (codes.has('living_bastion')) {
    mods.healMult *= TALENT_EFFECT_MVP.living_bastion.healMult;
  }

  if (codes.has('item_master')) {
    mods.denyNonItem = true;
    mods.itemNoExhaust = true;
  }

  if (card?.type === 'item') {
    if (codes.has('item_damage')) {
      mods.damageFlat += TALENT_EFFECT_MVP.item_damage.flat;
    }
    if (codes.has('item_armor')) {
      mods.blockFlat = (Number(mods.blockFlat) || 0) + TALENT_EFFECT_MVP.item_armor.flat;
    }
    if (codes.has('vital_satchel')) {
      const cfg = TALENT_EFFECT_MVP.vital_satchel;
      mods.damageFlat += cfg.damageFlat;
      mods.blockFlat = (Number(mods.blockFlat) || 0) + cfg.blockFlat;
    }
  }

  if (codes.has('steady_hands')) {
    mods.healFlat += TALENT_EFFECT_MVP.steady_hands.flat;
  }

  if (card && codes.has('overload') && card.statType === 'ninjutsu') {
    const cfg = TALENT_EFFECT_MVP.overload;
    mods.costDelta += cfg.costDelta;
    mods.damageMult *= cfg.damageMult;
  }

  if (card && codes.has('combo_master') && card.statType === 'taijutsu') {
    const cfg = TALENT_EFFECT_MVP.combo_master;
    if ((Number(player.taijutsuPlayedThisTurn) || 0) === cfg.cardsBeforeTrigger) {
      mods.damageMult *= cfg.damageMult;
    }
  }

  if (card && codes.has('blade_swift') && card.statType === 'taijutsu') {
    const cfg = TALENT_EFFECT_MVP.blade_swift;
    const baseCost = Number(card.cost) || 0;
    if (baseCost <= cfg.maxCost) mods.damageFlat += cfg.flat;
  }

  if (card && codes.has('elemental_mastery') && card.element) {
    mods.damageMult *= TALENT_EFFECT_MVP.elemental_mastery.mult;
  }

  if (
    card &&
    codes.has('shadow_feint') &&
    card.statType === 'genjutsu' &&
    !(player.genjutsuPlayedThisTurn > 0)
  ) {
    mods.costDelta += TALENT_EFFECT_MVP.shadow_feint.costDelta;
  }

  if (
    card &&
    codes.has('counter_strike') &&
    card.statType === 'taijutsu' &&
    player.counterStrikeReady
  ) {
    mods.damageFlat += TALENT_EFFECT_MVP.counter_strike.flat;
  }

  if (card && codes.has('finisher_blow') && card.statType === 'taijutsu' && enemy) {
    const cfg = TALENT_EFFECT_MVP.finisher_blow;
    const ratio = (Number(enemy.hp) || 0) / Math.max(1, Number(enemy.maxHp) || 1);
    if (ratio < cfg.threshold) mods.damageMult *= cfg.mult;
  }

  if (card && codes.has('relentless_press') && card.statType === 'taijutsu') {
    const stacks = Number(player.taijutsuPlayedThisTurn) || 0;
    mods.damageFlat += stacks * TALENT_EFFECT_MVP.relentless_press.flatPerCard;
  }

  if (card && codes.has('absolute_guard') && card.statType === 'taijutsu') {
    const wantsAttack =
      (Number(card.damage) || 0) > 0 || (card.effects || []).some(e => e.type === 'multi_strike');
    if (wantsAttack) {
      mods.costDelta += TALENT_EFFECT_MVP.absolute_guard.offensiveTaiCostDelta;
    }
  }

  if (card && codes.has('crushing_grip') && card.statType === 'taijutsu') {
    const cfg = TALENT_EFFECT_MVP.crushing_grip;
    if ((Number(card.cost) || 0) >= cfg.minCost) mods.armorIgnore += cfg.armorIgnore;
  }

  if (card && codes.has('adrenaline_rush') && card.statType === 'taijutsu') {
    const cfg = TALENT_EFFECT_MVP.adrenaline_rush;
    const ratio = (Number(player.hp) || 0) / Math.max(1, Number(player.maxHp) || 1);
    if (ratio < cfg.threshold) mods.damageFlat += cfg.flat;
  }

  if (card && codes.has('void_channel') && card.statType === 'ninjutsu') {
    mods.costDelta += TALENT_EFFECT_MVP.void_channel.costDelta;
  }

  if (card && codes.has('storm_weave') && card.statType === 'ninjutsu' && player.stormWeaveReady) {
    mods.costDelta += TALENT_EFFECT_MVP.storm_weave.costDelta;
  }

  if (card && codes.has('focus_burn') && card.statType === 'ninjutsu') {
    if (!(player.ninjutsuPlayedThisTurn > 0)) {
      mods.damageFlat += TALENT_EFFECT_MVP.focus_burn.flat;
    }
  }

  if (
    card &&
    codes.has('overcharge_spark') &&
    card.statType === 'ninjutsu' &&
    player.overchargeReady
  ) {
    mods.damageFlat += TALENT_EFFECT_MVP.overcharge_spark.flat;
  }

  if (
    card &&
    codes.has('dual_element') &&
    card.statType === 'ninjutsu' &&
    deckElementCount >= TALENT_EFFECT_MVP.dual_element.minElements
  ) {
    mods.damageMult *= TALENT_EFFECT_MVP.dual_element.mult;
  }

  if (
    card &&
    codes.has('echo_cast') &&
    card.statType === 'ninjutsu' &&
    !player.echoCastUsed &&
    ((Number(card.damage) || 0) > 0 || (card.effects || []).some(e => e.type === 'multi_strike'))
  ) {
    mods.echoReplayMult = TALENT_EFFECT_MVP.echo_cast.damageMult;
  }

  if (card && codes.has('elemental_cycle') && player.elementalCycleBonus) {
    mods.damageFlat += TALENT_EFFECT_MVP.elemental_cycle.flat;
  }

  if (
    card &&
    codes.has('silent_cut') &&
    card.statType === 'genjutsu' &&
    cardsPlayedThisTurn === 0 &&
    ((Number(card.damage) || 0) > 0 || (card.effects || []).some(e => e.type === 'multi_strike'))
  ) {
    mods.damageFlat += TALENT_EFFECT_MVP.silent_cut.flat;
  }

  if (card && (Number(card.heal) || 0) > 0) {
    if (codes.has('triage_focus') && !player.triageFocusUsed) {
      mods.healFlat += TALENT_EFFECT_MVP.triage_focus.flat;
    }
    if (
      codes.has('field_surgeon') &&
      (Number(card.cost) || 0) >= TALENT_EFFECT_MVP.field_surgeon.minCost
    ) {
      mods.healFlat += TALENT_EFFECT_MVP.field_surgeon.flat;
    }
    if (codes.has('last_stand_heal') && !player.lastStandHealUsed) {
      const cfg = TALENT_EFFECT_MVP.last_stand_heal;
      const ratio = (Number(player.hp) || 0) / Math.max(1, Number(player.maxHp) || 1);
      if (ratio < cfg.threshold) mods.healMult *= cfg.healMult;
    }
  }

  return mods;
}

/**
 * Début de combat (avant 1er tour) : chakra_surge, mirage, bastion, void_channel.
 * @returns {{ player, logs }}
 */
export function applyTalentCombatStart(player, effectCodes = []) {
  const logs = [];
  const next = { ...player };
  const codes = new Set(effectCodes || []);

  if (codes.has('void_channel')) {
    const mult = TALENT_EFFECT_MVP.void_channel.maxHpMult;
    const newMax = Math.max(1, Math.round((Number(next.maxHp) || 1) * mult));
    const hpLost = (Number(next.maxHp) || 0) - newMax;
    next.maxHp = newMax;
    next.hp = Math.min(Number(next.hp) || 0, newMax);
    logs.push({ type: 'talent', effect: 'void_channel', maxHp: newMax, hpLost });
  }

  if (codes.has('living_bastion')) {
    const cfg = TALENT_EFFECT_MVP.living_bastion;
    next.maxHp = (Number(next.maxHp) || 0) + cfg.maxHpFlat;
    next.hp = (Number(next.hp) || 0) + cfg.maxHpFlat;
    next.block = (Number(next.block) || 0) + cfg.startBlock;
    logs.push({
      type: 'talent',
      effect: 'living_bastion',
      maxHpFlat: cfg.maxHpFlat,
      block: cfg.startBlock,
    });
  }

  if (codes.has('chakra_surge') && !next.chakraSurgeUsed) {
    const v = TALENT_EFFECT_MVP.chakra_surge.chakra;
    next.chakra = (Number(next.chakra) || 0) + v;
    next.chakraSurgeUsed = true;
    logs.push({ type: 'talent', effect: 'chakra_surge', chakra: v });
  }

  if (codes.has('mirage_armor')) {
    const v = TALENT_EFFECT_MVP.mirage_armor.block;
    next.block = (Number(next.block) || 0) + v;
    next.mirageArmor = v;
    logs.push({ type: 'talent', effect: 'mirage_armor', block: v });
  }

  return { player: next, logs };
}

/**
 * Effets passifs début de tour joueur.
 * @returns {{ player, logs }}
 */
export function applyTalentStartOfTurn(player, effectCodes = [], { turn = 1 } = {}) {
  const logs = [];
  const next = {
    ...player,
    taijutsuPlayedThisTurn: 0,
    ninjutsuPlayedThisTurn: 0,
    genjutsuPlayedThisTurn: 0,
    cardsPlayedThisTurn: 0,
    elementsPlayedThisTurn: [],
    stormWeaveReady: false,
    elementalCycleBonus: false,
    echoPainUsedThisTurn: false,
  };
  const codes = new Set(effectCodes || []);

  if (codes.has('iron_guard')) {
    const v = TALENT_EFFECT_MVP.iron_guard.value;
    next.block = (Number(next.block) || 0) + v;
    logs.push({ type: 'talent', effect: 'iron_guard', block: v });
  }

  if (codes.has('boosted_regen')) {
    const v = TALENT_EFFECT_MVP.boosted_regen.value;
    const before = next.hp;
    next.hp = Math.min(next.maxHp, next.hp + v);
    logs.push({ type: 'talent', effect: 'boosted_regen', heal: next.hp - before });
  }

  if (codes.has('immortal')) {
    const pct = TALENT_EFFECT_MVP.immortal.pct;
    const heal = Math.max(1, Math.round((Number(next.maxHp) || 0) * pct));
    const before = next.hp;
    next.hp = Math.min(next.maxHp, next.hp + heal);
    logs.push({ type: 'talent', effect: 'immortal', heal: next.hp - before });
  }

  if (codes.has('purify') && !next.purifyUsed) {
    const idx = (next.statuses || []).findIndex((s) => PLAYER_DEBUFF_KEYS.has(s.key));
    if (idx >= 0) {
      const removed = next.statuses[idx];
      next.statuses = next.statuses.filter((_, i) => i !== idx);
      next.purifyUsed = true;
      logs.push({ type: 'talent', effect: 'purify', removed: removed.key });
    }
  }

  if (codes.has('mana_well')) {
    const cfg = TALENT_EFFECT_MVP.mana_well;
    if (turn > 0 && turn % cfg.turns === 0) {
      next.chakra = (Number(next.chakra) || 0) + cfg.chakra;
      logs.push({ type: 'talent', effect: 'mana_well', chakra: cfg.chakra, turn });
    }
  }

  return { player: next, logs };
}

/**
 * Fin de tour joueur (avant phase ennemi) : overcharge_spark arming.
 */
export function applyTalentEndOfPlayerTurn(player, effectCodes = []) {
  const logs = [];
  const codes = new Set(effectCodes || []);
  const next = { ...player };

  if (codes.has('overcharge_spark') && (Number(next.chakra) || 0) === 0) {
    next.overchargeReady = true;
    logs.push({ type: 'talent', effect: 'overcharge_spark', armed: true });
  } else if (codes.has('overcharge_spark')) {
    next.overchargeReady = false;
  }

  return { player: next, logs };
}

/**
 * Après une carte jouée : combos, flags, compteurs.
 * @returns {{ player, enemy, logs, extraDraw }}
 */
export function applyTalentAfterCardPlay(player, card, effectCodes = [], { enemy = null } = {}) {
  const logs = [];
  const next = {
    ...player,
    cardsPlayedThisTurn: (Number(player.cardsPlayedThisTurn) || 0) + 1,
  };
  const nextEnemy = enemy;
  const codes = new Set(effectCodes || []);
  let extraDraw = 0;

  if (card?.statType === 'taijutsu') {
    next.taijutsuPlayedThisTurn = (Number(next.taijutsuPlayedThisTurn) || 0) + 1;
    if (codes.has('counter_strike') && next.counterStrikeReady) {
      next.counterStrikeReady = false;
      logs.push({ type: 'talent', effect: 'counter_strike', consumed: true });
    }
  }
  if (card?.statType === 'ninjutsu') {
    next.ninjutsuPlayedThisTurn = (Number(next.ninjutsuPlayedThisTurn) || 0) + 1;
    if (codes.has('storm_weave') && next.stormWeaveReady) {
      next.stormWeaveReady = false;
      logs.push({ type: 'talent', effect: 'storm_weave', consumed: true });
    }
    if (
      codes.has('storm_weave') &&
      (Number(next.ninjutsuPlayedThisTurn) || 0) >= TALENT_EFFECT_MVP.storm_weave.cardsNeeded
    ) {
      next.stormWeaveReady = true;
      logs.push({ type: 'talent', effect: 'storm_weave', armed: true });
    }
    if (codes.has('echo_cast') && !player.echoCastUsed) {
      next.echoCastUsed = true;
    }
    if (codes.has('overcharge_spark') && player.overchargeReady) {
      next.overchargeReady = false;
      logs.push({ type: 'talent', effect: 'overcharge_spark', consumed: true });
    }
  }
  if (card?.statType === 'genjutsu') {
    next.genjutsuPlayedThisTurn = (Number(next.genjutsuPlayedThisTurn) || 0) + 1;
  }

  if (card?.element) {
    const prev = Array.isArray(next.elementsPlayedThisTurn) ? [...next.elementsPlayedThisTurn] : [];
    const last = prev[prev.length - 1];
    if (codes.has('elemental_cycle') && last && last !== card.element) {
      next.elementalCycleBonus = true;
      logs.push({ type: 'talent', effect: 'elemental_cycle', armed: true });
    } else if (codes.has('elemental_cycle') && player.elementalCycleBonus) {
      next.elementalCycleBonus = false;
      logs.push({ type: 'talent', effect: 'elemental_cycle', consumed: true });
    }
    prev.push(card.element);
    next.elementsPlayedThisTurn = prev;
  } else if (codes.has('elemental_cycle') && player.elementalCycleBonus) {
    next.elementalCycleBonus = false;
  }

  if (codes.has('elemental_fusion') && card?.element) {
    const elements = next.elementsPlayedThisTurn || [];
    const unique = new Set(elements);
    if (unique.size >= 2 && !next.elementalFusionDrawnThisTurn) {
      extraDraw = TALENT_EFFECT_MVP.elemental_fusion.draw;
      next.elementalFusionDrawnThisTurn = true;
      logs.push({ type: 'talent', effect: 'elemental_fusion', draw: extraDraw });
    }
  }

  if ((Number(card?.heal) || 0) > 0) {
    if (codes.has('triage_focus') && !player.triageFocusUsed) {
      next.triageFocusUsed = true;
    }
    if (codes.has('last_stand_heal') && !player.lastStandHealUsed) {
      const cfg = TALENT_EFFECT_MVP.last_stand_heal;
      const ratio = (Number(player.hp) || 0) / Math.max(1, Number(player.maxHp) || 1);
      if (ratio < cfg.threshold) next.lastStandHealUsed = true;
    }
  }

  return { player: next, enemy: nextEnemy, logs, extraDraw };
}

/**
 * Après dégâts subis (et hooks associés) : perfect_tank, counter_strike,
 * adrenaline, echo_pain, mirage_armor.
 * @returns {{ player, enemy, logs }}
 */
export function applyTalentAfterDamageTaken(
  player,
  effectCodes = [],
  { enemy = null, damageDealt = 0 } = {},
) {
  const logs = [];
  const codes = new Set(effectCodes || []);
  let next = { ...player };
  let nextEnemy = enemy ? { ...enemy } : enemy;

  if ((Number(damageDealt) || 0) > 0 && next.mirageArmor) {
    const mirage = Number(next.mirageArmor) || 0;
    next.block = Math.max(0, (Number(next.block) || 0) - mirage);
    next.mirageArmor = 0;
    logs.push({ type: 'talent', effect: 'mirage_armor', broken: true });
  }

  if ((Number(damageDealt) || 0) > 0 && codes.has('counter_strike')) {
    next.counterStrikeReady = true;
    logs.push({ type: 'talent', effect: 'counter_strike', armed: true });
  }

  if (
    codes.has('echo_pain') &&
    (Number(damageDealt) || 0) > 0 &&
    !next.echoPainUsedThisTurn &&
    nextEnemy
  ) {
    const dmg = TALENT_EFFECT_MVP.echo_pain.damage;
    nextEnemy = {
      ...nextEnemy,
      hp: Math.max(0, (Number(nextEnemy.hp) || 0) - dmg),
    };
    next.echoPainUsedThisTurn = true;
    logs.push({ type: 'talent', effect: 'echo_pain', damage: dmg, enemyHp: nextEnemy.hp });
  }

  if (codes.has('perfect_tank') && !next.perfectTankUsed) {
    const cfg = TALENT_EFFECT_MVP.perfect_tank;
    const ratio = (Number(next.hp) || 0) / Math.max(1, Number(next.maxHp) || 1);
    if (ratio < cfg.threshold && (Number(next.hp) || 0) > 0) {
      next = {
        ...next,
        block: (Number(next.block) || 0) + cfg.block,
        perfectTankUsed: true,
      };
      logs.push({ type: 'talent', effect: 'perfect_tank', block: cfg.block });
    }
  }

  return { player: next, enemy: nextEnemy, logs };
}

/** Cap dégâts entrants (keystone intangible). */
export function applyIncomingTalentCap(damage, effectCodes = []) {
  const codes = new Set(effectCodes || []);
  if (!codes.has('intangible')) return damage;
  const cap = TALENT_EFFECT_MVP.intangible.incomingCap;
  return Math.min(Number(damage) || 0, cap);
}

/**
 * Ajuste un payload de statut Genjutsu selon illusion_master / phantom_sovereign / fear_seed.
 * @returns {{ payload, player, enemy, logs }}
 */
export function applyTalentToStatusPayload({
  payload,
  card,
  player,
  enemy,
  effectCodes = [],
  target = 'enemy',
}) {
  const logs = [];
  const codes = new Set(effectCodes || []);
  const nextPayload = { ...payload };
  let nextPlayer = player;
  let nextEnemy = enemy;

  const isGenCard = card?.statType === 'genjutsu';
  const isDebuff = isGenjutsuDebuffKey(nextPayload.key);

  if (isGenCard && isDebuff && target === 'enemy') {
    if (codes.has('illusion_master')) {
      const d = TALENT_EFFECT_MVP.illusion_master.durationDelta;
      if (nextPayload.duration != null) {
        nextPayload.duration = (Number(nextPayload.duration) || 0) + d;
      }
      logs.push({ type: 'talent', effect: 'illusion_master', durationDelta: d });
    }
    if (codes.has('phantom_sovereign')) {
      nextPayload.value =
        (Number(nextPayload.value) || 0) + TALENT_EFFECT_MVP.phantom_sovereign.valueDelta;
      logs.push({
        type: 'talent',
        effect: 'phantom_sovereign',
        valueDelta: TALENT_EFFECT_MVP.phantom_sovereign.valueDelta,
      });
    }
    if (codes.has('fear_seed') && !player.fearSeedUsed) {
      const cfg = TALENT_EFFECT_MVP.fear_seed;
      nextEnemy = {
        ...nextEnemy,
        statuses: applyStatus(nextEnemy?.statuses || [], {
          key: 'force',
          value: cfg.force,
          duration: cfg.duration,
        }),
      };
      nextPlayer = { ...nextPlayer, fearSeedUsed: true };
      logs.push({ type: 'talent', effect: 'fear_seed', force: cfg.force, duration: cfg.duration });
    }
  }

  return { payload: nextPayload, player: nextPlayer, enemy: nextEnemy, logs };
}

/**
 * Post-soin : blood_bond, vital_overflow.
 * @returns {{ player, logs }}
 */
export function applyTalentAfterHeal(
  player,
  effectCodes = [],
  { healAttempted = 0, healApplied = 0 } = {},
) {
  const logs = [];
  const codes = new Set(effectCodes || []);
  const next = { ...player };

  if (codes.has('blood_bond') && healApplied > 0) {
    const cfg = TALENT_EFFECT_MVP.blood_bond;
    const used = Number(next.bloodBondUsed) || 0;
    if (used < cfg.maxPerCombat) {
      next.block = (Number(next.block) || 0) + cfg.block;
      next.bloodBondUsed = used + 1;
      logs.push({ type: 'talent', effect: 'blood_bond', block: cfg.block });
    }
  }

  if (codes.has('vital_overflow') && healAttempted > healApplied) {
    const over = healAttempted - healApplied;
    const cfg = TALENT_EFFECT_MVP.vital_overflow;
    const convert = Math.min(cfg.maxBlock, Math.floor(over * cfg.ratio));
    if (convert > 0) {
      next.block = (Number(next.block) || 0) + convert;
      logs.push({ type: 'talent', effect: 'vital_overflow', block: convert, overheal: over });
    }
  }

  return { player: next, logs };
}

/**
 * mind_trap / veil_thick / phantom_step hooks côté intention ennemie.
 */
export function applyTalentIncomingAttackMods(damage, player, enemy, effectCodes = []) {
  const codes = new Set(effectCodes || []);
  let dmg = Number(damage) || 0;
  let evadeBonus = 0;

  if (codes.has('mind_trap')) {
    const cfg = TALENT_EFFECT_MVP.mind_trap;
    if (dmg >= cfg.minDamage) dmg = Math.max(1, dmg - cfg.cut);
  }

  if (codes.has('confusion_tax') && enemyHasGenjutsuDebuff(enemy)) {
    dmg = Math.max(1, dmg - TALENT_EFFECT_MVP.confusion_tax.cut);
  }

  if (codes.has('veil_thick') && enemyHasGenjutsuDebuff(enemy)) {
    evadeBonus += TALENT_EFFECT_MVP.veil_thick.evadeBonus;
  }

  return { damage: dmg, evadeBonus };
}

/** Destination pile après jeu (item_master). */
export function resolveCardPileDestination(card, effectCodes = []) {
  const codes = new Set(effectCodes || []);
  if (codes.has('item_master') && card?.type === 'item') return 'discard';
  if (card?.exhaust || card?.type === 'summon') return 'exhaust';
  return 'discard';
}

/** Compte les éléments uniques dans un deck runtime. */
export function countDeckElements(cards = []) {
  const set = new Set();
  for (const c of cards || []) {
    if (c?.element) set.add(c.element);
  }
  return set.size;
}

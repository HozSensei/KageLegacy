/**
 * Application des effect_code talents (keystones / notables) en combat.
 *
 * Appliqués :
 *   iron_guard, boosted_regen, berserker,
 *   immortal, overload, intangible, combo_master, blade_swift,
 *   elemental_mastery, elemental_fusion, shadow_feint, perfect_tank
 */
import { TALENT_EFFECT_MVP } from './constants.js';
import { applyStatus } from './statuses.js';

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

/**
 * Mods de dégâts / coût dérivés des talents pour une carte donnée.
 * Recalculés à chaque carte.
 */
export function computeTalentDamageMods(effectCodes, player, card = null) {
  const mods = {
    damageMult: 1,
    damageFlat: 0,
    costDelta: 0,
    healMult: 1,
    blockAllowed: true,
    incomingDamageCap: null,
    denyAttack: false,
  };
  const codes = new Set(effectCodes || []);

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

  if (card && codes.has('overload') && card.statType === 'ninjutsu') {
    const cfg = TALENT_EFFECT_MVP.overload;
    mods.costDelta += cfg.costDelta;
    mods.damageMult *= cfg.damageMult;
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

  return mods;
}

/**
 * Effets passifs début de tour joueur.
 * @returns {{ player, logs }}
 */
export function applyTalentStartOfTurn(player, effectCodes = []) {
  const logs = [];
  const next = {
    ...player,
    taijutsuPlayedThisTurn: 0,
    genjutsuPlayedThisTurn: 0,
    elementsPlayedThisTurn: [],
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

  return { player: next, logs };
}

/**
 * Après une carte jouée : combo_master, elemental_fusion, compteurs de tour.
 * @returns {{ player, logs, extraDraw }}
 */
export function applyTalentAfterCardPlay(player, card, effectCodes = []) {
  const logs = [];
  let next = { ...player };
  const codes = new Set(effectCodes || []);
  let extraDraw = 0;

  if (card?.statType === 'taijutsu') {
    next.taijutsuPlayedThisTurn = (Number(next.taijutsuPlayedThisTurn) || 0) + 1;
  }
  if (card?.statType === 'genjutsu') {
    next.genjutsuPlayedThisTurn = (Number(next.genjutsuPlayedThisTurn) || 0) + 1;
  }

  if (card?.element) {
    const prev = Array.isArray(next.elementsPlayedThisTurn)
      ? [...next.elementsPlayedThisTurn]
      : [];
    prev.push(card.element);
    next.elementsPlayedThisTurn = prev;
  }

  if (codes.has('combo_master') && card?.statType === 'taijutsu') {
    const cfg = TALENT_EFFECT_MVP.combo_master;
    if ((Number(next.taijutsuPlayedThisTurn) || 0) === cfg.cardsNeeded) {
      next.statuses = applyStatus(next.statuses || [], {
        key: 'force',
        value: cfg.force,
        duration: cfg.duration,
      });
      logs.push({
        type: 'talent',
        effect: 'combo_master',
        force: cfg.force,
        duration: cfg.duration,
      });
    }
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

  return { player: next, logs, extraDraw };
}

/**
 * perfect_tank : 1×/combat si PV < 30 % après dégâts.
 */
export function applyTalentAfterDamageTaken(player, effectCodes = []) {
  const logs = [];
  const codes = new Set(effectCodes || []);
  if (!codes.has('perfect_tank') || player.perfectTankUsed) {
    return { player, logs };
  }

  const cfg = TALENT_EFFECT_MVP.perfect_tank;
  const ratio = (Number(player.hp) || 0) / Math.max(1, Number(player.maxHp) || 1);
  if (ratio < cfg.threshold && (Number(player.hp) || 0) > 0) {
    const next = {
      ...player,
      block: (Number(player.block) || 0) + cfg.block,
      perfectTankUsed: true,
    };
    logs.push({ type: 'talent', effect: 'perfect_tank', block: cfg.block });
    return { player: next, logs };
  }

  return { player, logs };
}

/** Cap dégâts entrants (keystone intangible). */
export function applyIncomingTalentCap(damage, effectCodes = []) {
  const codes = new Set(effectCodes || []);
  if (!codes.has('intangible')) return damage;
  const cap = TALENT_EFFECT_MVP.intangible.incomingCap;
  return Math.min(Number(damage) || 0, cap);
}

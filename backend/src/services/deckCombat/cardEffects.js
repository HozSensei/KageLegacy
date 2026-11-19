/**
 * Résolution des effets de cartes — module pur.
 */
import {
  getStatusValue,
  hasStatus,
  outgoingBlockMultiplier,
  outgoingDamageMultiplier,
  outgoingHealMultiplier,
  rollCrit,
  scaleBlock,
  scaleDamage,
  scaleHeal,
  applyDamageThroughBlock,
} from './formulas.js';
import { elementMultiplier, typeAdvantageMultiplier } from './typeAdvantage.js';
import { applyStatus, PLAYER_DEBUFF_KEYS } from './statuses.js';
import { drawCards } from './deckRuntime.js';
import { applyTalentAfterHeal, applyTalentToStatusPayload } from './talentEffects.js';
import { canApplyStatus, hitEnemy } from './bossPhases.js';
import { getNextIntent } from './enemyIntent.js';
import { resolveCardCritChance, resolveScalingStat } from './combatArts.js';
import { heldEffectMods } from './heldEffects.js';

/** Multiplicateur « zone » → gros dégâts mono-cible (PvE 1 ennemi). */
export const AOE_DAMAGE_MULT = 1.35;

export { PLAYER_DEBUFF_KEYS };

const COMBO_STAT_TYPES = new Set(['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']);

// Combo conditions always inspect the immediately preceding card in this turn.
function matchesPreviousCard(effect, previousCardStatType) {
  return (
    (effect.condition === 'previous_card_stat_type' || effect.type === 'combo_previous') &&
    COMBO_STAT_TYPES.has(effect.statType) &&
    effect.statType === previousCardStatType
  );
}

function comboValue(card, previousCardStatType, key) {
  return (card.effects || []).reduce((total, effect) => {
    if (!matchesPreviousCard(effect, previousCardStatType)) return total;
    return total + Math.max(0, Number(effect[key]) || 0);
  }, 0);
}

function attackStatFor(card, stats) {
  return resolveScalingStat(card.statType || 'taijutsu', stats);
}

export function effectiveCardCost(card, talentMods = {}, player = {}) {
  const baseCost = Math.max(0, (Number(card.cost) || 0) + (Number(talentMods.costDelta) || 0));
  const reduction = Math.max(0, Number(player.nextCardCostReduction) || 0);
  return {
    baseCost,
    reduction: Math.min(baseCost, reduction),
    cost: Math.max(0, baseCost - reduction),
  };
}

/**
 * Calcule les dégâts bruts d'une carte d'attaque (avant armure).
 */
export function computeCardDamage(card, ctx) {
  const {
    stats = {},
    playerStatuses = [],
    enemyStatuses = [],
    enemyPosture = null,
    enemyAffinity = null,
    talentMods = {},
    cardsPlayedThisTurn = 0,
    previousCardStatType = null,
    rng = Math.random,
  } = ctx;

  if (talentMods.denyAttack) {
    return { perHit: 0, hits: 0, total: 0, isCrit: false, chance: 0, denied: true };
  }

  let base = Number(card.damage) || 0;
  base += Number(talentMods.damageFlat) || 0;

  const hitsEffect = (card.effects || []).find(e => e.type === 'multi_strike');
  const hits = hitsEffect ? Math.max(1, Number(hitsEffect.hits) || 1) : 1;

  const conditionalBonus = (card.effects || []).find(effect => {
    if (effect.type !== 'bonus_if') return false;
    if (effect.condition === 'enemy_vulnerable') return hasStatus(enemyStatuses, 'vulnerable');
    if (effect.condition === 'enemy_weak') return hasStatus(enemyStatuses, 'weak');
    if (effect.condition === 'first_card') return Number(cardsPlayedThisTurn) === 0;
    return false;
  });
  if (conditionalBonus) base += Number(conditionalBonus.value) || 0;
  for (const effect of card.effects || []) {
    if (matchesPreviousCard(effect, previousCardStatType)) {
      if (effect.type === 'bonus_if') base += Number(effect.value) || 0;
      if (effect.type === 'combo_previous') base += Math.max(0, Number(effect.damage) || 0);
    }
  }

  let perHit = scaleDamage(base, attackStatFor(card, stats));
  perHit = Math.round(perHit * (1 + heldEffectMods(ctx.player, card).artDamagePct));
  // Flat Force (talents / ennemis) — les cartes soutien utilisent *_pct
  perHit += getStatusValue(playerStatuses, 'force');

  perHit = Math.round(
    perHit *
      typeAdvantageMultiplier(card.statType, enemyPosture) *
      elementMultiplier(card.element, enemyAffinity) *
      outgoingDamageMultiplier(playerStatuses, { statType: card.statType }),
  );

  if (talentMods.damageMult) {
    perHit = Math.round(perHit * talentMods.damageMult);
  }

  const aoeEffect = (card.effects || []).find(e => e.type === 'aoe');
  if (aoeEffect) {
    const mult = Number(aoeEffect.mult) > 0 ? Number(aoeEffect.mult) : AOE_DAMAGE_MULT;
    perHit = Math.round(perHit * mult);
  }

  const crit = rollCrit(resolveCardCritChance(card), rng);
  if (crit.isCrit) perHit = Math.round(perHit * crit.mult);

  let incomingMult = 1;
  if (hasStatus(enemyStatuses, 'vulnerable')) incomingMult *= 1.5;
  if (hasStatus(enemyStatuses, 'intangible')) {
    return { perHit: 1, hits: 1, total: 1, isCrit: crit.isCrit, chance: crit.chance };
  }

  perHit = Math.round(perHit * incomingMult);
  return { perHit, hits, total: perHit * hits, isCrit: crit.isCrit, chance: crit.chance };
}

export function computeCardBlock(card, stats, playerStatuses = [], talentMods = {}) {
  if (talentMods.blockAllowed === false) return 0;
  const scalingStat =
    card.statType === 'common' ? resolveScalingStat('common', stats) : Number(stats.medicine) || 0;
  let block = scaleBlock(Number(card.block) || 0, scalingStat);

  block += getStatusValue(playerStatuses, 'dexterity');
  block += Number(talentMods.blockFlat) || 0;
  const talentMult = Number(talentMods.blockMult) || 1;
  const statusMult = outgoingBlockMultiplier(playerStatuses);
  return Math.max(0, Math.round(block * talentMult * statusMult));
}

export function computeCardHeal(
  card,
  stats = {},
  talentMods = {},
  playerStatuses = [],
  comboHeal = 0,
) {
  const scalingStat =
    card.statType === 'common' ? resolveScalingStat('common', stats) : Number(stats.medicine) || 0;
  const base = scaleHeal(Number(card.heal) || 0, scalingStat);
  const flat = Number(talentMods.healFlat) || 0;
  const talentMult = Number(talentMods.healMult) || 1;
  const statusMult = outgoingHealMultiplier(playerStatuses);
  const heal = (base + flat) * talentMult * statusMult;
  const heldHealPct = Number(talentMods.heldHealPct) || 0;
  return heldHealPct
    ? Math.round((heal + comboHeal) * (1 + heldHealPct))
    : Math.round(heal) + comboHeal;
}

/**
 * Applique une carte jouée.
 * @returns {{ player, enemy, logs, chakraSpent }}
 */
export function applyCardPlay({
  player,
  enemy,
  card,
  stats,
  talentMods = {},
  talentCodes = [],
  incomingDamageModifier = null,
  rng = Math.random,
}) {
  const logs = [];
  let nextPlayer = { ...player, statuses: [...(player.statuses || [])] };
  let nextEnemy = { ...enemy, statuses: [...(enemy.statuses || [])] };

  if (talentMods.denyNonItem && card.type !== 'item') {
    const err = new Error('Maître des Objets : seules les cartes Objet sont jouables.');
    err.statusCode = 400;
    throw err;
  }

  const costDetails = effectiveCardCost(card, talentMods, nextPlayer);
  const cost = costDetails.cost;

  if ((Number(nextPlayer.chakra) || 0) < cost) {
    const err = new Error('Pas assez de Chakra.');
    err.statusCode = 400;
    throw err;
  }
  nextPlayer.chakra = (Number(nextPlayer.chakra) || 0) - cost;
  if ((Number(nextPlayer.nextCardCostReduction) || 0) > 0) {
    logs.push({
      type: 'next_card_cost_reduction',
      available: Number(nextPlayer.nextCardCostReduction) || 0,
      applied: costDetails.reduction,
      cost: costDetails.cost,
      baseCost: costDetails.baseCost,
    });
    nextPlayer.nextCardCostReduction = 0;
  }

  // Invocation (1 allié max)
  if (card.type === 'summon' || card.summon) {
    const def = card.summon || {};
    const hp = Math.max(1, Number(def.hp) || 20);
    nextPlayer.ally = {
      nameFr: def.nameFr || def.name || card.nameFr || 'Allié',
      nameEn: def.nameEn || def.name || card.nameEn || 'Ally',
      hp,
      maxHp: hp,
      attack: Math.max(0, Number(def.attack) || 6),
      taunt: Boolean(def.taunt ?? def.ability?.toLowerCase?.().includes('taunt')),
    };
    logs.push({
      type: 'summon',
      name: nextPlayer.ally.nameFr,
      hp: nextPlayer.ally.hp,
      attack: nextPlayer.ally.attack,
    });
  }

  // Dégâts
  const wantsAttack =
    (Number(card.damage) || 0) > 0 || (card.effects || []).some(e => e.type === 'multi_strike');

  if (wantsAttack) {
    const dmg = computeCardDamage(card, {
      stats,
      playerStatuses: nextPlayer.statuses,
      enemyStatuses: nextEnemy.statuses,
      enemyPosture: nextEnemy.posture,
      enemyAffinity: nextEnemy.elementAffinity,
      talentMods,
      cardsPlayedThisTurn: Number(nextPlayer.cardsPlayedThisTurn) || 0,
      previousCardStatType: nextPlayer.previousCardStatType,
      player: nextPlayer,
      rng,
    });

    if (dmg.denied) {
      logs.push({ type: 'attack_denied', reason: 'intangible_keystone', card: card.slug });
    } else {
      const armorIgnore = Number(talentMods.armorIgnore) || 0;
      let totalDealt = 0;
      const hitOpts = {
        armorIgnore,
        announceIntent: e => getNextIntent(e),
      };
      const phaseLogTypes = new Set([
        'boss_phase',
        'shield_break',
        'barrier_absorb',
        'minion_damage',
        'phase_buff',
        'phase_barrier',
        'phase_immunities',
        'shield_break_vulnerable',
        'intent',
      ]);
      for (let i = 0; i < dmg.hits; i += 1) {
        const rawHit =
          typeof incomingDamageModifier === 'function'
            ? incomingDamageModifier(dmg.perHit, i)
            : dmg.perHit;
        const hit = hitEnemy(nextEnemy, rawHit, hitOpts, applyDamageThroughBlock);
        nextEnemy = hit.enemy;
        totalDealt += hit.damageDealt;
        logs.push(...hit.logs.filter(l => phaseLogTypes.has(l.type)));
      }
      logs.push({
        type: 'damage',
        source: 'player',
        card: card.slug,
        amount: totalDealt,
        hits: dmg.hits,
        isCrit: dmg.isCrit,
        enemyHp: nextEnemy.hp,
        enemyBlock: nextEnemy.block,
        enemyBarrier: nextEnemy.barrier || 0,
      });

      // echo_cast : rejoue à X % des dégâts (1 hit)
      const echoMult = Number(talentMods.echoReplayMult) || 0;
      if (echoMult > 0 && dmg.perHit > 0) {
        const echoDmg = Math.max(1, Math.round(dmg.perHit * echoMult));
        const echo = hitEnemy(nextEnemy, echoDmg, hitOpts, applyDamageThroughBlock);
        nextEnemy = echo.enemy;
        logs.push({
          type: 'talent',
          effect: 'echo_cast',
          amount: echo.damageDealt,
          enemyHp: nextEnemy.hp,
        });
        logs.push(...echo.logs.filter(l => l.type === 'boss_phase' || l.type === 'shield_break'));
      }
    }
  }

  // Armure
  if ((Number(card.block) || 0) > 0) {
    const blockGain =
      computeCardBlock(card, stats, nextPlayer.statuses, talentMods) +
      comboValue(card, nextPlayer.previousCardStatType, 'block');
    if (blockGain > 0) {
      nextPlayer.block = (Number(nextPlayer.block) || 0) + blockGain;
      logs.push({ type: 'block', source: 'player', amount: blockGain, block: nextPlayer.block });
    } else if (talentMods.blockAllowed === false) {
      logs.push({ type: 'block_denied', reason: 'talent' });
    }
  }

  // Soin
  if ((Number(card.heal) || 0) > 0) {
    const healAmt = computeCardHeal(
      card,
      stats,
      { ...talentMods, heldHealPct: heldEffectMods(nextPlayer, card).healPct },
      nextPlayer.statuses,
      comboValue(card, nextPlayer.previousCardStatType, 'heal'),
    );
    const before = nextPlayer.hp;
    nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + healAmt);
    const applied = nextPlayer.hp - before;
    logs.push({ type: 'heal', amount: applied, hp: nextPlayer.hp });
    const healTalent = applyTalentAfterHeal(nextPlayer, talentCodes, {
      healAttempted: healAmt,
      healApplied: applied,
    });
    nextPlayer = healTalent.player;
    logs.push(...healTalent.logs);
  }

  // Effets additionnels
  for (const effect of card.effects || []) {
    const applied = applyExtraEffect(effect, {
      player: nextPlayer,
      enemy: nextEnemy,
      card,
      stats,
      talentCodes,
      talentMods,
      rng,
    });
    nextPlayer = applied.player;
    nextEnemy = applied.enemy;
    logs.push(...applied.logs);
  }

  return { player: nextPlayer, enemy: nextEnemy, logs, chakraSpent: cost };
}

/**
 * Attaque automatique de l'allié invoqué (début de tour joueur).
 */
export function resolveAllyAttack(player, enemy) {
  const logs = [];
  if (!player.ally || (player.ally.hp || 0) <= 0) {
    return { player, enemy, logs };
  }
  const atk = Number(player.ally.attack) || 0;
  if (atk <= 0) return { player, enemy, logs };

  const hit = hitEnemy(
    enemy,
    atk,
    { announceIntent: e => getNextIntent(e) },
    applyDamageThroughBlock,
  );
  logs.push({
    type: 'ally_attack',
    name: player.ally.nameFr || player.ally.nameEn,
    amount: hit.damageDealt,
    enemyHp: hit.enemy.hp,
  });
  logs.push(
    ...hit.logs.filter(
      l => l.type === 'boss_phase' || l.type === 'shield_break' || l.type === 'minion_damage',
    ),
  );
  return { player, enemy: hit.enemy, logs };
}

function applyExtraEffect(effect, ctx) {
  let { player, enemy } = ctx;
  const logs = [];
  const type = effect?.type;
  const talentCodes = ctx.talentCodes || [];

  if (
    effect?.condition === 'previous_card_stat_type' &&
    !matchesPreviousCard(effect, player.previousCardStatType)
  ) {
    return { player, enemy, logs };
  }

  if (
    (type === 'draw' || type === 'gain_energy' || type === 'gain_chakra') &&
    effect.condition != null &&
    !matchesPreviousCard(effect, player.previousCardStatType)
  ) {
    return { player, enemy, logs };
  }

  if (type === 'combo_previous') {
    if (matchesPreviousCard(effect, player.previousCardStatType)) {
      logs.push({
        type: 'card_combo',
        statType: effect.statType,
        damage: Number(effect.damage) || 0,
        heal: Number(effect.heal) || 0,
        block: Number(effect.block) || 0,
        draw: Number(effect.draw) || 0,
        chakra: Number(effect.chakra) || 0,
        costReduction: Number(effect.costReduction) || 0,
        statusValue: Number(effect.statusValue) || 0,
        card: ctx.card?.slug,
      });
      const count = Math.max(0, Math.floor(Number(effect.draw) || 0));
      const chakra = Math.max(0, Number(effect.chakra) || 0);
      const costReduction = Math.max(0, Math.floor(Number(effect.costReduction) || 0));
      if (count > 0) {
        const drawn = drawCards(player, count, ctx.rng, { playingInstanceId: ctx.card.instanceId });
        player = drawn.player;
        logs.push({ type: 'draw', count: drawn.drawn.length, instanceIds: drawn.drawn });
      }
      if (chakra > 0) {
        player = { ...player, chakra: (Number(player.chakra) || 0) + chakra };
        logs.push({ type: 'gain_chakra', amount: chakra, chakra: player.chakra });
      }
      if (costReduction > 0) {
        player = {
          ...player,
          nextCardCostReduction: (Number(player.nextCardCostReduction) || 0) + costReduction,
        };
        logs.push({ type: 'next_card_cost_ready', amount: costReduction });
      }
    }
  } else if (type === 'reduce_next_card_cost') {
    const amount = Math.max(0, Math.floor(Number(effect.value) || 0));
    if (amount > 0) {
      player = {
        ...player,
        nextCardCostReduction: (Number(player.nextCardCostReduction) || 0) + amount,
      };
      logs.push({ type: 'next_card_cost_ready', amount });
    }
  } else if (type === 'draw') {
    const drawn = drawCards(player, Number(effect.value) || 1, ctx.rng, {
      playingInstanceId: ctx.card.instanceId,
    });
    player = drawn.player;
    logs.push({ type: 'draw', count: drawn.drawn.length, instanceIds: drawn.drawn });
  } else if (type === 'gain_energy' || type === 'gain_chakra') {
    player = { ...player, chakra: (Number(player.chakra) || 0) + (Number(effect.value) || 0) };
    logs.push({ type: 'gain_chakra', amount: Number(effect.value) || 0, chakra: player.chakra });
  } else if (type === 'gain_block') {
    const raw =
      Math.max(0, Number(effect.value) || 0) +
      ((Number(ctx.card?.block) || 0) === 0
        ? comboValue(ctx.card, player.previousCardStatType, 'block')
        : 0);
    const scalingStat =
      ctx.card?.statType === 'common'
        ? resolveScalingStat('common', ctx.stats)
        : Number(ctx.stats?.medicine) || 0;
    const scaled = scaleBlock(raw, scalingStat);
    const talentFlat = Number(ctx.talentMods?.blockFlat) || 0;
    const withDex = scaled + getStatusValue(player.statuses, 'dexterity') + talentFlat;
    const blockGain = Math.max(0, Math.round(withDex * outgoingBlockMultiplier(player.statuses)));
    if (blockGain > 0) {
      player = { ...player, block: (Number(player.block) || 0) + blockGain };
      logs.push({ type: 'block', source: 'player', amount: blockGain, block: player.block });
    }
  } else if (type === 'apply_status') {
    const target =
      effect.target === 'self'
        ? 'player'
        : effect.target === 'enemy'
          ? 'enemy'
          : guessStatusTarget(effect.status);
    const statusKey = normalizeStatusKey(effect.status);
    let payload = {
      key: statusKey,
      value:
        (Number(effect.value) || 1) +
        (effect === (ctx.card?.effects || []).find(item => item.type === 'apply_status')
          ? comboValue(ctx.card, player.previousCardStatType, 'statusValue')
          : 0),
      duration: effect.duration != null ? Number(effect.duration) : Number(effect.value) || 1,
    };
    const talentStatus = applyTalentToStatusPayload({
      payload,
      card: ctx.card,
      player,
      enemy,
      effectCodes: talentCodes,
      target,
    });
    payload = talentStatus.payload;
    player = talentStatus.player;
    enemy = talentStatus.enemy;
    logs.push(...talentStatus.logs);
    if (target === 'player') {
      player = { ...player, statuses: applyStatus(player.statuses, payload) };
      logs.push({ type: 'apply_status', target, status: payload });
    } else if (!canApplyStatus(enemy, payload.key)) {
      logs.push({ type: 'status_immune', target: 'enemy', status: payload.key });
    } else {
      enemy = { ...enemy, statuses: applyStatus(enemy.statuses, payload) };
      logs.push({ type: 'apply_status', target, status: payload });
    }
  } else if (type === 'evade_next') {
    player = {
      ...player,
      statuses: applyStatus(player.statuses, {
        key: 'evade',
        value: Number(effect.chance) || 0.5,
        duration: null,
      }),
    };
    logs.push({ type: 'evade_ready', chance: Number(effect.chance) || 0.5 });
  } else if (type === 'counter') {
    player = {
      ...player,
      statuses: applyStatus(player.statuses, {
        key: 'counter',
        value: Number(effect.damage) || 0,
        duration: null,
      }),
    };
    logs.push({ type: 'counter_ready', damage: Number(effect.damage) || 0 });
  } else if (type === 'multi_strike' || type === 'bonus_if' || type === 'aoe') {
    // multi_strike / bonus_if / aoe : déjà traités dans computeCardDamage
  } else if (type === 'heal_self' || type === 'heal') {
    const healAmt = computeCardHeal(
      { statType: ctx.card.statType, heal: effect.value },
      ctx.stats,
      { ...ctx.talentMods, heldHealPct: heldEffectMods(player, ctx.card).healPct },
      player.statuses,
    );
    if (healAmt > 0) {
      const before = player.hp;
      const nextHp = Math.min(Number(player.maxHp) || before, (Number(player.hp) || 0) + healAmt);
      const applied = nextHp - before;
      player = { ...player, hp: nextHp };
      logs.push({ type: 'heal', amount: applied, hp: player.hp, source: 'heal_self' });
      const healTalent = applyTalentAfterHeal(player, talentCodes, {
        healAttempted: healAmt,
        healApplied: applied,
      });
      player = healTalent.player;
      logs.push(...healTalent.logs);
    }
  } else if (type === 'cleanse_self') {
    const idx = (player.statuses || []).findIndex(s => PLAYER_DEBUFF_KEYS.has(s.key));
    if (idx >= 0) {
      const removed = player.statuses[idx];
      player = {
        ...player,
        statuses: player.statuses.filter((_, i) => i !== idx),
      };
      logs.push({ type: 'cleanse', removed: removed.key });
    } else {
      logs.push({ type: 'cleanse', removed: null });
    }
  } else if (type === 'exile_enemy_card' || type === 'seal_intent') {
    const previous = enemy.intent ? { ...enemy.intent } : null;
    enemy = {
      ...enemy,
      intent: { type: 'sealed', sealed: true },
    };
    logs.push({
      type: 'intent_sealed',
      previousType: previous?.type || null,
    });
  } else {
    logs.push({ type: 'stub_effect', effect: type || 'unknown' });
  }

  return { player, enemy, logs };
}

function guessStatusTarget(status) {
  const selfKeys = new Set([
    'force',
    'dexterity',
    'regen',
    'intangible',
    'speed',
    'damage_pct',
    'block_pct',
    'heal_pct',
    'taijutsu_pct',
    'ninjutsu_pct',
    'genjutsu_pct',
  ]);
  return selfKeys.has(normalizeStatusKey(status)) ? 'player' : 'enemy';
}

function normalizeStatusKey(status) {
  const map = {
    burn: 'burn',
    brûlure: 'burn',
    poison: 'poison',
    weak: 'weak',
    faiblesse: 'weak',
    vulnerable: 'vulnerable',
    vulnérabilité: 'vulnerable',
    force: 'force',
    strength: 'force',
    dexterity: 'dexterity',
    regen: 'regen',
    regeneration: 'regen',
    damage_pct: 'damage_pct',
    block_pct: 'block_pct',
    heal_pct: 'heal_pct',
    taijutsu_pct: 'taijutsu_pct',
    ninjutsu_pct: 'ninjutsu_pct',
    genjutsu_pct: 'genjutsu_pct',
  };
  return map[String(status || '').toLowerCase()] || String(status || 'unknown');
}

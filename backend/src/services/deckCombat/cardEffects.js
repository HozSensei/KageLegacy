/**
 * Résolution des effets de cartes — module pur.
 */
import {
  clampDotDuration,
  computeDotIntensity,
  getStatusValue,
  hasStatus,
  isDotStatusKey,
  isDurationStackStatusKey,
  outgoingBlockMultiplier,
  outgoingDamageMultiplier,
  outgoingHealMultiplier,
  rollCrit,
  scaleBlock,
  scaleDamage,
  scaleHeal,
  applyDamageThroughBlock,
} from './formulas.js';
import { DOT_ART_BY_KEY, DOT_BY_ART, DOT_DURATION_MIN } from './constants.js';
import { elementMultiplier, typeAdvantageMultiplier } from './typeAdvantage.js';
import { applyStatus, PLAYER_DEBUFF_KEYS } from './statuses.js';
import { drawCards } from './deckRuntime.js';
import {
  applyTalentAfterHeal,
  applyTalentToStatusPayload,
  computeDotTalentFlat,
} from './talentEffects.js';
import { canApplyStatus, hitEnemy } from './bossPhases.js';
import { getNextIntent } from './enemyIntent.js';
import { resolveCardCritChance, resolveScalingStat } from './combatArts.js';
import { heldEffectMods } from './heldEffects.js';

export { PLAYER_DEBUFF_KEYS };

const COMBO_STAT_TYPES = new Set(['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']);

/** Esquive d'invocation par défaut (« occasionnelle »). */
export const SUMMON_DEFAULT_EVADE_CHANCE = 0.35;
/**
 * Brûlure d'invocation `burn` : durée seule.
 * Intensité = base moteur (DOT_BASES.burn) + scaling ninjutsu du poseur.
 */
export const SUMMON_DEFAULT_BURN = { duration: 2 };
/** Multiplicateur d'ATK pour l'invocation `strike`. */
export const SUMMON_STRIKE_ATK_MULT = 1.25;

/**
 * Lit les capacités d'invocation depuis le bloc summon (flags, abilities[], description).
 * - taunt : absorbe les dégâts à la place du joueur
 * - regen : soigne le joueur (allié utilitaire) au début de son tour
 * - evade : chance d'esquive pour le joueur tant que l'allié vit
 * - burn : applique Brûlure à chaque frappe de l'allié
 * - strike : +25 % ATK sur les frappes de l'allié
 */
export function resolveSummonTraits(def = {}) {
  const abilities = Array.isArray(def.abilities)
    ? def.abilities.map(ability => String(ability).toLowerCase())
    : [];
  const abilityText = String(def.ability || '').toLowerCase();
  const has = key => abilities.includes(key) || abilityText.includes(key);
  const desc = String(def.description || '');

  const taunt = Boolean(def.taunt ?? has('taunt'));

  let regen = Math.max(0, Math.floor(Number(def.regen) || 0));
  if (!regen && has('regen')) {
    const matched = desc.match(
      /(?:r[eé]g[eé]n[eè]?re?s?|regen(?:erates?)?|soigne(?:\s+le\s+joueur)?(?:\s+de)?|heals?(?:\s+you)?(?:\s+for)?)\s+(\d+)/i,
    );
    regen = matched ? Math.max(1, Number(matched[1]) || 0) : 2;
  }

  let evadeChance = Math.max(0, Number(def.evadeChance) || 0);
  if (!evadeChance && has('evade')) {
    evadeChance = SUMMON_DEFAULT_EVADE_CHANCE;
  }
  evadeChance = Math.min(0.75, evadeChance);

  const burn = has('burn')
    ? {
        duration: clampDotDuration(
          Number(def.burnDuration ?? def.burn?.duration) || SUMMON_DEFAULT_BURN.duration,
        ),
      }
    : null;

  return {
    taunt,
    regen,
    evadeChance,
    burn,
    strike: has('strike'),
    abilities,
  };
}

/** Bonus d'esquive fourni par une invocation vivante avec evade. */
export function allyEvadeChance(entity) {
  const ally = entity?.ally;
  if (!ally || (Number(ally.hp) || 0) <= 0) return 0;
  return Math.min(0.75, Math.max(0, Number(ally.evadeChance) || 0));
}

/** Dégâts d'attaque d'une invocation (strike = +25 % ATK). */
export function allyAttackDamage(ally) {
  const base = Math.max(0, Number(ally?.attack) || 0);
  if (base <= 0) return 0;
  if (!ally?.strike) return base;
  return Math.max(1, Math.round(base * SUMMON_STRIKE_ATK_MULT));
}

export function buildAllyFromSummon(card) {
  const def = card?.summon || {};
  const { taunt, regen, evadeChance, burn, strike } = resolveSummonTraits(def);
  const hp = Math.max(1, Number(def.hp) || 20);
  return {
    nameFr: def.nameFr || def.name || card?.nameFr || 'Allié',
    nameEn: def.nameEn || def.name || card?.nameEn || 'Ally',
    hp,
    maxHp: hp,
    attack: Math.max(0, Number(def.attack) || 6),
    taunt,
    regen,
    evadeChance,
    burn,
    strike: Boolean(strike),
  };
}

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
    nextPlayer.ally = buildAllyFromSummon(card);
    logs.push({
      type: 'summon',
      name: nextPlayer.ally.nameFr,
      hp: nextPlayer.ally.hp,
      attack: nextPlayer.ally.attack,
      taunt: Boolean(nextPlayer.ally.taunt),
      regen: Number(nextPlayer.ally.regen) || 0,
      evadeChance: Number(nextPlayer.ally.evadeChance) || 0,
      burn: nextPlayer.ally.burn || null,
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
 * Régénération d'invocation : soigne le joueur (allié utilitaire).
 */
export function applyAllyRegen(player) {
  const logs = [];
  const ally = player?.ally;
  if (!ally || (Number(ally.hp) || 0) <= 0) {
    return { player, logs };
  }
  const regen = Math.max(0, Math.floor(Number(ally.regen) || 0));
  if (regen <= 0) return { player, logs };

  const maxHp = Math.max(0, Number(player.maxHp) || 0);
  const before = Number(player.hp) || 0;
  if (maxHp <= 0 || before <= 0) return { player, logs };
  const hp = Math.min(maxHp, before + regen);
  const healed = hp - before;
  if (healed <= 0) return { player, logs };

  return {
    player: { ...player, hp },
    logs: [
      {
        type: 'ally_regen',
        name: ally.nameFr || ally.nameEn,
        value: healed,
        playerHp: hp,
      },
    ],
  };
}

/**
 * Attaque automatique de l'allié invoqué (début de tour joueur).
 * Applique d'abord la régénération d'invocation (soin joueur) si présente.
 * @param {object} [opts]
 * @param {object} [opts.stats]
 * @param {string[]} [opts.talentCodes]
 */
export function resolveAllyAttack(player, enemy, opts = {}) {
  const logs = [];
  const regenerated = applyAllyRegen(player);
  const nextPlayer = regenerated.player;
  let nextEnemy = enemy;
  logs.push(...regenerated.logs);

  if (!nextPlayer.ally || (nextPlayer.ally.hp || 0) <= 0) {
    return { player: nextPlayer, enemy: nextEnemy, logs };
  }
  const atk = allyAttackDamage(nextPlayer.ally);
  if (atk <= 0) return { player: nextPlayer, enemy: nextEnemy, logs };

  const hit = hitEnemy(
    nextEnemy,
    atk,
    { announceIntent: e => getNextIntent(e) },
    applyDamageThroughBlock,
  );
  nextEnemy = hit.enemy;
  logs.push({
    type: 'ally_attack',
    name: nextPlayer.ally.nameFr || nextPlayer.ally.nameEn,
    amount: hit.damageDealt,
    enemyHp: nextEnemy.hp,
    strike: Boolean(nextPlayer.ally.strike),
  });
  logs.push(
    ...hit.logs.filter(
      l => l.type === 'boss_phase' || l.type === 'shield_break' || l.type === 'minion_damage',
    ),
  );

  const burn = nextPlayer.ally.burn;
  if (burn && (Number(nextEnemy.hp) || 0) > 0) {
    const talentFlat = computeDotTalentFlat('burn', opts.talentCodes || []);
    const payload = {
      key: 'burn',
      value: computeDotIntensity('burn', {
        stats: opts.stats || null,
        talentFlat,
      }),
      duration: clampDotDuration(burn.duration ?? SUMMON_DEFAULT_BURN.duration),
    };
    if (canApplyStatus(nextEnemy, payload.key)) {
      nextEnemy = {
        ...nextEnemy,
        statuses: applyStatus(nextEnemy.statuses, payload),
      };
      logs.push({
        type: 'apply_status',
        target: 'enemy',
        status: payload.key,
        value: payload.value,
        duration: payload.duration,
        source: 'ally',
      });
    }
  }

  return { player: nextPlayer, enemy: nextEnemy, logs };
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
    if (isDotStatusKey(statusKey)) {
      const art = ctx.card?.statType;
      const expected = art ? DOT_BY_ART[art] : null;
      if (expected && expected !== statusKey) {
        logs.push({
          type: 'status_art_mismatch',
          status: statusKey,
          art,
          expected,
        });
        return { player, enemy, logs };
      }
      const requiredArt = DOT_ART_BY_KEY[statusKey];
      if (requiredArt && art && art !== requiredArt && art !== 'common') {
        logs.push({
          type: 'status_art_mismatch',
          status: statusKey,
          art,
          expected: requiredArt,
        });
        return { player, enemy, logs };
      }
    }
    let payload;
    const isPrimaryStatus =
      effect === (ctx.card?.effects || []).find(item => item.type === 'apply_status');
    const comboStatusBonus = isPrimaryStatus
      ? comboValue(ctx.card, player.previousCardStatType, 'statusValue')
      : 0;
    if (isDotStatusKey(statusKey)) {
      const talentFlat = computeDotTalentFlat(statusKey, talentCodes);
      payload = {
        key: statusKey,
        value: computeDotIntensity(statusKey, { stats: ctx.stats, talentFlat }) + comboStatusBonus,
        duration: clampDotDuration(effect.duration != null ? effect.duration : DOT_DURATION_MIN),
      };
    } else if (isDurationStackStatusKey(statusKey)) {
      // Faiblesse / Vulnérable : durée seule. value legacy sert de durée si duration absente.
      const baseDuration =
        effect.duration != null ? Number(effect.duration) : Number(effect.value) || 1;
      payload = {
        key: statusKey,
        value: 1,
        duration: Math.max(1, baseDuration + comboStatusBonus),
      };
    } else {
      payload = {
        key: statusKey,
        value: (Number(effect.value) || 1) + comboStatusBonus,
        duration: effect.duration != null ? Number(effect.duration) : Number(effect.value) || 1,
      };
    }
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
  } else if (type === 'multi_strike' || type === 'bonus_if') {
    // multi_strike / bonus_if : déjà traités dans computeCardDamage
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
    bleed: 'bleed',
    saignement: 'bleed',
    madness: 'madness',
    folie: 'madness',
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

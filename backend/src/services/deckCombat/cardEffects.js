/**
 * Résolution des effets de cartes — module pur.
 */
import {
  elementMultiplier,
  getStatusValue,
  hasStatus,
  outgoingDamageMultiplier,
  rollCrit,
  scaleBlock,
  scaleDamage,
  scaleHeal,
  typeAdvantageMultiplier,
} from './formulas.js';
import { applyStatus } from './statuses.js';
import { drawCards } from './deckRuntime.js';
import { applyDamageThroughBlock } from './formulas.js';

function attackStatFor(card, stats) {
  const key = card.statType || 'taijutsu';
  return Number(stats?.[key]) || 0;
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
    rng = Math.random,
  } = ctx;

  let base = Number(card.damage) || 0;
  const hitsEffect = (card.effects || []).find((e) => e.type === 'multi_strike');
  const hits = hitsEffect ? Math.max(1, Number(hitsEffect.hits) || 1) : 1;

  if ((card.effects || []).some((e) => e.type === 'bonus_if' && e.condition === 'enemy_vulnerable')) {
    if (hasStatus(enemyStatuses, 'vulnerable')) {
      const bonus = (card.effects || []).find((e) => e.type === 'bonus_if');
      base += Number(bonus?.value) || 0;
    }
  }

  let perHit = scaleDamage(base, attackStatFor(card, stats));
  perHit += getStatusValue(playerStatuses, 'force');

  perHit = Math.round(
    perHit *
      typeAdvantageMultiplier(card.statType, enemyPosture) *
      elementMultiplier(card.element, enemyAffinity) *
      outgoingDamageMultiplier(playerStatuses),
  );

  if (talentMods.damageMult) {
    perHit = Math.round(perHit * talentMods.damageMult);
  }

  const crit = rollCrit(stats.vitesse, rng);
  if (crit.isCrit) perHit = Math.round(perHit * crit.mult);

  // Vulnerable is applied on incoming side
  let incomingMult = 1;
  if (hasStatus(enemyStatuses, 'vulnerable')) incomingMult *= 1.5;
  if (hasStatus(enemyStatuses, 'intangible')) {
    return { perHit: 1, hits: 1, total: 1, isCrit: crit.isCrit, chance: crit.chance };
  }

  perHit = Math.round(perHit * incomingMult);
  return { perHit, hits, total: perHit * hits, isCrit: crit.isCrit, chance: crit.chance };
}

export function computeCardBlock(card, stats, playerStatuses = []) {
  let block = scaleBlock(Number(card.block) || 0, stats.medicine);
  block += getStatusValue(playerStatuses, 'dexterity');
  return Math.max(0, block);
}

export function computeCardHeal(card, stats) {
  return scaleHeal(Number(card.heal) || 0, stats.medicine);
}

/**
 * Applique une carte jouée.
 * @returns {{ player, enemy, logs, chakraSpent }}
 */
export function applyCardPlay({ player, enemy, card, stats, talentMods = {}, rng = Math.random }) {
  const logs = [];
  let nextPlayer = { ...player, statuses: [...(player.statuses || [])] };
  let nextEnemy = { ...enemy, statuses: [...(enemy.statuses || [])] };
  const cost = Number(card.cost) || 0;

  if ((Number(nextPlayer.chakra) || 0) < cost) {
    const err = new Error('Pas assez de Chakra.');
    err.statusCode = 400;
    throw err;
  }
  nextPlayer.chakra = (Number(nextPlayer.chakra) || 0) - cost;

  // Dégâts
  if ((Number(card.damage) || 0) > 0 || (card.effects || []).some((e) => e.type === 'multi_strike')) {
    const dmg = computeCardDamage(card, {
      stats,
      playerStatuses: nextPlayer.statuses,
      enemyStatuses: nextEnemy.statuses,
      enemyPosture: nextEnemy.posture,
      enemyAffinity: nextEnemy.elementAffinity,
      talentMods,
      rng,
    });

    let totalDealt = 0;
    for (let i = 0; i < dmg.hits; i += 1) {
      const result = applyDamageThroughBlock(nextEnemy, dmg.perHit);
      nextEnemy = { ...nextEnemy, hp: result.hp, block: result.block };
      totalDealt += result.damageDealt;
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
    });
  }

  // Armure
  if ((Number(card.block) || 0) > 0) {
    const blockGain = computeCardBlock(card, stats, nextPlayer.statuses);
    nextPlayer.block = (Number(nextPlayer.block) || 0) + blockGain;
    logs.push({ type: 'block', source: 'player', amount: blockGain, block: nextPlayer.block });
  }

  // Soin
  if ((Number(card.heal) || 0) > 0) {
    const healAmt = computeCardHeal(card, stats);
    const before = nextPlayer.hp;
    nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + healAmt);
    logs.push({ type: 'heal', amount: nextPlayer.hp - before, hp: nextPlayer.hp });
  }

  // Effets additionnels
  for (const effect of card.effects || []) {
    const applied = applyExtraEffect(effect, {
      player: nextPlayer,
      enemy: nextEnemy,
      card,
      stats,
      rng,
    });
    nextPlayer = applied.player;
    nextEnemy = applied.enemy;
    logs.push(...applied.logs);
  }

  // Counter riposte passive (stockée pour le prochain coup ennemi)
  // géré via status 'counter' value

  return { player: nextPlayer, enemy: nextEnemy, logs, chakraSpent: cost };
}

function applyExtraEffect(effect, ctx) {
  let { player, enemy } = ctx;
  const logs = [];
  const type = effect?.type;

  if (type === 'draw') {
    const drawn = drawCards(player, Number(effect.value) || 1, ctx.rng);
    player = drawn.player;
    logs.push({ type: 'draw', count: drawn.drawn.length, instanceIds: drawn.drawn });
  } else if (type === 'gain_energy' || type === 'gain_chakra') {
    player = { ...player, chakra: (Number(player.chakra) || 0) + (Number(effect.value) || 0) };
    logs.push({ type: 'gain_chakra', amount: Number(effect.value) || 0, chakra: player.chakra });
  } else if (type === 'apply_status') {
    const target = effect.target === 'self' ? 'player' : effect.target === 'enemy' ? 'enemy' : guessStatusTarget(effect.status);
    const statusKey = normalizeStatusKey(effect.status);
    const payload = {
      key: statusKey,
      value: Number(effect.value) || 1,
      duration: effect.duration != null ? Number(effect.duration) : Number(effect.value) || 1,
    };
    if (target === 'player') {
      player = { ...player, statuses: applyStatus(player.statuses, payload) };
    } else {
      enemy = { ...enemy, statuses: applyStatus(enemy.statuses, payload) };
    }
    logs.push({ type: 'apply_status', target, status: payload });
  } else if (type === 'evade_next') {
    player = {
      ...player,
      statuses: applyStatus(player.statuses, {
        key: 'evade',
        value: Number(effect.chance) || 0.5,
        duration: 1,
      }),
    };
    logs.push({ type: 'evade_ready', chance: Number(effect.chance) || 0.5 });
  } else if (type === 'counter') {
    player = {
      ...player,
      statuses: applyStatus(player.statuses, {
        key: 'counter',
        value: Number(effect.damage) || 0,
        duration: 1,
      }),
    };
    logs.push({ type: 'counter_ready', damage: Number(effect.damage) || 0 });
  } else if (type === 'multi_strike' || type === 'bonus_if') {
    // déjà traité dans computeCardDamage
  } else if (type === 'exile_enemy_card') {
    logs.push({ type: 'stub_effect', effect: type, note: 'MVP: effet ignoré' });
  } else {
    logs.push({ type: 'stub_effect', effect: type || 'unknown' });
  }

  return { player, enemy, logs };
}

function guessStatusTarget(status) {
  const selfKeys = new Set(['force', 'dexterity', 'regen', 'intangible', 'speed']);
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
  };
  return map[String(status || '').toLowerCase()] || String(status || 'unknown');
}

/**
 * IA ennemie — patterns Attack / Defend / Buff + boss phases / charge / summon / barrier.
 */
import { ENEMY_TEMPLATES } from './deckCombat/enemyTemplates.js';
import {
  applyDamageThroughBlock,
  getStatusValue,
  hasStatus,
  outgoingDamageMultiplier,
} from './deckCombat/formulas.js';
import { applyStatus } from './deckCombat/statuses.js';
import { applyTalentIncomingAttackMods } from './deckCombat/talentEffects.js';
import { TALENT_EFFECT_MVP } from './deckCombat/constants.js';
import { canApplyStatus, hitEnemy, maybeAdvanceBossPhase } from './deckCombat/bossPhases.js';
import { getNextIntent, scaleIntent } from './deckCombat/enemyIntent.js';
import { heldEffectMods } from './deckCombat/heldEffects.js';

export { getNextIntent, scaleIntent };

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * @param {string} templateId
 * @param {number} [difficulty=1] — multiplie HP / dégâts
 */
export function generateEnemyFromTemplate(templateId, difficulty = 1) {
  const template = ENEMY_TEMPLATES[templateId];
  if (!template) throw httpError(400, `Template ennemi inconnu: ${templateId}`);

  const diff = Math.max(0.5, Number(difficulty) || 1);
  const maxHp = Math.round(template.hp * diff);

  const enemy = {
    templateId: template.id,
    nameFr: template.nameFr,
    nameEn: template.nameEn,
    hp: maxHp,
    maxHp,
    block: 0,
    barrier: Math.max(0, Number(template.barrier) || 0),
    statuses: [],
    posture: template.posture,
    elementAffinity: template.elementAffinity,
    ai: template.ai,
    patterns: template.patterns || null,
    pattern: template.pattern || null,
    patternIndex: 0,
    intent: null,
    boss: Boolean(template.boss),
    rank: template.rank || null,
    phases: Array.isArray(template.phases)
      ? template.phases.map(p => ({
          ...p,
          onEnter: p.onEnter ? { ...p.onEnter } : undefined,
          pattern: Array.isArray(p.pattern) ? p.pattern.map(x => ({ ...x })) : undefined,
          patterns: Array.isArray(p.patterns)
            ? p.patterns.map(x => ({ ...x, intent: x.intent ? { ...x.intent } : x.intent }))
            : undefined,
        }))
      : null,
    phaseIndex: -1,
    phaseId: 'base',
    immunities: Array.isArray(template.immunities) ? [...template.immunities] : [],
    minion: null,
  };

  enemy.intent = getNextIntent(enemy, 1);
  return enemy;
}

/**
 * Attaque du minion ennemi (si vivant) — avant l'intention principale.
 */
function resolveEnemyMinionAttack(enemy, player, rng, talentCodes) {
  const logs = [];
  if (!enemy.minion || (enemy.minion.hp || 0) <= 0) {
    return { enemy, player, logs, damageTakenByPlayer: 0 };
  }

  let nextPlayer = { ...player, statuses: [...(player.statuses || [])] };
  let damage = Number(enemy.minion.attack) || 0;
  if (damage <= 0) return { enemy, player: nextPlayer, logs, damageTakenByPlayer: 0 };

  if (hasStatus(nextPlayer.statuses, 'vulnerable')) damage = Math.round(damage * 1.5);
  if (hasStatus(nextPlayer.statuses, 'intangible') || talentCodes.has('intangible')) {
    damage = 1;
  }

  const evadeChance = Math.min(
    1,
    getStatusValue(nextPlayer.statuses, 'evade') + heldEffectMods(nextPlayer).evadeChance
  );
  const evaded = evadeChance > 0 && rng() < evadeChance;
  if (evadeChance > 0) {
    nextPlayer.statuses = (nextPlayer.statuses || []).filter(s => s.key !== 'evade');
  }
  if (evaded) {
    logs.push({ type: 'evade', source: 'player', reason: 'minion' });
    return { enemy, player: nextPlayer, logs, damageTakenByPlayer: 0 };
  }

  const result = applyDamageThroughBlock(nextPlayer, damage);
  nextPlayer = { ...nextPlayer, hp: result.hp, block: result.block };
  logs.push({
    type: 'minion_attack',
    name: enemy.minion.nameFr || enemy.minion.nameEn,
    amount: result.damageDealt,
    playerHp: nextPlayer.hp,
  });
  return {
    enemy,
    player: nextPlayer,
    logs,
    damageTakenByPlayer: result.hpAbsorbed || 0,
  };
}

/**
 * Exécute l'intention courante de l'ennemi, puis tire la suivante.
 * @param {object} [opts]
 * @param {string[]} [opts.talentCodes] — keystones joueur (ex. intangible)
 * @returns {{ enemy, player, logs }}
 */
export function executeEnemyIntent(enemy, player, rng = Math.random, opts = {}) {
  const logs = [];
  let nextEnemy = {
    ...enemy,
    statuses: [...(enemy.statuses || [])],
    immunities: [...(enemy.immunities || [])],
  };
  let nextPlayer = { ...player, statuses: [...(player.statuses || [])] };
  const intent = nextEnemy.intent || { type: 'attack', damage: 6 };
  const talentCodes = new Set(opts.talentCodes || []);

  let damageTakenByPlayer = 0;
  let phantomStepDraw = 0;

  const minionAct = resolveEnemyMinionAttack(nextEnemy, nextPlayer, rng, talentCodes);
  nextEnemy = minionAct.enemy;
  nextPlayer = minionAct.player;
  logs.push(...minionAct.logs);
  damageTakenByPlayer += minionAct.damageTakenByPlayer || 0;

  let forceChargedIntent = null;

  if (intent.type === 'attack') {
    let damage = (Number(intent.damage) || 0) + getStatusValue(nextEnemy.statuses, 'force');
    damage = Math.round(damage * outgoingDamageMultiplier(nextEnemy.statuses));

    const incomingMods = applyTalentIncomingAttackMods(
      damage,
      nextPlayer,
      nextEnemy,
      opts.talentCodes || []
    );
    damage = incomingMods.damage;

    const evadeChance = Math.min(
      1,
      getStatusValue(nextPlayer.statuses, 'evade') +
        (Number(incomingMods.evadeBonus) || 0) +
        heldEffectMods(nextPlayer).evadeChance
    );
    const evaded = evadeChance > 0 && rng() < evadeChance;
    if (getStatusValue(nextPlayer.statuses, 'evade') > 0) {
      nextPlayer.statuses = (nextPlayer.statuses || []).filter(s => s.key !== 'evade');
    }
    if (evaded) {
      logs.push({ type: 'evade', source: 'player' });
      if (talentCodes.has('phantom_step') && !nextPlayer.phantomStepUsed) {
        phantomStepDraw = TALENT_EFFECT_MVP.phantom_step.draw;
        nextPlayer = { ...nextPlayer, phantomStepUsed: true };
        logs.push({ type: 'talent', effect: 'phantom_step', draw: phantomStepDraw });
      }
    } else {
      if (hasStatus(nextPlayer.statuses, 'vulnerable')) damage = Math.round(damage * 1.5);
      if (hasStatus(nextPlayer.statuses, 'intangible') || talentCodes.has('intangible')) {
        damage = 1;
      }

      if (nextPlayer.ally && nextPlayer.ally.taunt && (nextPlayer.ally.hp || 0) > 0) {
        const allyHp = Math.max(0, (Number(nextPlayer.ally.hp) || 0) - damage);
        const overflow = Math.max(0, damage - (Number(nextPlayer.ally.hp) || 0));
        nextPlayer = {
          ...nextPlayer,
          ally: allyHp > 0 ? { ...nextPlayer.ally, hp: allyHp } : null,
        };
        logs.push({
          type: 'ally_damage',
          amount: damage - overflow,
          allyHp: allyHp > 0 ? allyHp : 0,
          fallen: allyHp <= 0,
        });
        damage = overflow;
      }

      if (damage > 0) {
        const result = applyDamageThroughBlock(nextPlayer, damage);
        nextPlayer = { ...nextPlayer, hp: result.hp, block: result.block };
        damageTakenByPlayer += result.hpAbsorbed || 0;
        logs.push({
          type: 'damage',
          source: 'enemy',
          amount: result.damageDealt,
          playerHp: nextPlayer.hp,
          playerBlock: nextPlayer.block,
          fromCharge: Boolean(intent.fromCharge),
        });
      }

      const counter = getStatusValue(nextPlayer.statuses, 'counter');
      if (counter > 0) {
        const hit = hitEnemy(
          nextEnemy,
          counter,
          { announceIntent: e => getNextIntent(e, 0, rng) },
          applyDamageThroughBlock
        );
        nextEnemy = hit.enemy;
        logs.push({
          type: 'counter',
          amount: hit.damageDealt,
          enemyHp: nextEnemy.hp,
        });
        logs.push(
          ...hit.logs.filter(
            l => l.type === 'boss_phase' || l.type === 'shield_break' || l.type === 'barrier_absorb'
          )
        );
        nextPlayer.statuses = (nextPlayer.statuses || []).filter(s => s.key !== 'counter');
      }
    }
  } else if (intent.type === 'defend') {
    const block = Number(intent.block) || 0;
    nextEnemy.block = (Number(nextEnemy.block) || 0) + block;
    logs.push({ type: 'block', source: 'enemy', amount: block, block: nextEnemy.block });
  } else if (intent.type === 'buff') {
    nextEnemy.statuses = applyStatus(nextEnemy.statuses, {
      key: intent.status || 'force',
      value: Number(intent.value) || 1,
      duration: Number(intent.duration) || 2,
    });
    logs.push({ type: 'buff', source: 'enemy', status: intent.status, value: intent.value });
  } else if (intent.type === 'debuff') {
    const statusKey = intent.status || 'weak';
    nextPlayer.statuses = applyStatus(nextPlayer.statuses, {
      key: statusKey,
      value: Number(intent.value) || 1,
      duration: Number(intent.duration) || 2,
    });
    logs.push({ type: 'debuff', source: 'enemy', status: statusKey, value: intent.value });
  } else if (intent.type === 'charge') {
    const releaseDamage = Number(intent.releaseDamage) || Number(intent.damage) || 20;
    forceChargedIntent = scaleIntent(
      { type: 'attack', damage: releaseDamage, fromCharge: true },
      nextEnemy
    );
    logs.push({
      type: 'charge',
      source: 'enemy',
      releaseDamage,
      displayDamage: forceChargedIntent.displayDamage,
    });
  } else if (intent.type === 'summon') {
    const def = intent.minion || {};
    const hp = Math.max(1, Number(def.hp) || 24);
    nextEnemy.minion = {
      nameFr: def.nameFr || 'Ombre Liee',
      nameEn: def.nameEn || 'Bound Shade',
      hp,
      maxHp: hp,
      attack: Math.max(0, Number(def.attack) || 7),
      taunt: def.taunt !== false,
    };
    logs.push({
      type: 'enemy_summon',
      source: 'enemy',
      minion: {
        nameFr: nextEnemy.minion.nameFr,
        nameEn: nextEnemy.minion.nameEn,
        hp: nextEnemy.minion.hp,
        attack: nextEnemy.minion.attack,
      },
    });
  } else if (intent.type === 'raise_barrier') {
    const amount = Math.max(0, Number(intent.barrier) || 0);
    nextEnemy.barrier = (Number(nextEnemy.barrier) || 0) + amount;
    logs.push({
      type: 'raise_barrier',
      source: 'enemy',
      amount,
      barrier: nextEnemy.barrier,
    });
  } else if (intent.type === 'sealed' || intent.type === 'skip') {
    logs.push({ type: 'intent_skipped', reason: 'sealed' });
  }

  if (intent.status && intent.type === 'attack') {
    nextPlayer.statuses = applyStatus(nextPlayer.statuses, {
      key: intent.status,
      value: Number(intent.statusValue) || Number(intent.value) || 1,
      duration: Number(intent.statusDuration) || Number(intent.duration) || 2,
    });
    logs.push({ type: 'apply_status', target: 'player', status: intent.status });
  }

  if (nextEnemy.ai === 'pattern') {
    nextEnemy.patternIndex =
      ((Number(nextEnemy.patternIndex) || 0) + 1) % (nextEnemy.pattern?.length || 1);
  }

  if (forceChargedIntent) {
    nextEnemy.intent = forceChargedIntent;
  } else {
    const queued = opts.queuedIntent;
    nextEnemy.intent =
      queued && queued.phaseIndex === (nextEnemy.phaseIndex ?? -1)
        ? scaleIntent(queued.intent, nextEnemy)
        : getNextIntent(nextEnemy, 0, rng);
  }
  logs.push({ type: 'intent', intent: nextEnemy.intent });

  const phaseCheck = maybeAdvanceBossPhase(nextEnemy, {
    announceIntent: e => getNextIntent(e, 0, rng),
  });
  if (phaseCheck.changed) {
    nextEnemy = phaseCheck.enemy;
    logs.push(...phaseCheck.logs);
  }

  return {
    enemy: nextEnemy,
    player: nextPlayer,
    logs,
    damageTakenByPlayer,
    phantomStepDraw,
  };
}

/** Alias roadmap */
export function decideEnemyAction(enemy, player, rng = Math.random) {
  return executeEnemyIntent(enemy, player, rng);
}

export { ENEMY_TEMPLATES, canApplyStatus, hitEnemy, maybeAdvanceBossPhase };

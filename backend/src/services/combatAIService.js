/**
 * IA ennemie — patterns Attack / Defend / Buff (MVP).
 */
import { ENEMY_TEMPLATES } from './deckCombat/enemyTemplates.js';
import { applyDamageThroughBlock, getStatusValue, hasStatus } from './deckCombat/formulas.js';
import { applyStatus } from './deckCombat/statuses.js';
import { outgoingDamageMultiplier } from './deckCombat/formulas.js';

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
    statuses: [],
    posture: template.posture,
    elementAffinity: template.elementAffinity,
    ai: template.ai,
    patterns: template.patterns || null,
    pattern: template.pattern || null,
    patternIndex: 0,
    intent: null,
  };

  enemy.intent = getNextIntent(enemy, 1);
  return enemy;
}

/**
 * Choisit la prochaine intention (annoncée au joueur).
 */
export function getNextIntent(enemy, _turn = 1, rng = Math.random) {
  if (enemy.ai === 'pattern' && Array.isArray(enemy.pattern) && enemy.pattern.length) {
    const idx = Number(enemy.patternIndex) || 0;
    const intent = { ...enemy.pattern[idx % enemy.pattern.length] };
    return scaleIntent(intent, enemy);
  }

  const patterns = enemy.patterns || [];
  if (!patterns.length) {
    return { type: 'attack', damage: 6 };
  }

  const total = patterns.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
  let roll = rng() * total;
  for (const p of patterns) {
    roll -= Number(p.weight) || 0;
    if (roll <= 0) return scaleIntent({ ...p.intent }, enemy);
  }
  return scaleIntent({ ...patterns[patterns.length - 1].intent }, enemy);
}

function scaleIntent(intent, enemy) {
  // difficulty already baked into enemy via generateEnemyFromTemplate HP;
  // damage stays as template values for MVP readability
  if (intent.type === 'attack' && intent.damage != null) {
    const force = getStatusValue(enemy.statuses, 'force');
    return {
      ...intent,
      displayDamage: Math.round(
        (Number(intent.damage) + force) * outgoingDamageMultiplier(enemy.statuses),
      ),
    };
  }
  return { ...intent };
}

/**
 * Exécute l'intention courante de l'ennemi, puis tire la suivante.
 * @param {object} [opts]
 * @param {string[]} [opts.talentCodes] — keystones joueur (ex. intangible)
 * @returns {{ enemy, player, logs }}
 */
export function executeEnemyIntent(enemy, player, rng = Math.random, opts = {}) {
  const logs = [];
  let nextEnemy = { ...enemy, statuses: [...(enemy.statuses || [])] };
  let nextPlayer = { ...player, statuses: [...(player.statuses || [])] };
  const intent = nextEnemy.intent || { type: 'attack', damage: 6 };
  const talentCodes = new Set(opts.talentCodes || []);

  if (intent.type === 'attack') {
    let damage =
      (Number(intent.damage) || 0) + getStatusValue(nextEnemy.statuses, 'force');
    damage = Math.round(damage * outgoingDamageMultiplier(nextEnemy.statuses));

    // Évite ?
    const evadeChance = getStatusValue(nextPlayer.statuses, 'evade');
    if (evadeChance > 0 && rng() < evadeChance) {
      logs.push({ type: 'evade', source: 'player' });
      nextPlayer.statuses = (nextPlayer.statuses || []).filter((s) => s.key !== 'evade');
    } else {
      if (hasStatus(nextPlayer.statuses, 'vulnerable')) damage = Math.round(damage * 1.5);
      if (hasStatus(nextPlayer.statuses, 'intangible') || talentCodes.has('intangible')) {
        damage = 1;
      }

      // Allié avec taunt absorbe avant le joueur
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
        logs.push({
          type: 'damage',
          source: 'enemy',
          amount: result.damageDealt,
          playerHp: nextPlayer.hp,
          playerBlock: nextPlayer.block,
        });
      }

      // Contre-attaque
      const counter = getStatusValue(nextPlayer.statuses, 'counter');
      if (counter > 0) {
        const cResult = applyDamageThroughBlock(nextEnemy, counter);
        nextEnemy = { ...nextEnemy, hp: cResult.hp, block: cResult.block };
        logs.push({
          type: 'counter',
          amount: cResult.damageDealt,
          enemyHp: nextEnemy.hp,
        });
        nextPlayer.statuses = (nextPlayer.statuses || []).filter((s) => s.key !== 'counter');
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
    nextPlayer.statuses = applyStatus(nextPlayer.statuses, {
      key: intent.status || 'weak',
      value: Number(intent.value) || 1,
      duration: Number(intent.duration) || 2,
    });
    logs.push({ type: 'debuff', source: 'enemy', status: intent.status, value: intent.value });
  }

  // Statut attaché à une attaque (ex. burn)
  if (intent.status && intent.type === 'attack') {
    nextPlayer.statuses = applyStatus(nextPlayer.statuses, {
      key: intent.status,
      value: Number(intent.statusValue) || Number(intent.value) || 1,
      duration: Number(intent.statusDuration) || Number(intent.duration) || 2,
    });
    logs.push({ type: 'apply_status', target: 'player', status: intent.status });
  }

  // Avance pattern + nouvelle intention
  if (nextEnemy.ai === 'pattern') {
    nextEnemy.patternIndex = ((Number(nextEnemy.patternIndex) || 0) + 1) % (nextEnemy.pattern?.length || 1);
  }
  nextEnemy.intent = getNextIntent(nextEnemy, 0, rng);
  logs.push({ type: 'intent', intent: nextEnemy.intent });

  return { enemy: nextEnemy, player: nextPlayer, logs };
}

/** Alias roadmap */
export function decideEnemyAction(enemy, player, rng = Math.random) {
  return executeEnemyIntent(enemy, player, rng);
}

export { ENEMY_TEMPLATES };

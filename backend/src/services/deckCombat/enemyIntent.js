/**
 * Sélection / scaling des intentions ennemies (annoncées au joueur).
 * Module pur — extrait pour éviter les imports circulaires cardEffects ↔ combatAI.
 */
import { getStatusValue, outgoingDamageMultiplier } from './formulas.js';

export function scaleIntent(intent, enemy) {
  if (intent.type === 'attack' && intent.damage != null) {
    const force = getStatusValue(enemy.statuses, 'force');
    return {
      ...intent,
      displayDamage: Math.round(
        (Number(intent.damage) + force) * outgoingDamageMultiplier(enemy.statuses),
      ),
    };
  }
  if (intent.type === 'charge') {
    const release = Number(intent.releaseDamage) || Number(intent.damage) || 20;
    const force = getStatusValue(enemy.statuses, 'force');
    return {
      ...intent,
      releaseDamage: release,
      displayDamage: Math.round(
        (release + force) * outgoingDamageMultiplier(enemy.statuses),
      ),
    };
  }
  return { ...intent };
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

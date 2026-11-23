/**
 * Scaling ennemi pour combats de mission coopérative (plus durs que le solo).
 */
import {
  COOP_ENEMY_DAMAGE_MULT,
  COOP_ENEMY_HP_MULT,
} from '../config/coopMissionConfig.js';
import {
  generateEnemyFromTemplate,
  scaleIntentByDifficulty,
} from './combatAIService.js';

function scalePatternList(list, damageMult) {
  if (!Array.isArray(list)) return list;
  return list.map(intent => scaleIntentByDifficulty({ ...intent }, damageMult));
}

/** Applique les multiplicateurs coop HP / dégâts sur un ennemi déjà généré. */
export function applyCoopEnemyScale(enemy, {
  hpMult = COOP_ENEMY_HP_MULT,
  damageMult = COOP_ENEMY_DAMAGE_MULT,
} = {}) {
  if (!enemy) return enemy;
  const next = { ...enemy };
  const maxHp = Math.max(1, Math.round((Number(enemy.maxHp) || Number(enemy.hp) || 1) * hpMult));
  next.maxHp = maxHp;
  next.hp = maxHp;
  if (Array.isArray(enemy.pattern)) next.pattern = scalePatternList(enemy.pattern, damageMult);
  if (Array.isArray(enemy.patterns)) {
    next.patterns = enemy.patterns.map(p => ({
      ...p,
      intent: p.intent ? scaleIntentByDifficulty({ ...p.intent }, damageMult) : p.intent,
    }));
  }
  if (Array.isArray(enemy.phases)) {
    next.phases = enemy.phases.map(phase => ({
      ...phase,
      pattern: scalePatternList(phase.pattern, damageMult),
      patterns: Array.isArray(phase.patterns)
        ? phase.patterns.map(p => ({
            ...p,
            intent: p.intent ? scaleIntentByDifficulty({ ...p.intent }, damageMult) : p.intent,
          }))
        : phase.patterns,
    }));
  }
  return next;
}

/** Génère un ennemi de mission scalé pour le duo. */
export function buildCoopMissionEnemy(templateId, difficulty = 1) {
  const base = generateEnemyFromTemplate(templateId, difficulty);
  return applyCoopEnemyScale(base);
}

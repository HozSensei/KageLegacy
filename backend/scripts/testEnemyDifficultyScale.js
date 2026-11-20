/**
 * Vérifie que difficulty scale HP (doux) + offense.
 * Usage: node scripts/testEnemyDifficultyScale.js
 */
import assert from 'node:assert/strict';
import {
  difficultyHpMult,
  difficultyOffenseMult,
  generateEnemyFromTemplate,
} from '../src/services/combatAIService.js';

assert.equal(difficultyHpMult(1), 1);
assert.equal(difficultyOffenseMult(1.5), 1.5);
assert.ok(Math.abs(difficultyHpMult(2) - 1.4) < 1e-9);

const base = generateEnemyFromTemplate('ronin_bandit', 1);
const hard = generateEnemyFromTemplate('ronin_bandit', 1.5);

assert.ok(hard.maxHp > base.maxHp);
assert.ok(hard.maxHp < Math.round(base.maxHp * 1.5)); // HP softer than linear
assert.equal(hard.difficulty, 1.5);

const baseDmg = base.intent?.displayDamage ?? base.intent?.damage;
const hardDmg = hard.intent?.displayDamage ?? hard.intent?.damage;
if (base.intent?.type === 'attack' && hard.intent?.type === 'attack') {
  assert.ok(hardDmg >= Math.round(baseDmg * 1.4), `offense ${baseDmg} → ${hardDmg}`);
}

const boss = generateEnemyFromTemplate('hollow_bell_warden', 2);
assert.ok(boss.barrier > 0);
assert.ok(Array.isArray(boss.phases) && boss.phases[0]?.pattern?.[0]);

console.log('testEnemyDifficultyScale: OK');

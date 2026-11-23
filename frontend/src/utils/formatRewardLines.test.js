import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCombatSummary,
  formatGrant,
  formatGrants,
  normalizeDuelReward,
} from './formatRewardLines.js';

const t = (key, args = {}) => {
  if (key === 'combat.rewardXp') return `+${args.n} XP`;
  if (key === 'combat.rewardRyos') return `+${args.n} Ryos`;
  if (key === 'combat.rewardLevel') return `level +${args.n}`;
  if (key === 'combat.revealLootHint') return `${args.n} cards`;
  if (key === 'combat.rewardRunBonus') return `×${args.n}`;
  if (key === 'notifications.rewardPurse') return `purse +${args.n}`;
  if (key === 'notifications.rewardCard') return 'card';
  if (key === 'notifications.rewardBooster') return `booster ${args.kind}`;
  if (key === 'achievements.reward.dust') return `+${args.n} dust`;
  return key;
};

test('formatGrant maps known reward types', () => {
  assert.equal(formatGrant({ type: 'ryos', amount: 40 }, t), '+40 Ryos');
  assert.equal(formatGrant({ type: 'xp', amount: 15 }, t), '+15 XP');
  assert.equal(formatGrant({ type: 'dust', amount: 3 }, t), '+3 dust');
  assert.equal(formatGrant({ type: 'booster', boosterType: 'premium' }, t), 'booster premium');
  assert.equal(formatGrant({ type: 'ryos', amount: 0 }, t), null);
  assert.equal(formatGrant({ type: 'ryos', amount: 5, skipped: true }, t), null);
});

test('formatGrants joins non-empty grants', () => {
  assert.equal(
    formatGrants(
      [
        { type: 'ryos', amount: 30 },
        { type: 'xp', amount: 15 },
      ],
      t
    ),
    '+30 Ryos · +15 XP'
  );
  assert.equal(formatGrants([], t), '');
});

test('formatCombatSummary mirrors victory lines', () => {
  assert.equal(
    formatCombatSummary(
      {
        xp: 40,
        ryos: 100,
        leveledUp: true,
        levelsGained: 1,
        talentPointsGained: 1,
        lootCards: [{ card: { id: 1 } }],
        runMult: 1.2,
        purseReturned: 50,
      },
      t
    ),
    '+40 XP · +100 Ryos · level +1 · 1 cards · ×1.2 · purse +50'
  );
  assert.equal(formatCombatSummary({ error: true, xp: 10 }, t), '');
});

test('normalizeDuelReward accepts number or object', () => {
  assert.deepEqual(normalizeDuelReward(10), { ryos: 10 });
  assert.equal(normalizeDuelReward(0), null);
  assert.deepEqual(normalizeDuelReward({ ryos: 10, xp: 0 }), { ryos: 10, xp: 0 });
  assert.equal(normalizeDuelReward({}), null);
  assert.equal(normalizeDuelReward(null), null);
});

/**
 * Tests unitaires du flux missions coop (moteur + scaling + ready gate helpers).
 * Sans MySQL : couvre createCoopCombat avec ennemi custom, scale, revision apply.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCoopEnemyScale } from '../src/services/coopEnemyScale.js';
import {
  applyCoopAction,
  createCoopCombat,
  publicCoopCombat,
} from '../src/services/deckCombat/coopCombat.js';
import { COOP_REWARD_MULT } from '../src/config/coopMissionConfig.js';

const deck = id => [
  {
    quantity: 8,
    card: {
      slug: `strike-${id}`,
      type: 'attack',
      statType: 'taijutsu',
      cost: 1,
      damage: 4,
      effects: [],
    },
  },
];

const fighter = id => ({
  id,
  name: `P${id}`,
  rank: 'Genin',
  level: 5,
  profile: { avatarId: 'genin-1-1' },
  stats: {},
  deckEntries: deck(id),
  talentCodes: [],
});

test('createCoopCombat accepte un ennemi de mission scalé', () => {
  const enemy = applyCoopEnemyScale({
    templateId: 'ronin_bandit',
    nameFr: 'Bandit',
    nameEn: 'Bandit',
    hp: 100,
    maxHp: 100,
    block: 0,
    statuses: [],
    ai: 'pattern',
    patternIndex: 0,
    pattern: [{ type: 'attack', damage: 10 }],
  });
  assert.ok(enemy.maxHp > 100);
  assert.ok(enemy.pattern[0].damage > 10);
  const combat = createCoopCombat([fighter(1), fighter(2)], { enemy });
  assert.equal(combat.enemy.templateId, 'ronin_bandit');
  assert.equal(combat.activePlayerId, 1);
  const guestView = publicCoopCombat(combat, 2);
  assert.equal(guestView.currentPhase, 'enemy_turn');
  assert.equal(guestView.ally.id, 1);
});

test('tours async : fin de tour passe au partenaire puis ennemi', () => {
  let combat = createCoopCombat([fighter(1), fighter(2)]);
  combat = applyCoopAction(combat, 1, { type: 'end_turn' });
  assert.equal(combat.activePlayerId, 2);
  combat = applyCoopAction(combat, 2, { type: 'end_turn' });
  assert.equal(combat.activePlayerId, 1);
  assert.ok(combat.currentTurn >= 2);
});

test('forfeit termine en défaite', () => {
  let combat = createCoopCombat([fighter(1), fighter(2)]);
  combat = applyCoopAction(combat, 1, { type: 'forfeit' });
  assert.equal(combat.state, 'defeat');
});

test('COOP_REWARD_MULT est un boost > 1', () => {
  assert.ok(COOP_REWARD_MULT > 1);
});

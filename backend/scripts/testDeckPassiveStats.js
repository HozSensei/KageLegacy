import assert from 'node:assert/strict';
import { test } from 'node:test';
import pool from '../src/config/database.js';
import { applyUpgradeBonuses } from '../src/services/cardService.js';
import { startCombat } from '../src/services/combatEngineService.js';
import { BASE_MAX_HP } from '../src/services/deckCombat/constants.js';
import { getActiveDeck } from '../src/services/deckService.js';
import {
  createEmptyStats,
  getComputedStats,
  getDeckPassiveBonuses,
} from '../src/services/playerCharacterService.js';

const userId = 41;
const deck = { id: 8, user_id: userId, name: 'Passifs', is_active: 1 };
const dual = {
  slug: 'dragon-de-nuage', // Ninjutsu primaire, Taijutsu secondaire via le slug.
  type: 'attack',
  stat_type: 'ninjutsu',
  base_cost: 1,
  base_damage: 8,
  passive_bonus_json: JSON.stringify({ vitesse: 1, intelligence: 2, maxHp: 3, force: 99 }),
  upgrade_bonuses_json: {
    level_1: { passive: { vitesse: 1, maxHp: 2, startingBlock: 1 } },
    level_2: { passive: { intelligence: 1, maxHp: 4, maxChakra: 1, startingBlock: 2 } },
  },
};
const rows = [
  { ...dual, quantity: 2, upgrade_level: 2 },
  {
    slug: 'objet-de-test',
    type: 'item',
    stat_type: 'taijutsu',
    passive_bonus_json: { vitesse: 1, medecine: 3 },
    quantity: 1,
    upgrade_level: 0,
  },
  ...Array.from({ length: 6 }, (_, index) => ({
    slug: `carte-neutre-${index}`,
    type: 'skill',
    stat_type: 'taijutsu',
    quantity: 3,
    upgrade_level: 0,
  })),
].map((entry, index) => ({
  id: index + 1,
  card_definition_id: index + 1,
  rarity: 'common',
  ...entry,
}));

function mockActiveDeck(t, { selectedDeck = deck, selectedRows = rows } = {}) {
  let snapshot;
  t.mock.method(pool, 'execute', async (sql, params) => {
    if (sql.includes('information_schema.tables')) return [[{ ok: 1 }]];
    if (sql.includes('information_schema.columns')) return [[{ ok: 1 }]];
    if (sql.includes('FROM user_talents')) {
      assert.deepEqual(params, [userId]);
      return [[{ stat_bonus_json: { ninjutsu: 2, maxHp: 1 }, points_spent: 2 }]];
    }
    if (sql.includes('FROM user_decks d')) {
      assert.deepEqual(params, [userId]);
      assert.match(sql, /d\.is_active = 1/);
      // Comme MySQL, ne renvoyer que les colonnes projetées par la requête des passifs.
      const columns = sql
        .match(/SELECT\s+([\s\S]+?)\s+FROM user_decks d/)[1]
        .split(',')
        .map(column => column.trim().split('.').at(-1));
      return [rows.map(row => Object.fromEntries(columns.map(column => [column, row[column]])))];
    }
    if (sql.includes('FROM user_decks WHERE user_id = ? AND is_active = 1')) return [[deck]];
    if (sql.includes('FROM user_decks WHERE id = ? AND user_id = ?')) {
      assert.deepEqual(params, [selectedDeck.id, userId]);
      return [[selectedDeck]];
    }
    if (sql.includes('FROM user_deck_cards udc')) {
      assert.deepEqual(params, [selectedDeck.id]);
      return [selectedRows];
    }
    if (sql.includes('FROM combat_sessions')) return [[]];
    if (sql.includes('SELECT character_name FROM player_profiles'))
      return [[{ character_name: 'Test' }]];
    if (sql.includes('INSERT INTO combat_sessions')) {
      snapshot = JSON.parse(params.at(-2));
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('INSERT INTO combat_logs')) return [{ affectedRows: 1 }];
    assert.fail(`Requête inattendue : ${sql}`);
  });
  return () => snapshot;
}

const cards = {
  taijutsu: 6,
  ninjutsu: 2,
  genjutsu: 0,
  medicine: 4,
  maxHp: 14,
  maxChakra: 2,
  startingBlock: 4,
};
const total = { ...cards, ninjutsu: 6, maxHp: 16 };

test('passifs de carte : chaque amélioration est relative à la base', () => {
  assert.deepEqual(applyUpgradeBonuses(dual, 0).passiveBonus, {
    taijutsu: 2,
    ninjutsu: 1,
    maxHp: 3,
  });
  assert.deepEqual(applyUpgradeBonuses(dual, 1).passiveBonus, {
    taijutsu: 2,
    ninjutsu: 2,
    maxHp: 5,
    startingBlock: 1,
  });
  assert.deepEqual(applyUpgradeBonuses(dual, 2).passiveBonus, {
    taijutsu: 3,
    ninjutsu: 1,
    maxHp: 7,
    maxChakra: 1,
    startingBlock: 2,
  });
});

test('les stats du personnage reprennent les passifs du deck actif, avec copies et talents', async t => {
  mockActiveDeck(t);
  assert.deepEqual((await getActiveDeck(userId)).passiveBonuses, cards);
  const stats = await getComputedStats(userId);
  assert.deepEqual(stats.breakdown.cards, cards);
  assert.deepEqual(stats.total, total);
});

test('le PvE solo initialise PV, Chakra et armure et persiste les stats calculées', async t => {
  const snapshot = mockActiveDeck(t);
  const combat = await startCombat(userId);
  assert.equal(combat.deckId, deck.id);
  assert.equal(combat.player.hp, BASE_MAX_HP + total.maxHp);
  assert.equal(combat.player.maxHp, BASE_MAX_HP + total.maxHp);
  // La base du PvE solo est de 5, distincte de la constante de l'ancienne boucle.
  assert.equal(combat.player.chakra, 5 + total.maxChakra);
  assert.equal(combat.player.maxChakra, 5 + total.maxChakra);
  assert.equal(combat.player.block, total.startingBlock);
  assert.deepEqual(combat.stats, total);
  assert.deepEqual(snapshot(), total);
});

test('le PvE utilise les passifs du deck choisi même s’il est inactif', async t => {
  const selectedDeck = { ...deck, id: 21, is_active: 0 };
  const selectedRows = rows.map(row => ({
    ...row,
    passive_bonus_json: {},
    upgrade_bonuses_json: {},
  }));
  const snapshot = mockActiveDeck(t, { selectedDeck, selectedRows });
  const combat = await startCombat(userId, { deckId: selectedDeck.id });
  assert.equal(combat.deckId, selectedDeck.id);
  assert.equal(combat.player.chakra, 5);
  assert.equal(combat.player.maxHp, BASE_MAX_HP + 2);
  assert.equal(combat.stats.taijutsu, 0);
  assert.deepEqual(snapshot(), combat.stats);
});

test('le personnage garde des passifs vides si la table de collection est absente', async t => {
  t.mock.method(pool, 'execute', async sql => {
    if (sql.includes('information_schema.tables')) return [[{ ok: 1 }]];
    throw Object.assign(new Error('user_card_collection absente'), { code: 'ER_NO_SUCH_TABLE' });
  });
  assert.deepEqual(await getDeckPassiveBonuses(userId), createEmptyStats());
});

test('les autres erreurs de lecture des passifs remontent', async t => {
  const failure = Object.assign(new Error('Connexion interrompue'), { code: 'ECONNRESET' });
  t.mock.method(pool, 'execute', async () => {
    throw failure;
  });
  await assert.rejects(getDeckPassiveBonuses(userId), failure);
});

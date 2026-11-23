import assert from 'node:assert/strict';
import { test } from 'node:test';
import pool from '../src/config/database.js';
import { applyUpgradeBonuses } from '../src/services/cardService.js';
import { startCombat } from '../src/services/combatEngineService.js';
import { BASE_MAX_HP } from '../src/services/deckCombat/constants.js';
import {
  addCardToDeck,
  getActiveDeck,
  replaceDeckCards,
  setActiveDeck,
} from '../src/services/deckService.js';
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
    stat_type: 'common',
    passive_bonus_json: { vitesse: 1, medecine: 3 },
    quantity: 1,
    upgrade_level: 0,
  },
  ...Array.from({ length: 3 }, (_, index) => ({
    slug: `nin-filler-${index}`,
    type: 'skill',
    stat_type: 'ninjutsu',
    passive_bonus_json: {},
    quantity: 1,
    upgrade_level: 0,
  })),
  ...Array.from({ length: 5 }, (_, index) => ({
    slug: `tai-filler-${index}`,
    type: 'skill',
    stat_type: 'taijutsu',
    passive_bonus_json: {},
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

test('une carte de troisième voie (splash) reste jouable', async t => {
  const owned = {
    id: 99,
    card_definition_id: 99,
    quantity: 1,
    stat_type: 'genjutsu',
    rarity: 'common',
  };
  const withThirdArt = [...rows, owned];
  const collection = new Map(withThirdArt.map(row => [row.id, row]));
  let saved = rows;
  t.mock.method(pool, 'execute', async (sql, params) => {
    if (sql.includes('information_schema.tables')) return [[{ ok: 1 }]];
    if (sql.includes('FROM user_decks')) return [[deck]];
    if (sql.includes('FROM user_card_collection ucc')) return [[collection.get(params[0])]];
    if (sql.includes('FROM user_deck_cards udc')) return [saved];
    if (sql.includes('FROM user_deck_cards WHERE')) return [[]];
    if (sql.includes('INSERT INTO user_deck_cards')) {
      saved = [...saved, owned];
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM combat_sessions')) return [[]];
    assert.fail(`Requête inattendue : ${sql}`);
  });
  t.mock.method(pool, 'getConnection', async () => ({
    async beginTransaction() {},
    async commit() {},
    release() {},
    async execute(sql, params) {
      if (sql.includes('DELETE FROM user_deck_cards')) saved = [];
      else if (sql.includes('INSERT INTO user_deck_cards')) {
        saved.push({ ...collection.get(params[1]), quantity: params[3] });
      } else if (sql.includes('UPDATE user_decks SET is_active')) {
        /* activation */
      } else assert.fail(`Requête inattendue : ${sql}`);
    },
  }));

  assert.equal((await getActiveDeck(userId)).validation.valid, true);
  const added = await addCardToDeck(userId, deck.id, owned.id);
  assert.equal(added.size, 22);
  assert.equal(added.validation.valid, true);
  assert.equal(added.validation.artCounts.genjutsu, 1);
  assert.equal(added.validation.primaryCount, 15);
  assert.equal(added.validation.secondaryCount, 5);
  const replaced = await replaceDeckCards(
    userId,
    deck.id,
    withThirdArt.map(row => ({ collectionId: row.id, quantity: row.quantity })),
  );
  assert.equal(replaced.size, 22);
  assert.equal(replaced.validation.valid, true);
  await setActiveDeck(userId, deck.id);
});

test('un deck sous le seuil 15+5 refuse l’activation et le combat', async t => {
  const weakRows = [
    {
      id: 1,
      card_definition_id: 1,
      slug: 'faible-tai',
      type: 'skill',
      stat_type: 'taijutsu',
      rarity: 'common',
      quantity: 10,
      upgrade_level: 0,
      passive_bonus_json: {},
    },
    {
      id: 2,
      card_definition_id: 2,
      slug: 'faible-nin',
      type: 'skill',
      stat_type: 'ninjutsu',
      rarity: 'common',
      quantity: 10,
      upgrade_level: 0,
      passive_bonus_json: {},
    },
  ];
  t.mock.method(pool, 'execute', async sql => {
    if (sql.includes('information_schema.tables')) return [[{ ok: 1 }]];
    if (sql.includes('FROM user_decks')) return [[deck]];
    if (sql.includes('FROM user_deck_cards udc')) return [weakRows];
    if (sql.includes('FROM combat_sessions')) return [[]];
    assert.fail(`Requête inattendue : ${sql}`);
  });
  t.mock.method(pool, 'getConnection', async () => ({
    async beginTransaction() {},
    async commit() {},
    release() {},
    async execute() {
      assert.fail('aucune écriture attendue');
    },
  }));

  const active = await getActiveDeck(userId);
  assert.equal(active.validation.valid, false);
  assert.ok(active.validation.codes.includes('insufficient_primary_art'));
  const refused = { statusCode: 400, message: /Voie principale insuffisante|Primary path too low/ };
  await assert.rejects(setActiveDeck(userId, deck.id), refused);
  await assert.rejects(startCombat(userId), refused);
  await assert.rejects(startCombat(userId, { deckId: deck.id }), refused);
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

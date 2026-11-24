import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyAsyncDuelAction,
  createAsyncDuel,
  publicAsyncDuel,
} from '../src/services/deckCombat/asyncDuel.js';

const card = (slug, properties = {}) => ({
  quantity: 1,
  card: {
    slug,
    nameFr: slug,
    nameEn: slug,
    type: 'skill',
    statType: 'medicine',
    cost: 0,
    ...properties,
  },
});
const attack = (slug, damage, cost, properties) =>
  card(slug, { type: 'attack', statType: 'taijutsu', damage, cost, ...properties });
const rest = () => card('repos', { cost: 10 });
const make = (human, ai, seed) =>
  createAsyncDuel(
    [
      { id: 'human', name: 'Joueur', stats: {}, deckEntries: [rest()], ...human },
      { id: 'ai', name: 'Empreinte', stats: {}, deckEntries: [rest()], ...ai },
    ],
    seed
  );
const end = state => applyAsyncDuelAction(state, { type: 'end_turn' });
const instance = (state, slug, index = 0) =>
  state.fighters[index].hand.find(c => c.slug === slug).instanceId;
const use = (state, type, slug) =>
  applyAsyncDuelAction(state, { type, instanceId: instance(state, slug) });
const play = (state, slug) => use(state, 'play', slug);
const error = statusCode => ({ statusCode });
const copy = state => JSON.parse(JSON.stringify(state));
const aiHits = state => state.logs.filter(log => log.type === 'damage' && log.side === 'enemy');

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}

// Arrange a known opening hand and known hidden draw order independently of the shuffle.
function arrange(state, index, slugs, drawSlugs) {
  const fighter = state.fighters[index];
  const pile = [...fighter.hand, ...fighter.drawPile];
  const take = slug => {
    const index = pile.findIndex(c => c.slug === slug);
    assert.notEqual(index, -1, slug);
    return pile.splice(index, 1)[0];
  };
  fighter.hand = slugs.map(take);
  fighter.drawPile = [...(drawSlugs || []).map(take), ...pile];
  return state;
}

test('talents, passifs par copie, chakra de base 5 et ouverture persistante', () => {
  const starter = card('passif', { passiveBonus: { maxHp: 3, maxChakra: 1, startingBlock: 2 } });
  starter.quantity = 2;
  const state = make(
    deepFreeze({
      stats: { maxHp: 7, maxChakra: 2, startingBlock: 1 },
      deckEntries: [starter, { ...rest(), quantity: 6 }],
      talentCodes: ['chakra_surge', 'iron_guard'],
    })
  );
  const { player, enemy, currentPhase, ruleset } = publicAsyncDuel(state);
  assert.equal(ruleset, 'persistent');
  assert.equal(currentPhase, 'player_turn');
  assert.equal(player.hp, 113);
  assert.equal(player.maxChakra, 9);
  assert.equal(player.chakra, 10);
  assert.equal(player.block, 8);
  assert.equal(player.hand.length, 5);
  assert.equal(player.drawCount, 3);
  assert.equal(enemy.chakra, 5);
  assert.equal(enemy.nameEn, 'Empreinte');
  // Older persisted duels have no rank, level, or appearance snapshot.
  assert.equal(enemy.profile, undefined);
  assert.equal(enemy.rank, undefined);
  assert.equal(enemy.level, undefined);
  const next = publicAsyncDuel(end(copy(state)));
  assert.equal(next.player.chakra, 9);
  // 8 armure non consommée → fade ÷2 (4) + iron_guard (3)
  assert.equal(next.player.block, 7);
  assert.deepEqual(next.player.hand, player.hand);
});

test('deux échanges au total, un seul chakra, et pioche de remplacement sans repiocher la carte', () => {
  const start = arrange(
    make({ deckEntries: 'abcdefg'.split('').map(slug => card(slug)) }),
    0,
    ['a', 'b', 'c', 'd', 'e'],
    ['f', 'g']
  );
  const first = use(deepFreeze(start), 'discard_chakra', 'a');
  assert.equal(publicAsyncDuel(first).player.chakra, 6);
  assert.equal(publicAsyncDuel(first).player.discardsRemaining, 1);
  assert.throws(() => use(first, 'discard_chakra', 'b'), error(400));
  const second = use(first, 'discard_draw', 'b');
  const view = publicAsyncDuel(second).player;
  assert.deepEqual(
    view.hand.map(c => c.slug),
    ['c', 'd', 'e', 'f']
  );
  assert.equal(view.chakraDiscardAvailable, false);
  assert.equal(view.discardsRemaining, 0);
  assert.throws(() => use(second, 'discard_draw', 'c'), error(400));
  const next = publicAsyncDuel(end(second)).player;
  assert.deepEqual(
    next.hand.map(c => c.slug),
    ['c', 'd', 'e', 'f', 'g']
  );
  assert.equal(next.chakra, 5);
  assert.equal(next.discardsRemaining, 2);
  assert.equal(next.chakraDiscardAvailable, true);
  const singleton = make();
  assert.throws(() => use(singleton, 'discard_draw', 'repos'), error(400));
  const recycled = make({ deckEntries: [card('used'), card('kept')] });
  const exchanged = use(play(recycled, 'used'), 'discard_draw', 'kept');
  assert.deepEqual(
    exchanged.fighters[0].hand.map(c => c.slug),
    ['used']
  );
  assert.deepEqual(
    exchanged.fighters[0].discardPile.map(c => c.slug),
    ['kept']
  );
});

test('la pioche d’une carte peut dépasser cinq, et la main et l’épuisement persistent', () => {
  const deckEntries = [
    card('draw', { effects: [{ type: 'draw', value: 4 }], exhaust: true }),
    { ...rest(), quantity: 9 },
  ];
  const start = make({ deckEntries });
  const known = ['draw', 'repos', 'repos', 'repos', 'repos'];
  arrange(start, 0, known);
  const played = play(start, 'draw');
  const player = publicAsyncDuel(played).player;
  assert.equal(player.hand.length, 8);
  assert.equal(player.exhaustCount, 1);
  assert.deepEqual(publicAsyncDuel(end(played)).player.hand, player.hand);
});

test('le bloc protège pendant le tour adverse puis se réduit de moitié au tour suivant', () => {
  const state = make(
    { deckEntries: [card('guard', { block: 16 })] },
    {
      deckEntries: [attack('punch', 10, 2), card('shield', { block: 8, cost: 2 })],
    }
  );
  const next = end(play(state, 'guard'));
  const { player, enemy } = publicAsyncDuel(next);
  assert.equal(player.hp, 100);
  // 16 armure − 10 dégâts = 6, puis fade ÷2 → 3 restants
  assert.equal(player.block, 3);
  assert.equal(enemy.block, 8);
  assert.ok(
    next.logs.some(log => log.type === 'block_fade' && log.side === 'player' && log.value === 3)
  );
});

test('IA : compare les séquences, joue un combo légal de trois plutôt que le gros coup seul', () => {
  const ai = {
    deckEntries: [
      attack('greedy', 28, 5),
      card('prepare', { cost: 2, effects: [{ type: 'reduce_next_card_cost', value: 3 }] }),
      attack('link', 1, 5, { statType: 'ninjutsu', effects: [{ type: 'gain_chakra', value: 2 }] }),
      attack('finish', 3, 3, {
        effects: [{ type: 'combo_previous', statType: 'ninjutsu', damage: 47 }],
      }),
      rest(),
    ],
  };
  const state = make(undefined, ai);
  const next = end(deepFreeze(state));
  assert.deepEqual(
    aiHits(next).map(log => log.card),
    ['link', 'finish']
  );
  assert.ok(next.logs.some(log => log.type === 'next_card_cost_reduction' && log.applied === 3));
  assert.equal(next.fighters[1].chakra, 0);
  assert.equal(next.fighters[0].hp, 49);
});

test('IA : échange pour un seul chakra seulement si la suite est payable', () => {
  const state = make(undefined, {
    deckEntries: [rest(), attack('six', 20, 6), attack('seven', 70, 7)],
  });
  const next = end(state);
  assert.deepEqual(
    aiHits(next).map(log => log.card),
    ['six']
  );
  assert.equal(
    next.logs.filter(log => log.side === 'enemy' && log.type === 'discard_for_chakra').length,
    1
  );
  assert.ok(next.fighters[1].voluntaryDiscards <= 2);
});

test('IA : le premier jeu ne dépend ni de la main adverse ni des futures pioches', () => {
  const base = make(
    { deckEntries: [card('hidden-a'), card('hidden-b')] },
    {
      deckEntries: [
        attack('known', 14, 5),
        attack('draw-first', 1, 2, { effects: [{ type: 'draw', value: 1 }] }),
        card('filler1'),
        card('filler2'),
        card('filler3'),
        attack('hidden-big', 99, 1),
        attack('hidden-small', 1, 1),
      ],
    }
  );
  const changed = copy(base);
  const hand = ['draw-first', 'known', 'filler1', 'filler2', 'filler3'];
  arrange(base, 1, hand, ['hidden-big', 'hidden-small']);
  arrange(changed, 1, hand, ['hidden-small', 'hidden-big']);
  changed.fighters[0].hand = [{ ...changed.fighters[0].hand[0], slug: 'different', damage: 500 }];
  assert.equal(aiHits(end(base))[0].card, 'known');
  assert.equal(aiHits(end(changed))[0].card, 'known');
});

test('IA : borne le nombre de jeux même avec une boucle de pioche gratuite', () => {
  const loop = { ...attack('loop', 1, 0, { effects: [{ type: 'draw', value: 1 }] }), quantity: 7 };
  const state = make(undefined, { deckEntries: [loop] });
  const next = end(state);
  assert.equal(aiHits(next).length, 12);
  assert.equal(next.currentTurn, 2);
  assert.equal(next.currentPhase, 'player_turn');
});

test('les invocations provoquent, absorbent le dégât et attaquent au tour suivant', () => {
  const state = make(
    {
      deckEntries: [
        card('clone', {
          type: 'summon',
          summon: { hp: 11, attack: 3, taunt: true },
        }),
      ],
    },
    { deckEntries: [attack('hit', 10, 5)] }
  );
  const next = end(play(state, 'clone'));
  const { player, enemy } = publicAsyncDuel(next);
  assert.equal(player.hp, 100);
  assert.equal(player.ally.hp, 1);
  assert.equal(player.exhaustCount, 1);
  assert.equal(enemy.hp, 97);
});

test('une esquive protège de la frappe mais pas du statut, qui diminue au tour du porteur', () => {
  const state = make(
    { deckEntries: [card('dodge', { effects: [{ type: 'evade_next', chance: 1 }] })] },
    {
      deckEntries: [
        attack('dot', 30, 5, {
          statType: 'ninjutsu',
          effects: [{ type: 'apply_status', status: 'burn', duration: 2 }],
        }),
      ],
    }
  );
  const next = end(play(state, 'dodge'));
  // Esquive annule la frappe ; la brûlure est quand même posée puis tickée au début du tour joueur.
  assert.equal(next.fighters[0].hp, 95);
  assert.deepEqual(next.fighters[0].statuses, [{ key: 'burn', value: 5, duration: 1 }]);
  assert.ok(next.logs.some(log => log.type === 'evade' && log.side === 'player'));
  assert.ok(next.logs.some(log => log.type === 'burn' && log.side === 'player' && log.hp === 95));
});

test('la vue PvE ne divulgue pas de statistiques, main, RNG ni logs privés adverses', () => {
  const state = make(
    {
      deckEntries: [attack('visible', 2, 3, { statType: 'genjutsu' })],
      talentCodes: ['shadow_feint'],
    },
    {
      deckEntries: [attack('hidden-attack', 3, 1, { effects: [{ type: 'draw', value: 1 }] })],
      stats: { taijutsu: 9 },
      talentCodes: ['chakra_surge'],
    }
  );
  const initial = publicAsyncDuel(state);
  assert.equal(initial.player.hand[0].cost, 2);
  assert.equal(state.fighters[0].hand[0].cost, 3);
  const next = end(state);
  const visible = publicAsyncDuel(next);
  assert.equal(visible.enemy.intent, null);
  assert.ok(visible.logs.some(log => log.type === 'damage' && log.source === 'enemy'));
  const json = JSON.stringify(visible);
  assert.doesNotMatch(
    json,
    /hidden-attack|p2-1|rngState|drawPile|discardPile|talentCodes|"stats"|chakra_surge/
  );
  visible.player.hand[0].cost = 99;
  assert.notEqual(publicAsyncDuel(next).player.hand[0].cost, 99);
});

test('validation et issues : victoire, défaite par attaque ou poison, abandon', () => {
  assert.throws(() => createAsyncDuel([]), error(400));
  assert.throws(() => make({ deckEntries: [] }), error(400));
  assert.throws(() => make({ id: 'ai' }), error(400));
  const start = deepFreeze(
    make({ deckEntries: [attack('kill', 200, 5), attack('unpayable', 1000, 6)] })
  );
  assert.throws(() => applyAsyncDuelAction(start, { type: 'unknown' }), error(400));
  assert.throws(() => applyAsyncDuelAction(start, { type: 'play' }), error(400));
  assert.throws(
    () => applyAsyncDuelAction(start, { type: 'play', instanceId: instance(start, 'repos', 1) }),
    error(404)
  );
  assert.throws(
    () =>
      applyAsyncDuelAction(start, {
        type: 'play',
        instanceId: instance(start, 'kill'),
        target: 'ally',
      }),
    error(400)
  );
  assert.throws(() => play(start, 'unpayable'), error(400));
  const victory = play(start, 'kill');
  assert.equal(victory.state, 'victory');
  assert.equal(victory.currentPhase, 'game_over');
  assert.throws(() => end(victory), error(400));
  const defeat = end(make(undefined, { deckEntries: [attack('lethal', 200, 5)] }));
  assert.equal(defeat.state, 'defeat');
  const poisonSetup = make(undefined, {
    deckEntries: [
      card('poison', {
        cost: 0,
        effects: [{ type: 'apply_status', target: 'enemy', status: 'poison', duration: 1 }],
      }),
    ],
  });
  poisonSetup.fighters[0].hp = 3;
  assert.equal(end(poisonSetup).state, 'defeat');
  const forfeited = applyAsyncDuelAction(start, { type: 'forfeit' });
  assert.equal(forfeited.state, 'forfeited');
  assert.deepEqual(forfeited.logs, [{ type: 'forfeited' }]);
  assert.equal(start.state, 'in_progress');
});

test('la graine et l’état JSON suffisent à rejouer les actions sans mutation', () => {
  const human = { deckEntries: [{ ...attack('hit', 5, 1), quantity: 6 }, rest()] };
  const ai = { deckEntries: [{ ...attack('reply', 3, 2), quantity: 6 }, rest()] };
  let first = make(human, ai, 182);
  let second = make(human, ai, 182);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, make(human, ai, 183));
  for (let round = 0; round < 3; round += 1) {
    const action = { type: 'play', instanceId: instance(first, 'hit') };
    first = end(applyAsyncDuelAction(deepFreeze(first), action));
    second = end(applyAsyncDuelAction(copy(second), action));
    assert.deepEqual(first, copy(first));
    assert.deepEqual(first, second);
  }
});

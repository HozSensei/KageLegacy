import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { createAsyncDuelRouter } from '../src/routes/asyncDuels.js';

async function fixture(t, { rewards } = {}) {
  const rows = new Map();
  const fighters = new Map(
    [1, 2, 3, 4, 5].map(id => [
      id,
      {
        id,
        name: `Player ${id}`,
        level: id === 4 ? 10 : 5,
        rank: 'Genin',
        profile: {
          avatarId: `genin-1-${id}`,
          backgroundId: id === 2 ? 'joueur-1' : null,
          nicknameId: id === 2 ? 'genin' : null,
          unlockedNicknameIds: ['genin'],
        },
        factionId: id === 5 ? null : id === 2 || id === 4 ? 'kareno' : 'midorihara',
        stats: {},
        deckEntries: [
          {
            quantity: 20,
            card: {
              slug: `secret-${id}`,
              statType: 'taijutsu',
              type: 'attack',
              cost: 1,
              damage: id === 2 ? 300 : 1,
              effects: [],
            },
          },
        ],
      },
    ])
  );
  const store = {
    getDuelOverview: async userId => ({
      activeDuelId:
        [...rows.values()].find(
          row => row.attackerId === userId && row.state.state === 'in_progress'
        )?.id ?? null,
      defenses: [],
    }),
    getFactionStandings: async () => ({
      weekStart: '2026-11-16',
      weekEnd: '2026-11-23',
      factions: [],
    }),
    insertAsyncDuel: async row => {
      const saved = structuredClone({ ...row, revision: 0 });
      rows.set(row.id, saved);
      return saved;
    },
    loadAsyncDuel: async (id, userId) => {
      const found = rows.get(id);
      return found?.attackerId === userId ? structuredClone(found) : null;
    },
    updateAsyncDuel: async ({ id, attackerId, revision, state }) => {
      const row = rows.get(id);
      if (
        row?.attackerId !== attackerId ||
        row.revision !== revision ||
        row.state.state !== 'in_progress'
      )
        return null;
      const next = structuredClone({ ...row, revision: revision + 1, state });
      rows.set(id, next);
      return next;
    },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.get('test-user')) req.user = { id: Number(req.get('test-user')) };
    next();
  });
  const friends = {
    areDuelFriends: async (a, b) => a === 1 && b === 2,
    searchDuelPlayers: async (_id, q) => (q ? [{ id: 2, name: 'Player 2' }] : []),
    getDuelFriends: async id => ({
      friends: id === 1 ? [{ id: 2, name: 'Player 2' }] : [],
      incoming: [],
      outgoing: [],
    }),
  };
  app.use(
    '/api/deck-duels',
    createAsyncDuelRouter({
      store,
      friends,
      rewards,
      fighter: async id => fighters.get(id),
      candidates: async () => [1, 4, 3, 2].map(id => ({ id })),
    })
  );
  app.use((err, _req, res, _next) => {
    res
      .status(err.statusCode || (err.name === 'ZodError' ? 400 : 500))
      .json({ error: err.message });
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  const call = async (id, path, method = 'GET', payload) => {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/deck-duels${path}`,
      {
        method,
        headers: { ...(id && { 'test-user': String(id) }), 'Content-Type': 'application/json' },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      }
    );
    return {
      status: response.status,
      data: await response.json(),
      cacheControl: response.headers.get('cache-control'),
    };
  };
  return { call, fighters };
}

test('HTTP : ami hors ligne, deck figé, reprise et écriture versionnée', async t => {
  const { call, fighters } = await fixture(t);
  assert.equal((await call(null, '')).status, 401);
  assert.equal((await call(1, '', 'POST', { mode: 'friend', defenderId: 1 })).status, 400);
  assert.equal((await call(1, '', 'POST', { mode: 'friend', defenderId: 3 })).status, 404);
  assert.deepEqual((await call(1, '/opponents?q=Player')).data.opponents, [
    { id: 2, name: 'Player 2' },
  ]);
  assert.deepEqual((await call(1, '/friends')).data.friends, [{ id: 2, name: 'Player 2' }]);

  const started = await call(1, '', 'POST', { mode: 'friend', defenderId: 2 });
  assert.equal(started.status, 201);
  const { duel } = started.data;
  assert.equal(duel.revision, 0);
  assert.equal(duel.mode, 'friend');
  assert.equal(duel.reward, 0);
  assert.equal(duel.player.hand.length, 5);
  assert.equal(duel.enemy.nameEn, 'Player 2');
  assert.equal(duel.enemy.rank, 'Genin');
  assert.equal(duel.enemy.level, 5);
  assert.equal(duel.player.profile.avatarId, 'genin-1-1');
  assert.deepEqual(duel.enemy.profile, {
    avatarId: 'genin-1-2',
    backgroundId: 'joueur-1',
    nicknameId: 'genin',
  });
  assert.equal(duel.player.factionId, 'midorihara');
  assert.equal(duel.enemy.factionId, 'kareno');
  assert.doesNotMatch(
    JSON.stringify(duel),
    /secret-2|rngState|drawPile|unlockedNicknameIds/
  );
  assert.equal((await call(2, `/${duel.id}`)).status, 404);
  assert.equal((await call(1, '')).data.activeDuelId, duel.id);

  fighters.get(2).deckEntries[0].card.damage = 0;
  fighters.get(2).profile.avatarId = 'genin-1-16';
  assert.deepEqual((await call(1, `/${duel.id}`)).data.duel, duel);
  const path = `/${duel.id}/action`;
  assert.equal((await call(1, path, 'POST', { type: 'end_turn' })).status, 400);
  assert.equal((await call(1, path, 'POST', { type: 'end_turn', revision: 1 })).status, 409);
  const finished = await call(1, path, 'POST', { type: 'end_turn', revision: 0 });
  assert.equal(finished.status, 200);
  assert.equal(finished.data.duel.state, 'defeat');
  assert.equal(finished.data.duel.revision, 1);
  assert.deepEqual(finished.data.duel.enemy.profile, duel.enemy.profile);
  assert.equal((await call(1, path, 'POST', { type: 'end_turn', revision: 0 })).status, 409);
  assert.equal((await call(1, '')).data.activeDuelId, null);
});

test('HTTP : le serveur choisit dans la fenêtre de niveau et exclut le même village sur demande', async t => {
  const { call } = await fixture(t);
  assert.equal((await call(1, '', 'POST', { mode: 'enemy_faction', defenderId: 2 })).status, 400);
  assert.equal((await call(5, '', 'POST', { mode: 'enemy_faction' })).status, 400);
  const random = await call(1, '', 'POST', { mode: 'random' });
  assert.equal(random.status, 201);
  assert.equal(random.data.duel.mode, 'random');
  assert.equal(random.data.duel.enemy.nameEn, 'Player 3');
  await call(1, `/${random.data.duel.id}/action`, 'POST', { type: 'forfeit', revision: 0 });
  const rival = await call(1, '', 'POST', { mode: 'enemy_faction' });
  assert.equal(rival.status, 201);
  assert.equal(rival.data.duel.mode, 'enemy_faction');
  assert.equal(rival.data.duel.enemy.nameEn, 'Player 2');
  assert.equal((await call(1, '/factions')).data.weekStart, '2026-11-16');
});

test('HTTP : reçus de village réservés au compte connecté, avec une borne de lecture valide', async t => {
  const previousFallback = process.env.AUTH_DEMO_FALLBACK;
  process.env.AUTH_DEMO_FALLBACK = 'true';
  t.after(() => {
    if (previousFallback === undefined) delete process.env.AUTH_DEMO_FALLBACK;
    else process.env.AUTH_DEMO_FALLBACK = previousFallback;
  });
  const calls = [];
  const receipt = {
    weekStart: '2026-11-09',
    weekEnd: '2026-11-16',
    ryos: 50,
    factionId: 'midorihara',
    settledAt: '2026-11-16T00:00:00.123Z',
  };
  const { call } = await fixture(t, {
    rewards: {
      getVillageRewards: async id => {
        calls.push(['get', id]);
        return id === 1 ? { rewards: [receipt], unreadCount: 1 } : { rewards: [], unreadCount: 0 };
      },
      markVillageRewardsRead: async (id, throughWeekStart) => {
        calls.push(['read', id, throughWeekStart]);
        return { unreadCount: 0 };
      },
    },
  });
  const path = '/village-rewards';
  const read = `${path}/read`;
  const input = { throughWeekStart: receipt.weekStart };
  assert.equal((await call(null, path)).status, 401);
  assert.equal((await call(null, read, 'POST', input)).status, 401);
  for (const body of [
    {},
    { throughWeekStart: '2026-02-29' },
    { throughWeekStart: '2026-11-09T00:00:00Z' },
    { ...input, userId: 1 },
  ]) {
    assert.equal((await call(2, read, 'POST', body)).status, 400);
  }
  assert.deepEqual(calls, []);

  const own = await call(1, path);
  assert.equal(own.status, 200);
  assert.equal(own.cacheControl, 'no-store');
  assert.deepEqual(own.data, { rewards: [receipt], unreadCount: 1 });
  assert.deepEqual((await call(2, `${path}?userId=1`)).data, { rewards: [], unreadCount: 0 });
  const marked = await call(1, read, 'POST', input);
  assert.equal(marked.status, 200);
  assert.equal(marked.cacheControl, 'no-store');
  assert.deepEqual(marked.data, { unreadCount: 0 });
  assert.deepEqual(calls, [
    ['get', 1],
    ['get', 2],
    ['read', 1, receipt.weekStart],
  ]);
});

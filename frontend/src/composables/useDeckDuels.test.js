import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope } from 'vue';
import { useDeckDuels } from './useDeckDuels.js';

const snapshot = (revision, state = 'in_progress', hand = [{ instanceId: 'card-a' }]) => ({
  id: 'duel/a',
  revision,
  state,
  currentPhase: 'player_turn',
  player: { hand },
  enemy: { name: 'Rin' },
});
const lobby = (activeDuelId = null) => ({
  activeDuelId,
  defenses: [{ id: 1, opponentName: 'Rin', outcome: 'defeat', reward: 10 }],
});
const friendView = (overrides = {}) => ({ friends: [], incoming: [], outgoing: [], ...overrides });
const lobbyFriends = friendView({ friends: [{ id: 2, name: 'Rin' }] });
const httpError = status => Object.assign(new Error(`HTTP ${status}`), { status });
const requestDetails = ({ path, method, payload }) => [path, method, payload];

function harness(t, ...responses) {
  const scope = effectScope();
  t.after(() => {
    scope.stop();
    assert.equal(responses.length, 0, 'Unused mock responses');
  });
  const calls = [];
  const api = scope.run(() =>
    useDeckDuels({
      request: async (path, { method = 'GET', payload, signal }) => {
        calls.push({ path, method, payload, signal });
        assert.ok(responses.length, `Unexpected ${method} ${path}`);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response;
      },
    })
  );
  return { api, calls };
}

test('loads defense history and resumes the active duel without an opt-in setting', async t => {
  const { api, calls } = harness(t, lobby('duel/a'), { duel: snapshot(3) });
  await api.refresh();
  assert.deepEqual(
    calls.map(call => call.path),
    ['', '/duel%2Fa']
  );
  assert.equal(api.duel.value.revision, 3);
  assert.deepEqual(api.defenses.value, lobby().defenses);
  assert.equal(api.lobbyLoaded.value, true);
  assert.equal(api.locked.value, false);
});

test('the lobby only loads duels and friends; a friends load error does not lock matchmaking', async t => {
  const { api, calls } = harness(t, lobby(), httpError(500), lobby(), lobbyFriends);
  await api.refresh();
  assert.equal(api.friendsLoadFailed.value, true);
  assert.equal(api.locked.value, false);
  await api.refresh();
  assert.equal(api.friendsLoadFailed.value, false);
  assert.deepEqual(api.friends.value, lobbyFriends.friends);
  assert.equal(api.locked.value, false);
  assert.deepEqual(
    calls.map(call => call.path),
    ['', '/friends', '', '/friends']
  );
});

test('only accepted friends are selectable and a challenge starts with a single POST', async t => {
  const accepted = { id: 2, name: 'Rin' };
  const incoming = { id: 3, name: 'Mei' };
  const outgoing = { id: 4, name: 'Ren' };
  const detail = { ...snapshot(0), mode: 'friend' };
  const { api, calls } = harness(
    t,
    lobby(),
    friendView({ friends: [accepted], incoming: [incoming], outgoing: [outgoing] }),
    { duel: detail }
  );
  await api.refresh();
  assert.deepEqual(api.friends.value, [accepted]);
  await api.start('friend', incoming.id);
  await api.start('friend', outgoing.id);
  assert.equal(calls.length, 2);
  await api.start('friend', accepted.id);
  assert.deepEqual(calls.slice(2).map(requestDetails), [
    ['', 'POST', { mode: 'friend', defenderId: 2 }],
  ]);
  assert.deepEqual(api.duel.value, detail);
});

for (const mode of ['friend', 'random', 'enemy_faction']) {
  test(`starts a ${mode} duel with only the fields for that mode`, async t => {
    const detail = { ...snapshot(0), mode };
    const { api, calls } = harness(t, lobby(), lobbyFriends, { duel: detail });
    await api.refresh();
    await api.start('friend');
    await api.start('invalid', 2);
    assert.equal(calls.length, 2);
    await api.start(mode, 2);
    assert.deepEqual(requestDetails(calls[2]), [
      '',
      'POST',
      mode === 'friend' ? { mode, defenderId: 2 } : { mode },
    ]);
    assert.deepEqual(api.duel.value, detail);
  });
}

for (const status of [400, 404]) {
  test(`${status} reports matchmaking unavailable without locking or reloading the lobby`, async t => {
    const { api, calls } = harness(t, lobby(), lobbyFriends, httpError(status));
    await api.refresh();
    await api.start('enemy_faction');
    assert.equal(api.duel.value, null);
    assert.equal(api.feedback.value, 'opponentUnavailable');
    assert.equal(api.locked.value, false);
    assert.equal(calls.length, 3);
  });
}

test('409 reloads the duel without retrying the action and uses the new revision next time', async t => {
  const { api, calls } = harness(
    t,
    lobby('duel/a'),
    { duel: snapshot(2) },
    httpError(409),
    { duel: snapshot(4) },
    { duel: snapshot(5, 'forfeited') }
  );
  await api.refresh();
  api.selectedId.value = 'card-a';
  const conflict = api.act('play');
  await api.act('end_turn');
  await conflict;
  assert.deepEqual(calls.slice(2).map(requestDetails), [
    ['/duel%2Fa/action', 'POST', { type: 'play', instanceId: 'card-a', revision: 2 }],
    ['/duel%2Fa', 'GET', undefined],
  ]);
  assert.equal(api.feedback.value, 'actionConflict');
  assert.equal(api.selectedId.value, null);
  await api.act('forfeit');
  assert.deepEqual(calls[4].payload, { type: 'forfeit', revision: 4 });
  assert.equal(api.duel.value.state, 'forfeited');
});

test('a conflicting challenge resumes the duel created elsewhere', async t => {
  const { api, calls } = harness(t, lobby(), lobbyFriends, httpError(409), lobby('duel/a'), {
    duel: { ...snapshot(1), mode: 'random' },
  });
  await api.refresh();
  await api.start('friend', 2);
  assert.deepEqual(calls.slice(2).map(requestDetails), [
    ['', 'POST', { mode: 'friend', defenderId: 2 }],
    ['', 'GET', undefined],
    ['/duel%2Fa', 'GET', undefined],
  ]);
  assert.equal(api.duel.value.revision, 1);
  assert.equal(api.duel.value.mode, 'random');
  assert.equal(api.feedback.value, 'startConflict');
});

test('invalid actions are rejected and a failed conflict reload locks actions until refresh', async t => {
  const { api, calls } = harness(
    t,
    lobby('duel/a'),
    { duel: snapshot(2) },
    httpError(422),
    httpError(409),
    httpError(500),
    lobby(),
    { duel: { ...snapshot(3, 'victory', []), reward: { ryos: 10, xp: 2 }, mode: 'enemy_faction' } },
    lobby(),
    lobbyFriends
  );
  await api.refresh();
  await api.act('reserve', 'card-a');
  await api.act('play', 'not-in-hand');
  assert.equal(calls.length, 2);
  await api.act('discard_draw', 'card-a');
  assert.equal(api.feedback.value, 'invalidAction');
  assert.equal(api.duel.value.revision, 2);
  await api.act('end_turn');
  assert.equal(api.locked.value, true);
  await api.act('end_turn');
  assert.equal(calls.length, 5);
  await api.refresh();
  assert.equal(api.duel.value.state, 'victory');
  assert.deepEqual(api.duel.value.reward, { ryos: 10, xp: 2 });
  await api.returnToLobby();
  assert.equal(api.duel.value, null);
  assert.equal(api.locked.value, false);
});

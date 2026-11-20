import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope } from 'vue';
import { useCommunity } from './useCommunity.js';

const rin = { id: 2, name: 'Rin' };
const mei = { id: 3, name: 'Mei' };
const sai = { id: 4, name: 'Sai' };
const snapshot = (overrides = {}) => ({ friends: [], incoming: [], outgoing: [], ...overrides });

function deferred() {
  let resolve;
  const promise = new Promise(done => (resolve = done));
  return { promise, resolve };
}

function setup(t, ...responses) {
  const scope = effectScope();
  const calls = [];
  const api = scope.run(() =>
    useCommunity({
      request: async (path, { method = 'GET', payload, signal }) => {
        calls.push({ path, method, payload, signal });
        assert.ok(responses.length, `Unexpected request to ${path}`);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response;
      },
    })
  );
  t.after(() => {
    scope.stop();
    assert.equal(responses.length, 0, 'Unused mock responses');
  });
  return { api, calls, scope };
}

test('loads friends independently and applies each mutation response to lists and search statuses', async t => {
  const initial = snapshot({ incoming: [rin, sai] });
  const requested = snapshot({ incoming: [rin, sai], outgoing: [mei] });
  const accepted = snapshot({ friends: [rin], incoming: [sai], outgoing: [mei] });
  const declined = snapshot({ friends: [rin], outgoing: [mei] });
  const removed = snapshot({ outgoing: [mei] });
  const { api, calls } = setup(t, initial, requested, accepted, declined, removed, snapshot());

  await api.refresh();
  assert.deepEqual(api.friendships.value, initial);
  await api.requestFriend(mei.id);
  assert.deepEqual(api.friendships.value, requested);
  assert.equal(api.friendStatuses.value.get(String(mei.id)), 'outgoing');
  await api.requestFriend(mei.id); // A result with a pending request can't be added again.
  await api.acceptFriend(mei.id); // Only received requests can be accepted.
  await api.acceptFriend(rin.id);
  assert.deepEqual(api.friendships.value, accepted);
  assert.equal(api.friendStatuses.value.get(String(rin.id)), 'friends');
  await api.removeFriend(sai.id);
  assert.deepEqual(api.friendships.value, declined);
  await api.removeFriend(rin.id);
  assert.deepEqual(api.friendships.value, removed);
  await api.removeFriend(mei.id);
  assert.deepEqual(api.friendships.value, snapshot());
  assert.equal(api.friendStatuses.value.size, 0);
  assert.equal(api.updated.value, true);
  assert.deepEqual(
    calls.map(({ path, method, payload }) => [path, method, payload]),
    [
      ['/friends', 'GET', undefined],
      ['/friends', 'POST', { playerId: mei.id }],
      ['/friends/2/accept', 'POST', undefined],
      ['/friends/4', 'DELETE', undefined],
      ['/friends/2', 'DELETE', undefined],
      ['/friends/3', 'DELETE', undefined],
    ]
  );
});

test('blocks overlapping writes and requires a successful refresh after an unconfirmed write', async t => {
  const write = deferred();
  const initial = snapshot();
  const latest = snapshot({ outgoing: [mei] });
  const { api, calls } = setup(t, {}, initial, write.promise, latest);

  await api.refresh();
  assert.equal(api.friendsError.value, 'loadFailed');
  assert.equal(api.canMutate.value, false);
  await api.refresh();
  const pending = api.requestFriend(mei.id);
  assert.equal(api.canMutate.value, false);
  await api.requestFriend(sai.id);
  await api.refresh();
  assert.equal(calls.length, 3);
  write.resolve(null);
  await pending;
  assert.equal(api.friendsError.value, 'updateFailed');
  assert.deepEqual(api.friendships.value, initial);
  await api.requestFriend(mei.id);
  assert.equal(calls.length, 3);
  await api.refresh();
  assert.deepEqual(api.friendships.value, latest);
  assert.equal(api.canMutate.value, true);
  assert.equal(api.friendsError.value, null);
});

test('validates search input, encodes names and distinguishes empty results from errors', async t => {
  const { api, calls } = setup(t, new Error('network failure'), { opponents: [] });
  await api.search('   ');
  await api.search('a'.repeat(101));
  assert.equal(calls.length, 0);
  await api.search(' Mei & Co ');
  assert.equal(calls[0].path, '/opponents?q=Mei+%26+Co');
  assert.equal(api.searchFailed.value, true);
  assert.equal(api.players.value, null);
  await api.search('Mei');
  assert.equal(api.searchFailed.value, false);
  assert.deepEqual(api.players.value, []);
});

test('ignores outdated searches when another search starts or the input changes', async t => {
  const earlier = deferred();
  const later = deferred();
  const cleared = deferred();
  const { api, calls } = setup(t, earlier.promise, later.promise, cleared.promise);
  const oldSearch = api.search('Rin');
  const newSearch = api.search('Mei');
  assert.equal(calls[0].signal.aborted, true);
  earlier.resolve({ opponents: [rin] });
  await oldSearch;
  assert.equal(api.searching.value, true);
  assert.equal(api.players.value, null);
  later.resolve({ opponents: [mei] });
  await newSearch;
  assert.deepEqual(api.players.value, [mei]);
  const clearedSearch = api.search('Sai');
  api.clearSearch();
  assert.equal(calls[2].signal.aborted, true);
  cleared.resolve({ opponents: [sai] });
  await clearedSearch;
  assert.equal(api.players.value, null);
  assert.equal(api.searching.value, false);
});

test('cancels both friends and search reads when leaving the community page', async t => {
  const friends = deferred();
  const lookup = deferred();
  const { api, calls, scope } = setup(t, friends.promise, lookup.promise);
  const refresh = api.refresh();
  const search = api.search('Rin');
  scope.stop();
  assert.ok(calls.every(({ signal }) => signal.aborted));
  friends.resolve(snapshot({ friends: [rin] }));
  lookup.resolve({ opponents: [rin] });
  await Promise.all([refresh, search]);
  assert.equal(api.friendships.value, null);
  assert.equal(api.players.value, null);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope } from 'vue';
import { useFactionStandings } from './useFactionStandings.js';

const current = {
  weekStart: '2026-11-16',
  weekEnd: '2026-11-23',
  factions: [{ id: 'midorihara', points: 21 }, { id: 'kareno', points: 35 }],
};
const previous = {
  weekStart: '2026-11-09',
  weekEnd: '2026-11-16',
  factions: [{ id: 'kareno', points: 35 }],
  winnerId: 'kareno',
};

function setup(t, request) {
  const scope = effectScope();
  t.after(() => scope.stop());
  return { api: scope.run(() => useFactionStandings({ request })), scope };
}

test('loads both UTC weeks from /factions and defaults missing reward fields', async t => {
  let payload = { ...current, previousWeek: previous };
  const calls = [];
  const { api } = setup(t, async (path, { method = 'GET' }) => {
    calls.push([path, method]);
    return payload;
  });
  await api.refresh();
  assert.deepEqual(calls, [['/factions', 'GET']]);
  const { currentWeek, previousWeek, rewardStarts } = api.standings.value;
  assert.equal(currentWeek.start.toISOString(), '2026-11-16T00:00:00.000Z');
  assert.equal(currentWeek.end.toISOString(), '2026-11-23T00:00:00.000Z');
  assert.deepEqual(currentWeek.factions.map(faction => faction.id), ['kareno', 'midorihara']);
  assert.equal(currentWeek.rewardRyos, 0);
  assert.equal(rewardStarts, null);
  assert.equal(previousWeek.winnerId, 'kareno');
  assert.equal(previousWeek.rewardRyos, 0);
  assert.equal(previousWeek.settled, null);

  payload = current;
  await api.refresh();
  assert.equal(api.standings.value.previousWeek, null);
});

test('supports advertised reward amounts, future start, and explicit settlement status', async t => {
  let firstRewardWeekStart = '2026-11-23';
  let settled = false;
  const { api } = setup(t, async () => ({
    ...current,
    rewardRyos: 150,
    firstRewardWeekStart,
    previousWeek: { ...previous, rewardRyos: 100, settled },
  }));
  await api.refresh();
  assert.equal(api.standings.value.currentWeek.rewardRyos, 150);
  assert.equal(api.standings.value.rewardStarts.toISOString(), '2026-11-23T00:00:00.000Z');
  assert.equal(api.standings.value.previousWeek.rewardRyos, 100);
  assert.equal(api.standings.value.previousWeek.settled, false);

  firstRewardWeekStart = current.weekStart;
  settled = true;
  await api.refresh();
  assert.equal(api.standings.value.rewardStarts, null);
  assert.equal(api.standings.value.previousWeek.settled, true);
});

test('reports an invalid standings response and clears the error on refresh', async t => {
  let payload = { ...current, previousWeek: {} };
  const { api } = setup(t, async () => payload);
  await api.refresh();
  assert.equal(api.loadFailed.value, true);
  assert.equal(api.standings.value, null);

  payload = current;
  await api.refresh();
  assert.equal(api.loadFailed.value, false);
  assert.equal(api.loading.value, false);
});

test('cancels a standings request when leaving Village', async t => {
  let signal;
  let resolve;
  const { api, scope } = setup(t, (_path, options) => {
    signal = options.signal;
    return new Promise(done => {
      resolve = done;
    });
  });
  const loading = api.refresh();
  scope.stop();
  assert.equal(signal.aborted, true);
  resolve(current);
  await loading;
  assert.equal(api.standings.value, null);
  assert.equal(api.loadFailed.value, false);
});

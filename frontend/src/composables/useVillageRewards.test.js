import assert from 'node:assert/strict';
import test from 'node:test';
import { useVillageRewards } from './useVillageRewards.js';

const older = {
  weekStart: '2026-11-09',
  weekEnd: '2026-11-16',
  ryos: 200,
  factionId: 'kareno',
  settledAt: '2026-11-16T00:00:00.000Z',
};
const latest = {
  ...older,
  weekStart: '2026-11-16',
  weekEnd: '2026-11-23',
  settledAt: '2026-11-23T00:00:00.000Z',
};
const later = {
  ...latest,
  weekStart: '2026-11-23',
  weekEnd: '2026-11-30',
  settledAt: '2026-11-30T00:00:00.000Z',
};

test('shares a single GET and only posts the latest seen week, keeping history for a count-only POST', async () => {
  const calls = [];
  const api = useVillageRewards({
    request: async (path, { method = 'GET', payload }) => {
      calls.push({ path, method, payload });
      return method === 'GET' ? { rewards: [older, latest], unreadCount: 2 } : { unreadCount: 0 };
    },
  });

  const get = api.refresh();
  assert.equal(api.refresh(), get);
  await api.markSeen({ unreadCount: 2, throughWeekStart: later.weekStart });
  const receipt = await get;
  assert.deepEqual(api.rewards.value, [latest, older]);
  assert.equal(api.unreadCount.value, 2);
  assert.equal(calls.length, 1);
  await api.markSeen(receipt);
  assert.deepEqual(calls, [
    { path: '/village-rewards', method: 'GET', payload: undefined },
    {
      path: '/village-rewards/read',
      method: 'POST',
      payload: { throughWeekStart: latest.weekStart },
    },
  ]);
  assert.deepEqual(api.rewards.value, [latest, older]);
  assert.equal(api.unreadCount.value, 0);
});

test('does not acknowledge a newer reward found in a POST, and preserves its unread count', async () => {
  let postCalls = 0;
  const api = useVillageRewards({
    request: async (_path, options) => {
      if (options.method === 'POST') {
        postCalls += 1;
        assert.deepEqual(options.payload, { throughWeekStart: latest.weekStart });
        return { rewards: [later, latest], unreadCount: 1 };
      }
      return { rewards: [latest], unreadCount: 1 };
    },
  });

  const receipt = await api.refresh();
  await api.markSeen(receipt);
  await api.markSeen(receipt);
  assert.equal(postCalls, 1);
  assert.equal(api.unreadCount.value, 1);
  assert.deepEqual(api.rewards.value, [later, latest]);
});

test('failed GET invalidates previous authorization; failed POST does not clear the dot', async () => {
  let getFails = false;
  let postCalls = 0;
  const api = useVillageRewards({
    request: async (_path, options) => {
      if (options.method === 'POST') {
        postCalls += 1;
        throw new Error('POST unavailable');
      }
      if (getFails) throw new Error('GET unavailable');
      return { rewards: [latest], unreadCount: 1 };
    },
  });
  const oldReceipt = await api.refresh();
  getFails = true;
  assert.equal(await api.refresh(), null);
  await api.markSeen(oldReceipt);
  assert.equal(postCalls, 0);
  assert.equal(api.loadFailed.value, true);

  getFails = false;
  await api.markSeen(await api.refresh());
  assert.equal(postCalls, 1);
  assert.equal(api.loadFailed.value, false);
  assert.equal(api.readFailed.value, true);
  assert.equal(api.unreadCount.value, 1);
});

test('ignores pending work when the personal rewards state is reset', async () => {
  let resolve;
  let signal;
  const api = useVillageRewards({
    request: (_path, options) => {
      signal = options.signal;
      return new Promise(done => {
        resolve = done;
      });
    },
  });
  const get = api.refresh();
  await Promise.resolve();
  api.reset();
  assert.equal(signal.aborted, true);
  resolve({ rewards: [latest], unreadCount: 1 });
  assert.equal(await get, null);
  assert.equal(api.rewards.value, null);
  assert.equal(api.unreadCount.value, 0);
});

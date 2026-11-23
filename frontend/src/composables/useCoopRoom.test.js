import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope } from 'vue';
import { useCoopApi } from './useCoopApi.js';

const room = (revision, status = 'waiting') => ({
  id: 'room-a',
  revision,
  status,
  role: 'host',
});

function harness(t, { interval = 2000 } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const scope = effectScope();
  t.after(() => scope.stop());
  const calls = [];
  const api = scope.run(() =>
    useCoopApi({
      interval,
      request: (path, options) =>
        new Promise(resolve => calls.push({ path, ...options, resolve })),
    })
  );
  return { api, calls, scope };
}

test('create puis poll room ; une écriture annule le poll', async t => {
  const { api, calls } = harness(t);
  const opening = api.createRoom();
  assert.equal(calls[0].path, '/');
  assert.deepEqual(calls[0].payload, {});
  calls[0].resolve({ room: room(1, 'waiting') });
  await opening;

  t.mock.timers.tick(2000);
  const poll = calls[1];
  assert.equal(poll.path, '/rooms/room-a');
  const setup = api.setupRoom('room-a', { missionId: 1 });
  assert.equal(poll.signal.aborted, true);
  assert.equal(calls[2].path, '/rooms/room-a/setup');
  calls[2].resolve({ room: room(3, 'waiting') });
  await setup;
  poll.resolve({ room: room(2, 'waiting') });
  await Promise.resolve();
  assert.equal(api.room.value.revision, 3);
});

test('unmount aborts an ongoing read and stops scheduling polls', async t => {
  const { api, calls, scope } = harness(t);
  const opening = api.joinRoom('ABCD');
  assert.deepEqual(calls[0].payload, { code: 'ABCD' });
  calls[0].resolve({ room: room(1) });
  await opening;
  t.mock.timers.tick(2000);
  scope.stop();
  assert.equal(calls[1].signal.aborted, true);
  calls[1].resolve({ room: room(2) });
  await Promise.resolve();
  t.mock.timers.tick(6000);
  assert.equal(calls.length, 2);
  assert.equal(api.room.value.revision, 1);
});

test('a closed room without run stops polling', async t => {
  const { api, calls } = harness(t);
  const opening = api.createRoom();
  calls[0].resolve({ room: room(1) });
  await opening;
  t.mock.timers.tick(2000);
  calls[1].resolve({ room: room(2, 'closed') });
  await Promise.resolve();
  t.mock.timers.tick(6000);
  assert.equal(calls.length, 2);
  assert.equal(api.room.value.status, 'closed');
});

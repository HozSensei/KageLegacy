import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope } from 'vue';
import { useCoopRoom } from './useCoopRoom.js';

const room = (revision, status = 'active') => ({ id: 'room-a', revision, status });

function harness(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const scope = effectScope();
  t.after(() => scope.stop());
  const calls = [];
  const api = scope.run(() =>
    useCoopRoom({
      request: (path, options) => new Promise(resolve => calls.push({ path, ...options, resolve })),
    })
  );
  return { api, calls, scope };
}

test('actions invalidate in-flight polling and prevent concurrent writes', async t => {
  const { api, calls } = harness(t);
  const opening = api.create();
  assert.deepEqual(calls[0].payload, {});
  calls[0].resolve(room(1, 'waiting'));
  await opening;

  t.mock.timers.tick(1500);
  const poll = calls[1];
  assert.equal(poll.path, '/room-a');
  const ending = api.action({ type: 'end_turn', target: 'enemy' });
  assert.equal(poll.signal.aborted, true);
  assert.equal(await api.action({ type: 'end_turn' }), false);
  assert.equal(calls[2].path, '/room-a/action');
  calls[2].resolve(room(3));
  await ending;
  poll.resolve(room(2));
  await Promise.resolve();
  assert.equal(api.room.value.revision, 3);

  t.mock.timers.tick(1500);
  calls[3].resolve(room(2));
  await Promise.resolve();
  assert.equal(api.room.value.revision, 3);
});

test('unmount aborts an ongoing read and stops scheduling polls', async t => {
  const { api, calls, scope } = harness(t);
  const opening = api.join('ABCD');
  assert.deepEqual(calls[0].payload, { code: 'ABCD' });
  calls[0].resolve(room(1));
  await opening;
  t.mock.timers.tick(1500);
  scope.stop();
  assert.equal(calls[1].signal.aborted, true);
  calls[1].resolve(room(2));
  await Promise.resolve();
  t.mock.timers.tick(6000);
  assert.equal(calls.length, 2);
  assert.equal(api.room.value.revision, 1);
});

test('a finished room stops polling', async t => {
  const { api, calls } = harness(t);
  const opening = api.create();
  calls[0].resolve(room(1));
  await opening;
  t.mock.timers.tick(1500);
  calls[1].resolve(room(2, 'finished'));
  await Promise.resolve();
  t.mock.timers.tick(6000);
  assert.equal(calls.length, 2);
  assert.equal(api.room.value.status, 'finished');
});

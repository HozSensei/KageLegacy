import assert from 'node:assert/strict';
import test from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { useNotificationsStore } from './notifications.js';

test('fetchNotifications replaces the inbox and reports fresh unread ids', async () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        notifications: [
          {
            id: 1,
            kind: 'gain',
            payload: { source: 'onboarding', grants: [{ type: 'ryos', amount: 30 }] },
            read: false,
            createdAt: Date.now(),
          },
        ],
        unreadCount: 1,
      };
    },
  });

  try {
    const first = await store.fetchNotifications();
    assert.equal(store.items.length, 1);
    assert.equal(first.fresh.length, 0);
    assert.equal(store.unreadCount, 1);

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          notifications: [
            {
              id: 2,
              kind: 'quest_ready',
              payload: { description: 'Win 1 fight' },
              read: false,
              createdAt: Date.now(),
            },
            {
              id: 1,
              kind: 'gain',
              payload: { source: 'onboarding', grants: [{ type: 'ryos', amount: 30 }] },
              read: true,
              createdAt: Date.now() - 1000,
            },
          ],
        };
      },
    });

    const second = await store.fetchNotifications();
    assert.equal(store.items.length, 2);
    assert.equal(second.fresh.length, 1);
    assert.equal(second.fresh[0].id, 2);
    assert.equal(store.unreadCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('markRead, markUnread and remove update local state then call the API', async () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();
  store.items = [
    { id: 10, kind: 'gain', payload: {}, read: false, createdAt: 1 },
    { id: 11, kind: 'gain', payload: {}, read: false, createdAt: 2 },
  ];

  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  try {
    await store.markRead(10);
    assert.equal(store.items.find(n => n.id === 10)?.read, true);
    assert.equal(calls[0].method, 'POST');
    assert.match(calls[0].url, /\/api\/notifications\/10\/read$/);

    await store.markUnread(10);
    assert.equal(store.items.find(n => n.id === 10)?.read, false);
    assert.equal(calls[1].method, 'POST');
    assert.match(calls[1].url, /\/api\/notifications\/10\/unread$/);

    await store.remove(11);
    assert.equal(store.items.some(n => n.id === 11), false);
    assert.equal(calls[2].method, 'DELETE');
    assert.match(calls[2].url, /\/api\/notifications\/11$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

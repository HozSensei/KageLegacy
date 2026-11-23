import assert from 'node:assert/strict';
import test from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { useNotificationsStore } from './notifications.js';

test('pushOnce dedupes by key while push replaces sticky entries', () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();

  const first = store.pushOnce({
    kind: 'gain',
    dedupeKey: 'mission-recap:1',
    payload: { body: 'a' },
  });
  const second = store.pushOnce({
    kind: 'gain',
    dedupeKey: 'mission-recap:1',
    payload: { body: 'b' },
  });
  assert.ok(first);
  assert.equal(second, null);
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].payload.body, 'a');

  store.push({
    kind: 'quest_ready',
    dedupeKey: 'quest:9',
    sticky: true,
    payload: { description: 'old' },
  });
  store.push({
    kind: 'quest_ready',
    dedupeKey: 'quest:9',
    sticky: true,
    payload: { description: 'new' },
  });
  assert.equal(store.items.filter(i => i.kind === 'quest_ready').length, 1);
  assert.equal(store.items[0].payload.description, 'new');
  assert.equal(store.unreadCount, 2);
});

test('syncQuestReady keeps only currently claimable quests', () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();

  store.syncQuestReady(
    [
      {
        id: 1,
        progress: { isCompleted: true, isClaimed: false },
      },
      {
        id: 2,
        progress: { isCompleted: true, isClaimed: true },
      },
    ],
    quest => ({ payload: { questId: quest.id }, href: { name: 'battle-pass' } })
  );
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].dedupeKey, 'quest:1');

  store.syncQuestReady([], () => ({}));
  assert.equal(store.items.length, 0);
});

test('dismiss removes sticky notes and marks gains as read', () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();
  const gainId = store.push({ kind: 'gain', payload: { body: 'loot' } });
  store.push({
    kind: 'onboarding_ready',
    dedupeKey: 'onboarding:visit_shop',
    sticky: true,
    payload: { stepKey: 'visit_shop' },
  });

  store.dismiss(gainId);
  assert.equal(store.items.find(i => i.id === gainId)?.read, true);
  assert.equal(store.unreadCount, 1);

  store.dismiss(store.items.find(i => i.kind === 'onboarding_ready').id);
  assert.equal(store.items.some(i => i.kind === 'onboarding_ready'), false);
});

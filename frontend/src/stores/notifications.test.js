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

test('syncAchievementReady tracks claimable journal tiers', () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();

  store.syncAchievementReady(
    [
      {
        key: 'win_fights',
        tiers: [
          { tier: 1, claimable: true },
          { tier: 2, claimable: false },
        ],
      },
      {
        key: 'open_boosters',
        tiers: [{ tier: 1, claimable: false }],
      },
    ],
    ({ achievement, tier }) => ({
      payload: { achievementKey: achievement.key, tier: tier.tier },
      href: { name: 'journal' },
    })
  );
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].dedupeKey, 'achievement:win_fights:1');

  store.syncAchievementReady([], () => ({}));
  assert.equal(store.items.length, 0);
});

test('dismiss removes gains and sticky notes from the inbox', () => {
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
  assert.equal(store.items.some(i => i.id === gainId), false);
  assert.equal(store.unreadCount, 1);

  store.dismiss(store.items.find(i => i.kind === 'onboarding_ready').id);
  assert.equal(store.items.some(i => i.kind === 'onboarding_ready'), false);
  assert.equal(store.unreadCount, 0);
});

test('dismissed sticky claimables stay gone across resync until claimed', () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();
  const steps = [{ key: 'visit_profile', claimable: true, nameFr: 'Visiter ton profil' }];

  store.syncOnboardingReady(steps, step => ({
    payload: { stepKey: step.key, label: step.nameFr },
    href: { name: 'hub' },
  }));
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].dedupeKey, 'onboarding:visit_profile');

  store.dismiss(store.items[0].id);
  assert.equal(store.items.length, 0);

  // Changement de page → sync à nouveau : ne doit pas réapparaître.
  store.syncOnboardingReady(steps, step => ({
    payload: { stepKey: step.key, label: step.nameFr },
    href: { name: 'hub' },
  }));
  assert.equal(store.items.length, 0);

  // Après réclamation (plus claimable), le snooze est levé ; une future
  // claimabilité pourrait re-notifier (ex. reset admin).
  store.syncOnboardingReady([{ key: 'visit_profile', claimable: false }], () => ({}));
  store.syncOnboardingReady(steps, step => ({
    payload: { stepKey: step.key },
    href: { name: 'hub' },
  }));
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].dedupeKey, 'onboarding:visit_profile');
});

test('push preserves read flag when refreshing an existing dedupeKey', () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();
  store.push({
    kind: 'quest_ready',
    dedupeKey: 'quest:7',
    sticky: true,
    payload: { description: 'old' },
  });
  const quest = store.items.find(i => i.dedupeKey === 'quest:7');
  quest.read = true;
  store.push({
    kind: 'quest_ready',
    dedupeKey: 'quest:7',
    sticky: true,
    payload: { description: 'new' },
  });
  const refreshed = store.items.find(i => i.dedupeKey === 'quest:7');
  assert.equal(refreshed?.read, true);
  assert.equal(refreshed?.payload.description, 'new');
});

test('clearDedupe after claim allows a future ready notification', () => {
  setActivePinia(createPinia());
  const store = useNotificationsStore();
  store.syncOnboardingReady([{ key: 'visit_profile', claimable: true }], step => ({
    payload: { stepKey: step.key },
  }));
  store.dismiss(store.items[0].id);
  store.clearDedupe('onboarding:visit_profile');
  store.syncOnboardingReady([{ key: 'visit_profile', claimable: true }], step => ({
    payload: { stepKey: step.key },
  }));
  assert.equal(store.items.length, 1);
});

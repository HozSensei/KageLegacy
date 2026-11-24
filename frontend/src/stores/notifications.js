import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

const MAX_ITEMS = 40;

function newId() {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Inbox client des notifications TCG (gains, quêtes prêtes, récaps).
 * Les gains du Village restent dans villageRewards ; la cloche les agrège à l’affichage.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([]);
  /** Clés snoozées via « Marquer comme lu » — le sync ne les recrée pas tant qu’elles restent claimables. */
  const dismissedKeys = new Set();

  const unreadCount = computed(() => items.value.filter(item => !item.read).length);
  const unreadItems = computed(() => items.value.filter(item => !item.read));

  function rememberDismiss(dedupeKey) {
    if (dedupeKey) dismissedKeys.add(dedupeKey);
  }

  function forgetDismiss(dedupeKey) {
    if (dedupeKey) dismissedKeys.delete(dedupeKey);
  }

  /** Retire du snooze les clés d’un préfixe qui ne sont plus claimables. */
  function pruneDismissed(prefix, activeKeys) {
    for (const key of [...dismissedKeys]) {
      if (key.startsWith(prefix) && !activeKeys.has(key)) dismissedKeys.delete(key);
    }
  }

  function push(entry) {
    if (!entry?.kind) return null;
    const dedupeKey = entry.dedupeKey || null;

    if (dedupeKey && dismissedKeys.has(dedupeKey)) {
      return null;
    }

    if (dedupeKey) {
      const idx = items.value.findIndex(item => item.dedupeKey === dedupeKey);
      if (idx >= 0) {
        if (entry.once) return null;
        const prev = items.value[idx];
        const next = {
          ...prev,
          ...entry,
          id: prev.id,
          dedupeKey,
          createdAt: prev.createdAt,
          // Conserver « lu » sauf si l’appelant force explicitement.
          read: entry.read != null ? Boolean(entry.read) : Boolean(prev.read),
        };
        const copy = items.value.slice();
        copy.splice(idx, 1);
        items.value = [next, ...copy].slice(0, MAX_ITEMS);
        return next.id;
      }
    }

    const note = {
      id: entry.id || newId(),
      kind: entry.kind,
      dedupeKey,
      payload: entry.payload || {},
      href: entry.href ?? null,
      createdAt: entry.createdAt || Date.now(),
      read: Boolean(entry.read),
      sticky: Boolean(entry.sticky),
    };
    items.value = [note, ...items.value].slice(0, MAX_ITEMS);
    return note.id;
  }

  /** N’ajoute rien si une entrée avec le même dedupeKey existe déjà. */
  function pushOnce(entry) {
    return push({ ...entry, once: true });
  }

  function dismiss(id) {
    const item = items.value.find(n => n.id === id);
    if (!item) return;
    rememberDismiss(item.dedupeKey);
    if (item.sticky || item.dedupeKey) {
      items.value = items.value.filter(n => n.id !== id);
      return;
    }
    items.value = items.value.map(n => (n.id === id ? { ...n, read: true } : n));
  }

  function clearDedupe(dedupeKey) {
    if (!dedupeKey) return;
    forgetDismiss(dedupeKey);
    items.value = items.value.filter(n => n.dedupeKey !== dedupeKey);
  }

  function markAllRead() {
    for (const n of items.value) {
      rememberDismiss(n.dedupeKey);
    }
    items.value = items.value
      .filter(n => !n.sticky)
      .map(n => ({ ...n, read: true }));
  }

  /**
   * Aligne les rappels « quête prête » sur l’état serveur.
   * @param {Array} quests
   * @param {(quest: object) => object} buildEntry — retourne { payload, href }
   */
  function syncQuestReady(quests, buildEntry) {
    const ready = (quests || []).filter(
      q => q?.progress?.isCompleted && !q?.progress?.isClaimed && q.id != null
    );
    const keys = new Set(ready.map(q => `quest:${q.id}`));
    pruneDismissed('quest:', keys);
    items.value = items.value.filter(
      n =>
        n.kind !== 'quest_ready' ||
        (n.dedupeKey && keys.has(n.dedupeKey) && !dismissedKeys.has(n.dedupeKey))
    );
    for (const quest of ready) {
      const dedupeKey = `quest:${quest.id}`;
      if (dismissedKeys.has(dedupeKey)) continue;
      const built = buildEntry?.(quest) || {};
      push({
        kind: 'quest_ready',
        dedupeKey,
        sticky: true,
        payload: built.payload || { questId: quest.id },
        href: built.href ?? { name: 'battle-pass' },
      });
    }
  }

  /**
   * Aligne les rappels « étape guide réclamable ».
   * @param {Array} steps
   * @param {(step: object) => object} buildEntry
   */
  function syncOnboardingReady(steps, buildEntry) {
    const ready = (steps || []).filter(s => s?.claimable && s.key);
    const keys = new Set(ready.map(s => `onboarding:${s.key}`));
    pruneDismissed('onboarding:', keys);
    items.value = items.value.filter(
      n =>
        n.kind !== 'onboarding_ready' ||
        (n.dedupeKey && keys.has(n.dedupeKey) && !dismissedKeys.has(n.dedupeKey))
    );
    for (const step of ready) {
      const dedupeKey = `onboarding:${step.key}`;
      if (dismissedKeys.has(dedupeKey)) continue;
      const built = buildEntry?.(step) || {};
      push({
        kind: 'onboarding_ready',
        dedupeKey,
        sticky: true,
        payload: built.payload || { stepKey: step.key },
        href: built.href ?? { name: 'hub' },
      });
    }
  }

  /**
   * Aligne les rappels « succès / défi réclamable » (paliers du journal).
   * @param {Array} achievements
   * @param {(entry: { achievement: object, tier: object }) => object} buildEntry
   */
  function syncAchievementReady(achievements, buildEntry) {
    const ready = [];
    for (const achievement of achievements || []) {
      if (!achievement?.key) continue;
      for (const tier of achievement.tiers || []) {
        if (tier?.claimable) ready.push({ achievement, tier });
      }
    }
    const keys = new Set(
      ready.map(({ achievement, tier }) => `achievement:${achievement.key}:${tier.tier}`)
    );
    pruneDismissed('achievement:', keys);
    items.value = items.value.filter(
      n =>
        n.kind !== 'achievement_ready' ||
        (n.dedupeKey && keys.has(n.dedupeKey) && !dismissedKeys.has(n.dedupeKey))
    );
    for (const entry of ready) {
      const dedupeKey = `achievement:${entry.achievement.key}:${entry.tier.tier}`;
      if (dismissedKeys.has(dedupeKey)) continue;
      const built = buildEntry?.(entry) || {};
      push({
        kind: 'achievement_ready',
        dedupeKey,
        sticky: true,
        payload:
          built.payload || {
            achievementKey: entry.achievement.key,
            tier: entry.tier.tier,
          },
        href: built.href ?? { name: 'journal' },
      });
    }
  }

  function reset() {
    items.value = [];
    dismissedKeys.clear();
  }

  return {
    items,
    unreadCount,
    unreadItems,
    push,
    pushOnce,
    dismiss,
    clearDedupe,
    markAllRead,
    syncQuestReady,
    syncOnboardingReady,
    syncAchievementReady,
    reset,
  };
});

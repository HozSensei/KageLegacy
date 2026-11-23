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

  const unreadCount = computed(() => items.value.filter(item => !item.read).length);
  const unreadItems = computed(() => items.value.filter(item => !item.read));

  function push(entry) {
    if (!entry?.kind) return null;
    const dedupeKey = entry.dedupeKey || null;

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
          read: entry.read ?? false,
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
    if (item.sticky || item.dedupeKey) {
      items.value = items.value.filter(n => n.id !== id);
      return;
    }
    items.value = items.value.map(n => (n.id === id ? { ...n, read: true } : n));
  }

  function clearDedupe(dedupeKey) {
    if (!dedupeKey) return;
    items.value = items.value.filter(n => n.dedupeKey !== dedupeKey);
  }

  function markAllRead() {
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
    items.value = items.value.filter(
      n => n.kind !== 'quest_ready' || (n.dedupeKey && keys.has(n.dedupeKey))
    );
    for (const quest of ready) {
      const built = buildEntry?.(quest) || {};
      push({
        kind: 'quest_ready',
        dedupeKey: `quest:${quest.id}`,
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
    items.value = items.value.filter(
      n => n.kind !== 'onboarding_ready' || (n.dedupeKey && keys.has(n.dedupeKey))
    );
    for (const step of ready) {
      const built = buildEntry?.(step) || {};
      push({
        kind: 'onboarding_ready',
        dedupeKey: `onboarding:${step.key}`,
        sticky: true,
        payload: built.payload || { stepKey: step.key },
        href: built.href ?? { name: 'hub' },
      });
    }
  }

  function reset() {
    items.value = [];
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
    reset,
  };
});

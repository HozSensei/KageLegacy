import { ref, shallowRef } from 'vue';
import { requestDeckDuels } from './useDeckDuels.js';

export const villageRewardsHash = '#village-rewards';
const endpoint = '/village-rewards';

function parseRewards(data) {
  if (
    !Array.isArray(data.rewards) ||
    !data.rewards.every(
      reward =>
        reward &&
        ['weekStart', 'weekEnd', 'settledAt'].every(
          key => typeof reward[key] === 'string' && Number.isFinite(Date.parse(reward[key]))
        ) &&
        reward.factionId != null &&
        Number.isSafeInteger(reward.ryos) &&
        reward.ryos > 0
    )
  ) {
    throw new Error('Invalid village rewards');
  }
  return [...data.rewards].sort((a, b) => Date.parse(b.weekStart) - Date.parse(a.weekStart));
}

function parseUnreadCount(data) {
  if (!Number.isSafeInteger(data?.unreadCount) || data.unreadCount < 0) {
    throw new Error('Invalid village unread count');
  }
  return data.unreadCount;
}

export function useVillageRewards({ request = requestDeckDuels } = {}) {
  const rewards = shallowRef(null);
  const unreadCount = ref(0);
  const loading = ref(false);
  const loadFailed = ref(false);
  const readFailed = ref(false);
  let session = new AbortController();
  let pendingLoad;
  let pendingRead;
  let lastGet;

  function refresh() {
    const { signal } = session;
    if (pendingLoad) return pendingLoad;
    // A GET that started before a POST completed could restore a stale unread count.
    if (pendingRead) return pendingRead.then(() => (signal.aborted ? null : refresh()));

    loading.value = true;
    loadFailed.value = false;
    readFailed.value = false;
    lastGet = null;
    pendingLoad = Promise.resolve().then(async () => {
      if (signal.aborted) return null;
      try {
        const data = await request(endpoint, { signal });
        if (signal.aborted) return null;
        const count = parseUnreadCount(data);
        const list = parseRewards(data);
        rewards.value = list;
        unreadCount.value = count;
        lastGet = { unreadCount: count, throughWeekStart: list[0]?.weekStart };
        return lastGet;
      } catch {
        if (!signal.aborted) loadFailed.value = true;
        return null;
      } finally {
        if (!signal.aborted) {
          pendingLoad = undefined;
          loading.value = false;
        }
      }
    });
    return pendingLoad;
  }

  function markSeen(snapshot) {
    if (
      pendingRead ||
      !snapshot ||
      snapshot !== lastGet ||
      !snapshot.unreadCount ||
      !snapshot.throughWeekStart
    )
      return;
    const { signal } = session;
    const { throughWeekStart } = snapshot;
    // This authorization comes from the displayed GET, never from today or a POST response.
    lastGet = null;
    pendingRead = Promise.resolve().then(async () => {
      if (signal.aborted) return;
      try {
        const data = await request(`${endpoint}/read`, {
          method: 'POST',
          payload: { throughWeekStart },
          signal,
        });
        if (signal.aborted) return;
        const count = parseUnreadCount(data);
        if ('rewards' in data) rewards.value = parseRewards(data);
        unreadCount.value = count;
      } catch {
        if (!signal.aborted) readFailed.value = true;
      } finally {
        if (!signal.aborted) pendingRead = undefined;
      }
    });
    return pendingRead;
  }

  function reset() {
    session.abort();
    session = new AbortController();
    pendingLoad = undefined;
    pendingRead = undefined;
    lastGet = null;
    rewards.value = null;
    unreadCount.value = 0;
    loading.value = false;
    loadFailed.value = false;
    readFailed.value = false;
  }

  return { rewards, unreadCount, loading, loadFailed, readFailed, refresh, markSeen, reset };
}

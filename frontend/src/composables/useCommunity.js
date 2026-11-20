import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { requestDeckDuels } from './useDeckDuels.js';

export const friendGroups = ['friends', 'incoming', 'outgoing'];
export const maxSearchLength = 100;

export function useCommunity({ request = requestDeckDuels } = {}) {
  const friendships = shallowRef(null);
  const busy = ref(false);
  const friendsError = ref(null);
  const updated = ref(false);
  const canMutate = computed(
    () => Boolean(friendships.value) && !busy.value && !friendsError.value
  );
  const friendStatuses = computed(() => {
    const statuses = new Map();
    for (const group of friendGroups) {
      for (const player of friendships.value?.[group] ?? []) {
        statuses.set(String(player.id), group);
      }
    }
    return statuses;
  });

  const players = shallowRef(null);
  const searching = ref(false);
  const searchFailed = ref(false);
  let operation;
  let lookup;

  async function syncFriends(path, options) {
    if (busy.value) return;
    const controller = new AbortController();
    const isMutation = options !== undefined;
    operation = controller;
    busy.value = true;
    friendsError.value = null;
    updated.value = false;
    try {
      const data = await request(path, { ...options, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!friendGroups.every(group => Array.isArray(data?.[group]))) {
        throw new Error('Invalid friends response');
      }
      friendships.value = data;
      updated.value = isMutation;
    } catch {
      // A write may have succeeded even if its response was lost; require a refresh.
      if (!controller.signal.aborted)
        friendsError.value = isMutation ? 'updateFailed' : 'loadFailed';
    } finally {
      operation = undefined;
      busy.value = false;
    }
  }

  function refresh() {
    return syncFriends('/friends');
  }

  function requestFriend(playerId) {
    if (!canMutate.value || playerId == null || friendStatuses.value.has(String(playerId))) return;
    return syncFriends('/friends', { method: 'POST', payload: { playerId } });
  }

  function acceptFriend(playerId) {
    if (!canMutate.value || friendStatuses.value.get(String(playerId)) !== 'incoming') return;
    return syncFriends(`/friends/${encodeURIComponent(playerId)}/accept`, { method: 'POST' });
  }

  function removeFriend(playerId) {
    if (!canMutate.value || !friendStatuses.value.has(String(playerId))) return;
    return syncFriends(`/friends/${encodeURIComponent(playerId)}`, { method: 'DELETE' });
  }

  function clearSearch() {
    lookup?.abort();
    lookup = undefined;
    players.value = null;
    searching.value = false;
    searchFailed.value = false;
  }

  async function search(query) {
    clearSearch();
    const q = query.trim();
    if (!q || q.length > maxSearchLength) return;
    const controller = new AbortController();
    lookup = controller;
    searching.value = true;
    try {
      const data = await request(`/opponents?${new URLSearchParams({ q })}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!Array.isArray(data?.opponents)) throw new Error('Invalid search response');
      players.value = data.opponents;
    } catch {
      if (!controller.signal.aborted) searchFailed.value = true;
    } finally {
      if (lookup === controller) {
        lookup = undefined;
        searching.value = false;
      }
    }
  }

  onScopeDispose(() => {
    operation?.abort();
    lookup?.abort();
  });

  return {
    friendships,
    busy,
    friendsError,
    updated,
    canMutate,
    friendStatuses,
    players,
    searching,
    searchFailed,
    refresh,
    requestFriend,
    acceptFriend,
    removeFriend,
    clearSearch,
    search,
  };
}

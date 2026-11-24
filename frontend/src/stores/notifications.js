import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { parseApiResponse, readApiError } from '../utils/http.js';

const API_BASE = import.meta.env?.VITE_API_URL || '';

function noteAffectsBalances(note) {
  if (!note || note.kind !== 'gain') return false;
  const grants = Array.isArray(note.payload?.grants) ? note.payload.grants : [];
  return grants.some(g => {
    if (!g || g.skipped) return false;
    return ['ryos', 'dust', 'essence', 'kage_coins'].includes(g.type) && Number(g.amount) > 0;
  });
}

/**
 * Inbox alimentée par GET /api/notifications (persistée en DB, max 30).
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);
  /** Ids déjà vus — pour toaster uniquement les nouvelles arrivées. */
  const knownIds = ref(new Set());
  const hydrated = ref(false);

  const unreadCount = computed(() => items.value.filter(item => !item.read).length);
  const unreadItems = computed(() => items.value.filter(item => !item.read));

  function normalize(note) {
    return {
      id: note.id,
      kind: note.kind,
      dedupeKey: note.dedupeKey || null,
      payload: note.payload || {},
      href: note.href || null,
      read: Boolean(note.read),
      createdAt: note.createdAt || Date.now(),
      sticky: ['quest_ready', 'onboarding_ready', 'achievement_ready', 'village_reward'].includes(
        note.kind
      ),
    };
  }

  async function fetchNotifications() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      const list = (body.notifications || []).map(normalize);
      const prevKnown = knownIds.value;
      const nextKnown = new Set(list.map(n => n.id));
      const fresh = hydrated.value
        ? list.filter(n => !n.read && !prevKnown.has(n.id))
        : [];
      items.value = list;
      knownIds.value = nextKnown;
      hydrated.value = true;
      // Les gains (mission, succès, BP…) créditent le compte sans passer par /shop :
      // rafraîchir le portefeuille dès qu’une notif de ressources arrive.
      if (fresh.some(noteAffectsBalances)) {
        try {
          const { useShopStore } = await import('./shop.js');
          await useShopStore().fetchBalances();
        } catch {
          /* soldes optionnels */
        }
      }
      return { notifications: list, fresh };
    } catch (e) {
      error.value = e.message;
      return { notifications: items.value, fresh: [] };
    } finally {
      loading.value = false;
    }
  }

  async function markRead(id) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    items.value = items.value.map(n => (n.id === numericId ? { ...n, read: true } : n));
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${numericId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      return body;
    } catch (e) {
      error.value = e.message;
      await fetchNotifications();
      return null;
    }
  }

  async function markUnread(id) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    items.value = items.value.map(n => (n.id === numericId ? { ...n, read: false } : n));
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${numericId}/unread`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      return body;
    } catch (e) {
      error.value = e.message;
      await fetchNotifications();
      return null;
    }
  }

  async function remove(id) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    items.value = items.value.filter(n => n.id !== numericId);
    knownIds.value.delete(numericId);
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${numericId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      return body;
    } catch (e) {
      error.value = e.message;
      await fetchNotifications();
      return null;
    }
  }

  async function markAllRead() {
    items.value = items.value.map(n => ({ ...n, read: true }));
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      return body;
    } catch (e) {
      error.value = e.message;
      await fetchNotifications();
      return null;
    }
  }

  function reset() {
    items.value = [];
    knownIds.value = new Set();
    hydrated.value = false;
    error.value = null;
  }

  return {
    items,
    loading,
    error,
    hydrated,
    unreadCount,
    unreadItems,
    fetchNotifications,
    markRead,
    markUnread,
    remove,
    markAllRead,
    reset,
  };
});

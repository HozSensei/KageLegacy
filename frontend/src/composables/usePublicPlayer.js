import { ref } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || '';

const cache = new Map();

export async function fetchPublicPlayer(userId, { signal, force = false } = {}) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!force && cache.has(id)) return cache.get(id);

  const res = await fetch(`${API_BASE}/api/players/${id}/public`, {
    credentials: 'include',
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || 'public_profile_failed'), { status: res.status });
  }
  const data = await res.json();
  const player = data.player || null;
  if (player) cache.set(id, player);
  return player;
}

function resolveAnchor(anchorOrEvent) {
  if (!anchorOrEvent) return null;
  if (typeof anchorOrEvent.getBoundingClientRect === 'function') return anchorOrEvent;
  const fromCurrent = anchorOrEvent.currentTarget;
  if (fromCurrent && typeof fromCurrent.getBoundingClientRect === 'function') return fromCurrent;
  const target = anchorOrEvent.target;
  if (target && typeof target.closest === 'function') {
    return target.closest('.identity-chip') || target;
  }
  return null;
}

export function usePublicPlayerModal() {
  const open = ref(false);
  const loading = ref(false);
  const error = ref(null);
  const player = ref(null);
  const anchor = ref(null);

  async function show(userId, anchorOrEvent) {
    anchor.value = resolveAnchor(anchorOrEvent);
    open.value = true;
    loading.value = true;
    error.value = null;
    player.value = cache.get(Number(userId)) || null;
    try {
      player.value = await fetchPublicPlayer(userId, { force: true });
    } catch (err) {
      error.value = err?.message || 'load_failed';
    } finally {
      loading.value = false;
    }
  }

  function close() {
    open.value = false;
    anchor.value = null;
  }

  return { open, loading, error, player, anchor, show, close };
}

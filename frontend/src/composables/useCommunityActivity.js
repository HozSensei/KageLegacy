import { onScopeDispose, ref, shallowRef, watch } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || '';
const PAGE_SIZE = 20;

async function requestActivity(params, { signal } = {}) {
  const query = new URLSearchParams();
  query.set('limit', String(params.limit || PAGE_SIZE));
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.factionId) query.set('factionId', params.factionId);
  if (params.outcome) query.set('outcome', params.outcome);

  const res = await fetch(`${API_BASE}/api/community/activity?${query}`, {
    credentials: 'include',
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || 'activity_failed'), { status: res.status });
  }
  return res.json();
}

export function useCommunityActivity() {
  const events = shallowRef([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const loadFailed = ref(false);
  const hasMore = ref(false);
  const nextCursor = ref(null);
  const factionId = ref(null);
  const outcome = ref(null);
  let controller;

  async function load({ append = false } = {}) {
    controller?.abort();
    controller = new AbortController();
    if (append) loadingMore.value = true;
    else {
      loading.value = true;
      events.value = [];
      nextCursor.value = null;
      hasMore.value = false;
    }
    loadFailed.value = false;
    try {
      const data = await requestActivity(
        {
          limit: PAGE_SIZE,
          cursor: append ? nextCursor.value : null,
          factionId: factionId.value,
          outcome: outcome.value,
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const page = Array.isArray(data.events) ? data.events : [];
      events.value = append ? [...events.value, ...page] : page;
      nextCursor.value = data.nextCursor || null;
      hasMore.value = Boolean(data.hasMore && data.nextCursor);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (!controller.signal.aborted) loadFailed.value = true;
    } finally {
      loading.value = false;
      loadingMore.value = false;
    }
  }

  function refresh() {
    return load({ append: false });
  }

  function loadMore() {
    if (!hasMore.value || loading.value || loadingMore.value) return;
    return load({ append: true });
  }

  function setFactionFilter(value) {
    factionId.value = value || null;
  }

  function setOutcomeFilter(value) {
    outcome.value = value || null;
  }

  watch([factionId, outcome], () => refresh());

  onScopeDispose(() => controller?.abort());

  return {
    events,
    loading,
    loadingMore,
    loadFailed,
    hasMore,
    factionId,
    outcome,
    refresh,
    loadMore,
    setFactionFilter,
    setOutcomeFilter,
    pageSize: PAGE_SIZE,
  };
}

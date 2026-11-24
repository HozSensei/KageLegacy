import { onScopeDispose, ref, shallowRef } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

async function defaultRequest(path, { method = 'GET', payload, signal } = {}) {
  const base = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${base}/api/coop${path}`, {
    credentials: 'include',
    signal,
    ...(method === 'GET' && payload === undefined
      ? { cache: 'no-store' }
      : {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: payload === undefined ? undefined : JSON.stringify(payload),
        }),
  });
  const { ok, body } = await parseApiResponse(res);
  if (!ok) {
    const error = new Error(await readApiError(res, body));
    error.code = body?.code ?? null;
    error.status = res.status;
    throw error;
  }
  return body;
}

export function useCoopApi({ interval = 2000, request = defaultRequest } = {}) {
  const room = shallowRef(null);
  const run = shallowRef(null);
  const busy = ref(false);
  const pollFailed = ref(false);
  let timer;
  let current;
  let disposed = false;

  function cancelPending() {
    clearTimeout(timer);
    const pending = current;
    current = undefined;
    pending?.abort();
  }

  function reset() {
    cancelPending();
    room.value = null;
    run.value = null;
    busy.value = false;
    pollFailed.value = false;
  }

  function schedulePoll() {
    if (disposed) return;
    const roomId = room.value?.id;
    const runId = run.value?.id;
    if (!roomId && !runId) return;
    if (run.value && ['victory', 'defeat', 'abandoned'].includes(run.value.state)) return;
    if (room.value?.status === 'closed' && !runId) return;
    timer = setTimeout(() => {
      refresh().catch(() => {});
    }, interval);
  }

  async function runRequest(path, options = {}) {
    if (disposed || busy.value) return null;
    const isWrite = options.method && options.method !== 'GET';
    cancelPending();
    const controller = new AbortController();
    current = controller;
    busy.value = Boolean(isWrite);
    try {
      const body = await request(path, { ...options, signal: controller.signal });
      if (current !== controller) return null;
      if (body.room) room.value = body.room;
      if (body.run) {
        const prevAlly = run.value?.ally;
        const nextAlly = body.run.ally;
        const ally =
          nextAlly && prevAlly
            ? {
                ...nextAlly,
                userId: nextAlly.userId ?? prevAlly.userId ?? null,
                name: nextAlly.name || prevAlly.name || null,
                level: nextAlly.level ?? prevAlly.level ?? null,
                profile: nextAlly.profile || prevAlly.profile || null,
              }
            : nextAlly;
        run.value = {
          ...body.run,
          ally,
          combat:
            body.combat !== undefined
              ? body.combat
              : body.run.combat !== undefined
                ? body.run.combat
                : run.value?.combat && body.run.currentCombatId
                  ? run.value.combat
                  : null,
        };
      } else if (body.combat && run.value) {
        run.value = { ...run.value, combat: body.combat };
      }
      pollFailed.value = false;
      return body;
    } catch (error) {
      if (current !== controller) return null;
      if (!isWrite) pollFailed.value = true;
      throw error;
    } finally {
      if (current === controller) {
        current = undefined;
        busy.value = false;
        schedulePoll();
      }
    }
  }

  async function refresh() {
    if (run.value?.id) {
      return runRequest(`/runs/${encodeURIComponent(run.value.id)}`);
    }
    if (room.value?.id) {
      return runRequest(`/rooms/${encodeURIComponent(room.value.id)}`);
    }
    return runRequest('/me');
  }

  onScopeDispose(() => {
    disposed = true;
    cancelPending();
  });

  return {
    room,
    run,
    busy,
    pollFailed,
    reset,
    refresh,
    loadMe: () => runRequest('/me'),
    createRoom: () => runRequest('/', { method: 'POST', payload: {} }),
    joinRoom: code => runRequest('/join', { method: 'POST', payload: { code } }),
    setupRoom: (id, payload) =>
      runRequest(`/rooms/${encodeURIComponent(id)}/setup`, { method: 'PATCH', payload }),
    setStake: (id, stake) =>
      runRequest(`/rooms/${encodeURIComponent(id)}/stake`, {
        method: 'PATCH',
        payload: { stake },
      }),
    setReady: (id, ready = true) =>
      runRequest(`/rooms/${encodeURIComponent(id)}/ready`, {
        method: 'POST',
        payload: { ready },
      }),
    startMission: id =>
      runRequest(`/rooms/${encodeURIComponent(id)}/start`, { method: 'POST', payload: {} }),
    closeRoom: id =>
      runRequest(`/rooms/${encodeURIComponent(id)}/close`, { method: 'POST', payload: {} }),
    enterNode: runId =>
      runRequest(`/runs/${encodeURIComponent(runId)}/enter`, { method: 'POST', payload: {} }),
    setNodeReady: (runId, ready = true) =>
      runRequest(`/runs/${encodeURIComponent(runId)}/node-ready`, {
        method: 'POST',
        payload: { ready },
      }),
    shopBuy: (runId, itemId, replaceSlot = null) =>
      runRequest(`/runs/${encodeURIComponent(runId)}/shop/buy`, {
        method: 'POST',
        payload: { itemId, replaceSlot },
      }),
    inventoryUse: (runId, slotIndex) =>
      runRequest(`/runs/${encodeURIComponent(runId)}/inventory/use`, {
        method: 'POST',
        payload: { slotIndex },
      }),
    inventoryDiscard: (runId, slotIndex) =>
      runRequest(`/runs/${encodeURIComponent(runId)}/inventory/discard`, {
        method: 'POST',
        payload: { slotIndex },
      }),
    resolveEvent: (runId, choiceId) =>
      runRequest(`/runs/${encodeURIComponent(runId)}/resolve-event`, {
        method: 'POST',
        payload: { choiceId },
      }),
    combatAction: (runId, payload) =>
      runRequest(`/runs/${encodeURIComponent(runId)}/action`, {
        method: 'POST',
        payload: {
          ...payload,
          revision: run.value?.combat?.revision ?? payload.revision,
        },
      }),
    abandon: runId =>
      runRequest(`/runs/${encodeURIComponent(runId)}/abandon`, { method: 'POST', payload: {} }),
  };
}

/** @deprecated use useCoopApi — kept for existing tests expecting room polling shape */
export function useCoopRoom(options) {
  const api = useCoopApi(options);
  return {
    room: api.room,
    busy: api.busy,
    pollFailed: api.pollFailed,
    reset: api.reset,
    create: api.createRoom,
    join: api.joinRoom,
    action: payload => {
      if (api.run.value?.id) return api.combatAction(api.run.value.id, payload);
      return false;
    },
  };
}

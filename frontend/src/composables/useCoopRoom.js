import { onScopeDispose, ref, shallowRef } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

async function requestRoom(path, { payload, signal }) {
  const base = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${base}/api/coop${path}`, {
    credentials: 'include',
    signal,
    ...(payload === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
  });
  const { ok, body } = await parseApiResponse(res);
  if (!ok) {
    const error = new Error(await readApiError(res, body));
    error.code = body?.code ?? (body?.error === 'FRIENDLY_FIRE_CONFIRMATION' ? body.error : null);
    throw error;
  }
  if (!body?.room?.id) throw new Error('Invalid coop room response');
  return body.room;
}

export function useCoopRoom({ request = requestRoom, interval = 1500 } = {}) {
  const room = shallowRef(null);
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
    busy.value = false;
    pollFailed.value = false;
  }

  function schedulePoll() {
    if (!disposed && room.value && room.value.status !== 'finished') {
      timer = setTimeout(
        () => run(`/${encodeURIComponent(room.value.id)}`).catch(() => {}),
        interval
      );
    }
  }

  async function run(path, payload) {
    if (disposed || busy.value) return false;
    const isWrite = payload !== undefined;
    // An action supersedes any read already in flight, even if abort arrives too late.
    cancelPending();
    const controller = new AbortController();
    current = controller;
    busy.value = isWrite;
    try {
      const snapshot = await request(path, { payload, signal: controller.signal });
      if (current !== controller) return false;
      const previous = room.value;
      if (
        snapshot.id === previous?.id &&
        Number.isFinite(snapshot.revision) &&
        Number.isFinite(previous.revision) &&
        snapshot.revision < previous.revision
      ) {
        return false;
      }
      room.value = snapshot;
      pollFailed.value = false;
      return true;
    } catch (error) {
      if (current !== controller) return false;
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

  onScopeDispose(() => {
    disposed = true;
    cancelPending();
  });

  return {
    room,
    busy,
    pollFailed,
    reset,
    create: () => run('', {}),
    join: code => run('/join', { code }),
    action: payload =>
      room.value
        ? run(`/${encodeURIComponent(room.value.id)}/action`, {
            ...payload,
            revision: room.value.revision,
          })
        : false,
  };
}

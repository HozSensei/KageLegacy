import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { parseApiResponse } from '../utils/http.js';

const isMissing = status => status === 404 || status === 410;
const isInvalid = status => [400, 403, 422].includes(status);
const cardActions = ['play', 'discard_chakra', 'discard_draw'];

const duelPath = id => `/${encodeURIComponent(id)}`;

export async function requestDeckDuels(path, { method = 'GET', payload, signal } = {}) {
  const base = import.meta.env.VITE_API_URL || '';
  const response = await fetch(`${base}/api/deck-duels${path}`, {
    method,
    signal,
    credentials: 'include',
    ...(method === 'GET' ? { cache: 'no-store' } : {}),
    ...(payload === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  });
  const { ok, body, status } = await parseApiResponse(response);
  if (!ok) throw Object.assign(new Error(`Deck duels HTTP ${status}`), { status });
  return body;
}

export function useDeckDuels({ request = requestDeckDuels } = {}) {
  const lobbyLoaded = ref(false);
  const defenses = shallowRef([]);
  const duel = shallowRef(null);
  const selectedId = ref(null);
  const busy = ref(false);
  const needsSync = ref(true);
  const feedback = ref(null);
  const friends = shallowRef(null);
  const friendsLoadFailed = ref(false);

  const locked = computed(() => busy.value || needsSync.value);
  let operation;

  function applyDuel(snapshot, expectedId = null) {
    if (
      snapshot?.id == null ||
      (expectedId != null && String(snapshot.id) !== String(expectedId)) ||
      !Number.isInteger(snapshot.revision) ||
      !['in_progress', 'victory', 'defeat', 'forfeited'].includes(snapshot.state) ||
      (snapshot.state === 'in_progress' && (!snapshot.player || !snapshot.enemy))
    ) {
      throw new Error('Invalid duel snapshot');
    }
    if (
      snapshot.id !== duel.value?.id ||
      !(snapshot.player?.hand || []).some(card => card.instanceId === selectedId.value)
    ) {
      selectedId.value = null;
    }
    duel.value = snapshot;
  }

  function clearDuel() {
    duel.value = null;
    selectedId.value = null;
  }

  async function fetchDuel(id, send) {
    const { duel: snapshot } = await send(duelPath(id));
    applyDuel(snapshot, id);
  }

  async function loadFriends(send) {
    friendsLoadFailed.value = false;
    try {
      const data = await send('/friends');
      if (!Array.isArray(data?.friends)) throw new Error('Invalid duel friends response');
      friends.value = data.friends;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      friendsLoadFailed.value = true;
    }
  }

  async function syncLobby(send) {
    needsSync.value = true;
    const lobby = await send('');
    if (!Array.isArray(lobby?.defenses)) throw new Error('Invalid duel lobby');
    defenses.value = lobby.defenses;
    const previousId = duel.value?.state === 'in_progress' ? duel.value.id : null;
    const id = lobby.activeDuelId ?? previousId;
    if (id != null) {
      try {
        await fetchDuel(id, send);
      } catch (error) {
        if (!isMissing(error.status)) throw error;
        clearDuel();
        feedback.value = 'duelUnavailable';
      }
    }
    lobbyLoaded.value = true;
    needsSync.value = false;
    if (!duel.value) await loadFriends(send);
  }

  async function run(fallback, work) {
    if (busy.value) return;
    const controller = new AbortController();
    operation = controller;
    busy.value = true;
    feedback.value = null;
    const send = async (path, options) => {
      try {
        return await request(path, { ...options, signal: controller.signal });
      } finally {
        controller.signal.throwIfAborted();
      }
    };
    try {
      await work(send);
    } catch {
      if (!controller.signal.aborted) feedback.value = fallback;
    } finally {
      operation = undefined;
      busy.value = false;
    }
  }

  function refresh() {
    return run('loadFailed', syncLobby);
  }

  function start(mode, defenderId) {
    if (locked.value || duel.value) return;
    if (!['friend', 'random', 'enemy_faction'].includes(mode)) return;
    if (
      mode === 'friend' &&
      (friendsLoadFailed.value || !friends.value?.some(friend => friend.id === defenderId))
    )
      return;
    const payload = mode === 'friend' ? { mode, defenderId } : { mode };
    return run('startFailed', async send => {
      try {
        const { duel: snapshot } = await send('', { method: 'POST', payload });
        applyDuel(snapshot);
      } catch (error) {
        if (error.status === 409) {
          await syncLobby(send);
          feedback.value = 'startConflict';
        } else if (isInvalid(error.status) || isMissing(error.status)) {
          feedback.value = 'opponentUnavailable';
        } else {
          // A write may have succeeded even if its response was lost.
          needsSync.value = true;
          throw error;
        }
      }
    });
  }

  function act(type, instanceId = selectedId.value) {
    const current = duel.value;
    if (locked.value || current?.state !== 'in_progress') return;
    if (type !== 'forfeit' && current.currentPhase !== 'player_turn') return;
    const withCard = cardActions.includes(type);
    if (withCard) {
      if (
        instanceId == null ||
        !current.player.hand?.some(card => card.instanceId === instanceId)
      ) {
        return;
      }
    } else if (type !== 'forfeit' && type !== 'end_turn') {
      return;
    }

    return run('actionFailed', async send => {
      try {
        const { duel: snapshot } = await send(`${duelPath(current.id)}/action`, {
          method: 'POST',
          payload: { type, ...(withCard ? { instanceId } : {}), revision: current.revision },
        });
        applyDuel(snapshot, current.id);
      } catch (error) {
        if (error.status === 409 || isMissing(error.status)) {
          needsSync.value = true;
          selectedId.value = null;
          try {
            await fetchDuel(current.id, send);
            needsSync.value = false;
            feedback.value = 'actionConflict';
          } catch (reloadError) {
            if (!isMissing(reloadError.status)) throw reloadError;
            clearDuel();
            await syncLobby(send);
            feedback.value = 'duelUnavailable';
          }
        } else if (isInvalid(error.status)) {
          feedback.value = 'invalidAction';
        } else {
          needsSync.value = true;
          throw error;
        }
      }
    });
  }

  function returnToLobby() {
    clearDuel();
    return refresh();
  }

  onScopeDispose(() => {
    operation?.abort();
  });

  return {
    lobbyLoaded,
    defenses,
    duel,
    selectedId,
    busy,
    needsSync,
    feedback,
    locked,
    friends,
    friendsLoadFailed,

    refresh,
    start,
    act,
    returnToLobby,
  };
}

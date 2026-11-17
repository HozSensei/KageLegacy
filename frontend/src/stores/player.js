import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const usePlayerStore = defineStore('player', () => {
  const character = ref(null);
  const stats = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const checked = ref(false);
  const characterState = ref('idle');

  const hasCharacter = computed(() => Boolean(character.value));
  const hasConfirmedCharacterAbsence = computed(() => characterState.value === 'absent');
  const talentPoints = computed(() => character.value?.talentPointsAvailable ?? 0);

  async function fetchPlayer() {
    loading.value = true;
    error.value = null;
    characterState.value = 'loading';
    try {
      const res = await fetch(`${API_BASE}/api/player`, { credentials: 'include' });
      if (res.status === 404) {
        character.value = null;
        stats.value = null;
        characterState.value = 'absent';
        return null;
      }
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (!body.character) throw new Error('Invalid player response');
      character.value = body.character;
      stats.value = body.character.stats ?? null;
      characterState.value = 'ready';
      return character.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      characterState.value = 'error';
      return null;
    } finally {
      loading.value = false;
      checked.value = true;
    }
  }

  async function fetchStats() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/player/stats`, { credentials: 'include' });
      if (res.status === 404) {
        stats.value = null;
        return null;
      }
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      stats.value = body.stats;
      return stats.value;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createCharacter({ name, factionId, avatarUrl }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/player/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          factionId: factionId || null,
          avatarUrl: avatarUrl || null,
        }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      character.value = body.character;
      stats.value = body.character?.stats ?? null;
      checked.value = true;
      return character.value;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    character.value = null;
    stats.value = null;
    error.value = null;
    checked.value = false;
    characterState.value = 'idle';
  }

  return {
    character,
    stats,
    loading,
    error,
    checked,
    characterState,
    hasCharacter,
    hasConfirmedCharacterAbsence,
    talentPoints,

    fetchPlayer,
    fetchStats,
    createCharacter,
    reset,
  };
});

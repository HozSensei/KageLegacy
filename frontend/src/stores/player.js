import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const usePlayerStore = defineStore('player', () => {
  const character = ref(null);
  const stats = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const savingProfile = ref(false);
  const profileError = ref(null);
  const checked = ref(false);
  const characterState = ref('idle');
  let profileSaveVersion = 0;

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

  async function createCharacter({ name, factionId, avatarId }) {
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
          avatarId,
        }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (!body.character) throw new Error('Invalid player response');
      character.value = body.character;
      stats.value = body.character.stats ?? null;
      characterState.value = 'ready';
      checked.value = true;
      return character.value;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateCharacterProfile(changes) {
    if (!character.value || savingProfile.value) return null;
    const version = ++profileSaveVersion;
    const characterId = character.value.id;
    savingProfile.value = true;
    profileError.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/player/character/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      if (!body.character?.profile) throw new Error('Invalid player profile response');
      if (
        version !== profileSaveVersion ||
        !character.value ||
        character.value.id !== characterId
      ) {
        return null;
      }
      character.value = { ...character.value, ...body.character };
      stats.value = character.value.stats ?? null;
      characterState.value = 'ready';
      return character.value.profile;
    } catch (e) {
      if (version === profileSaveVersion) {
        profileError.value = e instanceof Error ? e.message : String(e);
      }
      return null;
    } finally {
      if (version === profileSaveVersion) savingProfile.value = false;
    }
  }

  function reset() {
    profileSaveVersion += 1;
    savingProfile.value = false;
    character.value = null;
    stats.value = null;
    error.value = null;
    profileError.value = null;
    checked.value = false;
    characterState.value = 'idle';
  }

  return {
    character,
    stats,
    loading,
    error,
    savingProfile,
    profileError,
    checked,
    characterState,
    hasCharacter,
    hasConfirmedCharacterAbsence,
    talentPoints,

    fetchPlayer,
    fetchStats,
    createCharacter,
    updateCharacterProfile,
    reset,
  };
});

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useCombatStore = defineStore('combat', () => {
  const combat = ref(null);
  const recentLogs = ref([]);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref(null);
  const selectedInstanceId = ref(null);

  const hand = computed(() => combat.value?.player?.hand || []);
  const player = computed(() => combat.value?.player || null);
  const enemy = computed(() => combat.value?.enemy || null);
  const isOver = computed(() => ['victory', 'defeat', 'forfeited'].includes(combat.value?.state));
  const isPlayerTurn = computed(
    () => combat.value?.currentPhase === 'player_turn' && !isOver.value
  );

  function applyCombat(payload) {
    if (!payload) return;
    combat.value = payload;
    if (Array.isArray(payload.logs) && payload.logs.length) {
      recentLogs.value = [...payload.logs, ...recentLogs.value].slice(0, 40);
    }
    // Clear selection if card left the hand
    if (
      selectedInstanceId.value &&
      !(payload.player?.hand || []).some(c => c.instanceId === selectedInstanceId.value)
    ) {
      selectedInstanceId.value = null;
    }
  }

  /** Injecte un état combat déjà créé (ex. entrée nœud de run). */
  function hydrateFrom(payload) {
    recentLogs.value = [];
    applyCombat(payload);
  }

  async function startCombat(body = {}) {
    loading.value = true;
    error.value = null;
    recentLogs.value = [];
    try {
      const res = await fetch(`${API_BASE}/api/combat/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const { ok, body: data } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, data));
      applyCombat(data.combat);
      return data.combat;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchState(combatId) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/combat/${combatId}/state`, {
        credentials: 'include',
      });
      const { ok, body: data } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, data));
      applyCombat(data.combat);
      return data.combat;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function playCard(instanceId) {
    if (!combat.value?.id || !instanceId) return null;
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/combat/${combat.value.id}/play`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      });
      const { ok, body: data } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, data));
      applyCombat(data.combat);
      return data.combat;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function endTurn() {
    if (!combat.value?.id) return null;
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/combat/${combat.value.id}/end-turn`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body: data } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, data));
      applyCombat(data.combat);
      return data.combat;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function discardForChakra(instanceId) {
    if (!combat.value?.id || !instanceId) return null;
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/combat/${combat.value.id}/discard-for-chakra`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      });
      const { ok, body: data } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, data));
      applyCombat(data.combat);
      return data.combat;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function reserveCard(instanceId) {
    if (!combat.value?.id || !instanceId) return null;
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/combat/${combat.value.id}/reserve-card`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      });
      const { ok, body: data } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, data));
      applyCombat(data.combat);
      return data.combat;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function forfeit() {
    if (!combat.value?.id) return null;
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/combat/${combat.value.id}/forfeit`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body: data } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, data));
      applyCombat(data.combat);
      return data.combat;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  function clear() {
    combat.value = null;
    recentLogs.value = [];
    selectedInstanceId.value = null;
    error.value = null;
  }

  return {
    combat,
    recentLogs,
    loading,
    actionLoading,
    error,
    selectedInstanceId,
    hand,
    player,
    enemy,
    isOver,
    isPlayerTurn,
    startCombat,
    fetchState,
    playCard,
    endTurn,
    discardForChakra,
    reserveCard,
    forfeit,
    clear,
    applyCombat,
    hydrateFrom,
  };
});

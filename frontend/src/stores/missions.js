import { defineStore } from 'pinia';
import { ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useMissionsStore = defineStore('missions', () => {
  const missions = ref([]);
  const enemies = ref([]);
  const activeRun = ref(null);
  const activeCombat = ref(null);
  const currentRun = ref(null);
  const currentEvent = ref(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref(null);

  async function fetchMissions() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/missions`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      missions.value = body.missions || [];
      enemies.value = body.enemies || [];
      activeRun.value = body.activeRun || null;
      activeCombat.value = body.activeCombat || null;
      return missions.value;
    } catch (e) {
      error.value = e.message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function startMission(missionId, deckId = null, opts = {}) {
    actionLoading.value = true;
    error.value = null;
    try {
      const payload = {};
      if (deckId) payload.deckId = deckId;
      if (opts?.hardMode) payload.hardMode = true;
      const res = await fetch(`${API_BASE}/api/missions/${missionId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      currentRun.value = body.run;
      activeRun.value = body.run;
      currentEvent.value = null;
      return body.run;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function fetchRun(runId) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/missions/runs/${runId}`, {
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      currentRun.value = body.run;
      currentEvent.value = body.run?.currentEvent || null;
      if (body.run?.state === 'in_progress') activeRun.value = body.run;
      return body.run;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function enterNode(runId) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/missions/runs/${runId}/enter`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      currentRun.value = body.run;
      currentEvent.value = body.event || body.run?.currentEvent || null;
      return body;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function resolveEvent(runId, choiceId) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/missions/runs/${runId}/resolve-event`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choiceId }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      currentRun.value = body.run;
      currentEvent.value = null;
      return body.run;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  async function abandonRun(runId) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/missions/runs/${runId}/abandon`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      currentRun.value = body.run;
      activeRun.value = null;
      currentEvent.value = null;
      return body.run;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      actionLoading.value = false;
    }
  }

  function applyRunUpdate(run) {
    if (!run) return;
    currentRun.value = run;
    currentEvent.value = run.currentEvent || null;
    if (run.state === 'in_progress') activeRun.value = run;
    else if (activeRun.value?.id === run.id) activeRun.value = null;
  }

  function clearRun() {
    currentRun.value = null;
    currentEvent.value = null;
  }

  function clearActiveCombat() {
    activeCombat.value = null;
  }

  return {
    missions,
    enemies,
    activeRun,
    activeCombat,
    currentRun,
    currentEvent,
    loading,
    actionLoading,
    error,
    fetchMissions,
    startMission,
    fetchRun,
    enterNode,
    resolveEvent,
    abandonRun,
    applyRunUpdate,
    clearRun,
    clearActiveCombat,
  };
});

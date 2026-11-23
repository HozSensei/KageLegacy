import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';
import { useNotificationsStore } from './notifications.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useOnboardingStore = defineStore('onboarding', () => {
  const steps = ref([]);
  const meta = ref(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref(null);
  const lastClaim = ref(null);
  const visitedKeys = new Set();

  const claimableCount = computed(() => meta.value?.claimable ?? 0);
  const finished = computed(() => Boolean(meta.value?.finished));
  const nextStep = computed(() => steps.value.find(s => !s.completed) || null);

  function applyProgress(body) {
    if (!body) return;
    steps.value = body.steps || [];
    meta.value = body.meta || null;
  }

  async function fetchProgress() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/onboarding`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyProgress(body);
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function recordVisit(stepKey) {
    if (!stepKey || visitedKeys.has(stepKey)) return null;
    const existing = steps.value.find(s => s.key === stepKey);
    if (existing?.completed) {
      visitedKeys.add(stepKey);
      return null;
    }
    visitedKeys.add(stepKey);
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/visit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepKey }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) {
        visitedKeys.delete(stepKey);
        return null;
      }
      if (body.progress) applyProgress(body.progress);
      else if (body.step) {
        const idx = steps.value.findIndex(s => s.key === stepKey);
        if (idx >= 0) steps.value[idx] = body.step;
      }
      return body;
    } catch {
      visitedKeys.delete(stepKey);
      return null;
    }
  }

  async function claimStep(stepKey) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepKey }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      lastClaim.value = body;
      if (body.progress) applyProgress(body.progress);
      try {
        useNotificationsStore().clearDedupe(`onboarding:${stepKey}`);
      } catch {
        /* ignore */
      }
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  return {
    steps,
    meta,
    loading,
    actionLoading,
    error,
    lastClaim,
    claimableCount,
    finished,
    nextStep,
    fetchProgress,
    recordVisit,
    claimStep,
  };
});

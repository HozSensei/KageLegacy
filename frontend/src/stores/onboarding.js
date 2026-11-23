import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';
import { mergeOnboardingSteps, metaFromSteps } from './onboardingProgress.js';
import { useNotificationsStore } from './notifications.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useOnboardingStore = defineStore('onboarding', () => {
  const steps = ref([]);
  const meta = ref(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref(null);
  const lastClaim = ref(null);
  /** Étapes confirmées complétées côté client (évite les POST répétés). */
  const visitedKeys = new Set();
  /** Déduplique les POST /visit en cours pour une même clé. */
  const inFlightVisits = new Map();

  const claimableCount = computed(() => meta.value?.claimable ?? 0);
  const finished = computed(() => Boolean(meta.value?.finished));
  const nextStep = computed(() => steps.value.find(s => !s.completed) || null);

  function applyProgress(body) {
    if (!body) return;
    const incoming = Array.isArray(body.steps) ? body.steps : null;
    if (incoming) {
      steps.value = mergeOnboardingSteps(steps.value, incoming);
      meta.value = metaFromSteps(steps.value);
      return;
    }
    if (body.meta) meta.value = body.meta;
  }

  function applySingleStep(step) {
    if (!step?.key) return;
    const idx = steps.value.findIndex(s => s.key === step.key);
    if (idx >= 0) {
      steps.value[idx] = mergeOnboardingSteps([steps.value[idx]], [step])[0];
    } else if (step.completed) {
      // Visite avant le premier GET : on garde au moins l’étape validée.
      steps.value = mergeOnboardingSteps(steps.value, [step]);
    }
    meta.value = metaFromSteps(steps.value);
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
    if (!stepKey) return null;
    const existing = steps.value.find(s => s.key === stepKey);
    if (existing?.completed || visitedKeys.has(stepKey)) {
      visitedKeys.add(stepKey);
      return null;
    }
    if (inFlightVisits.has(stepKey)) return inFlightVisits.get(stepKey);

    const run = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/onboarding/visit`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey }),
        });
        const { ok, body } = await parseApiResponse(res);
        if (!ok) return null;
        visitedKeys.add(stepKey);
        if (body.progress) applyProgress(body.progress);
        else if (body.step) applySingleStep(body.step);
        return body;
      } catch {
        return null;
      } finally {
        inFlightVisits.delete(stepKey);
      }
    })();

    inFlightVisits.set(stepKey, run);
    return run;
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

  function reset() {
    steps.value = [];
    meta.value = null;
    loading.value = false;
    actionLoading.value = false;
    error.value = null;
    lastClaim.value = null;
    visitedKeys.clear();
    inFlightVisits.clear();
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
    reset,
  };
});

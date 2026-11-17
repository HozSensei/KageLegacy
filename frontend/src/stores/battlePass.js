import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useBattlePassStore = defineStore('battlePass', () => {
  const season = ref(null);
  const progress = ref(null);
  const tracks = ref(null);
  const quests = ref([]);
  const meta = ref(null);

  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref(null);
  const lastClaim = ref(null);

  const currentLevel = computed(() => progress.value?.currentLevel ?? 0);
  const currentXp = computed(() => progress.value?.currentXp ?? 0);
  const isPremium = computed(() => Boolean(progress.value?.isPremium));
  const maxLevel = computed(() => season.value?.maxLevel ?? 50);

  const xpForNext = computed(() => {
    if (!season.value || currentLevel.value >= maxLevel.value) return 0;
    const next = currentLevel.value + 1;
    const tier = Math.floor((next - 1) / 10);
    return (season.value.baseXpPerLevel || 1000) + tier * 50;
  });

  const xpProgressPct = computed(() => {
    if (!xpForNext.value) return 100;
    return Math.min(100, Math.round((currentXp.value / xpForNext.value) * 100));
  });

  const claimableFree = computed(() => (tracks.value?.free || []).filter(t => t.claimable).length);
  const claimablePremium = computed(
    () => (tracks.value?.premium || []).filter(t => t.claimable).length
  );

  const dailyQuests = computed(() => quests.value.filter(q => q.questType === 'daily'));
  const weeklyQuests = computed(() => quests.value.filter(q => q.questType === 'weekly'));
  const milestoneQuests = computed(() => quests.value.filter(q => q.questType === 'milestone'));

  async function fetchBattlePass() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/battle-pass`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      season.value = body.season;
      progress.value = body.progress;
      tracks.value = body.tracks;
      meta.value = body.meta;
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchQuests() {
    try {
      const res = await fetch(`${API_BASE}/api/battle-pass/quests`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      quests.value = body.quests || [];
      return quests.value;
    } catch (e) {
      error.value = e.message;
      return [];
    }
  }

  async function loadAll() {
    await Promise.all([fetchBattlePass(), fetchQuests()]);
  }

  async function claimReward(level, track = 'free') {
    actionLoading.value = true;
    error.value = null;
    lastClaim.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/battle-pass/claim/${level}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      lastClaim.value = body;
      await fetchBattlePass();
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  async function unlockPremium(method = 'kage_coins') {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/battle-pass/unlock-premium`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      await fetchBattlePass();
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  async function claimQuest(questId) {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/battle-pass/quests/${questId}/claim`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      await Promise.all([fetchBattlePass(), fetchQuests()]);
      return body;
    } catch (e) {
      error.value = e.message;
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  return {
    season,
    progress,
    tracks,
    quests,
    meta,

    loading,
    actionLoading,
    error,
    lastClaim,
    currentLevel,
    currentXp,
    isPremium,
    maxLevel,
    xpForNext,
    xpProgressPct,
    claimableFree,
    claimablePremium,
    dailyQuests,
    weeklyQuests,
    milestoneQuests,
    fetchBattlePass,
    fetchQuests,

    loadAll,
    claimReward,
    unlockPremium,
    claimQuest,
  };
});

import { onScopeDispose, ref, shallowRef } from 'vue';
import { requestDeckDuels } from './useDeckDuels.js';

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeWeek(week) {
  if (!Array.isArray(week?.factions)) throw new Error('Invalid duel factions response');
  return {
    start: parseDate(week.weekStart),
    end: parseDate(week.weekEnd),
    factions: [...week.factions].sort((a, b) => b.points - a.points),
    rewardRyos: Number.isFinite(week.rewardRyos) && week.rewardRyos > 0 ? week.rewardRyos : 0,
    winnerId: week.winnerId ?? null,
    settled: typeof week.settled === 'boolean' ? week.settled : null,
  };
}

export function useFactionStandings({ request = requestDeckDuels } = {}) {
  const standings = shallowRef(null);
  const honorByFaction = shallowRef({});
  const honorScoredOn = ref(null);
  const loading = ref(false);
  const loadFailed = ref(false);
  let operation;

  async function refresh() {
    if (operation) return;
    const controller = new AbortController();
    operation = controller;
    loading.value = true;
    loadFailed.value = false;
    try {
      const data = await request('/factions', { signal: controller.signal });
      if (controller.signal.aborted) return;
      const currentWeek = normalizeWeek(data);
      const firstRewardWeekStart = parseDate(data.firstRewardWeekStart);
      standings.value = {
        currentWeek,
        rewardStarts:
          firstRewardWeekStart && currentWeek.start && firstRewardWeekStart > currentWeek.start
            ? firstRewardWeekStart
            : null,
        previousWeek: data.previousWeek == null ? null : normalizeWeek(data.previousWeek),
      };
      honorByFaction.value =
        data.honorByFaction && typeof data.honorByFaction === 'object' ? data.honorByFaction : {};
      honorScoredOn.value = data.honorScoredOn || null;
    } catch {
      if (!controller.signal.aborted) loadFailed.value = true;
    } finally {
      operation = undefined;
      loading.value = false;
    }
  }

  onScopeDispose(() => operation?.abort());

  return {
    standings,
    honorByFaction,
    honorScoredOn,
    loading,
    loadFailed,
    refresh,
  };
}

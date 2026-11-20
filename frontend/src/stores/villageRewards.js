import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useVillageRewards } from '../composables/useVillageRewards.js';
import { useAuthStore } from './auth.js';

export const useVillageRewardsStore = defineStore('villageRewards', () => {
  const auth = useAuthStore();
  const state = useVillageRewards();
  const anchorVisits = ref(0);

  watch(() => auth.user?.id, state.reset, { flush: 'sync' });

  function refresh() {
    if (auth.user) return state.refresh();
  }

  function revisitAnchor() {
    anchorVisits.value += 1;
  }

  return { ...state, refresh, anchorVisits, revisitAnchor };
});

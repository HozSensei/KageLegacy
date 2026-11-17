<script setup>
import { computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import CombatArena from '../components/combat/CombatArena.vue';
import { useCombatStore } from '../stores/combat';
import { useMissionsStore } from '../stores/missions';

defineOptions({ name: 'CombatView' });

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const combat = useCombatStore();
const missions = useMissionsStore();

const combatId = computed(() => route.params.id);
const isMidRunFight = computed(() => Boolean(combat.combat?.missionRunId));
const outcomeRewards = computed(
  () => combat.combat?.run?.rewards || combat.combat?.rewards || null
);
/** Victoire d'étape (parcours pas encore fini) : loot différé */
const showMidRunVictory = computed(
  () => isMidRunFight.value && combat.combat?.state === 'victory' && !outcomeRewards.value
);

onMounted(async () => {
  if (combatId.value) {
    if (!combat.combat || combat.combat.id !== combatId.value) {
      await combat.fetchState(combatId.value);
    }
  }
});

watch(combatId, async id => {
  if (id) await combat.fetchState(id);
});

watch(
  () => combat.combat?.run,
  run => {
    if (run) missions.applyRunUpdate(run);
  }
);

function onSelect(card) {
  combat.selectedInstanceId = card?.instanceId || null;
}

async function onPlay(card) {
  const id = card?.instanceId || combat.selectedInstanceId;
  if (!id) return;
  try {
    await combat.playCard(id);
  } catch {
    /* error surfaced via store */
  }
}

async function onEndTurn() {
  try {
    await combat.endTurn();
  } catch {
    /* store */
  }
}

async function onDiscardChakra(instanceId) {
  const id = instanceId || combat.selectedInstanceId;
  if (!id) return;
  try {
    await combat.discardForChakra(id);
  } catch {
    /* store */
  }
}

async function onReserveCard(instanceId) {
  const id = instanceId || combat.selectedInstanceId;
  if (!id) return;
  try {
    await combat.reserveCard(id);
  } catch {
    /* store */
  }
}

async function onForfeit() {
  try {
    await combat.forfeit();
  } catch {
    /* store */
  }
}

function goToRunOrMissions() {
  const runId = combat.combat?.missionRunId;
  combat.clear();
  if (runId) {
    router.push({ name: 'mission-run', params: { id: runId } });
    return;
  }
  router.push({ name: 'missions' });
}
</script>

<template>
  <div class="page-shell combat-shell" data-testid="combat-page">
    <header class="combat-head">
      <div class="combat-head__title">
        <p class="page-kicker flex items-center gap-2">
          <span class="lozenge text-vermilion" aria-hidden="true" />
          {{ t('combat.kicker') }}
        </p>
        <h1 class="t-heading">{{ t('combat.title') }}</h1>
      </div>
      <button type="button" class="btn-ghost btn-sm" @click="goToRunOrMissions">
        {{ isMidRunFight ? t('combat.backToRun') : t('combat.backToMissions') }}
      </button>
    </header>

    <p v-if="combat.error" class="alert alert--error mt-4">{{ combat.error }}</p>
    <p v-if="combat.loading && !combat.combat" class="mt-8 text-ink-muted">
      {{ t('combat.loading') }}
    </p>

    <CombatArena
      v-if="combat.combat"
      class="mt-5"
      :combat="combat.combat"
      :logs="combat.recentLogs"
      :selected-id="combat.selectedInstanceId"
      :busy="combat.actionLoading"
      :mid-run="showMidRunVictory"
      :outcome-rewards="outcomeRewards"
      @select-card="onSelect"
      @play-card="onPlay"
      @end-turn="onEndTurn"
      @discard-chakra="onDiscardChakra"
      @reserve-card="onReserveCard"
      @forfeit="onForfeit"
      @dismiss-outcome="goToRunOrMissions"
    />
  </div>
</template>

<style scoped>
.combat-shell {
  padding-top: clamp(1rem, 2.5vw, 1.75rem);
}

.combat-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--color-line);
}

.combat-head__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1rem;
}
</style>

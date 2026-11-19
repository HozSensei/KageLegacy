<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import PvpArena from '../components/pvp/PvpArena.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import { usePvpStore } from '../stores/pvp';

defineOptions({ name: 'PvpDuelView' });

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const pvp = usePvpStore();

const matchId = computed(() => route.params.id);

const arenaView = computed(() => {
  if (pvp.isHost && pvp.publicState) return pvp.publicState;
  if (pvp.isGuest && pvp.publicState) return pvp.publicState;
  if (pvp.isHost && pvp.duel) {
    return {
      ...pvp.duel,
      fighters: {
        host: {
          ...pvp.duel.fighters.host,
          hand: pvp.duel.fighters.host.hand,
          handCount: pvp.duel.fighters.host.hand?.length,
          drawCount: pvp.duel.fighters.host.drawPile?.length,
          discardCount: pvp.duel.fighters.host.discardPile?.length,
        },
        guest: {
          ...pvp.duel.fighters.guest,
          hand: undefined,
          handCount: pvp.duel.fighters.guest.hand?.length,
          drawCount: pvp.duel.fighters.guest.drawPile?.length,
          discardCount: pvp.duel.fighters.guest.discardPile?.length,
        },
      },
      viewerSeat: 'host',
    };
  }
  return null;
});

onMounted(async () => {
  if (!matchId.value) return;
  await pvp.fetchMatch(matchId.value);
  if (!pvp.match) return;

  try {
    await pvp.markReady(matchId.value);
  } catch {
    /* ready optional if already in progress */
  }

  pvp.connectWs(matchId.value);

  if (pvp.isHost && pvp.match.bootstrap && !pvp.duel) {
    pvp.initDuelFromMatch(pvp.match);
  }
});

watch(matchId, async id => {
  if (!id) return;
  pvp.clear();
  await pvp.fetchMatch(id);
  pvp.connectWs(id);
});

onUnmounted(() => {
  pvp.disconnectWs();
});

function onSelect(card) {
  pvp.selectedInstanceId = card?.instanceId || null;
}

async function onPlay(card) {
  const id = card?.instanceId || pvp.selectedInstanceId;
  if (!id) return;
  try {
    await pvp.sendAction('play_card', id);
  } catch {
    /* store */
  }
}

async function onEndTurn() {
  try {
    await pvp.sendAction('end_turn');
  } catch {
    /* store */
  }
}

async function onDiscardChakra(instanceId) {
  const id = instanceId || pvp.selectedInstanceId;
  if (!id) return;
  try {
    await pvp.sendAction('discard_chakra', id);
  } catch {
    /* store */
  }
}

async function onReserveCard(instanceId) {
  const id = instanceId || pvp.selectedInstanceId;
  if (!id) return;
  try {
    await pvp.sendAction('reserve_card', id);
  } catch {
    /* store */
  }
}

async function onForfeit() {
  try {
    await pvp.sendAction('forfeit');
  } catch {
    /* store */
  }
}

function backToQueue() {
  pvp.clear();
  router.push({ name: 'pvp' });
}
</script>

<template>
  <div class="page-shell pvp-duel" data-testid="pvp-duel-page">
    <div v-if="!arenaView || !pvp.role" class="pvp-duel__head">
      <div class="min-w-0">
        <p class="page-kicker">
          <span class="lozenge" aria-hidden="true" />
          {{ t('pvp.kicker') }}
        </p>
        <h1 class="t-heading mt-1">{{ t('pvp.duelTitle') }}</h1>
        <p v-if="pvp.role" class="mt-1 text-sm text-ink-muted">
          {{ pvp.isHost ? t('pvp.youAreHost') : t('pvp.youAreGuest') }}
        </p>
      </div>
      <button type="button" class="btn-ghost btn-sm" @click="backToQueue">
        <AppIcon name="arrow-left" size="1rem" />
        {{ t('pvp.backToQueue') }}
      </button>
    </div>

    <p v-if="pvp.error" class="alert alert--error mt-4">{{ pvp.error }}</p>
    <p v-if="pvp.loading && !arenaView" class="mt-8 text-ink-muted">
      {{ t('pvp.loading') }}
    </p>
    <p
      v-if="!arenaView && !pvp.loading && pvp.isGuest"
      class="alert alert--info mt-8"
      data-testid="pvp-await-host"
    >
      {{ t('pvp.awaitHostState') }}
    </p>

    <PvpArena
      v-if="arenaView && pvp.role"
      :view="arenaView"
      :previous-card-stat-type="pvp.isHost ? pvp.duel?.fighters?.host?.previousCardStatType : null"
      :role="pvp.role"
      :logs="pvp.recentLogs"
      :selected-id="pvp.selectedInstanceId"
      :busy="pvp.actionLoading"
      :peer-online="pvp.peerOnline"
      @select-card="onSelect"
      @play-card="onPlay"
      @end-turn="onEndTurn"
      @discard-chakra="onDiscardChakra"
      @reserve-card="onReserveCard"
      @forfeit="onForfeit"
      @dismiss-outcome="backToQueue"
    />
  </div>
</template>

<style scoped>
.pvp-duel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
}

.pvp-duel__head .page-kicker {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.pvp-duel__head .lozenge {
  color: var(--color-vermilion);
}
</style>

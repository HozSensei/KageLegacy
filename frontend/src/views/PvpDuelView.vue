<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PvpArena from '../components/pvp/PvpArena.vue'
import { usePvpStore } from '../stores/pvp'

defineOptions({ name: 'PvpDuelView' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const pvp = usePvpStore()

const matchId = computed(() => route.params.id)

const arenaView = computed(() => {
  if (pvp.isHost && pvp.publicState) return pvp.publicState
  if (pvp.isGuest && pvp.publicState) return pvp.publicState
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
    }
  }
  return null
})

onMounted(async () => {
  if (!matchId.value) return
  await pvp.fetchMatch(matchId.value)
  if (!pvp.match) return

  try {
    await pvp.markReady(matchId.value)
  } catch {
    /* ready optional if already in progress */
  }

  pvp.connectWs(matchId.value)

  if (pvp.isHost && pvp.match.bootstrap && !pvp.duel) {
    pvp.initDuelFromMatch(pvp.match)
  }
})

watch(matchId, async (id) => {
  if (!id) return
  pvp.clear()
  await pvp.fetchMatch(id)
  pvp.connectWs(id)
})

onUnmounted(() => {
  pvp.disconnectWs()
})

function onSelect(card) {
  pvp.selectedInstanceId = card?.instanceId || null
}

async function onPlay(card) {
  const id = card?.instanceId || pvp.selectedInstanceId
  if (!id) return
  try {
    await pvp.sendAction('play_card', id)
  } catch {
    /* store */
  }
}

async function onEndTurn() {
  try {
    await pvp.sendAction('end_turn')
  } catch {
    /* store */
  }
}

async function onDiscardChakra() {
  if (!pvp.selectedInstanceId) return
  try {
    await pvp.sendAction('discard_chakra', pvp.selectedInstanceId)
  } catch {
    /* store */
  }
}

async function onForfeit() {
  try {
    await pvp.sendAction('forfeit')
  } catch {
    /* store */
  }
}

function backToQueue() {
  pvp.clear()
  router.push({ name: 'pvp' })
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="pvp-duel-page">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="page-kicker">{{ t('pvp.kicker') }}</p>
        <h1 class="page-title mt-2">{{ t('pvp.duelTitle') }}</h1>
        <p v-if="pvp.role" class="mt-2 text-sm text-ink-muted">
          {{ pvp.isHost ? t('pvp.youAreHost') : t('pvp.youAreGuest') }}
        </p>
      </div>
      <button type="button" class="btn-ghost text-xs" @click="backToQueue">
        {{ t('pvp.backToQueue') }}
      </button>
    </div>

    <p v-if="pvp.error" class="mt-4 text-sm text-fire">{{ pvp.error }}</p>
    <p v-if="pvp.loading && !arenaView" class="mt-8 text-ink-muted">
      {{ t('pvp.loading') }}
    </p>
    <p
      v-if="!arenaView && !pvp.loading && pvp.isGuest"
      class="mt-8 text-ink-muted"
      data-testid="pvp-await-host"
    >
      {{ t('pvp.awaitHostState') }}
    </p>

    <PvpArena
      v-if="arenaView && pvp.role"
      class="mt-4"
      :view="arenaView"
      :role="pvp.role"
      :logs="pvp.recentLogs"
      :selected-id="pvp.selectedInstanceId"
      :busy="pvp.actionLoading"
      :peer-online="pvp.peerOnline"
      @select-card="onSelect"
      @play-card="onPlay"
      @end-turn="onEndTurn"
      @discard-chakra="onDiscardChakra"
      @forfeit="onForfeit"
      @dismiss-outcome="backToQueue"
    />
  </div>
</template>

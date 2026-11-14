<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { usePvpStore } from '../stores/pvp'
import { useDecksStore } from '../stores/decks'

defineOptions({ name: 'PvpQueueView' })

const { t } = useI18n()
const router = useRouter()
const pvp = usePvpStore()
const decks = useDecksStore()

const levelWindow = ref(3)
const joining = ref(false)
const localError = ref(null)
let pollTimer = null

const activeDeckLabel = computed(() => {
  const active = (decks.decks || []).find((d) => d.isActive)
  if (!active) return t('combat.practiceDeckHint')
  return active.name
})

onMounted(async () => {
  try {
    await Promise.all([pvp.fetchConfig(), decks.fetchDecks(), pvp.refreshQueue()])
  } catch (e) {
    localError.value = e.message || pvp.error
  }
  if (pvp.config?.levelWindowDefault) {
    levelWindow.value = pvp.config.levelWindowDefault
  }
  if (pvp.match?.id && ['pending', 'ready', 'in_progress'].includes(pvp.match.status)) {
    await router.push({ name: 'pvp-duel', params: { id: pvp.match.id } })
    return
  }
  pollTimer = setInterval(async () => {
    if (pvp.queueStatus !== 'queued') return
    await pvp.refreshQueue()
    if (pvp.match?.id) {
      await router.push({ name: 'pvp-duel', params: { id: pvp.match.id } })
    }
  }, 2500)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

async function onJoin() {
  joining.value = true
  localError.value = null
  try {
    const result = await pvp.joinQueue({ levelWindow: levelWindow.value })
    if (result?.match?.id) {
      await router.push({ name: 'pvp-duel', params: { id: result.match.id } })
    }
  } catch (e) {
    localError.value = e.message || pvp.error
  } finally {
    joining.value = false
  }
}

async function onLeave() {
  localError.value = null
  try {
    await pvp.leaveQueue()
  } catch (e) {
    localError.value = e.message
  }
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="pvp-queue-page">
    <div>
      <p class="page-kicker">{{ t('pvp.kicker') }}</p>
      <h1 class="page-title mt-2">{{ t('pvp.queueTitle') }}</h1>
      <p class="page-lead mt-3 max-w-xl">{{ t('pvp.queueLead') }}</p>
    </div>

    <div class="pvp-panel mt-8">
      <p class="text-sm text-ink-muted">
        {{ t('combat.activeDeck') }} :
        <span class="text-accent">{{ activeDeckLabel }}</span>
      </p>

      <label class="mt-4 block text-sm">
        <span class="text-ink-muted">{{ t('pvp.levelWindow') }}</span>
        <select v-model.number="levelWindow" class="mt-1 block input-field" data-testid="pvp-window">
          <option :value="3">± 3</option>
          <option :value="5">± 5</option>
        </select>
      </label>

      <p class="mt-4 text-sm text-ink-muted">{{ t('pvp.hostExplain') }}</p>

      <p v-if="localError || pvp.error" class="mt-4 text-sm text-fire">
        {{ localError || pvp.error }}
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <button
          v-if="pvp.queueStatus !== 'queued'"
          type="button"
          class="btn-primary"
          data-testid="pvp-join-queue"
          :disabled="joining || pvp.loading"
          @click="onJoin"
        >
          {{ joining ? t('pvp.searching') : t('pvp.joinQueue') }}
        </button>
        <button
          v-else
          type="button"
          class="btn-ghost"
          data-testid="pvp-leave-queue"
          @click="onLeave"
        >
          {{ t('pvp.leaveQueue') }}
        </button>
      </div>

      <p v-if="pvp.queueStatus === 'queued'" class="mt-4 text-accent" data-testid="pvp-waiting">
        {{ t('pvp.waiting') }}
        <span v-if="pvp.queue?.level"> — {{ t('pvp.yourLevel', { n: pvp.queue.level }) }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.pvp-panel {
  max-width: 32rem;
  padding: 1.25rem 1.35rem;
  border: 1px solid color-mix(in oklab, var(--color-ink, #1a1520) 12%, transparent);
  background:
    linear-gradient(160deg, rgba(40, 55, 70, 0.35), rgba(20, 24, 30, 0.5)),
    color-mix(in oklab, var(--color-surface, #12161c) 90%, transparent);
}
.input-field {
  width: 100%;
  max-width: 10rem;
  padding: 0.4rem 0.55rem;
  background: color-mix(in oklab, #000 25%, transparent);
  border: 1px solid color-mix(in oklab, #fff 12%, transparent);
  color: inherit;
}
</style>

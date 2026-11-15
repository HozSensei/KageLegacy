<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { usePvpStore } from '../stores/pvp'
import { useDecksStore } from '../stores/decks'
import PageHeader from '../components/ui/PageHeader.vue'
import bridgeImage from '../assets/illustrations/stone-bridge.webp'

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
  <div class="page-shell" data-testid="pvp-queue-page">
    <PageHeader
      index="09"
      tone="vermilion"
      layout="overlay"
      :kicker="t('pvp.kicker')"
      :title="t('pvp.queueTitle')"
      :lead="t('pvp.queueLead')"
      :image="bridgeImage"
      image-position="50% 60%"
    >
      <template #actions>
        <button
          v-if="pvp.queueStatus !== 'queued'"
          type="button"
          class="btn-primary"
          data-testid="pvp-hero-join"
          :disabled="joining || pvp.loading"
          @click="onJoin"
        >
          {{ joining ? t('common.loading') : t('pvp.joinQueue') }}
        </button>
      </template>
    </PageHeader>

    <div class="pvp-layout">
      <section class="pvp-panel" :class="{ 'pvp-panel--queued': pvp.queueStatus === 'queued' }">
        <p class="t-kicker">{{ t('pvp.queueSection') }}</p>

        <p class="pvp-deck">
          <span class="pvp-deck__label">{{ t('combat.activeDeck') }}</span>
          <span class="pvp-deck__name">{{ activeDeckLabel }}</span>
        </p>

        <label class="field pvp-window">
          <span class="field__label">{{ t('pvp.levelWindow') }}</span>
          <select v-model.number="levelWindow" class="input-field" data-testid="pvp-window">
            <option :value="3">± 3</option>
            <option :value="5">± 5</option>
          </select>
        </label>

        <p v-if="localError || pvp.error" class="alert alert--error mt-4">
          {{ localError || pvp.error }}
        </p>

        <div class="mt-6 flex flex-wrap gap-3">
          <button
            v-if="pvp.queueStatus !== 'queued'"
            type="button"
            class="btn-primary btn-lg"
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

        <p v-if="pvp.queueStatus === 'queued'" class="pvp-waiting" data-testid="pvp-waiting">
          <span class="pvp-waiting__pulse" data-tone="indigo" aria-hidden="true" />
          <span>
            {{ t('pvp.waiting') }}
            <span v-if="pvp.queue?.level"> — {{ t('pvp.yourLevel', { n: pvp.queue.level }) }}</span>
          </span>
        </p>
      </section>

      <aside class="pvp-rules">
        <h2 class="t-kicker">{{ t('pvp.rulesTitle') }}</h2>
        <p class="mt-3 leading-relaxed text-ink-muted">{{ t('pvp.hostExplain') }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.pvp-layout {
  display: grid;
  gap: 2rem;
  margin-top: 2rem;
}

@media (min-width: 900px) {
  .pvp-layout {
    grid-template-columns: minmax(0, 32rem) minmax(0, 1fr);
    gap: 3rem;
    align-items: start;
  }
}

.pvp-panel {
  padding: 1.5rem 1.5rem 1.6rem;
  border-top: 6px solid var(--color-vermilion);
  background: var(--color-bg-card);
  transition: border-color var(--dur-base) ease;
}

.pvp-panel--queued {
  border-top-color: var(--color-indigo);
}

.pvp-deck {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 1rem;
}

.pvp-deck__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink-muted);
}

.pvp-deck__name {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  font-stretch: 80%;
  line-height: 1.1;
  color: var(--color-ink);
}

.pvp-window {
  max-width: 11rem;
  margin-top: 1.25rem;
}

.pvp-waiting {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding: 0.75rem 1rem;
  background: var(--color-indigo-tint);
  font-weight: 600;
  color: var(--color-ink);
}

.pvp-waiting__pulse {
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  background: var(--color-indigo-deep);
  transform: rotate(45deg);
  animation: pulse-ring 1.6s ease-out infinite;
}

.pvp-rules {
  max-width: 34rem;
  padding-top: 0.25rem;
}
</style>

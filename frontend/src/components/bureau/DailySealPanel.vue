<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { readApiError } from '../../utils/http.js'

const { t } = useI18n()
const store = useSquadStore()
const opening = ref(false)
const lastReward = ref(null)
const lastWell = ref(null)
const showReveal = ref(false)

const seal = computed(() => store.dailySeal)
const canOpen = computed(() => seal.value?.canOpen)

async function openSeal() {
  if (!canOpen.value || opening.value) return
  opening.value = true
  lastReward.value = null
  try {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    const res = await fetch(`${API_BASE}/api/bureau/daily-seal/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    store.applySquadMutation(data)
    lastReward.value = data.reward
    lastWell.value = data.well
    showReveal.value = true
    window.setTimeout(() => {
      showReveal.value = false
    }, 2800)
  } catch (e) {
    store.error = e.message
  } finally {
    opening.value = false
  }
}

const rewardMessage = computed(() => {
  const reward = lastReward.value
  if (!reward) return ''
  if (reward.type === 'ryos' || reward.type === 'ryos_fallback') {
    return t('bureau.sealRewardRyos', { amount: reward.details.ryos })
  }
  if (reward.type === 'moral_boost') {
    return t('bureau.sealRewardMoral', {
      name: reward.details.ninjaName,
      moral: reward.details.to,
    })
  }
  if (reward.type === 'academy_jackpot') {
    return t('bureau.sealRewardJackpot')
  }
  if (reward.labelKey) return t(reward.labelKey)
  return t(`bureau.sealTier.${reward.tier}`)
})
</script>

<template>
  <div
    v-if="seal"
    class="mt-10 border-t border-line pt-8"
    data-testid="bureau-daily-seal-panel"
  >
    <p class="section-label">{{ t('bureau.dailySealTitle') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-muted">
      {{ t('bureau.dailySealHint', { max: seal.maxStack }) }}
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-4">
      <div
        class="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent/60 bg-ink/40 shadow-[0_0_24px_rgba(212,175,55,0.15)]"
        :class="{ 'seal-pulse': canOpen }"
      >
        <span class="text-2xl font-semibold text-accent">{{ seal.pending }}</span>
        <span class="absolute -bottom-1 text-[10px] text-ink-faint">/ {{ seal.maxStack }}</span>
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-sm text-ink">
          {{ t('bureau.dailySealStock', { count: seal.pending, max: seal.maxStack }) }}
        </p>
        <button
          type="button"
          class="btn-primary mt-3"
          :disabled="!canOpen || opening"
          data-testid="open-chakra-seal"
          @click="openSeal"
        >
          {{ opening ? t('bureau.dailySealOpening') : t('bureau.dailySealOpen') }}
        </button>
      </div>
    </div>

    <Transition name="seal-reveal">
      <div
        v-if="showReveal && lastReward"
        class="seal-reveal mt-4 border border-accent/40 bg-ink/60 px-4 py-3 text-sm text-accent"
        :data-tier="lastReward.tier"
      >
        <p class="text-xs uppercase tracking-widest text-ink-faint">
          {{ t(`bureau.sealTier.${lastReward.tier}`) }}
        </p>
        <p class="mt-1 font-medium">{{ rewardMessage }}</p>
        <p v-if="lastWell?.contributed && store.clan?.member" class="mt-2 text-xs text-ink-muted">
          <template v-if="lastWell.fused">{{ t('bureau.dailySealWellFusion') }}</template>
          <template v-else>{{ t('bureau.dailySealWellDrop') }}</template>
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.seal-pulse {
  animation: seal-glow 2s ease-in-out infinite;
}

@keyframes seal-glow {
  0%,
  100% {
    box-shadow: 0 0 16px rgba(212, 175, 55, 0.12);
  }
  50% {
    box-shadow: 0 0 28px rgba(212, 175, 55, 0.35);
  }
}

.seal-reveal-enter-active,
.seal-reveal-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.seal-reveal-enter-from,
.seal-reveal-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useSquadStore } from '../../stores/squad'
import { readApiError } from '../../utils/http.js'

const { t } = useI18n()
const store = useSquadStore()
const API_BASE = import.meta.env.VITE_API_URL || ''
const dismissing = ref(false)

const onboarding = computed(() => store.onboarding)
const visible = computed(() => onboarding.value?.active)

const stepLabels = {
  deck: 'onboarding.stepDeck',
  mission: 'onboarding.stepMission',
}

async function dismiss() {
  dismissing.value = true
  try {
    const res = await fetch(`${API_BASE}/api/gameplay/onboarding/dismiss`, { method: 'POST' })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    store.applySquadMutation(data)
  } finally {
    dismissing.value = false
  }
}
</script>

<template>
  <section
    v-if="visible"
    class="mt-10 border border-accent/40 bg-bg-soft/60 px-5 py-4"
    data-testid="onboarding-checklist"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="section-label">{{ t('onboarding.title') }}</p>
        <p class="mt-2 text-sm text-ink-muted">{{ t('onboarding.lead') }}</p>
      </div>
      <button
        type="button"
        class="shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink"
        :disabled="dismissing"
        @click="dismiss"
      >
        {{ t('onboarding.dismiss') }}
      </button>
    </div>

    <ul class="mt-5 space-y-3">
      <li
        v-for="step in onboarding.steps"
        :key="step.key"
        class="flex items-center justify-between gap-3 text-sm"
      >
        <span :class="step.done ? 'text-ink-faint line-through' : 'text-ink'">
          {{ t(stepLabels[step.key] || step.key) }}
        </span>
        <RouterLink
          v-if="!step.done"
          :to="step.route"
          class="text-xs text-accent underline-offset-2 hover:underline"
        >
          {{ t('onboarding.go') }}
        </RouterLink>
        <span v-else class="text-[10px] uppercase tracking-[0.14em] text-accent">
          {{ t('onboarding.done') }}
        </span>
      </li>
    </ul>
  </section>
</template>

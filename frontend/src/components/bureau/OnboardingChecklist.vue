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
const progressLabel = computed(() => {
  const done = onboarding.value?.doneCount ?? 0
  const total = onboarding.value?.totalCount ?? 0
  return t('onboarding.progress', { done, total })
})

const stepMeta = {
  deck: { label: 'onboarding.stepDeck', hint: 'onboarding.hintDeck' },
  training: { label: 'onboarding.stepTraining', hint: 'onboarding.hintTraining' },
  mission: { label: 'onboarding.stepMission', hint: 'onboarding.hintMission' },
  recon: { label: 'onboarding.stepRecon', hint: 'onboarding.hintRecon' },
  league: { label: 'onboarding.stepLeague', hint: 'onboarding.hintLeague' },
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
      <div class="min-w-0">
        <p class="section-label">{{ t('onboarding.title') }}</p>
        <p class="mt-2 text-sm text-ink-muted">{{ t('onboarding.lead') }}</p>
        <p class="mt-3 text-[10px] uppercase tracking-[0.14em] text-accent">
          {{ progressLabel }}
        </p>
      </div>
      <button
        type="button"
        data-testid="onboarding-dismiss"
        class="btn-ghost shrink-0 text-[10px]"
        :disabled="dismissing"
        @click="dismiss"
      >
        {{ t('onboarding.dismiss') }}
      </button>
    </div>

    <p class="mt-4 text-xs leading-5 text-ink-faint">
      {{ t('onboarding.cycleMap') }}
    </p>

    <ul class="mt-5 space-y-4">
      <li
        v-for="step in onboarding.steps"
        :key="step.key"
        class="flex items-start justify-between gap-3"
      >
        <div class="min-w-0">
          <p
            class="text-sm"
            :class="step.done ? 'text-ink-faint line-through' : 'text-ink'"
          >
            {{ t(stepMeta[step.key]?.label || step.key) }}
          </p>
          <p
            v-if="!step.done && stepMeta[step.key]?.hint"
            class="mt-1 text-xs text-ink-faint"
          >
            {{ t(stepMeta[step.key].hint) }}
          </p>
        </div>
        <RouterLink
          v-if="!step.done"
          :to="step.route"
          class="btn-ghost shrink-0 text-[10px]"
        >
          {{ t('onboarding.go') }}
        </RouterLink>
        <span
          v-else
          class="shrink-0 text-[10px] uppercase tracking-[0.14em] text-accent"
        >
          {{ t('onboarding.done') }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'

const { t } = useI18n()
const store = useSquadStore()
const recruiting = ref(false)

const academy = computed(() => store.academy)
const draw = computed(() => academy.value?.draw)

async function recruit() {
  recruiting.value = true
  try {
    await store.recruitFromAcademy()
  } finally {
    recruiting.value = false
  }
}
</script>

<template>
  <div v-if="academy" class="mt-10 border-t border-line pt-8">
    <p class="section-label">{{ t('bureau.academyTitle') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-muted">
      {{ t('bureau.academyHint') }}
    </p>
    <p v-if="!academy.windowOpen" class="mt-2 text-xs text-fire">
      {{ t('bureau.academyClosed') }}
    </p>
    <p v-else-if="academy.recruitedThisCycle" class="mt-2 text-xs text-accent">
      {{ t('bureau.academyDone') }}
    </p>

    <div v-if="draw" class="mt-4 border border-line p-4 text-sm">
      <p class="text-xs uppercase tracking-wide text-ink-faint">{{ t('bureau.academyDrawLabel') }}</p>
      <p class="mt-2 font-medium text-ink">{{ draw.candidate.name }}</p>
      <p class="mt-1 text-xs text-ink-muted">
        {{ draw.candidate.clanTierLabel }} · {{ draw.candidate.potential }} ·
        {{ t(`ninja.stats.${draw.candidate.primaryArt}`) }}
      </p>
      <p v-if="draw.candidate.profile?.artLabel" class="mt-1 text-xs text-ink-faint">
        {{ draw.candidate.profile.artLabel }} · {{ draw.candidate.profile.potentialLabel }}
      </p>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-ink">{{ draw.price.toLocaleString() }} Ryos</p>
        <button
          v-if="academy.windowOpen && !academy.recruitedThisCycle && !draw.recruited"
          type="button"
          class="btn-ghost"
          :disabled="recruiting"
          @click="recruit"
        >
          {{ t('bureau.academyRecruit') }}
        </button>
        <span v-else-if="draw.recruited" class="text-xs text-accent">
          {{ t('bureau.academyRecruited') }}
        </span>
      </div>
    </div>
  </div>
</template>

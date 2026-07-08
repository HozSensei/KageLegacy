<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useFormatRyos } from '../../composables/useFormatRyos'

const { t } = useI18n()
const { formatRyos } = useFormatRyos()
const store = useSquadStore()
const recruitingId = ref(null)
const recommendingId = ref(null)

const academy = computed(() => store.academy)
const draws = computed(() => academy.value?.draws || [])
const canRecommend = computed(
  () => store.clan?.member && store.clanBoard?.recommendation?.canRecommend
)

function rotationCountdown() {
  const target = academy.value?.nextRotationAt
  if (!target) return '—'
  const ms = new Date(target) - Date.now()
  if (ms <= 0) return t('bureau.academyRotationSoon')
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  return t('bureau.academyRotationIn', { hours, minutes })
}

async function recruit(drawId) {
  recruitingId.value = drawId
  try {
    await store.recruitFromAcademy(drawId)
  } finally {
    recruitingId.value = null
  }
}

async function recommend(drawId) {
  recommendingId.value = drawId
  try {
    await store.recommendToClan(drawId)
  } finally {
    recommendingId.value = null
  }
}
</script>

<template>
  <div v-if="academy" class="mt-10 border-t border-line pt-8" data-testid="bureau-academy-panel">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="section-label">{{ t('bureau.academyTitle') }}</p>
        <p class="mt-2 text-xs leading-relaxed text-ink-muted">
          {{ t('bureau.academyHintRotating') }}
        </p>
      </div>
      <p class="text-xs text-ink-faint">{{ rotationCountdown() }}</p>
    </div>

    <p v-if="!academy.rotationOpen" class="mt-2 text-xs text-fire">
      {{ t('bureau.academyClosedOperation') }}
    </p>

    <p v-if="store.clanBoard?.recommendation?.usedThisCycle" class="mt-2 text-xs text-ink-faint">
      {{ t('bureau.academyRecommendUsed') }}
    </p>

    <p v-if="store.sensei?.academyJackpotToken" class="mt-2 text-xs text-accent">
      {{ t('bureau.academyJackpotReady') }}
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="draw in draws"
        :key="draw.id"
        class="border border-line p-4 text-sm transition-colors"
        :class="{
          'border-fire/50': draw.expiresSoon,
          'border-accent/40': draw.candidate.jackpotForced,
        }"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs uppercase tracking-wide text-ink-faint">
            {{ t('bureau.academySlot', { slot: draw.slotIndex + 1 }) }}
          </p>
          <span
            v-if="draw.expiresSoon"
            class="text-[10px] uppercase tracking-wider text-fire"
          >
            {{ t('bureau.academyExpiresSoon') }}
          </span>
        </div>

        <p class="mt-2 font-medium text-ink">{{ draw.candidate.name }}</p>
        <p class="mt-1 text-xs text-ink-muted">
          {{ draw.candidate.clanTierLabel }} · {{ draw.candidate.potential }} ·
          {{ t(`ninja.stats.${draw.candidate.primaryArt}`) }}
        </p>
        <p v-if="draw.candidate.profile?.artLabel" class="mt-1 text-xs text-ink-faint">
          {{ draw.candidate.profile.artLabel }} · {{ draw.candidate.profile.potentialLabel }}
        </p>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p class="text-ink">{{ formatRyos(draw.price) }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="canRecommend && academy.rotationOpen"
              type="button"
              class="btn-ghost text-[11px]"
              :disabled="recommendingId === draw.id"
              data-testid="recommend-to-clan"
              @click="recommend(draw.id)"
            >
              {{ t('bureau.academyRecommendClan') }}
            </button>
            <button
              v-if="academy.rotationOpen && !draw.recruited"
              type="button"
              class="btn-ghost"
              :disabled="recruitingId === draw.id"
              @click="recruit(draw.id)"
            >
              {{ t('bureau.academyRecruit') }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <p v-if="!draws.length" class="mt-4 text-xs text-ink-muted">
      {{ t('bureau.academyEmpty') }}
    </p>
  </div>
</template>

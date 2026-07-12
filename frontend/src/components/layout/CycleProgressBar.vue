<script setup>
import { onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { useGameClockLive } from '../../composables/useGameClockLive.js'
import { useCycleProgress } from '../../composables/useCycleProgress.js'

defineOptions({ name: 'CycleProgressBar' })

const { t } = useI18n()
const store = useSquadStore()
const expanded = ref(false)

const gameClockRef = toRef(store, 'gameClock')
const { liveLabel, hour } = useGameClockLive(gameClockRef)
const { percent, milestones } = useCycleProgress(gameClockRef)

let pollTimer = null

function toggleExpanded() {
  expanded.value = !expanded.value
}

watch(expanded, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(() => {
  pollTimer = window.setInterval(() => {
    if (store.sensei) void store.fetchSquad()
  }, 60_000)
})

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="border-t border-line" data-testid="cycle-progress-bar">
    <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-10">
      <span
        class="cycle-progress__clock shrink-0 tabular-nums"
        data-testid="header-game-clock"
      >
        {{ liveLabel }}
      </span>

      <div class="min-w-0 flex-1">
        <div class="cycle-progress__track-wrap" aria-hidden="true">
          <div class="cycle-progress__track">
            <div class="cycle-progress__fill" :style="{ width: `${percent}%` }" />
          </div>
          <div
            v-for="milestone in milestones"
            :key="milestone.id"
            class="cycle-progress__marker"
            :class="[
              `cycle-progress__marker--${milestone.status}`,
              milestone.id === 'start' ? 'cycle-progress__marker--first' : '',
              milestone.id === 'end' ? 'cycle-progress__marker--last' : '',
            ]"
            :style="{ left: `${milestone.position}%` }"
            :title="t(milestone.titleKey)"
          >
            <span class="cycle-progress__marker-icon">
              <svg v-if="milestone.id === 'start'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
              </svg>
              <svg v-else-if="milestone.id === 'mid'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 4h10v16l-5-3-5 3V4Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" />
              </svg>
              <svg v-else-if="milestone.id === 'operation'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
                <path d="M12 4v4M12 16v4M4 12h4M16 12h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
              </svg>
              <svg v-else class="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 21V9l7-4 7 4v12" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" />
                <path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="cycle-progress__marker-label">{{ t(milestone.shortKey) }}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="cycle-progress__toggle"
        :aria-expanded="expanded"
        :aria-label="expanded ? t('cycleProgress.collapse') : t('cycleProgress.expand')"
        data-testid="cycle-progress-toggle"
        @click="toggleExpanded"
      >
        <svg
          class="h-4 w-4 transition-transform duration-200"
          :class="{ 'rotate-180': expanded }"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <div
      v-if="expanded"
      class="cycle-progress__detail border-t border-line bg-bg-soft/50"
      data-testid="cycle-progress-detail"
    >
      <div class="cycle-progress__detail-inner mx-auto max-w-6xl px-4 py-4 sm:px-10">
        <ol class="cycle-progress__timeline">
          <li
            v-for="milestone in milestones"
            :key="milestone.id"
            class="cycle-progress__step"
            :class="`cycle-progress__step--${milestone.status}`"
            :data-testid="`cycle-step-${milestone.id}`"
          >
            <div class="cycle-progress__step-head">
              <span class="cycle-progress__step-badge">{{ t(milestone.shortKey) }}</span>
              <span class="cycle-progress__step-title">{{ t(milestone.titleKey) }}</span>
              <span class="cycle-progress__step-status">
                <template v-if="milestone.status === 'done'">{{ t('cycleProgress.status.done') }}</template>
                <template v-else-if="milestone.status === 'current'">{{ t('cycleProgress.status.current') }}</template>
                <template v-else>{{ t('cycleProgress.countdown', { hours: milestone.hoursUntil }) }}</template>
              </span>
            </div>
            <ul class="cycle-progress__events">
              <li v-for="(eventKey, index) in milestone.eventKeys" :key="index">
                {{ t(eventKey) }}
              </li>
            </ul>
          </li>
        </ol>
        <p class="mt-3 text-xs uppercase tracking-[0.12em] text-ink-faint tabular-nums">
          {{ t('cycleProgress.currentHour', { hour }) }} · {{ liveLabel }}
        </p>
      </div>
    </div>
  </div>
</template>

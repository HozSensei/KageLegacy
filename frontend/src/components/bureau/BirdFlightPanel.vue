<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import {
  canRegisterBirdFlight,
  getBirdFlightProgress,
} from '../../composables/useBirdFlight.js'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'

const { t } = useI18n()
const store = useSquadStore()
const registeringId = ref(null)
const localError = ref(null)

const chuninList = computed(() => {
  const all = [...store.activeSquad, ...store.bench]
  return all
    .filter((n) => n.grade === 'Chunin')
    .map((n) => ({ ninja: n, progress: getBirdFlightProgress(n) }))
    .sort((a, b) => {
      if (a.progress.ready !== b.progress.ready) return a.progress.ready ? -1 : 1
      return b.progress.combat - a.progress.combat
    })
})

const registrationOpen = computed(() => {
  const hour = store.gameClock?.hour ?? 0
  return hour < 72 && !store.gameClock?.cycleComplete
})

async function register(ninjaId) {
  registeringId.value = ninjaId
  localError.value = null
  try {
    await store.requestBirdFlight(ninjaId)
  } catch (e) {
    localError.value = e.message
  } finally {
    registeringId.value = null
  }
}
</script>

<template>
  <section v-if="chuninList.length" class="mt-10 border-t border-line pt-8">
    <p class="section-label">{{ t('bureau.birdFlight.title') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-faint">{{ t('bureau.birdFlight.lead') }}</p>

    <p v-if="!registrationOpen" class="mt-4 text-xs text-ink-muted">
      {{ t('bureau.birdFlight.closed') }}
    </p>

    <p v-if="localError" class="mt-4 text-xs text-fire">{{ localError }}</p>

    <ul class="mt-6 space-y-5">
      <li
        v-for="{ ninja, progress } in chuninList"
        :key="ninja.id"
        class="border border-line/80 p-4"
        :class="{ 'border-accent/40 bg-accent/5': ninja.birdFlightPeak }"
      >
        <div class="flex items-baseline justify-between gap-3">
          <NinjaListIdentity :ninja="ninja" compact first-name-only />
          <span
            v-if="ninja.bird_flight_requested"
            class="text-[10px] uppercase tracking-[0.14em] text-accent"
          >
            {{ t('bureau.birdFlight.registered') }}
          </span>
        </div>

        <p class="mt-1 text-[11px] text-ink-faint">
          {{ t('bureau.birdFlight.combat') }}
          <span :class="progress.combat >= progress.combatRequired ? 'text-accent-soft' : 'text-ink-muted'">
            {{ progress.combat }}/{{ progress.combatRequired }}
          </span>
          ·
          {{ t('ninja.stats.intelligence') }}
          <span :class="progress.intelligence >= progress.intelligenceRequired ? 'text-accent-soft' : 'text-ink-muted'">
            {{ progress.intelligence }}/{{ progress.intelligenceRequired }}
          </span>
          <span v-if="ninja.birdFlightPeak" class="ml-2 text-accent">
            · {{ t('bureau.birdFlight.peak') }}
          </span>
        </p>

        <div class="mt-2 flex gap-3">
          <div class="exam-bar flex-1">
            <div class="exam-bar__fill" :style="{ width: `${progress.combatRatio * 100}%` }" />
          </div>
          <div class="exam-bar flex-1">
            <div class="exam-bar__fill exam-bar__fill--iq" :style="{ width: `${progress.intelligenceRatio * 100}%` }" />
          </div>
        </div>

        <p v-if="ninja.stagnationRisk && !ninja.bird_flight_requested" class="mt-2 text-[11px] text-fire">
          {{ t('bureau.birdFlight.stagnationWarning') }}
        </p>

        <button
          v-if="canRegisterBirdFlight(ninja, store.gameClock)"
          type="button"
          class="btn-ghost mt-3 text-[10px]"
          :disabled="registeringId === ninja.id"
          @click="register(ninja.id)"
        >
          {{
            registeringId === ninja.id
              ? t('bureau.birdFlight.sending')
              : t('bureau.birdFlight.submit')
          }}
        </button>
      </li>
    </ul>
  </section>
</template>

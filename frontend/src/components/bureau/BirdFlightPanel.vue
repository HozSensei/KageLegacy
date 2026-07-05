<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import {
  canRegisterBirdFlight,
  computeBirdFlightCost,
  getBirdFlightCombat,
} from '../../composables/useBirdFlight.js'

const { t } = useI18n()
const store = useSquadStore()
const registeringId = ref(null)
const localError = ref(null)

const chuninList = computed(() => {
  const all = [...store.activeSquad, ...store.bench]
  return all
    .filter((n) => n.grade === 'Chunin')
    .map((n) => ({ ninja: n, combat: getBirdFlightCombat(n) }))
    .sort((a, b) => b.combat - a.combat)
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
        v-for="{ ninja, combat } in chuninList"
        :key="ninja.id"
        class="border border-line/80 p-4"
        :class="{ 'border-accent/40 bg-accent/5': ninja.birdFlightPeak }"
      >
        <div class="flex items-baseline justify-between gap-3">
          <p class="font-display text-lg text-ink">{{ ninja.name.split(' ')[0] }}</p>
          <span
            v-if="ninja.bird_flight_requested"
            class="text-[10px] uppercase tracking-[0.14em] text-accent"
          >
            {{ t('bureau.birdFlight.registered') }}
          </span>
        </div>

        <p class="mt-1 text-[11px] text-ink-faint">
          {{ t('bureau.birdFlight.combat') }}
          <span :class="ninja.birdFlightReady ? 'text-accent-soft' : 'text-ink-muted'">
            {{ combat }}/17
          </span>
          <span v-if="ninja.birdFlightPeak" class="ml-2 text-accent">
            · {{ t('bureau.birdFlight.peak') }}
          </span>
        </p>

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
              : t('bureau.birdFlight.submit', { cost: computeBirdFlightCost(ninja) })
          }}
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import {
  computeChuninExamCost,
  canRegisterForExam,
  getChuninExamProgress,
} from '../../composables/useChuninExam.js'

const { t } = useI18n()
const store = useSquadStore()
const registeringId = ref(null)
const localError = ref(null)

const geninList = computed(() => {
  const all = [...store.activeSquad, ...store.bench]
  return all
    .filter((n) => n.grade === 'Genin')
    .map((n) => ({ ninja: n, progress: getChuninExamProgress(n) }))
    .sort((a, b) => {
      if (a.progress.ready !== b.progress.ready) return a.progress.ready ? -1 : 1
      return a.ninja.name.localeCompare(b.ninja.name)
    })
})

const registrationOpen = computed(() => (store.gameClock?.hour ?? 0) < 36)

async function register(ninjaId) {
  registeringId.value = ninjaId
  localError.value = null
  try {
    await store.requestChuninExam(ninjaId)
  } catch (e) {
    localError.value = e.message
  } finally {
    registeringId.value = null
  }
}
</script>

<template>
  <section v-if="geninList.length" class="mt-10 border-t border-line pt-8">
    <p class="section-label">{{ t('bureau.chuninExam.title') }}</p>
    <p class="mt-2 text-xs leading-relaxed text-ink-faint">{{ t('bureau.chuninExam.lead') }}</p>

    <p v-if="!registrationOpen" class="mt-4 text-xs text-ink-muted">
      {{ t('bureau.chuninExam.closed') }}
    </p>

    <p v-if="localError" class="mt-4 text-xs text-fire">{{ localError }}</p>

    <ul class="exam-list mt-6 space-y-5">
      <li v-for="{ ninja, progress } in geninList" :key="ninja.id" class="exam-list__row">
        <div class="flex items-baseline justify-between gap-3">
          <p class="font-display text-lg text-ink">{{ ninja.name.split(' ')[0] }}</p>
          <span
            v-if="ninja.chunin_exam_requested"
            class="text-[10px] uppercase tracking-[0.14em] text-accent"
          >
            {{ t('bureau.chuninExam.registered') }}
          </span>
        </div>

        <p class="mt-1 text-[11px] text-ink-faint">
          {{ t('bureau.chuninExam.combat') }}
          <span :class="progress.combat >= progress.combatRequired ? 'text-accent-soft' : 'text-ink-muted'">
            {{ progress.combat }}/{{ progress.combatRequired }}
          </span>
          ·
          {{ t('bureau.chuninExam.iq') }}
          <span :class="progress.intelligence >= progress.intelligenceRequired ? 'text-accent-soft' : 'text-ink-muted'">
            {{ progress.intelligence }}/{{ progress.intelligenceRequired }}
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

        <p v-if="ninja.stagnationRisk && !ninja.chunin_exam_requested" class="mt-2 text-[11px] text-fire">
          {{ t('bureau.chuninExam.stagnationWarning') }}
        </p>

        <button
          v-if="canRegisterForExam(ninja, store.gameClock)"
          type="button"
          class="btn-ghost mt-3 text-[10px]"
          :disabled="registeringId === ninja.id"
          @click="register(ninja.id)"
        >
          {{
            registeringId === ninja.id
              ? t('bureau.chuninExam.sending')
              : t('bureau.chuninExam.submit', { cost: computeChuninExamCost(ninja) })
          }}
        </button>
      </li>
    </ul>
  </section>
</template>

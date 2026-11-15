<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../../stores/squad'
import { canRegisterForExam, getChuninExamProgress } from '../../composables/useChuninExam.js'
import NinjaListIdentity from '../ninja/NinjaListIdentity.vue'

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

const registrationOpen = computed(() => {
  const hour = store.gameClock?.hour ?? 0
  return hour < 72 && !store.gameClock?.cycleComplete
})

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
    <p class="mt-2 text-xs text-ink-muted">{{ t('bureau.chuninExam.ceremony') }}</p>

    <p v-if="!registrationOpen" class="mt-4 text-xs text-ink-muted">
      {{ t('bureau.chuninExam.closed') }}
    </p>

    <p v-if="localError" class="mt-4 text-xs text-fire">{{ localError }}</p>

    <ul class="exam-list mt-6 space-y-5">
      <li v-for="{ ninja, progress } in geninList" :key="ninja.id" class="exam-list__row">
        <div class="flex items-baseline justify-between gap-3">
          <NinjaListIdentity :ninja="ninja" compact first-name-only />
          <span
            v-if="ninja.chunin_exam_requested"
            class="text-[10px] uppercase tracking-[0.14em] text-accent"
          >
            {{ t('bureau.chuninExam.registered') }}
          </span>
        </div>

        <p class="mt-1 text-[11px] text-ink-faint">
          {{ t('bureau.chuninExam.average') }}
          <span :class="progress.average >= progress.averageRequired ? 'text-accent-soft' : 'text-ink-muted'">
            {{ progress.average }}/{{ progress.averageRequired }}
          </span>
        </p>

        <div class="mt-2">
          <div class="exam-bar">
            <div class="exam-bar__fill" :style="{ width: `${progress.averageRatio * 100}%` }" />
          </div>
        </div>

        <p
          v-if="progress.promotionRewards"
          class="mt-2 text-[11px] leading-relaxed text-accent-soft"
        >
          {{
            t('bureau.chuninExam.rewardPreview', {
              ryos: progress.promotionRewards.ryos.toLocaleString(),
              reputation: progress.promotionRewards.reputation,
              moral: progress.promotionRewards.moralBoost,
            })
          }}
        </p>

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
              : t('bureau.chuninExam.submit')
          }}
        </button>
      </li>
    </ul>
  </section>
</template>

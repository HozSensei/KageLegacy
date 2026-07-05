<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaFlipCard from '../components/ninja/NinjaFlipCard.vue'
import ChuninExamList from '../components/bureau/ChuninExamList.vue'
import ChuninStagnationPanel from '../components/bureau/ChuninStagnationPanel.vue'
import IdleMissionPanel from '../components/bureau/IdleMissionPanel.vue'
import StagnationAlert from '../components/bureau/StagnationAlert.vue'

const { t, locale } = useI18n()
const store = useSquadStore()
const trainingFocus = ref('Genjutsu')
const focusSaving = ref(false)

const FOCUS_KEYS = ['Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine', 'Vitesse', 'Intelligence']

const squadRating = computed(() => {
  if (!store.activeSquad.length) return '—'
  const avg = store.activeSquad.reduce((acc, n) =>
    acc + n.taijutsu + n.ninjutsu + n.genjutsu + n.medecine + n.vitesse + n.intelligence, 0
  ) / store.activeSquad.length
  return Math.round(avg)
})

async function onTrainingFocusChange() {
  focusSaving.value = true
  try {
    await store.saveTrainingFocus(trainingFocus.value)
  } finally {
    focusSaving.value = false
  }
}

onMounted(async () => {
  await store.fetchSquad()
  if (store.sensei?.language) locale.value = store.sensei.language
  if (store.sensei?.trainingFocus) trainingFocus.value = store.sensei.trainingFocus
})
</script>

<template>
  <div class="page-shell">
    <header class="lg:grid lg:grid-cols-12 lg:gap-10">
      <div class="lg:col-span-7">
        <p class="page-kicker">{{ t('bureau.cycle') }}</p>
        <h1 class="page-title mt-3">{{ t('bureau.title') }}</h1>
        <p class="page-lead">
          Résumé du dojo, de l'escouade en lice et de l'état du cycle en cours.
        </p>
      </div>
    </header>

    <p v-if="store.loading" class="mt-12 text-sm text-ink-muted">Chargement…</p>
    <p v-else-if="store.error" class="mt-12 text-sm text-fire">{{ store.error }}</p>

    <template v-else-if="store.sensei">
      <div
        v-if="store.gameClock?.phase === 'operation_live'"
        class="mt-10 border-l-2 border-accent pl-4 text-sm text-ink-muted"
      >
        {{ t('bureau.operationLive') }} —
        <router-link to="/operation" class="text-accent underline-offset-4 hover:underline">voir le rapport</router-link>
      </div>

      <StagnationAlert />

      <dl class="metric-row mt-12">
        <div class="metric-item">
          <dd class="metric-value text-accent">{{ store.sensei.ryos.toLocaleString() }}</dd>
          <dt class="metric-label">{{ t('sensei.ryos') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ store.sensei.reputation }}</dd>
          <dt class="metric-label">{{ t('sensei.reputation') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ store.sensei.chakraPool }}</dd>
          <dt class="metric-label">{{ t('sensei.chakra') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ squadRating }}</dd>
          <dt class="metric-label">Note escouade</dt>
        </div>
      </dl>

      <section class="mt-14 lg:grid lg:grid-cols-12 lg:gap-10">
        <div class="lg:col-span-4">
          <p class="section-label">Jonin-Sensei</p>
          <h2 class="mt-3 font-display text-3xl text-ink">{{ store.sensei.name }}</h2>
          <p class="mt-4 text-sm leading-7 text-ink-muted">
            {{ t('sensei.interceptionHint') }}
          </p>
          <p class="mt-2 text-sm text-ink-faint">
            {{ t('sensei.chakra') }} :
            <span class="text-ink">{{ store.sensei.chakraPool }}</span> / 100
          </p>

          <div class="mt-8">
            <label class="section-label" for="training-focus">{{ t('bureau.trainingFocus') }}</label>
            <select
              id="training-focus"
              v-model="trainingFocus"
              class="strategy-select mt-3 max-w-xs"
              :disabled="focusSaving"
              @change="onTrainingFocusChange"
            >
              <option v-for="key in FOCUS_KEYS" :key="key" :value="key">
                {{ t(`ninja.stats.${key.toLowerCase()}`) }}
              </option>
            </select>
            <p class="mt-2 text-xs text-ink-faint">{{ t('bureau.trainingHint') }}</p>
          </div>

          <ChuninExamList />
          <ChuninStagnationPanel />
          <IdleMissionPanel />
        </div>

        <div class="mt-10 border-t border-line pt-10 lg:col-span-8 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <p class="section-label">{{ t('bureau.activeSquad') }}</p>
          <p class="mt-2 max-w-md text-sm text-ink-muted">
            Survolez une carte pour l'apercevoir, cliquez pour voir la fiche au verso.
          </p>

          <div class="mt-8 flex flex-wrap justify-center gap-6 sm:justify-start lg:gap-8">
            <NinjaFlipCard
              v-for="ninja in store.activeSquad"
              :key="ninja.id"
              :ninja="ninja"
              size="md"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '../stores/squad'
import NinjaFlipCard from '../components/ninja/NinjaFlipCard.vue'
import ChuninExamList from '../components/bureau/ChuninExamList.vue'
import ChuninStagnationPanel from '../components/bureau/ChuninStagnationPanel.vue'
import BirdFlightPanel from '../components/bureau/BirdFlightPanel.vue'
import DispensaryPanel from '../components/bureau/DispensaryPanel.vue'
import StagnationAlert from '../components/bureau/StagnationAlert.vue'
import CycleBudgetPanel from '../components/bureau/CycleBudgetPanel.vue'
import DailySealPanel from '../components/bureau/DailySealPanel.vue'
import AcademyPanel from '../components/bureau/AcademyPanel.vue'

defineOptions({ name: 'BureauView' })

const { t } = useI18n()
const store = useSquadStore()

const squadRating = computed(() => {
  if (!store.activeSquad.length) return '—'
  const avg = store.activeSquad.reduce((acc, n) =>
    acc + n.taijutsu + n.ninjutsu + n.genjutsu + n.medecine + n.vitesse + n.intelligence, 0
  ) / store.activeSquad.length
  return Math.round(avg)
})

const showOperationBanner = computed(() => {
  const phase = store.gameClock?.phase
  return phase === 'operation_live' || phase === 'cycle_end'
})

const debtFrozen = computed(
  () => (store.sensei?.ryos ?? 0) < 0 || store.sensei?.salaryDebt
)

const journalUnreadCount = computed(() =>
  (store.activityFeed || []).filter((note) => !note.read).length
)

onMounted(async () => {
  if (!store.sensei) await store.fetchSquad()
})
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="bureau-page">
    <header class="lg:grid lg:grid-cols-12 lg:gap-10">
      <div class="lg:col-span-7">
        <p class="page-lead">
          {{ t('bureau.lead') }}
        </p>
      </div>
    </header>

    <p v-if="store.loading && !store.sensei" class="mt-12 text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="store.error" class="mt-12 text-sm text-fire">{{ store.error }}</p>

    <template v-else-if="store.sensei">
      <div
        v-if="debtFrozen"
        class="mt-10 border-l-2 border-fire pl-4 text-sm text-fire"
      >
        {{ t('bureau.debtFreeze') }}
      </div>

      <div
        v-if="showOperationBanner"
        class="mt-10 border-l-2 border-accent pl-4 text-sm text-ink-muted"
        :class="{ 'mt-6': debtFrozen }"
      >
        {{ t('bureau.operationLive') }} —
        <router-link to="/operation" class="text-accent underline-offset-4 hover:underline">
          {{ t('bureau.operationLink') }}
        </router-link>
      </div>

      <StagnationAlert />

      <router-link
        to="/journal"
        class="mt-10 flex items-center justify-between gap-4 border border-line bg-bg-card/40 px-4 py-3 transition hover:border-accent/40 hover:bg-bg-card"
        data-testid="bureau-journal-link"
      >
        <div class="min-w-0">
          <p class="section-label">{{ t('bureau.activityTitle') }}</p>
          <p class="mt-1 text-sm text-ink-muted">{{ t('bureau.activityTeaser') }}</p>
        </div>
        <span
          v-if="journalUnreadCount > 0"
          class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-fire px-1.5 text-[10px] font-medium text-bg"
        >
          {{ journalUnreadCount > 9 ? '9+' : journalUnreadCount }}
        </span>
      </router-link>

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
          <dt class="metric-label">{{ t('bureau.squadRating') }}</dt>
        </div>
      </dl>

      <DailySealPanel />

      <section class="mt-14 lg:grid lg:grid-cols-12 lg:gap-10">
        <div class="lg:col-span-4">
          <h2 class="font-display text-3xl text-ink">{{ store.sensei.name }}</h2>
          <p class="mt-4 text-sm leading-7 text-ink-muted">
            {{ t('sensei.interceptionHint') }}
          </p>
          <p class="mt-2 text-sm text-ink-faint">
            {{ t('sensei.chakra') }} :
            {{ t('sensei.chakraMax', { current: store.sensei.chakraPool, max: 100 }) }}
          </p>

          <CycleBudgetPanel />
          <ChuninExamList />
          <BirdFlightPanel />
          <ChuninStagnationPanel />
        </div>

        <div class="mt-10 border-t border-line pt-10 lg:col-span-8 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <p class="section-label">{{ t('bureau.activeSquad') }}</p>
          <p class="mt-2 max-w-md text-sm text-ink-muted">
            {{ t('bureau.activeSquadHint') }}
          </p>

          <div class="mt-8 flex flex-wrap justify-center gap-6 sm:justify-start lg:gap-8">
            <NinjaFlipCard
              v-for="ninja in store.activeSquad"
              :key="ninja.id"
              :ninja="ninja"
              size="md"
            />
          </div>

          <AcademyPanel />
          <DispensaryPanel />
        </div>
      </section>
    </template>
  </div>
</template>

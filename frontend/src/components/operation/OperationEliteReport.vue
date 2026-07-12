<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEliteStore } from '../../stores/elite'

const props = defineProps({
  matchId: { type: [Number, String], required: true },
  canLoad: { type: Boolean, default: true },
})

const { t } = useI18n()
const elite = useEliteStore()
const open = ref(false)

const report = computed(() => elite.matchReport)
const loading = computed(() => elite.reportLoading)
const error = computed(() => elite.reportError)

const possessionLabel = computed(() => {
  const p = report.value?.summary?.possession
  if (!p) return '—'
  if (p.home != null && p.away != null) return `${p.home}% / ${p.away}%`
  if (p.mine != null) return `${p.mine}%`
  return '—'
})

const possessionCaption = computed(() => {
  const p = report.value?.summary?.possession
  if (p?.home != null && p?.away != null) return t('eliteReport.possessionSplit')
  return t('eliteReport.possession')
})

const endReasonLabel = computed(() => {
  const key = report.value?.summary?.endReason
  if (!key) return '—'
  const i18nKey = `eliteReport.endReasons.${key}`
  const translated = t(i18nKey)
  return translated === i18nKey ? key : translated
})

watch(
  () => [props.matchId, props.canLoad, elite.subscription?.isActive],
  async ([id, canLoad, isActive]) => {
    if (!id || !canLoad || !isActive) return
    if (open.value) {
      await elite.fetchMatchReport(id)
    }
  }
)

async function toggle() {
  open.value = !open.value
  if (open.value && props.matchId && elite.subscription?.isActive && !report.value) {
    await elite.fetchMatchReport(props.matchId)
  }
}

function heatmapBarWidth(value, bucket) {
  const max = Math.max(...Object.values(bucket || {}), 1)
  return Math.round(((value || 0) / max) * 100)
}
</script>

<template>
  <section
    v-if="elite.subscription?.isActive"
    class="mt-14 border-t border-line pt-10"
    data-testid="elite-match-report"
  >
    <button type="button" class="flex w-full items-center justify-between text-left" @click="toggle">
      <span class="section-label">{{ t('eliteReport.title') }}</span>
      <span class="text-xs uppercase tracking-[0.14em] text-accent">
        {{ open ? t('eliteReport.hide') : t('eliteReport.show') }}
      </span>
    </button>

    <div v-if="open" class="mt-6 space-y-8">
      <p v-if="loading" class="text-sm text-ink-muted">{{ t('common.loading') }}</p>
      <p v-else-if="error" class="text-sm text-fire">{{ error }}</p>

      <template v-else-if="report">
        <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="border border-line/60 bg-bg-card/40 p-3">
            <dt class="text-xs uppercase tracking-[0.14em] text-ink-faint">
              {{ possessionCaption }}
            </dt>
            <dd class="mt-1 text-lg text-ink">
              {{ possessionLabel }}
            </dd>
          </div>
          <div class="border border-line/60 bg-bg-card/40 p-3">
            <dt class="text-xs uppercase tracking-[0.14em] text-ink-faint">
              {{ t('eliteReport.endReason') }}
            </dt>
            <dd class="mt-1 text-sm text-ink-muted">{{ endReasonLabel }}</dd>
          </div>
          <div class="border border-line/60 bg-bg-card/40 p-3">
            <dt class="text-xs uppercase tracking-[0.14em] text-ink-faint">
              {{ t('eliteReport.ko') }}
            </dt>
            <dd class="mt-1 text-sm text-ink-muted">
              {{ report.summary.koCount.home }} / {{ report.summary.koCount.away }}
            </dd>
          </div>
          <div class="border border-line/60 bg-bg-card/40 p-3">
            <dt class="text-xs uppercase tracking-[0.14em] text-ink-faint">
              {{ t('operation.endingTour') }}
            </dt>
            <dd class="mt-1 text-sm text-ink-muted">{{ report.endingTour }} / 12</dd>
          </div>
        </dl>

        <div v-if="report.decisiveMoments?.length">
          <p class="text-xs uppercase tracking-[0.14em] text-ink-faint">
            {{ t('eliteReport.decisiveTitle') }}
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(moment, idx) in report.decisiveMoments"
              :key="idx"
              class="border-l-2 border-accent/50 pl-3 text-sm text-ink-muted"
            >
              <span class="text-xs text-ink-faint">T{{ moment.tour }}</span>
              · {{ moment.label }}
            </li>
          </ul>
        </div>

        <div v-if="report.techniqueBreakdown?.mine">
          <p class="text-xs uppercase tracking-[0.14em] text-ink-faint">
            {{ t('eliteReport.techniqueTitle') }}
          </p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="border border-line/60 p-3 text-xs text-ink-muted">
              <p class="text-ink">{{ t('eliteReport.myDamage') }}</p>
              <p class="mt-2">
                Tai {{ report.techniqueBreakdown.mine.Taijutsu }} ·
                Nin {{ report.techniqueBreakdown.mine.Ninjutsu }} ·
                Gen {{ report.techniqueBreakdown.mine.Genjutsu }}
              </p>
              <p class="mt-1 text-ink-faint">
                {{ t('eliteReport.received') }} {{ report.techniqueBreakdown.mine.received }}
              </p>
            </div>
            <div class="border border-line/60 p-3 text-xs text-ink-muted">
              <p class="text-ink">{{ t('eliteReport.oppDamage') }}</p>
              <p class="mt-2">
                Tai {{ report.techniqueBreakdown.opponent.Taijutsu }} ·
                Nin {{ report.techniqueBreakdown.opponent.Ninjutsu }} ·
                Gen {{ report.techniqueBreakdown.opponent.Genjutsu }}
              </p>
              <p class="mt-1 text-ink-faint">
                {{ t('eliteReport.received') }} {{ report.techniqueBreakdown.opponent.received }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="report.elementHeatmap">
          <p class="text-xs uppercase tracking-[0.14em] text-ink-faint">
            {{ t('eliteReport.heatmapTitle') }}
          </p>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div class="border border-line/60 p-3 text-xs">
              <p class="text-ink">{{ t('eliteReport.heatmapDealt') }}</p>
              <ul class="mt-2 space-y-1 text-ink-muted">
                <li
                  v-for="element in report.elementHeatmap.elements"
                  :key="`dealt-${element}`"
                  class="flex items-center gap-2"
                >
                  <span class="w-14 shrink-0 text-ink-faint">{{ element }}</span>
                  <span class="w-8 tabular-nums">{{ report.elementHeatmap.mine.dealt[element] }}</span>
                  <span
                    class="h-1.5 flex-1 rounded-full bg-bg-soft"
                  >
                    <span
                      class="block h-full rounded-full bg-accent/70"
                      :style="{
                        width: `${heatmapBarWidth(report.elementHeatmap.mine.dealt[element], report.elementHeatmap.mine.dealt)}%`,
                      }"
                    />
                  </span>
                </li>
              </ul>
            </div>
            <div class="border border-line/60 p-3 text-xs">
              <p class="text-ink">{{ t('eliteReport.heatmapTaken') }}</p>
              <ul class="mt-2 space-y-1 text-ink-muted">
                <li
                  v-for="element in report.elementHeatmap.elements"
                  :key="`taken-${element}`"
                  class="flex items-center gap-2"
                >
                  <span class="w-14 shrink-0 text-ink-faint">{{ element }}</span>
                  <span class="w-8 tabular-nums">{{ report.elementHeatmap.mine.taken[element] }}</span>
                  <span class="h-1.5 flex-1 rounded-full bg-bg-soft">
                    <span
                      class="block h-full rounded-full bg-fire/60"
                      :style="{
                        width: `${heatmapBarWidth(report.elementHeatmap.mine.taken[element], report.elementHeatmap.mine.taken)}%`,
                      }"
                    />
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <p
            v-if="report.elementHeatmap.circle"
            class="mt-3 text-sm text-ink-faint"
          >
            {{
              t('eliteReport.heatmapCircle', {
                adv: report.elementHeatmap.circle.mineAdvantage,
                dis: report.elementHeatmap.circle.mineDisadvantage,
              })
            }}
          </p>
        </div>

        <div v-if="report.timeline?.length">
          <p class="text-xs uppercase tracking-[0.14em] text-ink-faint">
            {{ t('eliteReport.timelineTitle') }}
          </p>
          <ul class="mt-3 max-h-64 space-y-3 overflow-y-auto pr-2 text-xs">
            <li v-for="row in report.timeline" :key="row.tour" class="border border-line/40 p-2">
              <p class="font-medium text-ink">
                {{ t('eliteReport.tour', { n: row.tour }) }}
                <span v-if="row.initiativeHomePct != null" class="text-ink-faint">
                  · init {{ row.initiativeHomePct }}%
                </span>
              </p>
              <ul class="mt-1 space-y-1 text-ink-muted">
                <li v-for="(ev, i) in row.events" :key="i" :class="ev.side === 'mine' ? 'text-accent/90' : ''">
                  {{ ev.summary }}
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </section>
</template>

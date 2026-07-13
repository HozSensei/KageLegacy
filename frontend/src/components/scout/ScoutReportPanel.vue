<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const props = defineProps({
  scoutReport: { type: Object, default: null },
  opponentName: { type: String, default: null },
  compact: { type: Boolean, default: false },
})

const { t } = useI18n()

const opponentLabel = computed(
  () => props.scoutReport?.opponentName || props.opponentName || '—'
)

function potentialLabel(profile) {
  const hint = profile?.potentialHint
  if (!hint) return ''
  const key = `scout.potentialLevels.${hint}`
  const translated = t(key)
  return translated !== key ? translated : hint
}
</script>

<template>
  <section v-if="scoutReport" class="scout-report" data-testid="scout-report-panel">
    <p
      v-if="scoutReport.lockReason === 'no_recon'"
      class="text-xs leading-relaxed text-ink-muted"
    >
      {{ t('scout.noRecon', { opponent: opponentLabel }) }}
    </p>

    <p
      v-else-if="scoutReport.phase === 'locked'"
      class="text-xs text-ink-faint"
    >
      {{ t('scout.locked') }}
    </p>

    <div v-else class="border-l-2 border-accent-soft pl-4">
      <p class="text-sm text-ink">
        {{ opponentLabel }}
        <span v-if="scoutReport.opponentIsBot" class="text-ink-faint">{{ t('league.botParen') }}</span>
      </p>

      <div v-if="scoutReport.historicalTendencies?.lines?.length" class="mt-4">
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          {{ t('scout.tendenciesTitle', { count: scoutReport.historicalTendencies.sampleSize }) }}
        </p>
        <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
          <li v-for="(line, i) in scoutReport.historicalTendencies.lines" :key="`tend-${i}`">{{ line }}</li>
        </ul>
      </div>

      <p v-if="scoutReport.rosterPending" class="mt-4 text-xs text-ink-faint">
        {{ t('scout.rosterPending') }}
      </p>

      <template v-else-if="scoutReport.phase === 'roster'">
        <p
          v-if="scoutReport.tier === 'full'"
          class="mt-4 text-[10px] uppercase tracking-[0.14em] text-accent"
        >
          {{ t('scout.full', { pct: scoutReport.reconScorePct ?? '—' }) }}
        </p>
        <p
          v-else-if="scoutReport.reconOutcome === 'win'"
          class="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink-faint"
        >
          {{ t('scout.partialWin', { pct: scoutReport.reconScorePct ?? '—' }) }}
        </p>
        <p v-else class="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          {{ t('scout.partial') }}
        </p>

        <p class="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          {{ t('scout.rosterTitle') }}
        </p>
        <ul
          v-if="scoutReport.rosterReport?.lines?.length"
          class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted"
        >
          <li v-for="(line, i) in scoutReport.rosterReport.lines" :key="`roster-${i}`">{{ line }}</li>
        </ul>

        <ul
          v-if="scoutReport.anomalyFlags?.length"
          class="mt-3 space-y-1 text-xs text-amber-700/90 dark:text-amber-400/90"
        >
          <li v-for="(flag, k) in scoutReport.anomalyFlags" :key="`flag-${k}`">{{ flag }}</li>
        </ul>

        <ul
          v-if="scoutReport.profiles?.length"
          class="mt-4 space-y-1 border-t border-line/40 pt-3 text-xs text-ink-faint"
        >
          <li v-for="(profile, j) in scoutReport.profiles" :key="`sp-${j}`">
            {{ profile.artLabel }}
            <span v-if="potentialLabel(profile)">
              · {{ t('scout.potential', { level: potentialLabel(profile) }) }}
            </span>
            <span v-if="profile.element"> · {{ profile.element }}</span>
          </li>
        </ul>

        <div v-if="scoutReport.deckReport?.lines?.length" class="mt-6 border-t border-line/50 pt-4">
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {{ t('scout.opponentDeck') }}
          </p>
          <p class="mt-1 text-[11px] leading-relaxed text-ink-muted">
            {{ t('scout.deckLead') }}
          </p>
          <p v-if="scoutReport.deckPending" class="mt-2 text-[10px] text-amber-700/90 dark:text-amber-400/90">
            {{ t('scout.deckPending') }}
          </p>
          <p v-else-if="scoutReport.deckFrozen" class="mt-2 text-[10px] text-accent">
            {{ t('scout.deckFrozen') }}
          </p>
          <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
            <li v-for="(line, k) in scoutReport.deckReport.lines" :key="`deck-${k}`">{{ line }}</li>
          </ul>
        </div>
      </template>

      <p v-if="!compact" class="mt-6 text-[11px] text-ink-faint">
        {{ t('scout.timelineHint') }}
      </p>
      <RouterLink
        v-if="compact"
        to="/espionnage"
        class="mt-4 inline-block text-xs text-accent underline-offset-2 hover:underline"
      >
        {{ t('scout.openFull') }}
      </RouterLink>
    </div>
  </section>
</template>

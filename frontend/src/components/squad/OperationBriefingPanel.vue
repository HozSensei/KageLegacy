<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

defineProps({
  briefing: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const { t } = useI18n()
const rulesDeckLink = { path: '/rules', hash: '#combat-pli' }

function potentialLabel(profile) {
  const hint = profile?.potentialHint
  if (!hint) return ''
  const key = `scout.potentialLevels.${hint}`
  const translated = t(key)
  return translated !== key ? translated : hint
}
</script>

<template>
  <section
    v-if="briefing?.nextMatch"
    class="mt-10 border border-line bg-bg-soft p-6"
    data-testid="operation-briefing"
  >
    <p class="section-label">{{ t('briefing.title') }}</p>
    <p class="mt-2 text-xs text-ink-muted">{{ t('briefing.lead') }}</p>

    <div class="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
      <p class="text-ink">
        {{ t('briefing.opponent') }}:
        <span class="font-medium">{{ briefing.nextMatch.opponentName }}</span>
        <span v-if="briefing.nextMatch.opponentIsBot" class="text-ink-faint"> (bot)</span>
      </p>
      <p class="text-ink-muted">{{ t('briefing.cycle', { cycle: briefing.seasonCycle }) }}</p>
    </div>

    <div v-if="briefing.environment?.line" class="mt-4 text-xs text-ink-muted">
      {{ briefing.environment.line }}
      <span v-if="!briefing.environment.confirmed" class="text-ink-faint">
        — {{ t('briefing.envFuzzy') }}
      </span>
    </div>

    <div class="mt-8 grid gap-8 lg:grid-cols-2">
      <div>
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('briefing.ownDeck') }}</p>
        <p class="mt-2 text-sm text-ink">
          {{ t('briefing.pliCount', { count: briefing.ownDeck.pliCount }) }}
          · {{ t('briefing.techniques', { count: briefing.ownDeck.techniqueCount }) }}
        </p>
        <p class="mt-1 text-xs text-ink-muted">
          {{ t('briefing.teamSpeed', { speed: briefing.ownDeck.teamSpeed }) }}
        </p>
        <ul class="mt-4 space-y-2 text-xs text-ink-muted">
          <li v-for="member in briefing.ownDeck.members" :key="member.ninjaId">
            <span class="text-ink">{{ member.name }}</span>
            · {{ member.artLabel }}
            <span v-if="member.techniques?.length">
              · {{ member.techniques.map((tech) => tech.name).join(', ') }}
            </span>
            <span v-else class="text-ink-faint"> · {{ t('squad.deck.autoFill') }}</span>
          </li>
        </ul>
      </div>

      <div>
        <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('briefing.scoutTitle') }}</p>
        <p v-if="!briefing.scoutAvailable" class="mt-2 text-xs text-ink-faint">
          {{ t('briefing.scoutLocked') }}
        </p>
        <p
          v-else-if="briefing.scout?.lockReason === 'no_recon'"
          class="mt-2 text-xs leading-relaxed text-ink-muted"
        >
          {{ t('briefing.scoutNoRecon', { opponent: briefing.nextMatch?.opponentName ?? '—' }) }}
        </p>
        <template v-else-if="briefing.scout">
          <div v-if="briefing.scout.historicalTendencies?.lines?.length" class="mt-2">
            <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {{ t('briefing.scoutTendenciesTitle', { count: briefing.scout.historicalTendencies.sampleSize }) }}
            </p>
            <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
              <li v-for="(line, i) in briefing.scout.historicalTendencies.lines" :key="`tend-${i}`">
                {{ line }}
              </li>
            </ul>
          </div>
          <p v-if="briefing.scout.rosterPending" class="mt-3 text-xs text-ink-faint">
            {{ t('briefing.scoutRosterPending') }}
          </p>
          <template v-else-if="briefing.scout.phase === 'roster'">
            <p
              v-if="briefing.scout.tier === 'full'"
              class="mt-3 text-[10px] uppercase tracking-[0.14em] text-accent"
            >
              {{ t('briefing.scoutFull', { pct: briefing.scout.reconScorePct ?? '—' }) }}
            </p>
            <p
              v-else-if="briefing.scout.reconOutcome === 'win'"
              class="mt-3 text-[10px] uppercase tracking-[0.14em] text-ink-faint"
            >
              {{ t('briefing.scoutPartialWin', { pct: briefing.scout.reconScorePct ?? '—' }) }}
            </p>
            <p v-else class="mt-3 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {{ t('briefing.scoutPartial') }}
            </p>
            <p class="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {{ t('briefing.scoutRosterTitle') }}
            </p>
            <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
              <li v-for="(line, i) in briefing.scout.rosterReport?.lines ?? []" :key="`scout-${i}`">
                {{ line }}
              </li>
            </ul>
            <ul v-if="briefing.scout.anomalyFlags?.length" class="mt-2 space-y-1 text-xs text-amber-700/90">
              <li v-for="(flag, k) in briefing.scout.anomalyFlags" :key="`flag-${k}`">{{ flag }}</li>
            </ul>
            <ul
              v-if="briefing.scout.profiles?.length"
              class="mt-4 space-y-1 border-t border-line/50 pt-3 text-xs text-ink-faint"
            >
              <li v-for="(profile, i) in briefing.scout.profiles" :key="`prof-${i}`">
                {{ profile.artLabel }}
                <span v-if="potentialLabel(profile)">
                  · {{ t('scout.potential', { level: potentialLabel(profile) }) }}
                </span>
                <span v-if="profile.element"> · {{ profile.element }}</span>
              </li>
            </ul>
            <div v-if="briefing.opponentDeck?.lines?.length" class="mt-6 border-t border-line/50 pt-4">
              <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                {{ t('briefing.opponentDeck') }}
              </p>
              <p class="mt-1 text-[11px] leading-relaxed text-ink-muted">
                {{ t('scout.deckLead') }}
              </p>
              <p v-if="briefing.scout.deckPending" class="mt-1 text-[10px] text-amber-700/90">
                {{ t('briefing.deckPending') }}
              </p>
              <p v-else-if="briefing.scout.deckFrozen" class="mt-1 text-[10px] text-accent">
                {{ t('briefing.deckFrozen') }}
              </p>
              <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
                <li v-for="(line, j) in briefing.opponentDeck.lines" :key="`deck-${j}`">
                  {{ line }}
                </li>
              </ul>
            </div>
          </template>
        </template>
      </div>
    </div>

    <RouterLink
      :to="rulesDeckLink"
      class="mt-6 inline-block text-xs text-accent underline-offset-2 hover:underline"
    >
      {{ t('briefing.rulesLink') }}
    </RouterLink>

    <p v-if="briefing.compositionLocked && !briefing.tacticsLocked" class="mt-2 text-xs text-ink-muted">
      {{ t('briefing.compositionLocked') }}
    </p>
    <p v-if="briefing.tacticsLocked" class="mt-2 text-xs text-fire">{{ t('briefing.locked') }}</p>

    <div v-if="briefing.advice?.length" class="mt-8 border-t border-line/50 pt-6">
      <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('briefing.adviceTitle') }}</p>
      <ul class="mt-3 space-y-2 text-xs leading-relaxed text-ink">
        <li v-for="(tip, i) in briefing.advice" :key="`adv-${i}`">→ {{ tip }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import SenseiIdentity from '../components/sensei/SenseiIdentity.vue'
import { resolveIdentity } from '../utils/senseiIdentity.js'

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const league = ref(null)
const gameClock = ref(null)
const fixtures = ref(null)

const showScout = computed(() => (gameClock.value?.hour ?? 0) >= 36)
const invite = ref(null)
const inviteCopied = ref(false)

onMounted(async () => {
  try {
    const [leagueRes, inviteRes] = await Promise.all([
      fetch(`${API_BASE}/api/league`),
      fetch(`${API_BASE}/api/league/invite`).catch(() => null),
    ])
    if (!leagueRes.ok) {
      const body = await leagueRes.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${leagueRes.status}`)
    }
    const data = await leagueRes.json()
    league.value = data
    gameClock.value = data.gameClock

    if (data.pool?.id) {
      const fixRes = await fetch(
        `${API_BASE}/api/matches/pools/${data.pool.id}/fixtures?cycle=${data.pool.currentCycle}`
      )
      if (fixRes.ok) fixtures.value = await fixRes.json()
    }

    if (inviteRes?.ok) {
      invite.value = await inviteRes.json()
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function copyInvite() {
  if (!invite.value?.inviteUrl) return
  try {
    await navigator.clipboard.writeText(invite.value.inviteUrl)
    inviteCopied.value = true
    setTimeout(() => { inviteCopied.value = false }, 2000)
  } catch {
    inviteCopied.value = false
  }
}

function fixtureIdentity(side, userId) {
  return resolveIdentity(side.identity, {
    userId,
    senseiName: side.name,
    isBot: side.isBot,
    isGuest: side.isGuest,
  })
}


function matchStatusLabel(status) {
  const map = {
    scheduled: t('league.matchScheduled'),
    simulated: t('league.matchSimulated'),
    revealing: t('league.matchLive'),
    applied: t('league.matchDone'),
  }
  return map[status] || status
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="league-page">
    <header>
      <p class="page-lead">{{ t('league.lead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('league.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else-if="league">
      <dl class="metric-row mt-12">
        <div class="metric-item">
          <dd class="metric-value text-accent">{{ league.pool.division }}</dd>
          <dt class="metric-label">{{ t('league.division') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ league.pool.season }}</dd>
          <dt class="metric-label">{{ t('league.season') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ league.pool.currentCycle }}/{{ league.pool.maxCycles }}</dd>
          <dt class="metric-label">{{ t('league.cycle') }}</dt>
        </div>
      </dl>

      <section class="mt-14" data-testid="league-standings">
        <p class="section-label">{{ t('league.standings') }}</p>
        <table class="league-table mt-6 w-full text-sm">
          <thead>
            <tr class="text-left text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <th class="pb-3 pr-4">#</th>
              <th class="pb-3">{{ t('league.sensei') }}</th>
              <th class="pb-3 text-right">{{ t('league.played') }}</th>
              <th class="pb-3 text-right">{{ t('league.points') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in league.standings"
              :key="row.userId"
              class="border-t border-line/60"
              :class="{ 'text-accent': row.isPlayer }"
            >
              <td class="py-3 pr-4 tabular-nums text-ink-muted">{{ row.rank }}</td>
              <td class="py-3">
                <SenseiIdentity
                  v-if="row.identity"
                  :identity="row.identity"
                  variant="inline"
                  :highlight="row.isPlayer"
                />
                <template v-else>
                  {{ row.senseiName }}
                  <span v-if="row.isBot" class="ml-1 text-[10px] text-ink-faint">{{ t('league.bot') }}</span>
                </template>
              </td>
              <td class="py-3 text-right tabular-nums">{{ row.played }}</td>
              <td class="py-3 text-right font-display text-lg tabular-nums">{{ row.points }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="invite" class="mt-14">
        <p class="section-label">{{ t('league.inviteTitle') }}</p>
        <p class="mt-2 text-xs text-ink-faint">{{ t('league.inviteLead') }}</p>
        <p class="mt-3 break-all font-mono text-[11px] text-ink-muted">{{ invite.inviteUrl }}</p>
        <button type="button" class="btn-ghost mt-3 text-[10px]" @click="copyInvite">
          {{ inviteCopied ? t('league.inviteCopied') : t('league.inviteCopy') }}
        </button>
      </section>

      <section v-if="league.nextMatch" class="mt-14">
        <p class="section-label">{{ t('league.nextMatch') }}</p>
        <RouterLink
          :to="{
            name: 'operation-match',
            params: { matchId: league.nextMatch.id },
            query: { poolId: league.pool.id, cycle: league.nextMatch.cycle },
          }"
          class="mt-4 block border border-line p-5 transition hover:border-accent"
        >
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {{ t('league.matchday') }} {{ league.nextMatch.cycle }}
            · {{ matchStatusLabel(league.nextMatch.status) }}
          </p>
          <div class="operation-match-header operation-match-header--compact mt-4">
            <div class="operation-match-header__versus">
              <SenseiIdentity
                class="operation-match-header__card"
                :identity="fixtureIdentity(league.nextMatch.home, league.nextMatch.homeUserId)"
                variant="match"
                :subtitle="t('league.homeSide')"
                :linkable="false"
              />
              <span class="operation-match-header__vs">{{ t('common.vs') }}</span>
              <SenseiIdentity
                class="operation-match-header__card"
                :identity="fixtureIdentity(league.nextMatch.away, league.nextMatch.awayUserId)"
                variant="match"
                :subtitle="t('league.awaySide')"
                :linkable="false"
              />
            </div>
          </div>
          <p
            v-if="league.nextMatch.status !== 'scheduled'"
            class="mt-2 text-sm text-ink-muted"
          >
            {{ league.nextMatch.homeScore }} : {{ league.nextMatch.awayScore }}
          </p>
          <p class="mt-3 text-xs text-accent">{{ t('league.viewChronicle') }}</p>
        </RouterLink>
      </section>

      <section v-if="fixtures?.matches?.length" class="mt-14" data-testid="league-fixtures">
        <p class="section-label">{{ t('league.fixtures') }}</p>
        <p class="mt-2 text-xs leading-relaxed text-ink-muted">
          {{ t('league.fixturesHint', { cycle: league.pool.currentCycle }) }}
        </p>

        <ul class="mt-6 space-y-2">
          <li v-for="match in fixtures.matches" :key="match.id">
            <RouterLink
              :to="{
                name: 'operation-match',
                params: { matchId: match.id },
                query: { poolId: league.pool.id, cycle: match.cycle },
              }"
              class="block border px-4 py-4 text-sm transition hover:border-accent"
              :class="match.isParticipant ? 'border-accent/60 bg-accent/5' : 'border-line'"
            >
              <div class="operation-match-header operation-match-header--compact">
                <div class="operation-match-header__versus">
                  <SenseiIdentity
                    class="operation-match-header__card"
                    :identity="fixtureIdentity(match.home, match.homeUserId)"
                    variant="match"
                    :subtitle="t('league.homeSide')"
                    :linkable="false"
                  />
                  <span class="operation-match-header__vs">{{ t('common.vs') }}</span>
                  <SenseiIdentity
                    class="operation-match-header__card"
                    :identity="fixtureIdentity(match.away, match.awayUserId)"
                    variant="match"
                    :subtitle="t('league.awaySide')"
                    :linkable="false"
                  />
                </div>
              </div>
              <p
                v-if="match.homeScore != null && match.awayScore != null && match.status !== 'scheduled'"
                class="operation-match-header__status mt-3"
              >
                {{ match.homeScore }} : {{ match.awayScore }}
              </p>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="league.recentMatches?.length" class="mt-14">
        <p class="section-label">{{ t('league.recentMatches') }}</p>
        <ul class="mt-4 space-y-2">
          <li v-for="match in league.recentMatches" :key="match.id">
            <RouterLink
              :to="{
                name: 'operation-match',
                params: { matchId: match.id },
                query: { poolId: league.pool.id, cycle: match.cycle },
              }"
              class="block border border-line px-4 py-3 text-sm text-ink-muted transition hover:border-accent hover:text-ink"
            >
              J{{ match.cycle }} · {{ match.home }} vs {{ match.away }}
              <span class="ml-2 text-ink-faint">{{ match.score }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="showScout && league.scoutReport" class="mt-14">
            <p class="section-label">{{ t('league.scoutTitle') }}</p>
            <p
              v-if="league.scoutReport.lockReason === 'no_recon'"
              class="mt-4 text-xs leading-relaxed text-ink-muted"
            >
              {{ t('league.scoutNoRecon', { opponent: league.scoutReport.opponentName }) }}
            </p>
            <div v-else class="mt-4 border-l-2 border-accent-soft pl-4">
              <p class="text-sm text-ink">
                {{ league.scoutReport.opponentName }}
                <span v-if="league.scoutReport.opponentIsBot" class="text-ink-faint">{{ t('league.botParen') }}</span>
              </p>

              <div v-if="league.scoutReport.historicalTendencies?.lines?.length" class="mt-4">
                <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {{ t('league.scoutTendenciesTitle', { count: league.scoutReport.historicalTendencies.sampleSize }) }}
                </p>
                <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
                  <li v-for="(line, i) in league.scoutReport.historicalTendencies.lines" :key="`tend-${i}`">{{ line }}</li>
                </ul>
              </div>

              <p
                v-if="league.scoutReport.rosterPending"
                class="mt-4 text-xs text-ink-faint"
              >
                {{ t('league.scoutRosterPending') }}
              </p>

              <template v-else-if="league.scoutReport.phase === 'roster'">
                <p
                  v-if="league.scoutReport.tier === 'full'"
                  class="mt-4 text-[10px] uppercase tracking-[0.14em] text-accent"
                >
                  {{ t('league.scoutFull', { pct: league.scoutReport.reconScorePct ?? '—' }) }}
                </p>
                <p
                  v-else-if="league.scoutReport.reconOutcome === 'win'"
                  class="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink-faint"
                >
                  {{ t('league.scoutPartialWin', { pct: league.scoutReport.reconScorePct ?? '—' }) }}
                </p>
                <p v-else class="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {{ t('league.scoutPartial') }}
                </p>
                <p class="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {{ t('league.scoutRosterTitle') }}
                </p>
                <ul
                  v-if="league.scoutReport.rosterReport?.lines?.length"
                  class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted"
                >
                  <li v-for="(line, i) in league.scoutReport.rosterReport.lines" :key="`roster-${i}`">{{ line }}</li>
                </ul>
                <ul
                  v-if="league.scoutReport.anomalyFlags?.length"
                  class="mt-3 space-y-1 text-xs text-amber-700/90 dark:text-amber-400/90"
                >
                  <li v-for="(flag, k) in league.scoutReport.anomalyFlags" :key="`flag-${k}`">{{ flag }}</li>
                </ul>
                <ul
                  v-if="league.scoutReport.profiles?.length"
                  class="mt-4 space-y-1 border-t border-line/40 pt-3 text-xs text-ink-faint"
                >
                  <li v-for="(profile, j) in league.scoutReport.profiles" :key="`sp-${j}`">
                    {{ profile.artLabel }} · {{ t('dossier.potential', { level: profile.potentialHint }) }}
                  </li>
                </ul>
                <div v-if="league.scoutReport.deckReport?.lines?.length" class="mt-6 border-t border-line/50 pt-4">
                  <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    {{ t('league.opponentDeck') }}
                  </p>
                  <p v-if="league.scoutReport.deckPending" class="mt-1 text-[10px] text-amber-700/90 dark:text-amber-400/90">
                    {{ t('league.deckPending') }}
                  </p>
                  <p v-else-if="league.scoutReport.deckFrozen" class="mt-1 text-[10px] text-accent">
                    {{ t('league.deckFrozen') }}
                  </p>
                  <ul class="mt-2 space-y-2 text-xs leading-relaxed text-ink-muted">
                    <li v-for="(line, k) in league.scoutReport.deckReport.lines" :key="`deck-${k}`">{{ line }}</li>
                  </ul>
                </div>
              </template>
            </div>
          </section>
    </template>
  </div>
</template>

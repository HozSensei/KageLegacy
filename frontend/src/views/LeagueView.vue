<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import ScoutReportPanel from '../components/scout/ScoutReportPanel.vue'
import SenseiIdentity from '../components/sensei/SenseiIdentity.vue'
import LeagueWallPanel from '../components/league/LeagueWallPanel.vue'
import { resolveIdentity } from '../utils/senseiIdentity.js'
import { readApiError } from '../utils/http.js'
import { useSquadStore } from '../stores/squad'

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''
const store = useSquadStore()

const loading = ref(true)
const error = ref(null)
const league = ref(null)
const gameClock = ref(null)
const fixtures = ref(null)

const showScout = computed(() => (gameClock.value?.hour ?? 0) >= 36)
const invite = ref(null)
const inviteCopied = ref(false)
const challengeBusyId = ref(null)
const challengeError = ref(null)
const challengeSentIds = ref({})
const externalTargets = ref([])

const roster = computed(() => league.value?.pool?.roster || invite.value?.roster || null)

async function markLeagueOnboarding() {
  try {
    if (!store.sensei) await store.fetchSquad()
    const step = store.onboarding?.steps?.find((s) => s.key === 'league')
    if (store.onboarding && (!store.onboarding.active || step?.done)) return
    const res = await fetch(`${API_BASE}/api/gameplay/onboarding/league`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    store.applySquadMutation(data)
  } catch {
    /* ignore — onboarding is best-effort */
  }
}

onMounted(async () => {
  try {
    const [leagueRes, inviteRes, targetsRes] = await Promise.all([
      fetch(`${API_BASE}/api/league`),
      fetch(`${API_BASE}/api/league/invite`).catch(() => null),
      fetch(`${API_BASE}/api/league/challenge-targets`).catch(() => null),
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
    if (targetsRes?.ok) {
      const targets = await targetsRes.json()
      externalTargets.value = (targets.opponents || []).filter((o) => !o.samePool)
    }

    await markLeagueOnboarding()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function copyInvite() {
  if (!invite.value?.inviteUrl) return
  try {
    if (navigator.share) {
      await navigator.share({
        title: t('league.inviteTitle'),
        text: t('league.inviteShareText', {
          division: league.value?.pool?.division || invite.value.divisionLevel,
        }),
        url: invite.value.inviteUrl,
      })
      return
    }
    await navigator.clipboard.writeText(invite.value.inviteUrl)
    inviteCopied.value = true
    setTimeout(() => {
      inviteCopied.value = false
    }, 2000)
  } catch {
    try {
      await navigator.clipboard.writeText(invite.value.inviteUrl)
      inviteCopied.value = true
      setTimeout(() => {
        inviteCopied.value = false
      }, 2000)
    } catch {
      inviteCopied.value = false
    }
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

function h2hLabel(h2h) {
  if (!h2h) return null
  return t('league.h2hScore', { w: h2h.wins, d: h2h.draws, l: h2h.losses })
}

function challengeAlreadySent(userId) {
  return Boolean(challengeSentIds.value[userId])
}

async function challengeRecon(targetUserId) {
  if (!targetUserId || challengeBusyId.value) return
  challengeBusyId.value = targetUserId
  challengeError.value = null
  try {
    const res = await fetch(`${API_BASE}/api/reconnaissance/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    challengeSentIds.value = { ...challengeSentIds.value, [targetUserId]: true }
  } catch (e) {
    challengeError.value = e.message
  } finally {
    challengeBusyId.value = null
  }
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
        <div v-if="roster" class="metric-item">
          <dd class="metric-value">{{ roster.humans }}/{{ roster.capacity }}</dd>
          <dt class="metric-label">{{ t('league.humans') }}</dt>
        </div>
      </dl>

      <section class="mt-14" data-testid="league-standings">
        <p class="section-label">{{ t('league.standings') }}</p>
        <p v-if="challengeError" class="mt-2 text-xs text-fire">{{ challengeError }}</p>
        <table class="league-table mt-6 w-full text-sm">
          <thead>
            <tr class="text-left text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <th class="pb-3 pr-4">#</th>
              <th class="pb-3">{{ t('league.sensei') }}</th>
              <th class="pb-3 text-right">{{ t('league.h2h') }}</th>
              <th class="pb-3 text-right">{{ t('league.played') }}</th>
              <th class="pb-3 text-right">{{ t('league.points') }}</th>
              <th class="pb-3 text-right" />
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
                <div class="flex flex-wrap items-center gap-2">
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
                  <span
                    v-if="row.isNemesis"
                    class="text-[10px] uppercase tracking-[0.12em] text-fire"
                    data-testid="league-nemesis-badge"
                  >
                    {{ t('league.nemesis') }}
                  </span>
                </div>
              </td>
              <td class="py-3 text-right tabular-nums text-ink-muted">
                <span v-if="row.h2h">{{ h2hLabel(row.h2h) }}</span>
                <span v-else class="text-ink-faint">—</span>
              </td>
              <td class="py-3 text-right tabular-nums">{{ row.played }}</td>
              <td class="py-3 text-right font-display text-lg tabular-nums">{{ row.points }}</td>
              <td class="py-3 text-right">
                <button
                  v-if="row.canChallengeRecon"
                  type="button"
                  class="btn-ghost text-[10px]"
                  :disabled="challengeBusyId === row.userId || challengeAlreadySent(row.userId)"
                  :data-testid="`league-challenge-${row.userId}`"
                  @click="challengeRecon(row.userId)"
                >
                  {{
                    challengeAlreadySent(row.userId)
                      ? t('league.challengeSent')
                      : challengeBusyId === row.userId
                        ? t('missions.reconBusy')
                        : t('league.challengeRecon')
                  }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="invite" class="mt-14" data-testid="league-invite">
        <p class="section-label">{{ t('league.inviteTitle') }}</p>
        <p class="mt-2 text-xs text-ink-muted">{{ t('league.inviteLead') }}</p>
        <p v-if="roster" class="mt-3 text-sm text-ink">
          {{
            t('league.inviteRoster', {
              humans: roster.humans,
              capacity: roster.capacity,
              bots: roster.bots,
            })
          }}
        </p>
        <p class="mt-3 break-all font-mono text-[11px] text-ink-muted">{{ invite.inviteUrl }}</p>
        <button type="button" class="btn-ghost mt-3 text-[10px]" data-testid="league-invite-copy" @click="copyInvite">
          {{ inviteCopied ? t('league.inviteCopied') : t('league.inviteCopy') }}
        </button>
      </section>

      <LeagueWallPanel />

      <section v-if="league.nextMatch" class="mt-14">
        <p class="section-label">{{ t('league.nextMatch') }}</p>
        <div class="mt-4 border border-line p-5">
          <RouterLink
            :to="{
              name: 'operation-match',
              params: { matchId: league.nextMatch.id },
              query: { poolId: league.pool.id, cycle: league.nextMatch.cycle },
            }"
            class="block transition hover:border-accent"
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

          <div v-if="league.nextMatch.h2h || league.nextMatch.isNemesis" class="mt-4 border-t border-line pt-4 text-xs text-ink-muted">
            <p v-if="league.nextMatch.h2h">
              {{ t('league.h2hVs', { name: league.nextMatch.opponentName }) }}
              · {{ h2hLabel(league.nextMatch.h2h) }}
            </p>
            <p v-if="league.nextMatch.isNemesis" class="mt-1 text-fire">
              {{ t('league.nemesisHint', { count: league.nextMatch.consecutiveLosses }) }}
            </p>
            <button
              v-if="league.nextMatch.canChallengeRecon"
              type="button"
              class="btn-ghost mt-3 text-[10px]"
              :disabled="
                challengeBusyId === league.nextMatch.opponentUserId ||
                  challengeAlreadySent(league.nextMatch.opponentUserId)
              "
              data-testid="league-next-challenge"
              @click="challengeRecon(league.nextMatch.opponentUserId)"
            >
              {{
                challengeAlreadySent(league.nextMatch.opponentUserId)
                  ? t('league.challengeSent')
                  : t('league.challengeRecon')
              }}
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="externalTargets.length"
        class="mt-14"
        data-testid="league-external-challenges"
      >
        <p class="section-label">{{ t('league.otherLeaguesTitle') }}</p>
        <p class="mt-2 text-xs text-ink-muted">{{ t('league.otherLeaguesLead') }}</p>
        <ul class="mt-4 space-y-2">
          <li
            v-for="target in externalTargets"
            :key="target.userId"
            class="flex flex-wrap items-center justify-between gap-3 border border-line px-4 py-3 text-sm"
          >
            <div>
              <RouterLink
                :to="`/sensei/${target.userId}`"
                class="text-ink underline-offset-2 hover:underline"
              >
                {{ target.senseiName }}
              </RouterLink>
              <p class="mt-1 text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                {{ t('league.otherLeagueDivision', { division: target.divisionLevel }) }}
              </p>
            </div>
            <button
              type="button"
              class="btn-ghost text-[10px]"
              :disabled="challengeBusyId === target.userId || challengeAlreadySent(target.userId)"
              :data-testid="`league-ext-challenge-${target.userId}`"
              @click="challengeRecon(target.userId)"
            >
              {{
                challengeAlreadySent(target.userId)
                  ? t('league.challengeSent')
                  : t('league.challengeRecon')
              }}
            </button>
          </li>
        </ul>
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
        <ScoutReportPanel class="mt-4" :scout-report="league.scoutReport" compact />
      </section>
    </template>
  </div>
</template>

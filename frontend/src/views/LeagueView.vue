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
const showRecon = computed(() => recon.value?.available === true)
const canReconAct = computed(
  () => showRecon.value && !recon.value?.played && !recon.value?.pendingOutgoing?.length
)
const myFixture = computed(() =>
  fixtures.value?.matches?.find((m) => m.isParticipant) ?? null
)
const otherFixtures = computed(() =>
  (fixtures.value?.matches ?? []).filter((m) => !m.isParticipant)
)
const invite = ref(null)
const inviteCopied = ref(false)
const recon = ref(null)
const reconOpponents = ref([])
const reconLoading = ref(false)
const reconBusy = ref(false)
const reconError = ref(null)

onMounted(async () => {
  try {
    const [leagueRes, inviteRes, reconRes, opponentsRes] = await Promise.all([
      fetch(`${API_BASE}/api/league`),
      fetch(`${API_BASE}/api/league/invite`).catch(() => null),
      fetch(`${API_BASE}/api/reconnaissance`).catch(() => null),
      fetch(`${API_BASE}/api/reconnaissance/opponents`).catch(() => null),
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

    if (reconRes?.ok) {
      recon.value = await reconRes.json()
    }
    if (opponentsRes?.ok) {
      const data = await opponentsRes.json()
      reconOpponents.value = data.opponents ?? []
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

async function refreshRecon() {
  reconLoading.value = true
  reconError.value = null
  try {
    const [reconRes, opponentsRes] = await Promise.all([
      fetch(`${API_BASE}/api/reconnaissance`),
      fetch(`${API_BASE}/api/reconnaissance/opponents`),
    ])
    if (reconRes.ok) recon.value = await reconRes.json()
    if (opponentsRes.ok) {
      const data = await opponentsRes.json()
      reconOpponents.value = data.opponents ?? []
    }
  } catch (e) {
    reconError.value = e.message
  } finally {
    reconLoading.value = false
  }
}

function reconOutcomeLabel(outcome) {
  const map = {
    win: t('league.reconOutcomeWin'),
    draw: t('league.reconOutcomeDraw'),
    loss: t('league.reconOutcomeLoss'),
  }
  return map[outcome] || outcome
}

function canChallengeUser(row) {
  return (
    canReconAct.value &&
    !row.isPlayer &&
    !row.isBot &&
    !recon.value?.pendingIncoming?.some((c) => c.challengerUserId === row.userId)
  )
}

async function runReconAction(action) {
  reconBusy.value = true
  reconError.value = null
  try {
    const res = await action()
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
    await refreshRecon()
    return body
  } catch (e) {
    reconError.value = e.message
    return null
  } finally {
    reconBusy.value = false
  }
}

async function startReconMatchmake() {
  await runReconAction(() =>
    fetch(`${API_BASE}/api/reconnaissance/matchmake`, { method: 'POST' })
  )
}

async function challengeUser(targetUserId) {
  await runReconAction(() =>
    fetch(`${API_BASE}/api/reconnaissance/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
  )
}

async function acceptReconChallenge(challengeId) {
  await runReconAction(() =>
    fetch(`${API_BASE}/api/reconnaissance/challenges/${challengeId}/accept`, { method: 'POST' })
  )
}

async function declineReconChallenge(challengeId) {
  await runReconAction(() =>
    fetch(`${API_BASE}/api/reconnaissance/challenges/${challengeId}/decline`, { method: 'POST' })
  )
}

const externalOpponents = computed(() =>
  reconOpponents.value.filter((o) => !o.samePool)
)
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

      <div class="mt-14 lg:grid lg:grid-cols-12 lg:gap-10">
        <section class="lg:col-span-7" data-testid="league-standings">
          <p class="section-label">{{ t('league.standings') }}</p>
          <table class="league-table mt-6 w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                <th class="pb-3 pr-4">#</th>
                <th class="pb-3">{{ t('league.sensei') }}</th>
                <th class="pb-3 text-right">{{ t('league.played') }}</th>
                <th class="pb-3 text-right">{{ t('league.points') }}</th>
                <th v-if="showRecon" class="pb-3 text-right">{{ t('league.reconChallengeCol') }}</th>
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
                <td v-if="showRecon" class="py-3 text-right">
                  <button
                    v-if="canChallengeUser(row)"
                    type="button"
                    class="btn-ghost text-[10px]"
                    :disabled="reconBusy"
                    data-testid="recon-challenge-pool"
                    @click="challengeUser(row.userId)"
                  >
                    {{ t('league.reconChallenge') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <aside class="mt-12 lg:col-span-5 lg:mt-0">
          <section v-if="showRecon" class="mb-10" data-testid="league-reconnaissance">
            <p class="section-label">{{ t('league.reconTitle') }}</p>
            <p class="mt-2 text-xs leading-relaxed text-ink-muted">{{ t('league.reconLead') }}</p>
            <p class="mt-2 text-[10px] text-ink-faint">
              {{ t('league.reconRewards') }}
            </p>

            <p v-if="reconError" class="mt-3 text-xs text-fire">{{ reconError }}</p>

            <div v-if="recon?.pendingIncoming?.length" class="mt-4 space-y-2">
              <p class="text-[10px] uppercase tracking-[0.14em] text-accent">{{ t('league.reconIncoming') }}</p>
              <div
                v-for="challenge in recon.pendingIncoming"
                :key="challenge.challengeId"
                class="border border-line px-4 py-3 text-sm"
              >
                <p class="text-ink">{{ t('league.reconChallengeFrom', { name: challenge.challengerName }) }}</p>
                <div class="mt-3 flex gap-2">
                  <button
                    type="button"
                    class="btn-primary text-[10px]"
                    :disabled="reconBusy"
                    @click="acceptReconChallenge(challenge.challengeId)"
                  >
                    {{ t('league.reconAccept') }}
                  </button>
                  <button
                    type="button"
                    class="btn-ghost text-[10px]"
                    :disabled="reconBusy"
                    @click="declineReconChallenge(challenge.challengeId)"
                  >
                    {{ t('league.reconDecline') }}
                  </button>
                </div>
              </div>
            </div>

            <p v-if="recon?.pendingOutgoing" class="mt-4 text-xs text-ink-muted">
              {{ t('league.reconPendingOutgoing', { name: recon.pendingOutgoing.defenderName }) }}
            </p>

            <button
              v-if="canReconAct"
              type="button"
              class="btn-primary mt-4 text-[10px]"
              :disabled="reconBusy"
              data-testid="recon-matchmake"
              @click="startReconMatchmake"
            >
              {{ reconBusy ? t('league.reconBusy') : t('league.reconMatchmake') }}
            </button>

            <p v-else-if="recon?.played && recon?.lastMission" class="mt-4 border border-line px-4 py-3 text-sm">
              <span class="text-ink">{{ reconOutcomeLabel(recon.lastMission.outcome) }}</span>
              <span class="text-ink-muted"> · {{ recon.lastMission.opponentName }}</span>
              <span v-if="recon.lastMission.awayIsBot" class="text-ink-faint">{{ t('league.botParen') }}</span>
              <span v-if="recon.lastMission.ryos" class="ml-2 text-accent">+{{ recon.lastMission.ryos }} Ryos</span>
              <span v-if="recon.lastMission.loot?.items?.length" class="ml-2 text-ink-muted">
                · {{ recon.lastMission.loot.items.map((i) => i.slug).join(', ') }}
              </span>
              <span v-if="recon.lastMission.loot?.tacticCard?.slug" class="ml-2 text-accent">
                · {{ recon.lastMission.loot.tacticCard.slug }}
              </span>
            </p>

            <div v-if="externalOpponents.length && canReconAct" class="mt-6">
              <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{{ t('league.reconOtherPools') }}</p>
              <ul class="mt-3 space-y-2">
                <li
                  v-for="opp in externalOpponents"
                  :key="opp.userId"
                  class="flex items-center justify-between border border-line/60 px-3 py-2 text-xs"
                >
                  <span>
                    {{ opp.senseiName }}
                    <span class="text-ink-faint">· Div. {{ opp.divisionLevel }}</span>
                  </span>
                  <button
                    type="button"
                    class="btn-ghost text-[10px]"
                    :disabled="reconBusy"
                    @click="challengeUser(opp.userId)"
                  >
                    {{ t('league.reconChallenge') }}
                  </button>
                </li>
              </ul>
            </div>
          </section>

          <section v-if="invite" class="mb-10">
            <p class="section-label">{{ t('league.inviteTitle') }}</p>
            <p class="mt-2 text-xs text-ink-faint">{{ t('league.inviteLead') }}</p>
            <p class="mt-3 break-all font-mono text-[11px] text-ink-muted">{{ invite.inviteUrl }}</p>
            <button type="button" class="btn-ghost mt-3 text-[10px]" @click="copyInvite">
              {{ inviteCopied ? t('league.inviteCopied') : t('league.inviteCopy') }}
            </button>
          </section>

          <section v-if="league.nextMatch">
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

          <section v-if="fixtures?.matches?.length" class="mt-10" data-testid="league-fixtures">
            <p class="section-label">{{ t('league.fixtures') }}</p>
            <p class="mt-2 text-xs leading-relaxed text-ink-muted">
              {{ t('league.fixturesHint', { cycle: league.pool.currentCycle }) }}
            </p>

            <div v-if="myFixture" class="mt-6">
              <p class="text-[10px] uppercase tracking-[0.14em] text-accent">
                {{ t('matches.yourMatch') }}
              </p>
              <RouterLink
                :to="{
                  name: 'operation-match',
                  params: { matchId: myFixture.id },
                  query: { poolId: league.pool.id, cycle: myFixture.cycle },
                }"
                class="mt-3 block border border-accent/60 bg-accent/5 px-4 py-4 transition hover:border-accent"
              >
                <div class="operation-match-header operation-match-header--compact">
                  <div class="operation-match-header__versus">
                    <SenseiIdentity
                      class="operation-match-header__card"
                      :identity="fixtureIdentity(myFixture.home, myFixture.homeUserId)"
                      variant="match"
                      :subtitle="t('league.homeSide')"
                      :linkable="false"
                    />
                    <span class="operation-match-header__vs">{{ t('common.vs') }}</span>
                    <SenseiIdentity
                      class="operation-match-header__card"
                      :identity="fixtureIdentity(myFixture.away, myFixture.awayUserId)"
                      variant="match"
                      :subtitle="t('league.awaySide')"
                      :linkable="false"
                    />
                  </div>
                </div>
                <p
                  v-if="myFixture.homeScore != null && myFixture.awayScore != null && myFixture.status !== 'scheduled'"
                  class="operation-match-header__status mt-3"
                >
                  {{ myFixture.homeScore }} : {{ myFixture.awayScore }}
                </p>
                <p class="mt-3 text-center text-xs text-accent">{{ t('league.viewChronicle') }}</p>
              </RouterLink>
            </div>

            <ul v-if="otherFixtures.length" class="mt-6 space-y-2">
              <li v-for="match in otherFixtures" :key="match.id">
                <RouterLink
                  :to="{
                    name: 'operation-match',
                    params: { matchId: match.id },
                    query: { poolId: league.pool.id, cycle: match.cycle },
                  }"
                  class="block border border-line px-4 py-4 text-sm transition hover:border-accent"
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

          <section v-if="league.recentMatches?.length" class="mt-10">
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

          <section v-if="showScout && league.scoutReport" class="mt-10">
            <p class="section-label">{{ t('league.scoutTitle') }}</p>
            <div class="mt-4 border-l-2 border-accent-soft pl-4">
              <p class="text-sm text-ink">
                {{ league.scoutReport.opponentName }}
                <span v-if="league.scoutReport.opponentIsBot" class="text-ink-faint">{{ t('league.botParen') }}</span>
              </p>
              <ul class="mt-3 space-y-2 text-xs leading-relaxed text-ink-muted">
                <li v-for="(line, i) in league.scoutReport.lines" :key="i">{{ line }}</li>
              </ul>
              <ul
                v-if="league.scoutReport.profiles?.length"
                class="mt-4 space-y-1 border-t border-line/40 pt-3 text-xs text-ink-faint"
              >
                <li v-for="(profile, j) in league.scoutReport.profiles" :key="`sp-${j}`">
                  {{ profile.artLabel }} · {{ t('dossier.potential', { level: profile.potentialHint }) }}
                </li>
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

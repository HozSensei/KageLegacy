<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const league = ref(null)
const gameClock = ref(null)

const showScout = computed(() => (gameClock.value?.hour ?? 0) >= 36)

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/league`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${res.status}`)
    }
    const data = await res.json()
    league.value = data
    gameClock.value = data.gameClock
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

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
  <div class="page-shell">
    <header>
      <p class="page-kicker">{{ t('league.kicker') }}</p>
      <h1 class="page-title mt-3">{{ t('nav.league') }}</h1>
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
        <section class="lg:col-span-7">
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
                  {{ row.senseiName }}
                  <span v-if="row.isBot" class="ml-1 text-[10px] text-ink-faint">bot</span>
                </td>
                <td class="py-3 text-right tabular-nums">{{ row.played }}</td>
                <td class="py-3 text-right font-display text-lg tabular-nums">{{ row.points }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <aside class="mt-12 lg:col-span-5 lg:mt-0">
          <section v-if="league.nextMatch">
            <p class="section-label">{{ t('league.nextMatch') }}</p>
            <div class="mt-4 border border-line p-5">
              <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                {{ t('league.matchday') }} {{ league.nextMatch.cycle }}
                · {{ matchStatusLabel(league.nextMatch.status) }}
              </p>
              <p class="mt-4 font-display text-2xl text-ink">
                {{ league.nextMatch.home.name }}
                <span class="text-ink-faint">vs</span>
                {{ league.nextMatch.away.name }}
              </p>
              <p
                v-if="league.nextMatch.status !== 'scheduled'"
                class="mt-2 text-sm text-ink-muted"
              >
                {{ league.nextMatch.homeScore }} : {{ league.nextMatch.awayScore }}
              </p>
              <p class="mt-3 text-xs text-ink-faint">
                {{ t('league.vsHint', { opponent: league.nextMatch.opponentName }) }}
              </p>
            </div>
          </section>

          <section v-if="showScout && league.scoutReport" class="mt-10">
            <p class="section-label">{{ t('league.scoutTitle') }}</p>
            <div class="mt-4 border-l-2 border-accent-soft pl-4">
              <p class="text-sm text-ink">
                {{ league.scoutReport.opponentName }}
                <span v-if="league.scoutReport.opponentIsBot" class="text-ink-faint">(bot)</span>
              </p>
              <ul class="mt-3 space-y-2 text-xs leading-relaxed text-ink-muted">
                <li v-for="(line, i) in league.scoutReport.lines" :key="i">{{ line }}</li>
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

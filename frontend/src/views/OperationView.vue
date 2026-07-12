<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import OperationMatchNav from '../components/OperationMatchNav.vue'
import ChronicleReader from '../components/operation/ChronicleReader.vue'
import SenseiIdentity from '../components/sensei/SenseiIdentity.vue'
import OperationEliteReport from '../components/operation/OperationEliteReport.vue'
import { useEliteStore } from '../stores/elite'

const props = defineProps({
  matchId: { type: [String, Number], default: null },
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const elite = useEliteStore()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const navLoading = ref(true)
const error = ref(null)
const operation = ref(null)
const navigation = ref(null)
const showMechanical = ref(false)
let pollTimer = null

const activeMatchId = computed(() => props.matchId || route.params.matchId || null)

async function fetchNavigation() {
  navLoading.value = true
  try {
    const params = new URLSearchParams()
    if (route.query.poolId) params.set('poolId', route.query.poolId)
    if (route.query.cycle) params.set('cycle', route.query.cycle)
    if (activeMatchId.value) params.set('matchId', activeMatchId.value)
    const res = await fetch(`${API_BASE}/api/matches/navigation?${params}`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    navigation.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    navLoading.value = false
  }
}

async function fetchOperation() {
  try {
    const url = activeMatchId.value
      ? `${API_BASE}/api/matches/${activeMatchId.value}`
      : `${API_BASE}/api/operation/live`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${res.status}`)
    }
    operation.value = await res.json()
    error.value = null

    if (
      activeMatchId.value &&
      operation.value?.pool?.id &&
      !route.query.poolId
    ) {
      router.replace({
        name: route.name,
        params: route.params,
        query: {
          ...route.query,
          poolId: operation.value.pool.id,
          cycle: operation.value.match?.seasonCycle,
        },
      })
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await Promise.all([fetchOperation(), fetchNavigation()])
}

function schedulePoll() {
  clearInterval(pollTimer)
  if (operation.value?.state === 'live') {
    pollTimer = setInterval(refreshAll, 30000)
  }
}

watch(
  () => operation.value?.state,
  () => schedulePoll()
)

watch(
  () => [activeMatchId.value, route.query.poolId, route.query.cycle],
  async () => {
    loading.value = true
    await refreshAll()
    schedulePoll()
  }
)

const chronicleCast = computed(() => {
  const match = operation.value?.match
  const roster = operation.value?.chronicleCast ?? { ninjas: [] }
  return {
    ninjas: roster.ninjas || [],
    senseiIdentities: [match?.homeIdentity, match?.awayIdentity].filter(Boolean),
  }
})

const matchTitle = computed(() => {
  const m = operation.value?.match
  if (!m) return null
  return `${m.homeSensei} vs ${m.awaySensei}`
})

const matchIdentities = computed(() => operation.value?.match ?? null)

const resultLabel = computed(() => {
  const m = operation.value?.match
  if (!m || m.result === 'pending') return null

  if (operation.value?.viewerRole === 'spectator') {
    const map = {
      home_win: t('matches.resultHomeWin', { home: m.homeSensei }),
      away_win: t('matches.resultAwayWin', { away: m.awaySensei }),
      draw: t('operation.draw'),
    }
    return map[m.result]
  }

  const map = {
    home_win: m.isHome ? t('operation.victory') : t('operation.defeat'),
    away_win: m.isHome ? t('operation.defeat') : t('operation.victory'),
    draw: t('operation.draw'),
  }
  return map[m.result]
})

const reportReady = computed(() => {
  const state = operation.value?.state
  return state === 'live' || state === 'finished'
})

const spectatorBadge = computed(() => operation.value?.viewerRole === 'spectator')
const canUseEliteAnalytics = computed(() => Boolean(elite.subscription?.isActive))

const plainHomeMatchCard = computed(() => {
  if (operation.value?.viewerRole !== 'participant') return false
  const match = operation.value?.match
  if (!match?.isHome) return false
  return Boolean(match.homeIdentity?.isElite)
})

const plainAwayMatchCard = computed(() => {
  if (operation.value?.viewerRole !== 'participant') return false
  const match = operation.value?.match
  if (match?.isHome) return false
  return Boolean(match.awayIdentity?.isElite)
})

const equipmentRows = computed(() => {
  const summary = operation.value?.mechanical?.equipmentSummary || []
  return summary.filter((row) => row.equippedSlugs?.length || row.consumedSlugs?.length)
})

function slugLabel(slug) {
  const key = `operation.items.${slug}`
  const translated = t(key)
  return translated === key ? slug : translated
}

onMounted(async () => {
  await refreshAll()
  schedulePoll()
  elite.fetchElite()
})

onUnmounted(() => clearInterval(pollTimer))
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="operation-page">
    <header>
      <p class="page-lead">{{ t('operation.leadBrowse') }}</p>
    </header>

    <p v-if="loading && !operation" class="mt-12 text-sm text-ink-muted">{{ t('operation.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <div v-else class="mt-10 lg:grid lg:grid-cols-12 lg:gap-10">
      <aside class="lg:col-span-4 xl:col-span-3">
        <OperationMatchNav :nav="navigation" :loading="navLoading" />
      </aside>

      <div class="mt-10 lg:col-span-8 lg:mt-0 xl:col-span-9">
        <template v-if="operation">
          <div v-if="matchTitle" class="operation-match-header mb-8">
            <div
              v-if="spectatorBadge || operation.match?.seasonCycle"
              class="operation-match-header__meta"
            >
              <span
                v-if="spectatorBadge"
                class="text-[10px] uppercase tracking-[0.14em] text-ink-faint"
              >
                {{ t('matches.spectator') }}
              </span>
              <span
                v-if="operation.match?.seasonCycle"
                class="text-[10px] uppercase tracking-[0.14em] text-ink-faint"
              >
                {{ t('league.matchday') }} {{ operation.match.seasonCycle }}
              </span>
            </div>

            <div class="operation-match-header__versus">
              <SenseiIdentity
                v-if="matchIdentities.homeIdentity"
                class="operation-match-header__card"
                :identity="matchIdentities.homeIdentity"
                variant="match"
                :plain="plainHomeMatchCard"
                :subtitle="t('league.homeSide')"
              />
              <span v-else class="operation-match-header__card font-display text-xl text-ink">
                {{ matchIdentities.homeSensei }}
              </span>
              <span class="operation-match-header__vs">{{ t('common.vs') }}</span>
              <SenseiIdentity
                v-if="matchIdentities.awayIdentity"
                class="operation-match-header__card"
                :identity="matchIdentities.awayIdentity"
                variant="match"
                :plain="plainAwayMatchCard"
                :subtitle="t('league.awaySide')"
              />
              <span v-else class="operation-match-header__card font-display text-xl text-ink">
                {{ matchIdentities.awaySensei }}
              </span>
            </div>
          </div>

          <p
            v-if="operation.state === 'scheduled'"
            class="operation-match-header__status"
          >
            {{ t('operation.scheduledSpectator', { home: operation.match?.homeSensei, away: operation.match?.awaySensei }) }}
          </p>

          <p
            v-else-if="operation.state === 'waiting' || operation.state === 'simulating'"
            class="operation-match-header__status"
          >
            {{ t('operation.waiting') }}
          </p>

          <div v-else class="lg:grid lg:grid-cols-12 lg:gap-10">
            <article class="lg:col-span-8">
              <h3 class="font-display text-xl text-ink">{{ t('operation.reportTitle') }}</h3>

              <div v-if="resultLabel" class="mt-4 text-sm uppercase tracking-[0.14em] text-accent">
                {{ resultLabel }}
                <span v-if="operation.match" class="text-ink-faint">
                  · {{ operation.match.homeScore }} – {{ operation.match.awayScore }}
                </span>
              </div>

              <ChronicleReader
                class="mt-8 text-[15px] leading-relaxed text-ink-muted"
                :segments="operation.chronicle"
                :cast="chronicleCast"
                :empty-text="t('operation.noChronicle')"
              />

              <p
                v-if="operation.suspense"
                class="mt-8 border-l-2 border-accent/40 pl-4 text-sm italic text-ink-faint"
              >
                {{ operation.suspense }}
              </p>

              <section v-if="operation.debriefing?.length" class="mt-14 border-t border-line pt-10">
                <p class="section-label">{{ t('operation.debriefTitle') }}</p>
                <ul class="mt-6 space-y-4">
                  <li
                    v-for="(alert, idx) in operation.debriefing"
                    :key="alert.code || idx"
                    class="text-sm leading-relaxed text-ink-muted"
                  >
                    {{ alert.text }}
                  </li>
                </ul>
              </section>

              <OperationEliteReport
                v-if="activeMatchId"
                :match-id="activeMatchId"
                :can-load="reportReady"
              />
            </article>

            <aside v-if="canUseEliteAnalytics" class="mt-12 lg:col-span-4 lg:mt-0">
              <button
                type="button"
                class="btn-ghost w-full"
                @click="showMechanical = !showMechanical"
              >
                {{ showMechanical ? t('operation.hideMechanical') : t('operation.showMechanical') }}
              </button>

              <div
                v-if="showMechanical && operation.mechanical"
                class="mt-6 border border-line bg-bg-soft p-5 text-sm"
              >
                <dl class="space-y-4">
                  <div>
                    <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      {{ t('operation.possession') }}
                    </dt>
                    <dd class="mt-1 text-ink-muted">
                      {{ operation.mechanical.possession?.homePct }}% /
                      {{ operation.mechanical.possession?.awayPct }}%
                    </dd>
                  </div>
                  <div>
                    <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      {{ t('operation.remainingPower') }}
                    </dt>
                    <dd class="mt-1 text-ink-muted">
                      {{ operation.mechanical.homeScorePct }}% /
                      {{ operation.mechanical.awayScorePct }}%
                    </dd>
                  </div>
                  <div>
                    <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      {{ t('operation.endingTour') }}
                    </dt>
                    <dd class="mt-1 text-ink-muted">{{ operation.mechanical.endingTour }} / 12</dd>
                  </div>
                  <div v-if="equipmentRows.length">
                    <dt class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      {{ t('operation.equipmentTitle') }}
                    </dt>
                    <dd class="mt-2 space-y-2">
                      <div
                        v-for="row in equipmentRows"
                        :key="`${row.side}-${row.ninjaId}`"
                        class="text-xs text-ink-muted"
                      >
                        <span class="text-ink">{{ row.ninjaName }}</span>
                        <span v-if="row.consumedSlugs?.length" class="text-accent">
                          · {{ t('operation.itemUsed', { items: row.consumedSlugs.map(slugLabel).join(', ') }) }}
                        </span>
                        <span v-else-if="row.equippedSlugs?.length" class="text-ink-faint">
                          · {{ t('operation.itemUnused', { items: row.equippedSlugs.map(slugLabel).join(', ') }) }}
                        </span>
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </template>

        <p v-else class="text-sm text-ink-muted">{{ t('matches.pickMatch') }}</p>
      </div>
    </div>
  </div>
</template>

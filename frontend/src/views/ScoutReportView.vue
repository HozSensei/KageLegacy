<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import ScoutReportPanel from '../components/scout/ScoutReportPanel.vue'

defineOptions({ name: 'ScoutReportView' })

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const league = ref(null)
const gameClock = ref(null)

const scoutAvailable = computed(() => (gameClock.value?.hour ?? 0) >= 36)

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
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="scout-page">
    <header>
      <p class="page-lead">{{ t('scout.pageLead') }}</p>
    </header>

    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else>
      <p v-if="!scoutAvailable" class="mt-10 text-sm text-ink-muted">
        {{ t('scout.locked') }}
      </p>

      <template v-else-if="league?.scoutReport">
        <div v-if="league.nextMatch" class="mt-10 border border-line px-5 py-4 text-sm">
          <p class="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {{ t('scout.nextMatch') }}
          </p>
          <p class="mt-2 text-ink">
            {{ t('league.matchday') }} {{ league.nextMatch.cycle }}
            · {{ league.nextMatch.opponentName }}
          </p>
        </div>

        <section class="mt-10">
          <p class="section-label">{{ t('scout.title') }}</p>
          <ScoutReportPanel class="mt-4" :scout-report="league.scoutReport" />
        </section>
      </template>

      <p v-else class="mt-10 text-sm text-ink-muted">{{ t('scout.unavailable') }}</p>

      <div class="mt-10 flex flex-wrap gap-3">
        <RouterLink to="/reconnaissance" class="btn-primary text-[10px]">
          {{ t('scout.reconLink') }}
        </RouterLink>
        <RouterLink to="/league" class="btn-ghost text-[10px]">
          {{ t('scout.leagueLink') }}
        </RouterLink>
      </div>
    </template>
  </div>
</template>

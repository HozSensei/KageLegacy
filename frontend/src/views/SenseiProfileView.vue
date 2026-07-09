<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import SenseiIdentity from '../components/sensei/SenseiIdentity.vue'

defineOptions({ name: 'SenseiProfileView' })

const props = defineProps({
  userId: { type: [String, Number], required: true },
})

const { t } = useI18n()
const route = useRoute()
const API_BASE = import.meta.env.VITE_API_URL || ''

const loading = ref(true)
const error = ref(null)
const profile = ref(null)

const targetId = computed(() => props.userId || route.params.userId)

const statsLine = computed(() => {
  const s = profile.value?.publicStats
  if (!s?.division) return null
  return t('senseiProfile.statsLine', {
    division: s.division,
    season: s.season,
    points: s.seasonPoints,
    reputation: s.reputation,
  })
})

onMounted(fetchProfile)

async function fetchProfile() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/sensei/${targetId.value}/profile`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`)
    profile.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-shell page-shell--hero" data-testid="sensei-profile-page">
    <p v-if="loading" class="mt-12 text-sm text-ink-muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="mt-12 text-sm text-fire">{{ error }}</p>

    <template v-else-if="profile">
      <SenseiIdentity
        :identity="profile.identity"
        variant="card"
        :subtitle="statsLine"
        :linkable="false"
      />

      <dl class="metric-row mt-10">
        <div class="metric-item">
          <dd class="metric-value">{{ profile.publicStats.wins }}</dd>
          <dt class="metric-label">{{ t('senseiProfile.wins') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ profile.publicStats.draws }}</dd>
          <dt class="metric-label">{{ t('senseiProfile.draws') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value">{{ profile.publicStats.losses }}</dd>
          <dt class="metric-label">{{ t('senseiProfile.losses') }}</dt>
        </div>
        <div class="metric-item">
          <dd class="metric-value text-accent">{{ profile.publicStats.seasonPoints }}</dd>
          <dt class="metric-label">{{ t('league.points') }}</dt>
        </div>
      </dl>

      <section v-if="profile.recentMatch" class="mt-14 border-t border-line pt-10">
        <p class="section-label">{{ t('senseiProfile.lastMatch') }}</p>
        <RouterLink
          :to="{
            name: 'operation-match',
            params: { matchId: profile.recentMatch.id },
          }"
          class="mt-4 block border border-line p-5 transition hover:border-accent"
        >
          <p class="text-sm text-ink">
            {{ t('league.matchday') }} {{ profile.recentMatch.cycle }}
            · {{ profile.recentMatch.opponentName }}
          </p>
          <p class="mt-2 text-xs text-accent">{{ t('league.viewChronicle') }}</p>
        </RouterLink>
      </section>

      <p v-if="profile.isOwnProfile" class="mt-10 text-xs text-ink-faint">
        {{ t('senseiProfile.ownHint') }}
        <RouterLink to="/bureau" class="text-accent hover:underline">{{ t('nav.bureau') }}</RouterLink>
      </p>
    </template>
  </div>
</template>
